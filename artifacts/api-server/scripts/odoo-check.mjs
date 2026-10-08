// Diagnóstico SOLO LECTURA de la conexión con Odoo (pnpm --filter @workspace/api-server run odoo:check).
// No crea ni modifica nada: usa únicamente version, authenticate, fields_get,
// search_count y search_read. Nunca imprime la API key (solo su largo).
// Uso: pnpm --filter @workspace/api-server run odoo:check            (conexión)
//      pnpm --filter @workspace/api-server run odoo:check -- hydrate (además explora esos productos)
import { readFileSync } from "node:fs";

const args = process.argv.slice(2).filter(a => a !== "--");
const pid = args.find(a => /^\d+$/.test(a));
// Término de búsqueda opcional (ej. "hydrate"): explora cómo están cargados esos productos.
const TERM = args.find(a => !/^\d+$/.test(a) && a !== "self");
const env = (!pid || pid === "self") ? process.env : Object.fromEntries(
  readFileSync(`/proc/${pid}/environ`, "utf8").split("\0").filter(l => l.startsWith("ODOO_")).map(l => {
    const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)];
  }),
);
// Igual que el api-server: solo el origen (la API de Odoo vive en la raíz).
let URL_ = ""; try { URL_ = new URL((env.ODOO_URL || "").trim()).origin; } catch { URL_ = ""; }
const rawPath = (() => { try { return new URL((env.ODOO_URL || "").trim()).pathname; } catch { return "/"; } })();
const { ODOO_DB: DB = "", ODOO_USER: USER = "", ODOO_API_KEY: KEY = "" } = env;
const mask = s => (s ? `${s.length} caracteres` : "VACÍO");
console.log("Secrets → URL:", URL_ ? URL_ + (rawPath !== "/" ? ` (el Secret trae la ruta "${rawPath}": se ignora, la API usa la raíz)` : "") : "VACÍO",
  "| DB:", DB ? `"${DB.trim()}"${DB !== DB.trim() ? " (¡espacios!)" : ""}` : "VACÍO", "| USER:", USER ? `"${USER.trim()}"` : "VACÍO", "| KEY:", mask(KEY.trim()));

if (!URL_ || !DB || !USER || !KEY) {
  console.log("✗ Faltan Secrets ODOO_* en este entorno. Cargalos en Replit (Secrets) y corré esto en la pestaña Shell.");
  process.exit(1);
}

