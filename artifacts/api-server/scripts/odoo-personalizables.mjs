// Marca en Odoo qué productos muestran el botón «Personalizar» del módulo
// website_creativa_studio (campo booleano product.template.cs_personalizable).
// PROMPT-ODOO-TIENDA §5. IDEMPOTENTE.
//
// Personalizable = la plantilla tiene al menos una variante en el catálogo del
// personalizador: marca de la tienda, con perfil 3D (modelo propio o forma
// genérica del tipo) y con alguna técnica posible (todo el drinkware admite al
// menos grabado láser). Es la MISMA función que arma /api/catalog
// (fetchFromOdoo), corrida contra la base de destino. Se marcan las que
// faltan y se desmarcan las que dejaron de serlo.
//
// Uso:  node scripts/odoo-personalizables.mjs [--aplicar] [--url … --db … --user … --key …]
//       (o ODOO_URL / ODOO_DB / ODOO_USER / ODOO_API_KEY)
//   Sin --aplicar: informe (no escribe nada).
//   En producción escribe solo con ODOO_ALLOW_PRODUCTION_WRITES=si (freno de odoo.ts).
// Los productos deshabilitados en /admin no se descuentan: revisar el informe.
import { createRequire } from "node:module";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(here, "..");

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
for (const [flag, env] of [["url", "ODOO_URL"], ["db", "ODOO_DB"], ["user", "ODOO_USER"], ["key", "ODOO_API_KEY"]]) {
  const v = opt(flag);
  if (v) process.env[env] = v;
}
const APPLY = args.includes("--aplicar");

// fetchFromOdoo y OdooClient son TypeScript del api-server: se compilan a un
// archivo temporal dentro de scripts/ (así resuelven sus dependencias).
const require = createRequire(path.join(apiDir, "package.json"));
const { build } = require("esbuild");
const outDir = path.join(here, ".build");
await mkdir(outDir, { recursive: true });
const outfile = path.join(outDir, `personalizables-${process.pid}.mjs`);
await build({
  stdin: {
    contents: 'export { fetchFromOdoo } from "../src/lib/catalog"; export { OdooClient, odooConfig, isProductionConfig } from "../src/lib/odoo";',
    resolveDir: here, loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", outfile, logLevel: "error",
  external: ["pino", "pino-pretty"],
});
let mod;
try {
  mod = await import(pathToFileURL(outfile).href);
} finally {
  await rm(outfile, { force: true });
}
const { fetchFromOdoo, OdooClient, odooConfig, isProductionConfig } = mod;

const cfg = odooConfig();
if (!cfg) { console.error("Faltan --url/--db/--user/--key (o ODOO_URL / ODOO_DB / ODOO_USER / ODOO_API_KEY)."); process.exit(1); }
const prod = isProductionConfig(cfg);
console.log(`Base: ${cfg.db} @ ${new URL(cfg.url).hostname}${prod ? "  ⛔ PRODUCCIÓN" : ""}${APPLY ? "" : "  (informe: sin --aplicar no escribe)"}`);
const client = new OdooClient(cfg);

// 1. Catálogo del personalizador en esa base.
const { products } = await fetchFromOdoo(client);
const variantIds = products.flatMap(p => p.variants.map(v => v.id));
console.log(`Catálogo: ${products.length} productos, ${variantIds.length} variantes con perfil 3D.`);

// 2. Plantillas de esas variantes.
const want = new Set();
for (let i = 0; i < variantIds.length; i += 500) {
  const rows = await client.call("product.product", "search_read", [[["id", "in", variantIds.slice(i, i + 500)]]], { fields: ["product_tmpl_id"], context: { active_test: false } });
  for (const r of rows) if (r.product_tmpl_id) want.add(r.product_tmpl_id[0]);
}

// 3. Lo marcado hoy (el campo lo agrega el módulo website_creativa_studio).
let marked;
try {
  marked = await client.call("product.template", "search_read", [[["cs_personalizable", "=", true]]], { fields: ["name"], context: { active_test: false } });
} catch (err) {
  console.error(`No se pudo leer cs_personalizable: ¿está instalado el módulo website_creativa_studio en esta base?\n  ${err.message}`);
  process.exit(1);
}
const have = new Set(marked.map(r => r.id));
const toMark = [...want].filter(id => !have.has(id));
const toUnmark = [...have].filter(id => !want.has(id));

const names = async ids => ids.length
  ? (await client.call("product.template", "search_read", [[["id", "in", ids]]], { fields: ["name"], context: { active_test: false } })).map(r => `#${r.id} ${r.name}`)
  : [];
console.log(`\nA marcar (${toMark.length}):`);
for (const n of await names(toMark)) console.log(`  + ${n}`);
console.log(`A desmarcar (${toUnmark.length}):`);
for (const n of await names(toUnmark)) console.log(`  - ${n}`);
console.log(`Sin cambios: ${want.size - toMark.length} ya marcadas.`);

if (!APPLY) {
  console.log("\nInforme solamente. Para escribir: --aplicar");
  process.exit(0);
}
if (toMark.length) await client.call("product.template", "write", [toMark, { cs_personalizable: true }]);
if (toUnmark.length) await client.call("product.template", "write", [toUnmark, { cs_personalizable: false }]);
console.log(`\n✓ Marcadas ${toMark.length}, desmarcadas ${toUnmark.length}.`);
