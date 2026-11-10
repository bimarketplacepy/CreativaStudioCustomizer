/**
 * «Comprar» con Odoo (PLAN-ODOO.md §3–§4, PROMPT-ODOO-PRUEBAS §4): crear o
 * reutilizar el pedido de venta de un diseño CS-XXXX y devolver el link de
 * pago del portal. Un diseño = un pedido (client_order_ref).
 *
 * Verificado contra el fuente de Odoo 19.0:
 *  - sale.order.state: draft | sent | sale | cancel (sale/models/sale_order.py:26)
 *  - amount_paid = suma de transacciones authorized/done (sale_order.py:673):
 *    NO se usa para «pagado»; se suman solo las transacciones done (payment-state.ts)
 *  - el pago confirma el pedido (sale/models/payment_transaction.py:108)
 *  - get_portal_url genera el access_token (portal/models/portal_mixin.py:116)
 *  - res.partner en 19 NO tiene `mobile`: solo `phone` (confirmado en staging)
 */
import { OdooClient, OdooError } from "./odoo";
import { normalizeEmail, normalizePhonePy, phoneSearchPattern } from "./phone-py";
import { logger } from "./logger";
import { doneAmount, isPaid } from "./payment-state";
import type { QuoteLine } from "./quote-rules";

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

/** Impresión a color (PROMPT-ODOO-TIENDA §1.4). Hoy sin precio en Odoo: se cotiza. */
export const COLOR_CODES = {
  small: "IMP-COLOR-CHICO",
  front: "IMP-COLOR-FRENTE",
  wrap: "IMP-COLOR-360",
} as const;

/** Servicio de un diseño de artista: DISENO-ARTISTA-<ID> (ej. DISENO-ARTISTA-AOPY-NAVIDAD-TAZA). */
export const artistCode = (designId: string) => `DISENO-ARTISTA-${designId.toUpperCase()}`;

export interface Customer { name: string; email: string; phone: string }

export interface OdooOrderInfo {
  id: number;
  name: string;
  state: "draft" | "sent" | "sale" | "cancel";
  clientOrderRef: string | null;
  amountTotal: number;
  /** Capturado: solo transacciones de pago en estado "done" (payment-state.ts). */
  amountDone: number;
  /** Pago real completo: done ≥ total y total > 0. Nunca por state=sale ni amount_paid. */
  paid: boolean;
}

export interface CheckoutLines {
  /** Variante de la tienda; null = pieza genérica o del cliente (la agrega el taller). */
  variantId: number | null;
  technique: "laser" | "color";
  plan: string;
  extraTexts: number;
  /** Servicio de impresión a color (COLOR_CODES), solo con technique "color". */
  colorCode: string | null;
  /** Servicio del diseño de artista (artistCode). */
  artistCode: string | null;
}

/** Una línea del presupuesto armada por el servidor, con el precio de Odoo. */
export interface PlannedLine {
  label: string;
  /** product.product; null = nota «a cotizar» (no existe el servicio o no tiene precio). */
  productId: number | null;
  qty: number;
  price: number | null;
}

export interface PlannedOrder {
  lines: PlannedLine[];
  /** Nombres de las líneas sin precio en Odoo (el veredicto pasa a REVISION). */
  unpriced: string[];
  /** La variante, releída en Odoo (null sin variante). */
  piece: VariantState | null;
}

export interface VariantState {
  id: number;
  name: string;
  exists: boolean;
  inStock: boolean;
  price: number | null;
}

type M2O = [number, string] | false;

const ctx = { allowed_company_ids: [COMPANY_ID], lang: "es_PY" };

type OrderRow = { id: number; name: string; state: OdooOrderInfo["state"]; client_order_ref: string | false; amount_total: number; transaction_ids: number[] };

/** Arma la info del pedido sumando solo lo capturado (transacciones done). Solo lectura. */
async function toInfo(client: OdooClient, r: OrderRow): Promise<OdooOrderInfo> {
  const txs = r.transaction_ids?.length
    ? await client.call<Array<{ state: string; amount: number }>>(
      "payment.transaction", "read", [r.transaction_ids, ["state", "amount"]], { context: ctx })
    : [];
  const amountDone = doneAmount(txs);
  return {
    id: r.id, name: r.name, state: r.state,
    clientOrderRef: r.client_order_ref || null,
    amountTotal: r.amount_total, amountDone,
    paid: isPaid({ amountTotal: r.amount_total, amountDone }),
  };
}

const ORDER_FIELDS = ["name", "state", "client_order_ref", "amount_total", "transaction_ids"];

