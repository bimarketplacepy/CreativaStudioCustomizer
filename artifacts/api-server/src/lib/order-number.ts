/**
 * Números CS-XXXX sin choques entre entornos (incidente del 2026-11-11).
 *
 * Cada base (la de pruebas, la del Deployment…) tiene su propia
 * `orders_number_seq`, pero todas pueden escribir en el mismo Odoo. Antes de
 * numerar un pedido que va a Odoo, la secuencia local salta por encima del CS
 * más alto que ya existe allá (con candado de Postgres: dos instancias no la
 * mueven a la vez). Lo que esto no cubre —dos entornos numerando en el mismo
 * segundo— lo frena order-claim.ts: un ref ajeno nunca se reutiliza y el
 * pedido se renumera.
 *
 * El formato visible no cambia (CS-0031) y los pedidos por WhatsApp, que no
 * van a Odoo, no consultan Odoo.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, ordersTable, type Order } from "@workspace/db";
import type { OdooClient } from "./odoo";
import { recentCsRefs } from "./odoo-checkout";
import { claimOf, maxCsNumber, newClaim } from "./order-claim";
import { withPgLock } from "./pg-lock";
import { logger } from "./logger";

const SYNC_TTL_MS = 60_000;
let lastSync = 0;

/**
 * La secuencia local queda en max(local, mayor CS de Odoo): el próximo
 * nextval() es un número que Odoo no tiene. Cada 60 s como mucho, salvo `force`.
 */
export async function syncOrderSequence(client: OdooClient, force = false): Promise<void> {
  if (!force && Date.now() - lastSync < SYNC_TTL_MS) return;
  const odooMax = maxCsNumber(await recentCsRefs(client));
  await withPgLock("orders-number-seq", async () => {
    // setval nunca baja la secuencia: greatest con el valor actual.
    await db.execute(sql`select setval('orders_number_seq', greatest(last_value, ${odooMax}::bigint), true) from orders_number_seq`);
  });
  lastSync = Date.now();
}

/** Marca del pedido para reconocer su presupuesto en Odoo (la crea si falta). */
export async function ensureClaim(order: Order): Promise<{ order: Order; claim: string }> {
  const existing = claimOf(order.designState);
  if (existing) return { order, claim: existing };
  const claim = newClaim();
  // `__` queda fuera del hash del diseño (design-hash.ts): no cambia la versión aprobada.
  const [row] = await db.update(ordersTable)
    .set({ designState: sql`${ordersTable.designState} || jsonb_build_object('__odooClaim', ${claim}::text)` })
    .where(and(eq(ordersTable.id, order.id), sql`${ordersTable.designState}->>'__odooClaim' is null`))
    .returning();
  if (row) return { order: row, claim };
  // Otra request la puso primero: usar esa.
  const fresh = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, order.id) });
  const theirs = fresh ? claimOf(fresh.designState) : null;
  if (!fresh || !theirs) throw new Error(`No se pudo marcar el pedido ${order.orderNumber}`);
  return { order: fresh, claim: theirs };
}

/**
 * Otro número para un pedido cuyo CS ya existe en Odoo para otro pedido. Solo
 * si todavía no tiene presupuesto propio (odoo_order_id vacío). El número
 * anterior queda en designState.__renumberedFrom.
 */
export async function renumberOrder(client: OdooClient, order: Order): Promise<Order> {
  await syncOrderSequence(client, true);
  const [row] = await db.update(ordersTable)
    .set({
      orderNumber: sql`'CS-' || lpad(nextval('orders_number_seq')::text, 4, '0')`,
      designState: sql`${ordersTable.designState} || jsonb_build_object('__renumberedFrom', ${order.orderNumber}::text)`,
    })
    .where(and(eq(ordersTable.id, order.id), isNull(ordersTable.odooOrderId)))
    .returning();
  if (!row) throw new Error(`El pedido ${order.orderNumber} ya tiene presupuesto: no se renumera`);
  logger.warn({ from: order.orderNumber, to: row.orderNumber }, "checkout: número ya usado en Odoo por otro pedido, renumerado");
  return row;
}
