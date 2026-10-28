/**
 * «Comprar» con Odoo (PLAN-ODOO.md §3–§4, PROMPT-ODOO-PRUEBAS §4): crear o
 * reutilizar el pedido de venta de un diseño CS-XXXX y devolver el link de
 * pago del portal. Un diseño = un pedido (client_order_ref).
 *
 * Verificado contra el fuente de Odoo 19.0:
 *  - sale.order.state: draft | sent | sale | cancel (sale/models/sale_order.py:26)
 *  - amount_paid = suma de transacciones authorized/done (sale_order.py:673)
 *  - el pago confirma el pedido (sale/models/payment_transaction.py:108)
 *  - get_portal_url genera el access_token (portal/models/portal_mixin.py:116)
 *  - res.partner en 19 NO tiene `mobile`: solo `phone` (confirmado en staging)
 */
import { OdooClient, OdooError } from "./odoo";
import { normalizeEmail, normalizePhonePy, phoneSearchPattern } from "./phone-py";
import { logger } from "./logger";

export class OdooCheckoutError extends OdooError {}
/** La variante se agotó entre el diseño y el clic en «Comprar». */
export class OdooSoldOut extends OdooCheckoutError {}
/** El pedido de ese diseño ya está pagado. */
export class OdooAlreadyPaid extends OdooCheckoutError {
  constructor(public readonly order: OdooOrderInfo) {
    super("Este pedido ya está pagado");
  }
}

/** Compañía y sitio web donde se venden los termos (Marketplace S.A. = 1). */
const COMPANY_ID = Number(process.env.ODOO_SALE_COMPANY_ID) || 1;
const WEBSITE_ID = Number(process.env.ODOO_SALE_WEBSITE_ID) || 0;
/** Validez del presupuesto: 48 h (PLAN-ODOO §4: los abandonados no bloquean stock). */
const VALIDITY_HOURS = 48;

/** Servicios de grabado en Odoo (default_code), por plan de la landing. */
export const ENGRAVING_CODES: Record<string, string> = {
  names: "GRAB-NOMBRES",
  drawing: "GRAB-ICONO",
  logo: "GRAB-LOGO",
};
export const EXTRA_CODE = "GRAB-EXTRA";

export interface Customer { name: string; email: string; phone: string }

export interface OdooOrderInfo {
  id: number;
  name: string;
  state: "draft" | "sent" | "sale" | "cancel";
  clientOrderRef: string | null;
  amountTotal: number;
  amountPaid: number;
  paid: boolean;
}

export interface CheckoutLines {
  variantId: number;
  plan: string;
  extraTexts: number;
}

type M2O = [number, string] | false;

const ctx = { allowed_company_ids: [COMPANY_ID], lang: "es_PY" };

/** Pagado = cubrió el total con transacciones, o Odoo ya lo confirmó. */
export function isPaid(o: { state: string; amountTotal: number; amountPaid: number }): boolean {
  return o.state === "sale" || (o.amountTotal > 0 && o.amountPaid + 0.005 >= o.amountTotal);
}

function toInfo(r: { id: number; name: string; state: OdooOrderInfo["state"]; client_order_ref: string | false; amount_total: number; amount_paid: number }): OdooOrderInfo {
  const info = {
    id: r.id, name: r.name, state: r.state,
    clientOrderRef: r.client_order_ref || null,
    amountTotal: r.amount_total, amountPaid: r.amount_paid,
  };
  return { ...info, paid: isPaid(info) };
}

const ORDER_FIELDS = ["name", "state", "client_order_ref", "amount_total", "amount_paid"];

/** Lee el pedido de Odoo por id (null si no existe). Solo lectura. */
export async function readOrder(client: OdooClient, id: number): Promise<OdooOrderInfo | null> {
  const rows = await client.call<Array<Parameters<typeof toInfo>[0]>>(
    "sale.order", "search_read", [[["id", "=", id]]], { fields: ORDER_FIELDS, limit: 1, context: ctx });
  return rows[0] ? toInfo(rows[0]) : null;
}

/** Pedido de un diseño (client_order_ref = CS-XXXX), el más reciente no cancelado. */
export async function findOrderByRef(client: OdooClient, ref: string): Promise<OdooOrderInfo | null> {
  const rows = await client.call<Array<Parameters<typeof toInfo>[0]>>(
    "sale.order", "search_read",
    [[["client_order_ref", "=", ref], ["state", "!=", "cancel"]]],
    { fields: ORDER_FIELDS, limit: 1, order: "id desc", context: ctx });
  return rows[0] ? toInfo(rows[0]) : null;
}

