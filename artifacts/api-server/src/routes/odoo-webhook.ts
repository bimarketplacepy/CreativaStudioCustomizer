// POST /api/odoo/webhook?secret=… — aviso de pago desde Odoo (PROMPT §5).
// Solo de ida: la landing NUNCA escribe en Odoo como respuesta a un aviso.
//  - Secreto distinto o ausente: 404 (no revela que la ruta existe).
//  - No se confía en el cuerpo: con el id recibido se vuelve a leer el
//    pedido en Odoo. Se marca «pagado» solo si client_order_ref empieza con
//    CS- y amount_paid cubre el total (o el pedido está confirmado).
//  - Repetido: no cambia nada (idempotente).
// La acción de servidor «webhook» de Odoo 19 manda { _model, _id, _action,
// ...campos } (odoo/addons/base/models/ir_actions.py:1048).
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { OdooClient, odooConfig } from "../lib/odoo";
import { readOrder, type OdooOrderInfo } from "../lib/odoo-checkout";
import { logger } from "../lib/logger";

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

/** Aplica en la base de la landing lo que dice Odoo. Devuelve si cambió algo. */
export async function applyOdooPayment(info: OdooOrderInfo): Promise<{ changed: boolean; orderNumber: string | null; state: string }> {
  const ref = info.clientOrderRef ?? "";
  if (!ORDER_NUMBER_RE.test(ref)) return { changed: false, orderNumber: null, state: "ignorado" };
  const state = info.paid ? "pagado" : "pendiente";
  const row = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.orderNumber, ref),
    columns: { id: true, odooPaymentState: true, odooOrderId: true },
  });
  if (!row) return { changed: false, orderNumber: ref, state };
  // Idempotente: un aviso repetido con el mismo resultado no toca la fila.
  // Y un pedido ya pagado nunca vuelve a «pendiente» por un aviso rezagado.
  if (row.odooPaymentState === state || (row.odooPaymentState === "pagado" && state === "pendiente")) {
    return { changed: false, orderNumber: ref, state: row.odooPaymentState ?? state };
  }
  await db.update(ordersTable).set({
    odooOrderId: info.id, odooOrderName: info.name, odooTotal: String(info.amountTotal),
    odooPaymentState: state, odooPaymentAt: new Date(),
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
    const result = await applyOdooPayment(info);
    logger.info({ id, ...result }, "odoo webhook");
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err, id }, "odoo webhook: failed");
    res.status(502).json({ ok: false, message: "No se pudo leer el pedido en Odoo" });
  }
});

export default router;
