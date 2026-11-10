// POST /api/checkout — «Comprar» (PROMPT-ODOO-TIENDA §3): veredicto de
// factibilidad en el servidor, presupuesto en Odoo con firma y pago, y el
// link del portal solo si el diseño se puede cobrar ya. Respuestas:
//   400 datos inválidos (teléfono o email) — sin llamar a Odoo
//   422 { verdict: "IMPOSIBLE", reasons } — nada se crea (ni en Odoo ni acá)
//   200 { verdict: "OK", portalUrl } — firmar y pagar en el portal
//   200 { verdict: "REVISION" } — presupuesto sin enviar; el taller lo aprueba
//   200 { ..., odoo: { paid: true } } — «ya pagaste este pedido»
//   502 Odoo no responde o no está configurado — el cliente sigue por WhatsApp
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, ordersTable } from "@workspace/db";
import { CreateOrderBody } from "@workspace/api-zod";
import { rateLimit } from "../middlewares/rate-limit";
import { OdooClient, OdooError, OdooProductionWriteBlocked, odooConfig } from "../lib/odoo";
import { OdooAlreadyPaid, OdooCheckoutError, absolutePortal, checkout as odooCheckout, portalPath, stampApprovedVersion } from "../lib/odoo-checkout";
import { extraLabels, serverVerdict, verdictNote } from "../lib/checkout-verdict";
import { designHash } from "../lib/design-hash";
import { normalizeEmail, normalizePhonePy } from "../lib/phone-py";
import { createOrReuseOrder, imageUrlFor, originFrom } from "./orders";
import { logger } from "../lib/logger";
import { withPgLock } from "../lib/pg-lock";

const router: IRouter = Router();

const CustomerBody = z.object({
  nombre: z.string().trim().min(2).max(120),
  telefono: z.string().trim().min(6).max(40),
  email: z.string().trim().min(5).max(120),
});

const CheckoutBody = CreateOrderBody.extend({ cliente: CustomerBody });

const WHATSAPP_HINT = "No pudimos conectar con la tienda. Podés enviar el pedido por WhatsApp y lo cerramos por ahí.";

/** Un solo cliente de Odoo por proceso: reusa el uid y la caché de campos. */
let client: OdooClient | null = null;
function odoo(): OdooClient | null {
  if (client) return client;
  const cfg = odooConfig();
  if (!cfg) return null;
  client = new OdooClient(cfg);
  return client;
}

/** La captura del 3D como adjunto de Odoo (prueba automática). */
function proofFrom(dataUrl: string | null | undefined, ref: string) {
  const m = dataUrl ? /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl) : null;
  if (!m) return null;
  return { name: `Prueba ${ref}.${m[1] === "image/png" ? "png" : "jpg"}`, mimetype: m[1], base64: m[2] };
}

