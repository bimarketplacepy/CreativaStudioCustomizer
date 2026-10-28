// POST /api/checkout — «Comprar»: crea o reutiliza el pedido CS-XXXX de la
// landing y su pedido de venta en Odoo, y devuelve el link de pago del portal
// (PROMPT-ODOO-PRUEBAS §4). Orden de pasos y respuestas:
//   400 datos inválidos (teléfono o email) — sin llamar a Odoo
//   409 variante agotada — sin crear nada en Odoo
//   200 { ..., odoo: { paid: true } } — «ya pagaste este pedido» con el link
//   502 Odoo no responde o no está configurado — el cliente sigue por WhatsApp
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, ordersTable } from "@workspace/db";
import { CreateOrderBody } from "@workspace/api-zod";
import { rateLimit } from "../middlewares/rate-limit";
import { OdooClient, OdooError, OdooProductionWriteBlocked, odooConfig } from "../lib/odoo";
import { OdooAlreadyPaid, OdooCheckoutError, OdooSoldOut, checkout as odooCheckout, portalUrl } from "../lib/odoo-checkout";
import { normalizeEmail, normalizePhonePy } from "../lib/phone-py";
import { createOrReuseOrder, imageUrlFor, originFrom } from "./orders";
import { logger } from "../lib/logger";

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

/** Datos del diseño que Odoo necesita para armar las líneas. */
function linesFrom(designState: Record<string, unknown>) {
  const variantId = typeof designState.odooVariantId === "number" ? designState.odooVariantId : null;
  const plan = typeof designState.plan === "string" ? designState.plan : "names";
  const extra = (designState.extraEngraving ?? null) as { lid?: unknown; base?: unknown } | null;
  const extraTexts =
    (typeof designState.text2 === "string" && designState.text2.trim() ? 1 : 0) +
    (extra && typeof extra.lid === "string" ? 1 : 0) +
    (extra && typeof extra.base === "string" ? 1 : 0);
  return { variantId, plan, extraTexts, technique: designState.technique, ownProduct: designState.ownProduct === true };
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

  const lines = linesFrom(body.designState as Record<string, unknown>);
  if (lines.ownProduct || lines.variantId === null || lines.technique !== "laser") {
    res.status(400).json({ message: "Por ahora solo se compra online el grabado láser sobre piezas de la tienda. El resto, por WhatsApp." });
    return;
  }

  const odooClient = odoo();
  if (!odooClient) {
    res.status(502).json({ message: WHATSAPP_HINT, whatsapp: true });
    return;
  }

  // 1. Pedido CS-XXXX de la landing (mismo requestId → mismo pedido).
  const created = await createOrReuseOrder(body);
  if (!created.ok) {
    res.status(created.status).json({ message: created.message });
    return;
  }
  const order = created.order;
  const origin = originFrom(req);
  const previewImageUrl = imageUrlFor(req, order);
  const adminUrl = `${origin}/admin?pedido=${order.orderNumber}`;
  const designSummary = [order.product, order.color, order.technique, order.customText ? `«${order.customText}»` : null, order.iconName ? `ícono ${order.iconName}` : null]
    .filter(Boolean).join(" · ");

  // 2–5. Odoo: stock, contacto, pedido, link de pago.
  try {
    const result = await odooCheckout(odooClient, {
      ref: order.orderNumber, customer,
      lines: { variantId: lines.variantId, plan: lines.plan, extraTexts: lines.extraTexts },
      previewImageUrl, adminUrl, designSummary,
    });
    await db.update(ordersTable).set({
      odooOrderId: result.order.id,
      odooOrderName: result.order.name,
      odooTotal: String(result.order.amountTotal),
      odooPaymentState: result.order.paid ? "pagado" : "pendiente",
      odooPaymentAt: new Date(),
    }).where(eq(ordersTable.id, order.id));
    logger.info({ orderNumber: order.orderNumber, odoo: result.order.name, partner: result.partnerId, partnerCreated: result.partnerCreated, reused: created.reused }, "checkout: ok");
    res.status(200).json({
      orderNumber: order.orderNumber,
      previewImageUrl,
      odoo: { orderId: result.order.id, orderName: result.order.name, total: result.order.amountTotal, paymentUrl: result.paymentUrl, paid: false },
    });
  } catch (err) {
    if (err instanceof OdooAlreadyPaid) {
      await db.update(ordersTable).set({
        odooOrderId: err.order.id, odooOrderName: err.order.name, odooTotal: String(err.order.amountTotal),
        odooPaymentState: "pagado", odooPaymentAt: new Date(),
      }).where(eq(ordersTable.id, order.id));
      let viewUrl: string | null = null;
      try { viewUrl = await portalUrl(odooClient, err.order.id); } catch { viewUrl = null; }
      res.status(200).json({
        orderNumber: order.orderNumber, previewImageUrl,
        message: "Ya pagaste este pedido. Podés verlo en el link.",
        odoo: { orderId: err.order.id, orderName: err.order.name, total: err.order.amountTotal, paymentUrl: viewUrl, paid: true },
      });
      return;
    }
    if (err instanceof OdooSoldOut) {
      res.status(409).json({ message: `${err.message}. Elegí otro color o tamaño.`, soldOut: true, orderNumber: order.orderNumber });
      return;
    }
    if (err instanceof OdooProductionWriteBlocked) {
      logger.error({ err }, "checkout: freno anti-producción");
      res.status(502).json({ message: WHATSAPP_HINT, whatsapp: true });
      return;
    }
    const known = err instanceof OdooCheckoutError || err instanceof OdooError;
    logger.error({ err, orderNumber: order.orderNumber }, known ? "checkout: odoo error" : "checkout: unexpected error");
    res.status(502).json({ message: WHATSAPP_HINT, whatsapp: true, orderNumber: order.orderNumber });
  }
});

export default router;
