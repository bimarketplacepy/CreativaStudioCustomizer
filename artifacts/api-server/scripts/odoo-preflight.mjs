// Chequeo SOLO LECTURA previo a escribir en Odoo (PROMPT-ODOO-PRUEBAS §2).
// Imprime: versión, host y base, si es PRODUCCIÓN, permisos del usuario de API
// sobre sale.order / res.partner, campos clave de sale.order, medios de pago
// activos y plantillas de email. Nunca escribe ni imprime la API key.
//   ODOO_URL=... ODOO_DB=... ODOO_USER=... ODOO_API_KEY=... node scripts/odoo-preflight.mjs
const PROD_HOSTS = ["marketplace.odoo.com"];
const PROD_DBS = ["marketplace-main-33409600"];

let origin = ""; try { origin = new URL((process.env.ODOO_URL || "").trim()).origin; } catch {}
const DB = (process.env.ODOO_DB || "").trim(), USER = (process.env.ODOO_USER || "").trim(), KEY = (process.env.ODOO_API_KEY || "").trim();
if (!origin || !DB || !USER || !KEY) { console.log("✗ Faltan ODOO_URL / ODOO_DB / ODOO_USER / ODOO_API_KEY"); process.exit(1); }

const host = new URL(origin).hostname;
const isProd = PROD_HOSTS.includes(host) || PROD_DBS.includes(DB);
console.log(`Host: ${host} | Base: ${DB} | Usuario: ${USER} | Key: ${KEY.length} caracteres`);
console.log(isProd ? "⛔ ES PRODUCCIÓN: no se escribe nada." : "✓ No es producción (freno de escritura inactivo para esta base).");

async function rpc(service, method, args) {
  const r = await fetch(`${origin}/jsonrpc`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: 1 }), signal: AbortSignal.timeout(20000) });
  const b = await r.json();
  if (b.error) throw new Error(b.error.data?.message || b.error.message);
  return b.result;
}
const step = async (name, fn) => { try { const r = await fn(); console.log(`✓ ${name}:`, r ?? ""); return r; } catch (e) { console.log(`✗ ${name}: ${e.message.split("\n")[0]}`); } };

const v = await rpc("common", "version", []);
console.log(`Versión: ${v.server_version} (serie ${v.server_serie})`);
const uid = await rpc("common", "authenticate", [DB, USER, KEY, {}]);
if (!uid) { console.log("✗ Login rechazado"); process.exit(1); }
console.log(`Login OK, uid ${uid}`);
const call = (model, method, args, kw = {}) => rpc("object", "execute_kw", [DB, uid, KEY, model, method, args, kw]);

// has_access(operation) sobre el recordset vacío = permiso general sobre el
// modelo (odoo/orm/models.py:4123, 19.0). Es público: se puede llamar por RPC.
for (const model of ["sale.order", "sale.order.line", "res.partner", "product.product", "payment.transaction"]) {
  await step(`Permisos en ${model}`, async () => {
    const out = {};
    for (const op of ["read", "create", "write", "unlink"]) out[op] = await call(model, "has_access", [[], op]);
    return out;
  });
}
await step("Campos clave de sale.order", async () => {
  const f = await call("sale.order", "fields_get", [], { attributes: ["type"] });
  return Object.fromEntries(["access_token", "client_order_ref", "amount_paid", "state", "validity_date", "note", "website_id", "transaction_ids"].map(k => [k, f[k]?.type ?? "NO EXISTE"]));
});
await step("Campos de teléfono en res.partner", async () => {
  const f = await call("res.partner", "fields_get", [], { attributes: ["type"] });
  return { phone: f.phone?.type ?? "NO EXISTE", mobile: f.mobile?.type ?? "NO EXISTE", email: f.email?.type };
});
await step("Medios de pago (payment.provider)", async () =>
  (await call("payment.provider", "search_read", [[]], { fields: ["name", "code", "state", "is_published"], context: { active_test: false } }))
    .map(p => `${p.name} [${p.code}] state=${p.state} publicado=${p.is_published}`).join(" · "));
await step("Métodos de pago activos (payment.method)", async () =>
  (await call("payment.method", "search_read", [[["active", "=", true]]], { fields: ["name", "code"], limit: 30 })).map(p => `${p.name} [${p.code}]`).join(" · "));
await step("Plantillas de email de ventas", async () =>
  (await call("mail.template", "search_read", [[["model", "=", "sale.order"]]], { fields: ["name"] })).map(t => t.name).join(" · "));
await step("Servicios GRAB-*", async () =>
  JSON.stringify(await call("product.product", "search_read", [[["default_code", "like", "GRAB-"]]], { fields: ["default_code", "lst_price", "type", "sale_ok"], context: { active_test: false } })));
await step("Pedidos con client_order_ref CS-*", async () => `${await call("sale.order", "search_count", [[["client_order_ref", "like", "CS-"]]])} pedidos`);
await step("Moneda de la compañía", async () => (await call("res.company", "search_read", [[]], { fields: ["name", "currency_id"] })).map(c => `${c.name}: ${c.currency_id[1]}`).join(" · "));
await step("Automatizaciones (base.automation) sobre sale.order", async () =>
  (await call("base.automation", "search_read", [[["model_name", "=", "sale.order"]]], { fields: ["name", "trigger", "active"] })).map(a => `${a.name} (${a.trigger}, ${a.active ? "activa" : "inactiva"})`).join(" · ") || "ninguna");