/** Stock y precio actuales de la variante (PLAN-ODOO §4: se vuelve a consultar al comprar). */
export async function checkVariant(client: OdooClient, variantId: number): Promise<{ id: number; name: string; price: number; available: number }> {
  const rows = await client.call<Array<{ id: number; display_name: string; lst_price: number; free_qty?: number; qty_available?: number; is_storable?: boolean; sale_ok: boolean; active: boolean }>>(
    "product.product", "search_read", [[["id", "=", variantId]]],
    { fields: ["display_name", "lst_price", "free_qty", "qty_available", "is_storable", "sale_ok", "active"], limit: 1, context: ctx });
  const v = rows[0];
  if (!v || !v.active || !v.sale_ok) throw new OdooSoldOut("Ese producto ya no está a la venta");
  const available = v.free_qty ?? v.qty_available ?? 0;
  if (v.is_storable !== false && available <= 0) throw new OdooSoldOut("Ese color se agotó mientras diseñabas");
  return { id: v.id, name: v.display_name, price: v.lst_price, available };
}

/** Ids de los servicios de grabado por default_code (los crea scripts/odoo-setup.mjs). */
export async function serviceIds(client: OdooClient, codes: string[]): Promise<Record<string, number>> {
  const rows = await client.call<Array<{ id: number; default_code: string }>>(
    "product.product", "search_read", [[["default_code", "in", codes], ["sale_ok", "=", true]]],
    { fields: ["default_code"], context: ctx });
  const out: Record<string, number> = {};
  for (const r of rows) if (!(r.default_code in out)) out[r.default_code] = r.id;
  for (const c of codes) if (!(c in out)) throw new OdooCheckoutError(`Falta el servicio ${c} en Odoo (correr scripts/odoo-setup.mjs)`);
  return out;
}

/**
 * Busca o crea el contacto (PROMPT §4.3). El portal del pedido es público
 * (link con access_token) y muestra nombre, dirección, teléfono y email del
 * contacto: por eso solo se reutiliza uno existente si coinciden el email
 * normalizado Y el teléfono normalizado. Si coincide uno solo, se crea un
 * contacto nuevo con lo que escribió el cliente (quien conozca el email o el
 * celular de otro no ve sus datos) y se deja una nota interna para revisar.
 * Nunca fusiona ni modifica contactos existentes.
 */
export async function findOrCreatePartner(client: OdooClient, c: Customer): Promise<{ id: number; created: boolean; note: string | null }> {
  const fields = ["name", "email", "phone", "active", "write_date"];
  type P = { id: number; name: string; email: string | false; phone: string | false };

  const byEmail = await client.call<P[]>("res.partner", "search_read",
    [[["email", "=ilike", c.email]]], { fields, order: "write_date desc, id desc", limit: 20, context: ctx });
  const both = byEmail.filter(p => normalizePhonePy(p.phone || "") === c.phone);
  if (both.length) {
    if (both.length > 1) logger.info({ email: c.email, ids: both.map(p => p.id) }, "checkout: varios contactos con ese email y teléfono; se usa el más reciente");
    return { id: both[0].id, created: false, note: null };
  }

  const byPhone = await client.call<P[]>("res.partner", "search_read",
    [[["phone", "ilike", phoneSearchPattern(c.phone)]]], { fields, order: "write_date desc, id desc", limit: 50, context: ctx });
  const samePhone = byPhone.filter(p => normalizePhonePy(p.phone || "") === c.phone);

  const id = await client.call<number>("res.partner", "create", [{
    name: c.name, email: c.email, phone: c.phone, company_id: false, type: "contact",
  }], { context: ctx });

  const similar = [
    byEmail.length ? `con el mismo email: ${byEmail.map(p => `#${p.id} ${p.name}`).join(", ")}` : null,
    samePhone.length ? `con el mismo teléfono: ${samePhone.map(p => `#${p.id} ${p.name}`).join(", ")}` : null,
  ].filter(Boolean);
  const note = similar.length
    ? `Contacto nuevo #${id}: ya había contactos ${similar.join("; ")}, pero no coincidían email y teléfono a la vez. Revisar si hay que fusionarlos.`
    : null;
  return { id, created: true, note };
}

const esc = (s: string) => s.replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch]!));

export interface CreateOrderInput {
  ref: string;
  partnerId: number;
  lines: CheckoutLines;
  previewImageUrl: string | null;
  adminUrl: string;
  designSummary: string;
  extraNote: string | null;
}

/**
 * Nota interna en el chatter del pedido (subtipo «Nota»: no se manda al
 * cliente ni aparece en el portal). Si falla, el pedido sigue: solo se avisa
 * en el log, porque el link del taller también está en /admin.
 */