router.post("/checkout", rateLimit({ max: 30, windowMs: 60 * 60 * 1000 }), async (req, res) => {
  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos de pedido inválidos" });
    return;
  }
  const body = parsed.data;

  // Validar el cliente ANTES de cualquier llamada a Odoo.
  const phone = normalizePhonePy(body.cliente.telefono);
  if (!phone) {
    res.status(400).json({ message: "Ingresá un celular paraguayo válido (ej. 0981 123 456).", field: "telefono" });
    return;
  }
  const email = normalizeEmail(body.cliente.email);
  if (!email) {
    res.status(400).json({ message: "Ingresá un email válido.", field: "email" });
    return;
  }
  const customer = { name: body.cliente.nombre, email, phone };
  const ds = body.designState as Record<string, unknown>;

  const odooClient = odoo();
  if (!odooClient) {
    res.status(502).json({ message: WHATSAPP_HINT, whatsapp: true });
    return;
  }

  try {
    // 1. Veredicto en el servidor, con precios y stock leídos de Odoo (solo lectura).
    const { result, plan } = await serverVerdict(odooClient, ds);
    if (result.verdict === "IMPOSIBLE") {
      logger.info({ reasons: result.reasons.map(r => r.code) }, "checkout: diseño imposible");
      res.status(422).json({
        message: result.reasons[0]?.message ?? "Este diseño no se puede producir.",
        verdict: "IMPOSIBLE", reasons: result.reasons,
        soldOut: result.reasons.some(r => r.code === "out_of_stock" || r.code === "variant_missing") || undefined,
      });
      return;
    }
    const verdict = result.verdict;

    // 2. Pedido CS-XXXX de la landing (mismo requestId → mismo pedido).
    const created = await createOrReuseOrder(body);
    if (!created.ok) {
      res.status(created.status).json({ message: created.message });
      return;
    }
    const order = created.order;
    const origin = originFrom(req);
    const previewImageUrl = imageUrlFor(req, order);
    const adminUrl = `${origin}/admin?pedido=${order.orderNumber}`;
    const designSummary = [order.product, order.color, order.technique, order.customText ? `«${order.customText}»` : null, order.iconName ? `ícono ${order.iconName}` : null, ...extraLabels(ds)]
      .filter(Boolean).join(" · ");

    // 3. Presupuesto en Odoo (firma + pago, 48 h, prueba adjunta).
    // Con candado: `checkout` busca por client_order_ref y después crea, así
    // que dos «Comprar» simultáneos del mismo pedido creaban dos presupuestos.
    const r = await withPgLock(`checkout:${order.orderNumber}`, () => odooCheckout(odooClient, {
      ref: order.orderNumber, customer, plan, verdict,
      previewImageUrl, proof: proofFrom(body.previewImage, order.orderNumber), adminUrl, designSummary,
      verdictNote: verdictNote(result),
    }));

    // OK: la versión que vio es la aprobada (automático). REVISION: la aprueba el taller.
    const hash = designHash(order.designState);
    const autoApproved = verdict === "OK";
    if (autoApproved && r.created) {
      await stampApprovedVersion(odooClient, r.order.id, hash, "automático").catch(err =>
        logger.warn({ err: String(err), orderNumber: order.orderNumber }, "checkout: no se pudo dejar la huella en el presupuesto"));
    }
    const [row] = await db.update(ordersTable).set({
      odooOrderId: r.order.id,
      odooOrderName: r.order.name,
      odooTotal: String(r.order.amountTotal),
      odooPaymentState: r.order.paid ? "pagado" : "pendiente",
      odooPaymentAt: new Date(),
      verdict,
      verdictReasons: result.reasons,
      ...(created.reused ? {} : autoApproved
        ? { reviewState: null, approvedHash: hash, approvedAt: new Date(), approvedBy: "automático" }
        : { reviewState: "en_revision" }),
    }).where(eq(ordersTable.id, order.id)).returning({ reviewState: ordersTable.reviewState, approvedHash: ordersTable.approvedHash });

    // Un pedido reutilizado conserva su estado: si el taller ya lo aprobó, va al portal.
    const payable = verdict === "OK" || (row?.reviewState === "aprobado" && !!row.approvedHash);
    const portalUrl = payable ? r.portalPath ?? await portalPath(odooClient, r.order.id) : null;

    logger.info({ orderNumber: order.orderNumber, odoo: r.order.name, verdict, partner: r.partnerId, partnerCreated: r.partnerCreated, reused: created.reused }, "checkout: ok");
    res.status(200).json({
      verdict: payable ? "OK" : "REVISION",
      reasons: result.reasons,
      portalUrl,
      orderNumber: order.orderNumber,
      previewImageUrl,
      odoo: { orderId: r.order.id, orderName: r.order.name, total: r.order.amountTotal, paymentUrl: portalUrl && absolutePortal(odooClient, portalUrl), paid: false },
    });
  } catch (err) {
    if (err instanceof OdooAlreadyPaid) {
      let viewUrl: string | null = null;
      try { viewUrl = await portalPath(odooClient, err.order.id); } catch { viewUrl = null; }
      res.status(200).json({
        verdict: "OK", reasons: [], portalUrl: viewUrl,
        orderNumber: err.order.clientOrderRef ?? "", previewImageUrl: null,
        message: "Ya pagaste este pedido. Podés verlo en el link.",
        odoo: { orderId: err.order.id, orderName: err.order.name, total: err.order.amountTotal, paymentUrl: viewUrl && absolutePortal(odooClient, viewUrl), paid: true },
      });
      return;
    }
    if (err instanceof OdooProductionWriteBlocked) {
      logger.error({ err }, "checkout: freno anti-producción");
      res.status(502).json({ message: WHATSAPP_HINT, whatsapp: true });
      return;
    }
    const known = err instanceof OdooCheckoutError || err instanceof OdooError;
    logger.error({ err }, known ? "checkout: odoo error" : "checkout: unexpected error");
    res.status(502).json({ message: WHATSAPP_HINT, whatsapp: true });
  }
});

export default router;
