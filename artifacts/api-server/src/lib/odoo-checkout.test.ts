// pnpm --filter @workspace/api-server test — el checkout NUNCA devuelve el
// presupuesto de otro pedido (incidente del 2026-11-11: CS-0021 del Deployment
// recibió el portal de S00221 = CS-0021 de la base de pruebas). Odoo falso en
// memoria: sin red.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkout, type PlannedOrder } from "./odoo-checkout";
import { OrderRefCollision, claimOf, isOwnOrder, maxCsNumber, newClaim, originFor, resolveOrder, type ClaimOrder } from "./order-claim";
import type { OdooClient } from "./odoo";

type Row = { id: number; name: string; state: string; client_order_ref: string | false; origin: string | false; amount_total: number; transaction_ids: number[]; partner_id: number };

/** Odoo en memoria: lo justo para checkout() (contactos, presupuestos, portal). */
function fakeOdoo(orders: Row[]) {
  const calls: string[] = [];
  let nextId = 900;
  const match = (r: Row, [f, op, v]: [string, string, unknown]) => {
    const x = (r as unknown as Record<string, unknown>)[f];
    if (op === "=") return x === v;
    if (op === "!=") return x !== v;
    if (op === "=like") return typeof x === "string" && x.startsWith(String(v).replace(/%$/, ""));
    throw new Error(`dominio no soportado: ${op}`);
  };
  const client = {
    async call(model: string, method: string, args: unknown[], kw: { fields?: string[] } = {}) {
      calls.push(`${model}.${method}`);
      if (model === "res.partner" && method === "search_read") return [];
      if (model === "res.partner" && method === "create") return 500;
      if (model === "payment.transaction") return [];
      if (model === "ir.attachment" && method === "create") return 1;
      if (model === "sale.order" && method === "search_read") {
        const domain = args[0] as [string, string, unknown][];
        return orders.filter(r => domain.every(d => match(r, d))).sort((a, b) => b.id - a.id);
      }
      if (model === "sale.order" && method === "create") {
        const v = args[0] as Record<string, unknown>;
        const id = nextId++;
        orders.push({ id, name: `S00${id}`, state: "draft", client_order_ref: v.client_order_ref as string, origin: v.origin as string, amount_total: 220_000, transaction_ids: [], partner_id: v.partner_id as number });
        return id;
      }
      if (model === "sale.order" && method === "message_post") return 1;
      if (model === "sale.order" && method === "get_portal_url") return `/my/orders/${(args[0] as number[])[0]}?access_token=tok`;
      throw new Error(`llamada no esperada: ${model}.${method}`);
    },
  };
  return { client: client as unknown as OdooClient, calls, orders };
}

/** S00221: CS-0021 de la base de pruebas, de otro cliente («Prueba Celu»), creado antes de la marca. */
const foreignS00221 = (): Row => ({ id: 221, name: "S00221", state: "draft", client_order_ref: "CS-0021", origin: "Creativa Studio", amount_total: 220_000, transaction_ids: [], partner_id: 37856 });

const plan: PlannedOrder = { lines: [{ productId: 978276, qty: 1, label: "Termo Sleek Line 710ml Aqua" }], unpriced: [], piece: null } as unknown as PlannedOrder;
const args = (over: Partial<Parameters<typeof checkout>[1]> = {}): Parameters<typeof checkout>[1] => ({
  ref: "CS-0021", claim: newClaim(), odooOrderId: null,
  customer: { name: "Cliente Prueba CS", email: "prueba.cs@example.com", phone: "+595982000000" },
  plan, verdict: "OK", previewImageUrl: null, proof: null, adminUrl: "https://x/admin", designSummary: "Termo · «PRUEBA CS»", verdictNote: null,
  ...over,
});

test("el caso del 11/11: CS-0021 ya existe en Odoo para otro pedido → no se devuelve su portal ni se crea nada", async () => {
  const odoo = fakeOdoo([foreignS00221()]);
  await assert.rejects(checkout(odoo.client, args()), (err: unknown) => {
    assert.ok(err instanceof OrderRefCollision);
    assert.deepEqual(err.foreign, [{ id: 221, name: "S00221" }]);
    return true;
  });
  assert.ok(!odoo.calls.includes("sale.order.get_portal_url"), "no pide el portal de S00221");
  assert.ok(!odoo.calls.includes("sale.order.create"), "no crea un segundo CS-0021");
  assert.ok(!odoo.calls.includes("res.partner.create"), "corta antes de crear el contacto");
});