async function rpc(service, method, args) {
  const r = await fetch(`${URL_}/jsonrpc`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: 1 }),
    signal: AbortSignal.timeout(20000), redirect: "manual",
  });
  if (r.status >= 300 && r.status < 400) throw new Error(`redirección HTTP ${r.status} → ${r.headers.get("location")} (¿URL con http en vez de https, o dominio equivocado?)`);
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 160)}`);
  let body; try { body = JSON.parse(text); } catch { throw new Error(`no es JSON (¿la URL no es la de Odoo?): ${text.slice(0, 120)}`); }
  if (body.error) throw new Error(body.error.data?.message || body.error.message);
  return body.result;
}
const step = async (name, fn) => { try { const r = await fn(); console.log(`✓ ${name}`, r ?? ""); return r; } catch (e) { console.log(`✗ ${name}: ${e.message}`); return undefined; } };

const ver = await step("1. Servidor Odoo responde (versión)", async () => {
  const v = await rpc("common", "version", []); return `${v.server_version} (${v.server_serie})`;
});
if (!ver) process.exit(0);
const dbs = await step("2. Bases disponibles", async () => {
  try { const l = await rpc("db", "list", []); return `${l.length} → ${l.includes(DB.trim()) ? "la base configurada EXISTE" : "¡la base configurada NO está en la lista!: " + l.join(", ")}`; }
  catch (e) { return `(listado deshabilitado por el servidor, normal en Odoo Online: ${e.message.slice(0, 60)})`; }
});
const uid = await step("3. Login con usuario + API key", async () => {
  const u = await rpc("common", "authenticate", [DB.trim(), USER.trim(), KEY.trim(), {}]);
  if (!u) throw new Error("credenciales rechazadas (usuario, API key o base incorrectos)");
  return `uid ${u}`;
});
if (!uid) process.exit(0);
const id = Number(uid.split(" ")[1]);
const call = (model, method, args, kw = {}) => rpc("object", "execute_kw", [DB.trim(), id, KEY.trim(), model, method, args, kw]);

await step("4. Permiso de lectura de productos", async () => `${await call("product.template", "search_count", [[]])} plantillas en total`);
const f = await step("5. Campos disponibles", async () => {
  const t = Object.keys(await call("product.template", "fields_get", [], { attributes: ["type"] }));
  const p = Object.keys(await call("product.product", "fields_get", [], { attributes: ["type"] }));
  return { publicado: t.includes("is_published") ? "is_published" : t.includes("website_published") ? "website_published" : "NINGUNO (¿sin módulo eCommerce?)", stock: p.includes("free_qty") ? "free_qty" : p.includes("qty_available") ? "qty_available" : "sin stock", storable: p.includes("is_storable") ? "is_storable (v18)" : p.includes("detailed_type") ? "detailed_type (v17)" : "type" };
});
await step("6. Productos publicados y vendibles (no servicios)", async () => {
  const dom = [["sale_ok", "=", true], ["type", "!=", "service"]];
  if (f?.publicado && !f.publicado.startsWith("NINGUNO")) dom.push([f.publicado, "=", true]);
  const t0 = Date.now();
  const total = await call("product.template", "search_count", [dom]);
  return `${total} en total (consulta: ${Date.now() - t0} ms)`;
});
await step("7. Atributos de variantes (color/tamaño)", async () => {
  const a = await call("product.attribute", "search_read", [[]], { fields: ["name", "display_type"] });
  return a.map(x => `${x.name} [${x.display_type}]`).join(", ");
});
await step("8. Servicios de grabado GRAB-*", async () => {
  const s = await call("product.product", "search_read", [[["default_code", "in", ["GRAB-NOMBRES", "GRAB-ICONO", "GRAB-LOGO"]]]], { fields: ["default_code", "lst_price"] });
  return s.length ? JSON.stringify(s) : "ninguno (se usan los precios de la landing — esperado)";
});

// ── Exploración de una marca/término (solo lectura) ──────────────────────────
if (TERM) {
  console.log(`\n== Exploración: "${TERM}" ==`);
  const pub = f?.publicado && !f.publicado.startsWith("NINGUNO") ? [[f.publicado, "=", true]] : [];
  const base = [["sale_ok", "=", true], ["type", "!=", "service"]];
  await step(`E1. Productos con "${TERM}" en el nombre`, async () => {
    const all = await call("product.template", "search_count", [[["name", "ilike", TERM]]]);
    const sel = await call("product.template", "search_count", [[...base, ...pub, ["name", "ilike", TERM]]]);
    return `${all} en total · ${sel} publicados y vendibles`;
  });
  const tf = await call("product.template", "fields_get", [], { attributes: ["type", "string", "relation"] });
  const brandFields = Object.entries(tf).filter(([k, v]) => /brand|marca/i.test(k) || /brand|marca/i.test(v.string ?? ""));
  await step("E2. Campos de marca en el producto", async () =>
    brandFields.length ? brandFields.map(([k, v]) => `${k} (${v.type}${v.relation ? " → " + v.relation : ""}, "${v.string}")`).join(", ") : "ninguno");
  const want = ["name", "default_code", "categ_id", "public_categ_ids", "product_tag_ids", "list_price", "product_variant_count", "is_storable", ...brandFields.map(([k]) => k)];
  const fields = want.filter(k => k in tf);
  const rows = await call("product.template", "search_read", [[...base, ...pub, ["name", "ilike", TERM]]], { fields, limit: 60, order: "name" });
  const ids = (k) => [...new Set(rows.flatMap(r => Array.isArray(r[k]) && typeof r[k][0] === "number" && typeof r[k][1] !== "string" ? r[k] : []))];
  const names = async (model, list) => list.length ? Object.fromEntries((await call(model, "read", [list, ["display_name"]])).map(x => [x.id, x.display_name])) : {};
  const pubCat = "public_categ_ids" in tf ? await names("product.public.category", ids("public_categ_ids")) : {};
  const tags = "product_tag_ids" in tf ? await names("product.tag", ids("product_tag_ids")) : {};
  const show = v => Array.isArray(v) ? (typeof v[1] === "string" && v.length === 2 && typeof v[0] === "number" ? v[1] : v) : v;
  console.log(`✓ E3. Muestra (${rows.length} primeros, orden alfabético):`);
  const counts = { cat: {}, pub: {}, tag: {}, brand: {} };
  const bump = (o, k) => { if (k) o[k] = (o[k] ?? 0) + 1; };
  for (const r of rows) {
    const extra = brandFields.map(([k]) => `${k}=${JSON.stringify(show(r[k]))}`).join(" ");
    console.log(`   • ${r.name}  | ${r.list_price} | var:${r.product_variant_count} | cat:${show(r.categ_id) || "-"}${extra ? " | " + extra : ""}`);
    bump(counts.cat, show(r.categ_id));
    (r.public_categ_ids || []).forEach(i => bump(counts.pub, pubCat[i]));
    (r.product_tag_ids || []).forEach(i => bump(counts.tag, tags[i]));
    brandFields.forEach(([k]) => bump(counts.brand, JSON.stringify(show(r[k]))));
  }
  console.log("✓ E4. Categorías internas:", counts.cat);
  console.log("✓ E5. Categorías del ecommerce:", counts.pub);
  console.log("✓ E6. Etiquetas:", counts.tag);
  if (brandFields.length) console.log("✓ E7. Valores de marca:", counts.brand);
  const withVariants = rows.filter(r => r.product_variant_count > 1).slice(0, 3);
  for (const r of withVariants) {
    await step(`E8. Variantes de "${r.name}"`, async () => {
      const vs = await call("product.product", "search_read", [[["product_tmpl_id", "=", r.id]]], { fields: ["default_code", "lst_price", "free_qty", "product_template_attribute_value_ids"], limit: 12 });
      const pt = await call("product.template.attribute.value", "read", [[...new Set(vs.flatMap(v => v.product_template_attribute_value_ids))], ["name", "attribute_id", "html_color", "display_type"]]);
      const byId = Object.fromEntries(pt.map(p => [p.id, `${p.attribute_id[1]}=${p.name}${p.html_color ? " " + p.html_color : ""} [${p.display_type}]`]));
      return "\n     " + vs.map(v => `${v.default_code || "-"} | ${v.lst_price} | stock ${v.free_qty} | ${v.product_template_attribute_value_ids.map(i => byId[i]).join(", ")}`).join("\n     ");
    });
  }
}
