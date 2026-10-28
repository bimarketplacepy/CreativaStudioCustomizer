// Prepara una base de Odoo para «Comprar» (PROMPT-ODOO-PRUEBAS §3). IDEMPOTENTE.
//  1. Servicios de grabado (type=service, sale_ok) buscados por default_code:
//     GRAB-NOMBRES 35.000 · GRAB-ICONO 40.000 · GRAB-LOGO 50.000 · GRAB-EXTRA 5.000
//     (montos de engraving-plans.ts y pricing.ts). Crea los que faltan, corrige
//     precio/tipo de los que existen.
//  2. --demo: activa el proveedor de pago de prueba «Demo» (instala
//     payment_demo si hace falta, lo pone en modo test y lo publica). SOLO en
//     bases de prueba: el script se niega en producción.
//
// Uso:  node scripts/odoo-setup.mjs --url https://... --db <base> --user <login> --key <api key> [--demo] [--dry]
//       (o las mismas cuatro por ODOO_URL / ODOO_DB / ODOO_USER / ODOO_API_KEY)
// Se corre en producción recién cuando se apruebe, y sin --demo.
const PROD_HOSTS = ["marketplace.odoo.com"];
const PROD_DBS = ["marketplace-main-33409600"];

const SERVICES = [
  { code: "GRAB-NOMBRES", name: "Grabado láser: nombres y apellidos", price: 35000 },
  { code: "GRAB-ICONO", name: "Grabado láser: nombres + ícono pequeño", price: 40000 },
  { code: "GRAB-LOGO", name: "Grabado láser: nombres + logo", price: 50000 },
  { code: "GRAB-EXTRA", name: "Grabado láser: escritura extra (texto 2, tapa o base)", price: 5000 },
];

const args = process.argv.slice(2);
const opt = (name, env) => { const i = args.indexOf(`--${name}`); return (i >= 0 ? args[i + 1] : undefined) ?? process.env[env] ?? ""; };
const DRY = args.includes("--dry");
const DEMO = args.includes("--demo");
let origin = ""; try { origin = new URL(opt("url", "ODOO_URL").trim()).origin; } catch {}
const DB = opt("db", "ODOO_DB").trim(), USER = opt("user", "ODOO_USER").trim(), KEY = opt("key", "ODOO_API_KEY").trim();
if (!origin || !DB || !USER || !KEY) { console.error("Faltan --url/--db/--user/--key (o ODOO_*)"); process.exit(1); }

const host = new URL(origin).hostname;
const isProd = PROD_HOSTS.includes(host) || PROD_DBS.includes(DB);
console.log(`Base: ${DB} @ ${host}${isProd ? "  ⛔ PRODUCCIÓN" : ""}${DRY ? "  (modo informe, sin escribir)" : ""}`);
if (isProd && process.env.ODOO_ALLOW_PRODUCTION_WRITES !== "si") {
  console.error("Es producción: se necesita ODOO_ALLOW_PRODUCTION_WRITES=si para escribir. Nada se tocó.");
  process.exit(2);
}
if (isProd && DEMO) { console.error("--demo está prohibido en producción."); process.exit(2); }

async function rpc(service, method, a, timeout = 30000) {
  const r = await fetch(`${origin}/jsonrpc`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args: a }, id: 1 }), signal: AbortSignal.timeout(timeout) });
  const b = await r.json();
  if (b.error) throw new Error(b.error.data?.message || b.error.message);
  return b.result;
}
const uid = await rpc("common", "authenticate", [DB, USER, KEY, {}]);
if (!uid) { console.error("Login rechazado"); process.exit(1); }
const call = (model, method, a, kw = {}, timeout) => rpc("object", "execute_kw", [DB, uid, KEY, model, method, a, kw], timeout);
const write = async (label, fn) => { if (DRY) { console.log(`  (dry) ${label}`); return null; } const r = await fn(); console.log(`  ✓ ${label}`); return r; };