test("tampoco si el ajeno está cancelado (no se duplica el ref)", async () => {
  const odoo = fakeOdoo([{ ...foreignS00221(), state: "cancel" }]);
  await assert.rejects(checkout(odoo.client, args()), OrderRefCollision);
});

test("un odoo_order_id guardado que no es de este ref no se reutiliza", async () => {
  const odoo = fakeOdoo([foreignS00221(), { ...foreignS00221(), id: 300, name: "S00300", client_order_ref: "CS-0099" }]);
  await assert.rejects(checkout(odoo.client, args({ odooOrderId: 300 })), OrderRefCollision);
});

test("ref libre → crea el presupuesto con la marca del pedido en origin", async () => {
  const odoo = fakeOdoo([foreignS00221()]);
  const a = args({ ref: "CS-0030" });
  const r = await checkout(odoo.client, a);
  assert.equal(r.created, true);
  assert.equal(r.order.clientOrderRef, "CS-0030");
  assert.equal(r.order.origin, originFor(a.claim));
  assert.equal(r.portalPath, `/my/orders/${r.order.id}?access_token=tok`);
});

test("reintento del MISMO pedido (doble clic, fila sin id guardado) → reutiliza el suyo por la marca", async () => {
  const odoo = fakeOdoo([]);
  const a = args({ ref: "CS-0030" });
  const first = await checkout(odoo.client, a);
  const again = await checkout(odoo.client, a);
  assert.equal(again.created, false);
  assert.equal(again.order.id, first.order.id);
  assert.equal(odoo.calls.filter(c => c === "sale.order.create").length, 1);
});

test("mismo diseño de OTRO cliente (mismo hash) en otra base: la marca es otra → choque, no reutiliza", async () => {
  const odoo = fakeOdoo([]);
  await checkout(odoo.client, args({ ref: "CS-0030" }));
  await assert.rejects(checkout(odoo.client, args({ ref: "CS-0030" })), OrderRefCollision);
});

test("con odoo_order_id guardado (pedido de antes de la marca) → reutiliza ese", async () => {
  const odoo = fakeOdoo([foreignS00221()]);
  const r = await checkout(odoo.client, args({ odooOrderId: 221 }));
  assert.equal(r.order.id, 221);
  assert.equal(r.created, false);
});

test("webhook: solo es propio el presupuesto con el id guardado o la marca", () => {
  const claim = newClaim();
  const o = (over: Partial<ClaimOrder>): ClaimOrder => ({ id: 221, name: "S00221", state: "sale", clientOrderRef: "CS-0021", origin: "Creativa Studio", ...over });
  assert.equal(isOwnOrder(o({}), "CS-0021", claim, null), false, "ajeno: mismo ref, sin id ni marca");
  assert.equal(isOwnOrder(o({}), "CS-0021", claim, 221), true, "id guardado");
  assert.equal(isOwnOrder(o({ id: 900, origin: originFor(claim) }), "CS-0021", claim, null), true, "marca propia");
  assert.equal(isOwnOrder(o({ id: 900, origin: originFor(claim) }), "CS-0022", claim, null), false, "otro ref");
  assert.equal(isOwnOrder(o({ origin: originFor(newClaim()) }), "CS-0021", claim, null), false, "marca de otro");
});

test("numeración: el mayor CS de Odoo (para saltar por encima) y la marca", async () => {
  assert.equal(maxCsNumber(["CS-0029", "CS-0028", "CS-10001", "S0001", false, null, "CS-12a"]), 10001);
  assert.equal(maxCsNumber([]), 0);
  assert.match(newClaim(), /^[0-9a-f]{16}$/);
  assert.notEqual(newClaim(), newClaim());
  assert.equal(claimOf({ __odooClaim: "0123456789abcdef" }), "0123456789abcdef");
  assert.equal(claimOf({ __odooClaim: "x" }), null);
  // resolveOrder sin presupuestos → crear.
  assert.deepEqual(await resolveOrder({ byId: async () => null, byRef: async () => [] }, { ref: "CS-0001", odooOrderId: null, claim: null }), { kind: "create" });
});