async function postInternalNote(client: OdooClient, orderId: number, lines: Array<string | null>): Promise<void> {
  const items = lines.filter((l): l is string => !!l);
  if (!items.length) return;
  const html = items.map(l => `<p>${esc(l).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`).join("");
  const post = (body: string, extra: Record<string, unknown>) => client.call<number>("sale.order", "message_post", [[orderId]],
    { body, message_type: "comment", subtype_xmlid: "mail.mt_note", context: ctx, ...extra });
  try {
    // body_is_html (Odoo 18+): sin él, un body por RPC se escapa como texto.
    await post(html, { body_is_html: true });
  } catch (err) {
    try {
      await post(items.join("\n"), {});
    } catch (err2) {
      logger.warn({ orderId, err: String(err), err2: String(err2) }, "checkout: no se pudo dejar la nota interna en Odoo");
    }
  }
}

/** Crea el pedido de venta (presupuesto) con la variante y el grabado. */
export async function createOrder(client: OdooClient, input: CreateOrderInput): Promise<OdooOrderInfo> {
  const code = ENGRAVING_CODES[input.lines.plan];
  if (!code) throw new OdooCheckoutError(`Plan de grabado desconocido: ${input.lines.plan}`);
  const codes = input.lines.extraTexts > 0 ? [code, EXTRA_CODE] : [code];
  const ids = await serviceIds(client, codes);

  const orderLines: unknown[] = [
    [0, 0, { product_id: input.lines.variantId, product_uom_qty: 1 }],
    [0, 0, { product_id: ids[code], product_uom_qty: 1 }],
  ];
  if (input.lines.extraTexts > 0) orderLines.push([0, 0, { product_id: ids[EXTRA_CODE], product_uom_qty: input.lines.extraTexts }]);

  const validity = new Date(Date.now() + VALIDITY_HOURS * 3600_000).toISOString().slice(0, 10);
  // `note` sale en el portal y en el PDF del cliente: solo el diseño. Lo
  // interno (imagen, taller, avisos del contacto) va a una nota del chatter.
  const note = `<p><b>Creativa Studio · diseño ${esc(input.ref)}</b></p><p>${esc(input.designSummary)}</p>`;

  const vals: Record<string, unknown> = {
    partner_id: input.partnerId,
    company_id: COMPANY_ID,
    client_order_ref: input.ref,
    validity_date: validity,
    // Sin esto el portal no muestra «Pagar»: _has_to_be_paid exige
    // require_payment (sale/models/sale_order.py:1915). 100 % por adelantado;
    // sin firma online (el diseño se confirma por WhatsApp).
    require_payment: true,
    prepayment_percent: 1.0,
    require_signature: false,
    origin: "Creativa Studio",
    note,
    order_line: orderLines,
  };
  if (WEBSITE_ID) vals.website_id = WEBSITE_ID;

  const id = await client.call<number>("sale.order", "create", [vals], { context: ctx });
  await postInternalNote(client, id, [
    input.previewImageUrl ? `Imagen del diseño: ${input.previewImageUrl}` : null,
    `Taller: ${input.adminUrl}`,
    input.extraNote,
  ]);
  const info = await readOrder(client, id);
  if (!info) throw new OdooCheckoutError("Odoo creó el pedido pero no se pudo releer");
  return info;
}

/** URL absoluta del portal del pedido (genera el access_token si no existe). */
export async function portalUrl(client: OdooClient, orderId: number): Promise<string> {
  const rel = await client.call<string>("sale.order", "get_portal_url", [[orderId]], { context: ctx });
  const base = (process.env.ODOO_PORTAL_BASE_URL?.trim() || client.baseUrl).replace(/\/+$/, "");
  return rel.startsWith("http") ? rel : `${base}${rel}`;
}

/**
 * Flujo completo de «Comprar» (PROMPT §4.2–4.5). Lanza OdooSoldOut,
 * OdooAlreadyPaid u OdooError. Idempotente por `ref`.
 */
export async function checkout(client: OdooClient, args: {
  ref: string; customer: Customer; lines: CheckoutLines;
  previewImageUrl: string | null; adminUrl: string; designSummary: string;
}): Promise<{ order: OdooOrderInfo; paymentUrl: string; partnerId: number; partnerCreated: boolean }> {
  // 2. Stock y precio de nuevo. Si se agotó: nada se crea.
  await checkVariant(client, args.lines.variantId);
  // 3. Contacto.
  const partner = await findOrCreatePartner(client, args.customer);
  // 4. Un diseño = un pedido.
  let order = await findOrderByRef(client, args.ref);
  if (order?.paid) throw new OdooAlreadyPaid(order);
  if (!order) {
    order = await createOrder(client, { ...args, partnerId: partner.id, extraNote: partner.note });
  }
  // 5. Link de pago.
  const paymentUrl = await portalUrl(client, order.id);
  return { order, paymentUrl, partnerId: partner.id, partnerCreated: partner.created };
}
