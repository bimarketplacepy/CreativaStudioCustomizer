// POST /api/odoo/webhook?secret=… — aviso de pago desde Odoo (PROMPT §5).
// Solo de ida: la landing NUNCA escribe en Odoo como respuesta a un aviso.
//  - Secreto distinto o ausente: 404 (no revela que la ruta existe).
//  - No se confía en el cuerpo: con el id recibido se vuelve a leer el
//    pedido en Odoo. Se marca «pagado» solo si client_order_ref empieza con
//    CS-, las transacciones de pago en estado done cubren el total (pago
//    real: ni amount_paid, que suma las autorizadas, ni state=sale) Y el
//    cliente FIRMÓ la prueba (signed_on). Pagado sin firma → «pago_sin_firma»;
//    confirmado sin pago real → «confirmado_sin_pago» (los dos: revisar en
//    /admin, no se produce). PROMPT-ODOO-TIENDA §3; reglas en payment-state.ts.
//  - Al pagar se congela la versión: si el pedido no tenía hash aprobado, se
//    guarda el del designState actual.
// Lo llama el módulo website_creativa_studio con { _model, _id } y reintenta
// cada 10 min mientras no reciba 2xx.
//  - Repetido: no cambia nada (idempotente).
// La acción de servidor «webhook» de Odoo 19 manda { _model, _id, _action,
// ...campos } (odoo/addons/base/models/ir_actions.py:1048).
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { OdooClient, odooConfig } from "../lib/odoo";
import { readOrder, readSignature, type OdooOrderInfo } from "../lib/odoo-checkout";
import { designHash } from "../lib/design-hash";
import { logger } from "../lib/logger";
import { paymentStateOf } from "../lib/payment-state";

const router: IRouter = Router();

const ORDER_NUMBER_RE = /^CS-\d{4,}$/;

let client: OdooClient | null = null;
function odoo(): OdooClient | null {
  if (client) return client;
  const cfg = odooConfig();
  if (!cfg) return null;
  client = new OdooClient(cfg);
  return client;
}

export { paymentStateOf, type PaymentState } from "../lib/payment-state";

/**
 * Aplica en la base de la landing lo que dice Odoo. Devuelve si cambió algo.
 * `signed`: el presupuesto tiene firma del cliente (readSignature).
 */
export async function applyOdooPayment(info: OdooOrderInfo, signed: boolean): Promise<{ changed: boolean; orderNumber: string | null; state: string }> {
  const ref = info.clientOrderRef ?? "";
  if (!ORDER_NUMBER_RE.test(ref)) return { changed: false, orderNumber: null, state: "ignorado" };
  const state = paymentStateOf(info, signed);
  const row = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.orderNumber, ref),
    columns: { id: true, odooPaymentState: true, odooOrderId: true, approvedHash: true, designState: true },
  });
  if (!row) return { changed: false, orderNumber: ref, state };
  // Idempotente: un aviso repetido con el mismo resultado no toca la fila.
  // Y un pedido ya pagado nunca vuelve atrás por un aviso rezagado.
  if (row.odooPaymentState === state || (row.odooPaymentState === "pagado" && state !== "pagado")) {
    return { changed: false, orderNumber: ref, state: row.odooPaymentState ?? state };
  }
  await db.update(ordersTable).set({
    odooOrderId: info.id, odooOrderName: info.name, odooTotal: String(info.amountTotal),
    odooPaymentState: state, odooPaymentAt: new Date(),
    // Pagado y firmado: esta es la versión que se produce.
    ...(state === "pagado" && !row.approvedHash
      ? { approvedHash: designHash(row.designState), approvedAt: new Date(), approvedBy: "pago firmado" }
      : {}),
  }).where(and(eq(ordersTable.id, row.id)));
  return { changed: true, orderNumber: ref, state };
}

router.post("/odoo/webhook", async (req, res) => {
  const secret = process.env.ODOO_WEBHOOK_SECRET?.trim();
  const got = typeof req.query.secret === "string" ? req.query.secret : "";
  if (!secret || !got || got !== secret) {
    res.status(404).end();
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const rawId = body._id ?? body.id;
  const id = typeof rawId === "number" ? rawId : typeof rawId === "string" && /^\d+$/.test(rawId) ? Number(rawId) : null;
  const model = typeof body._model === "string" ? body._model : "sale.order";
  if (id === null || model !== "sale.order") {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }
  const odooClient = odoo();
  if (!odooClient) {
    res.status(503).json({ ok: false, message: "Odoo no configurado" });
    return;
  }
  try {
    const info = await readOrder(odooClient, id);
    if (!info) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }
    const signature = info.paid ? await readSignature(odooClient, id) : { signed: false };
    const result = await applyOdooPayment(info, signature.signed);
    if (result.state === "pago_sin_firma") logger.warn({ id, ...result }, "odoo webhook: pago sin firma (revisar)");
    if (result.state === "confirmado_sin_pago") logger.warn({ id, ...result }, "odoo webhook: confirmado sin pago real (revisar)");
    logger.info({ id, ...result }, "odoo webhook");
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err, id }, "odoo webhook: failed");
    res.status(502).json({ ok: false, message: "No se pudo leer el pedido en Odoo" });
  }
});

export default router;