// ── 1. Servicios de grabado ──────────────────────────────────────────────────
console.log("\n1. Servicios de grabado");
const categ = (await call("product.category", "search_read", [[["complete_name", "=", "Services"]]], { fields: ["id"], limit: 1 }))[0]?.id ?? false;
// Mismo tratamiento de IVA que las piezas: copiar impuestos de un producto publicado con stock.
const sample = (await call("product.template", "search_read", [[["sale_ok", "=", true], ["is_published", "=", true], ["type", "=", "consu"]]], { fields: ["taxes_id"], limit: 1 }))[0];
const taxes = sample?.taxes_id ?? [];
const report = [];
for (const s of SERVICES) {
  const found = await call("product.product", "search_read", [[["default_code", "=", s.code]]], { fields: ["id", "product_tmpl_id", "lst_price", "type", "sale_ok", "active"], context: { active_test: false } });
  const vals = { name: s.name, default_code: s.code, type: "service", sale_ok: true, purchase_ok: false, list_price: s.price, invoice_policy: "order", company_id: false, taxes_id: [[6, 0, taxes]] };
  if (categ) vals.categ_id = categ;
  if (!found.length) {
    const id = await write(`crear ${s.code} = Gs. ${s.price.toLocaleString("es-PY")}`, () => call("product.template", "create", [vals]));
    report.push({ code: s.code, action: "creado", templateId: id });
    continue;
  }
  const v = found[0];
  const fix = {};
  if (v.lst_price !== s.price) fix.list_price = s.price;
  if (v.type !== "service") fix.type = "service";
  if (!v.sale_ok) fix.sale_ok = true;
  if (!v.active) fix.active = true;
  if (Object.keys(fix).length) {
    await write(`corregir ${s.code}: ${JSON.stringify(fix)}`, () => call("product.template", "write", [[v.product_tmpl_id[0]], fix]));
    report.push({ code: s.code, action: "corregido", templateId: v.product_tmpl_id[0], fix });
  } else {
    console.log(`  = ${s.code} ya está bien (Gs. ${v.lst_price.toLocaleString("es-PY")})`);
    report.push({ code: s.code, action: "sin cambios", templateId: v.product_tmpl_id[0] });
  }
}

// ── 2. Proveedor de pago Demo (solo bases de prueba) ─────────────────────────
if (DEMO) {
  console.log("\n2. Proveedor de pago de prueba (Demo)");
  const providers = await call("payment.provider", "search_read", [[["name", "=", "Demo"]]], { fields: ["id", "code", "state", "is_published", "module_id", "module_state", "company_id"], context: { active_test: false } });
  if (!providers.length) {
    console.log("  ✗ No hay proveedor «Demo» en la base (¿falta el módulo payment?).");
  } else {
    const p = providers[0];
    console.log(`  Demo #${p.id}: code=${p.code} state=${p.state} publicado=${p.is_published} módulo=${p.module_state}`);
    if (p.module_state !== "installed") {
      // Igual que el botón «Instalar» de la ficha: payment.provider.button_immediate_install
      // instala payment_demo (addons/payment/models/payment_provider.py:476).
      await write("instalar el módulo payment_demo (puede tardar)", () => call("payment.provider", "button_immediate_install", [[p.id]], {}, 300000));
    }
    const after = (await call("payment.provider", "search_read", [[["id", "=", p.id]]], { fields: ["code", "state", "is_published"], context: { active_test: false } }))[0];
    const fix = {};
    if (after.state !== "test") fix.state = "test";       // Demo solo admite test/disabled
    if (!after.is_published) fix.is_published = true;
    if (Object.keys(fix).length) await write(`Demo → ${JSON.stringify(fix)}`, () => call("payment.provider", "write", [[p.id], fix]));
    else console.log("  = Demo ya está en modo test y publicado");
  }
}

console.log("\nResumen:", JSON.stringify(report));
