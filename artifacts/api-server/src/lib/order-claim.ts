/**
 * ¿De quién es este presupuesto de Odoo? (incidente del 2026-11-11)
 *
 * El número CS-XXXX sale de la base de cada entorno (`orders_number_seq`), y
 * varias bases pueden escribir en el mismo Odoo (la base de pruebas, un
 * Deployment apuntado a staging…). Buscar el `sale.order` solo por
 * `client_order_ref` devolvió el presupuesto de OTRO cliente: CS-0021 del
 * Deployment encontró S00221 (= CS-0021 de la base de pruebas) y le mandó su
 * portal.
 *
 * Regla: un presupuesto es de este pedido solo si
 *  - su id es el `odoo_order_id` guardado en la fila, o
 *  - su `origin` lleva la marca de ESTE pedido: un token aleatorio que se
 *    guarda en `designState.__odooClaim` antes de crear el presupuesto (cubre
 *    el caso de que Odoo lo cree y la fila no llegue a guardar el id).
 * El hash del diseño NO sirve de identidad: dos clientes con el mismo diseño
 * (mismo termo, mismo texto) tienen el mismo hash.
 *
 * Con el mismo `client_order_ref` y un presupuesto ajeno en Odoo, el checkout
 * nunca lo reutiliza: lanza OrderRefCollision (la ruta le da otro número al
 * pedido o falla). Sin dependencias: se prueba con `node --test`.
 */

export interface ClaimOrder {
  id: number;
  name: string;
  clientOrderRef: string | null;
  state: string;
  origin: string | null;
}

/** `origin` de los presupuestos creados por la landing (Odoo: «Documento origen»). */
export const ORIGIN_PREFIX = "Creativa Studio";
export const originFor = (claim: string): string => `${ORIGIN_PREFIX} · ${claim}`;

/** Token del pedido: 16 hex aleatorios (no se adivina ni se repite entre entornos). */
export const CLAIM_RE = /^[0-9a-f]{16}$/;
export function newClaim(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Token guardado en el designState de la fila, si es válido. */
export function claimOf(designState: unknown): string | null {
  const c = (designState as Record<string, unknown> | null | undefined)?.__odooClaim;
  return typeof c === "string" && CLAIM_RE.test(c) ? c : null;
}

/** ¿El presupuesto es de este pedido? (mismo ref Y id guardado o marca propia). */
export function isOwnOrder(o: ClaimOrder, ref: string, claim: string | null, odooOrderId: number | null): boolean {
  if (o.clientOrderRef !== ref) return false;
  if (odooOrderId != null && o.id === odooOrderId) return true;
  return !!claim && o.origin === originFor(claim);
}

/**
 * Aviso de pago: ¿el presupuesto `o` es el de la fila? Con id guardado, solo
 * ese id (nunca se adopta otro presupuesto con el mismo ref). Sin id guardado,
 * solo el que lleva la marca de la fila; sin marca, ninguno.
 */
export function webhookOwns(row: { odooOrderId: number | null; designState: unknown }, o: ClaimOrder, ref: string): boolean {
  if (row.odooOrderId != null) return row.odooOrderId === o.id && o.clientOrderRef === ref;
  return isOwnOrder(o, ref, claimOf(row.designState), null);
}

export class OrderRefCollision extends Error {
  constructor(readonly ref: string, readonly foreign: Array<Pick<ClaimOrder, "id" | "name">>) {
    super(`${ref} ya existe en Odoo para otro pedido (${foreign.map(f => f.name).join(", ")})`);
  }
}

export interface OrderLookup {
  byId(id: number): Promise<ClaimOrder | null>;
  /** Todos los presupuestos con ese client_order_ref (cualquier estado), el más nuevo primero. */
  byRef(ref: string): Promise<ClaimOrder[]>;
}

/**
 * Presupuesto a reutilizar para este pedido, o `create` si hay que crearlo.
 * Lanza OrderRefCollision si en Odoo hay un presupuesto AJENO con el mismo
 * ref (aunque esté cancelado): nunca se devuelve el de otro cliente, y
 * tampoco se crea un segundo presupuesto con el mismo ref.
 */
export async function resolveOrder(
  lookup: OrderLookup,
  a: { ref: string; odooOrderId: number | null; claim: string | null },
): Promise<{ kind: "reuse"; order: ClaimOrder } | { kind: "create" }> {
  if (a.odooOrderId != null) {
    const saved = await lookup.byId(a.odooOrderId);
    if (saved && saved.clientOrderRef === a.ref && saved.state !== "cancel") return { kind: "reuse", order: saved };
  }
  const same = await lookup.byRef(a.ref);
  const foreign = same.filter(o => !isOwnOrder(o, a.ref, a.claim, a.odooOrderId));
  if (foreign.length) throw new OrderRefCollision(a.ref, foreign.map(({ id, name }) => ({ id, name })));
  const live = same.find(o => o.state !== "cancel");
  return live ? { kind: "reuse", order: live } : { kind: "create" };
}

/** CS más alto entre refs de Odoo ("CS-0029" → 29); 0 si no hay. */
export function maxCsNumber(refs: Array<string | null | false | undefined>): number {
  let max = 0;
  for (const r of refs) {
    const m = typeof r === "string" ? /^CS-(\d{1,9})$/.exec(r.trim()) : null;
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}