/** Lee el pedido de Odoo por id (null si no existe). Solo lectura. */
export async function readOrder(client: OdooClient, id: number): Promise<OdooOrderInfo | null> {
  const rows = await client.call<OrderRow[]>(
    "sale.order", "search_read", [[["id", "=", id]]], { fields: ORDER_FIELDS, limit: 1, context: ctx });
  return rows[0] ? toInfo(client, rows[0]) : null;
}

/** Pedido de un diseño (client_order_ref = CS-XXXX), el más reciente no cancelado. */
export async function findOrderByRef(client: OdooClient, ref: string): Promise<OdooOrderInfo | null> {
  const rows = await client.call<OrderRow[]>(
    "sale.order", "search_read",
    [[["client_order_ref", "=", ref], ["state", "!=", "cancel"]]],
    { fields: ORDER_FIELDS, limit: 1, order: "id desc", context: ctx });
  return rows[0] ? toInfo(client, rows[0]) : null;
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

/**
 * Estado de la variante en Odoo, sin lanzar: para el veredicto de factibilidad
 * (variante inexistente o agotada → IMPOSIBLE). Solo lectura.
 */
export async function readVariant(client: OdooClient, variantId: number): Promise<VariantState> {
  try {
    const v = await checkVariant(client, variantId);
    return { id: v.id, name: v.name, exists: true, inStock: true, price: v.price > 0 ? v.price : null };
  } catch (err) {
    if (!(err instanceof OdooSoldOut)) throw err;
    const rows = await client.call<Array<{ id: number; display_name: string; active: boolean; sale_ok: boolean }>>(
      "product.product", "search_read", [[["id", "=", variantId]]],
      { fields: ["display_name", "active", "sale_ok"], limit: 1, context: ctx });
    const r = rows[0];
    const exists = !!r && r.active && r.sale_ok;
    return { id: variantId, name: r?.display_name ?? "", exists, inStock: false, price: null };
  }
}

/** Servicios por default_code con su precio de lista. Los que no existen no vienen. Solo lectura. */
export async function readServices(client: OdooClient, codes: string[]): Promise<Record<string, { id: number; price: number }>> {
  if (!codes.length) return {};
  const rows = await client.call<Array<{ id: number; default_code: string; lst_price: number }>>(
    "product.product", "search_read", [[["default_code", "in", codes], ["sale_ok", "=", true]]],
    { fields: ["default_code", "lst_price"], context: ctx });
  const out: Record<string, { id: number; price: number }> = {};
  for (const r of rows) if (!(r.default_code in out)) out[r.default_code] = { id: r.id, price: r.lst_price };
  return out;
}

/**
 * Arma las líneas del presupuesto con los precios de Odoo (PROMPT-ODOO-TIENDA
 * §1.4). Nunca usa precios del navegador. Solo lee: no crea nada.
 *  - Grabado láser: GRAB-* es obligatorio (sin él, error: correr odoo-setup).
 *  - Impresión a color y diseño de artista: si el servicio falta o vale 0, la
 *    línea queda como nota «a cotizar» y el veredicto pasa a REVISION.
 */
export async function planOrder(client: OdooClient, lines: CheckoutLines): Promise<PlannedOrder> {
  const piece = lines.variantId !== null ? await readVariant(client, lines.variantId) : null;
  const engraving = lines.technique === "laser" ? ENGRAVING_CODES[lines.plan] : null;
  if (lines.technique === "laser" && !engraving) throw new OdooCheckoutError(`Plan de grabado desconocido: ${lines.plan}`);
  const codes = [engraving, lines.extraTexts > 0 ? EXTRA_CODE : null, lines.colorCode, lines.artistCode]
    .filter((c): c is string => !!c);
  const services = await readServices(client, codes);

  const out: PlannedLine[] = [];
  const unpriced: string[] = [];
  if (piece) {
    out.push({ label: piece.name, productId: piece.id, qty: 1, price: piece.price });
    if (piece.price === null) unpriced.push("Pieza");
  } else {
    unpriced.push("Pieza");
  }
  const required = (code: string, label: string, qty = 1) => {
    const s = services[code];
    if (!s) throw new OdooCheckoutError(`Falta el servicio ${code} en Odoo (correr scripts/odoo-setup.mjs)`);
    out.push({ label, productId: s.id, qty, price: s.price });
  };
  const optional = (code: string, label: string) => {
    const s = services[code];
    if (s && s.price > 0) {
      out.push({ label, productId: s.id, qty: 1, price: s.price });
    } else {
      out.push({ label: `${label}: a cotizar por el taller`, productId: null, qty: 1, price: null });
      unpriced.push(label);
    }
  };
  if (engraving) required(engraving, "Grabado láser");
  if (lines.extraTexts > 0) required(EXTRA_CODE, "Escritura extra", lines.extraTexts);
  if (lines.colorCode) optional(lines.colorCode, "Impresión a color");
  if (lines.artistCode) optional(lines.artistCode, "Diseño de artista");
  return { lines: out, unpriced, piece };
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
  plan: PlannedOrder;
  previewImageUrl: string | null;
  /** Prueba automática: la captura del 3D (JPEG/PNG en base64, sin el prefijo data:). */
  proof: { name: string; mimetype: string; base64: string } | null;
  adminUrl: string;
  designSummary: string;
  extraNote: string | null;
  /** Veredicto y motivos (nota interna para el taller). */
  verdictNote: string | null;
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

/** Crea el presupuesto con las líneas armadas por el servidor. */
export async function createOrder(client: OdooClient, input: CreateOrderInput): Promise<OdooOrderInfo> {
  const orderLines: unknown[] = input.plan.lines.map(l => l.productId !== null
    ? [0, 0, { product_id: l.productId, product_uom_qty: l.qty }]
    // Sin servicio o sin precio: nota visible («a cotizar»). El taller agrega
    // la línea con su precio antes de enviar el presupuesto.
    : [0, 0, { display_type: "line_note", name: l.label }]);

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
    // require_payment (sale/models/sale_order.py:1915). 100 % por adelantado.
    require_payment: true,
    prepayment_percent: 1.0,
    // Firma obligatoria: el cliente acepta la prueba («Acepto que mi pieza se
    // produzca así») antes de pagar (PROMPT-ODOO-TIENDA §1.3).
    require_signature: true,
    origin: "Creativa Studio",
    note,
    order_line: orderLines,
  };
  if (WEBSITE_ID) vals.website_id = WEBSITE_ID;

  const id = await client.call<number>("sale.order", "create", [vals], { context: ctx });
  if (input.proof) await attachProof(client, id, input.proof);
  await postInternalNote(client, id, [
    input.previewImageUrl ? `Imagen del diseño: ${input.previewImageUrl}` : null,
    `Taller: ${input.adminUrl}`,
    input.verdictNote,
    input.extraNote,
  ]);
  const info = await readOrder(client, id);
  if (!info) throw new OdooCheckoutError("Odoo creó el pedido pero no se pudo releer");
  return info;
}

/**
 * Prueba visual adjunta al presupuesto (ir.attachment del sale.order). Si
 * falla, el pedido sigue (la imagen también está en /admin y en la nota).
 */
export async function attachProof(client: OdooClient, orderId: number, proof: NonNullable<CreateOrderInput["proof"]>): Promise<number | null> {
  try {
    return await client.call<number>("ir.attachment", "create", [{
      name: proof.name, type: "binary", datas: proof.base64, mimetype: proof.mimetype,
      res_model: "sale.order", res_id: orderId,
    }], { context: ctx });
  } catch (err) {
    logger.warn({ orderId, err: String(err) }, "checkout: no se pudo adjuntar la prueba");
    return null;
  }
}

/**
 * Deja la huella de la versión aprobada en la nota del presupuesto (la ve el
 * cliente en el portal y el PDF): el taller produce ESA versión.
 */
export async function stampApprovedVersion(client: OdooClient, orderId: number, hash: string, who: string): Promise<void> {
  const rows = await client.call<Array<{ note: string | false }>>(
    "sale.order", "search_read", [[["id", "=", orderId]]], { fields: ["note"], limit: 1, context: ctx });
  const current = rows[0]?.note || "";
  if (current.includes(hash)) return;
  const stamp = `<p><small>Versión aprobada (${esc(who)}): sha256 ${hash}</small></p>`;
  await client.call<boolean>("sale.order", "write", [[orderId], { note: `${current}${stamp}` }], { context: ctx });
}

/**
 * Ruta RELATIVA del portal (/my/orders/<id>?access_token=…). Es la que viaja
 * en `cs:checkout`: el módulo website_creativa_studio exige que empiece con
 * /my/orders/ y navega dentro de su propio dominio.
 */
export async function portalPath(client: OdooClient, orderId: number): Promise<string> {
  const rel = await client.call<string>("sale.order", "get_portal_url", [[orderId]], { context: ctx });
  const path = rel.startsWith("http") ? new URL(rel).pathname + new URL(rel).search : rel;
  if (!path.startsWith("/my/orders/")) throw new OdooCheckoutError(`get_portal_url devolvió una ruta inesperada: ${path}`);
  return path;
}

/** La ruta del portal con el dominio de la tienda (landing fuera del iframe). */
export function absolutePortal(client: OdooClient, path: string): string {
  const base = (process.env.ODOO_PORTAL_BASE_URL?.trim() || client.baseUrl).replace(/\/+$/, "");
  return `${base}${path}`;
}

/** URL absoluta del portal del pedido (genera el access_token si no existe). */
export async function portalUrl(client: OdooClient, orderId: number): Promise<string> {
  return absolutePortal(client, await portalPath(client, orderId));
}

/** Líneas del presupuesto con el tipo de producto (para quote-rules.ts). Solo lectura. */
export async function readQuoteLines(client: OdooClient, orderId: number): Promise<QuoteLine[]> {
  const lines = await client.call<Array<{ display_type: string | false; product_id: M2O; price_unit: number; product_uom_qty: number }>>(
    "sale.order.line", "search_read", [[["order_id", "=", orderId]]],
    { fields: ["display_type", "product_id", "price_unit", "product_uom_qty"], context: ctx });
  const ids = [...new Set(lines.map(l => (l.product_id ? l.product_id[0] : null)).filter((x): x is number => x !== null))];
  const types = new Map<number, string>();
  if (ids.length) {
    const prods = await client.call<Array<{ id: number; type: string }>>("product.product", "read", [ids, ["type"]], { context: ctx });
    for (const pr of prods) types.set(pr.id, pr.type);
  }
  return lines.map(l => ({
    displayType: l.display_type || false,
    productType: l.product_id ? types.get(l.product_id[0]) ?? null : null,
    priceUnit: l.price_unit,
    qty: l.product_uom_qty,
  }));
}

/** Firma del cliente en el portal (signed_on / signed_by). Solo lectura. */
export async function readSignature(client: OdooClient, orderId: number): Promise<{ signed: boolean; signedBy: string | null; signedOn: string | null }> {
  const rows = await client.call<Array<{ signed_on: string | false; signed_by: string | false }>>(
    "sale.order", "search_read", [[["id", "=", orderId]]], { fields: ["signed_on", "signed_by"], limit: 1, context: ctx });
  const r = rows[0];
  return { signed: !!r?.signed_on, signedBy: r?.signed_by || null, signedOn: r?.signed_on || null };
}

/**
 * Manda el presupuesto al cliente con la plantilla estándar de Odoo
 * (sale.email_template_edi_sale) y lo marca como enviado, como el botón
 * «Enviar por email». Lo usa la aprobación del taller.
 */
export async function sendQuotation(client: OdooClient, orderId: number): Promise<void> {
  const rows = await client.call<Array<{ res_id: number }>>("ir.model.data", "search_read",
    [[["module", "=", "sale"], ["name", "=", "email_template_edi_sale"], ["model", "=", "mail.template"]]],
    { fields: ["res_id"], limit: 1, context: ctx });
  const templateId = rows[0]?.res_id;
  if (!templateId) throw new OdooCheckoutError("No se encontró la plantilla de email del presupuesto (sale.email_template_edi_sale)");
  await client.call<number>("mail.template", "send_mail", [templateId, orderId], { force_send: true, context: ctx });
  await client.call<boolean>("sale.order", "write", [[orderId], { state: "sent" }], { context: ctx });
}

/** Cancela el presupuesto con el motivo en el chatter (rechazo del taller). */
export async function cancelQuotation(client: OdooClient, orderId: number, reason: string): Promise<void> {
  await postInternalNote(client, orderId, [`Pedido de cambios (taller): ${reason}`]);
  await client.call("sale.order", "action_cancel", [[orderId]], { context: ctx });
}

/**
 * Presupuesto de un diseño (PROMPT-ODOO-TIENDA §3): contacto, un diseño = un
 * pedido (client_order_ref) y, con veredicto OK, la ruta del portal para
 * firmar y pagar. Con REVISION el presupuesto queda sin enviar. Lanza
 * OdooAlreadyPaid u OdooError. Idempotente por `ref`.
 */
export async function checkout(client: OdooClient, args: {
  ref: string; customer: Customer; plan: PlannedOrder; verdict: "OK" | "REVISION";
  previewImageUrl: string | null; proof: CreateOrderInput["proof"]; adminUrl: string; designSummary: string;
  verdictNote: string | null;
}): Promise<{ order: OdooOrderInfo; portalPath: string | null; partnerId: number; partnerCreated: boolean; created: boolean }> {
  const partner = await findOrCreatePartner(client, args.customer);
  let order = await findOrderByRef(client, args.ref);
  if (order?.paid) throw new OdooAlreadyPaid(order);
  const created = !order;
  if (!order) {
    order = await createOrder(client, { ...args, partnerId: partner.id, extraNote: partner.note });
  }
  const path = args.verdict === "OK" ? await portalPath(client, order.id) : null;
  return { order, portalPath: path, partnerId: partner.id, partnerCreated: partner.created, created };
}
