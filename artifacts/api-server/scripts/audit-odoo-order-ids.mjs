// Auditoría SOLO LECTURA de orders.odoo_order_id (incidente del 2026-11-11).
// Para cada fila con odoo_order_id no nulo, lee ese sale.order en Odoo y lista
// las filas sospechosas:
//   - no_existe:    el sale.order ya no existe en ese Odoo
//   - ref_distinto: client_order_ref ≠ order_number de la fila
//   - origin_ajeno: origin no empieza con «Creativa Studio»
// No escribe NADA: en Postgres la sesión va en una transacción READ ONLY y
// solo hace un SELECT; en Odoo solo llama a search_read. Al final imprime
// (sin ejecutar) el SELECT y el UPDATE propuestos para limpiar esas filas.
//
//   node scripts/audit-odoo-order-ids.mjs
//
// Base: AUDIT_DATABASE_URL (la del Deployment) o, si falta, DATABASE_URL.
// Odoo: AUDIT_ODOO_URL / _DB / _USER / _API_KEY o, si faltan, ODOO_URL / ODOO_DB
//       / ODOO_USER / ODOO_API_KEY. Nunca imprime claves ni la URL de la base.
import { createRequire } from "node:module";
// `pg` es dependencia de @workspace/db (lib/db), no de este paquete.
const pg = createRequire(new URL("../../../lib/db/package.json", import.meta.url))("pg");

const env = (k) => (process.env[`AUDIT_${k}`] || process.env[k] || "").trim();
const dbUrl = (process.env.AUDIT_DATABASE_URL || process.env.DATABASE_URL || "").trim();
let origin = ""; try { origin = new URL(env("ODOO_URL")).origin; } catch {}
const DB = env("ODOO_DB"), USER = env("ODOO_USER"), KEY = env("ODOO_API_KEY");
if (!dbUrl) { console.log("✗ Falta AUDIT_DATABASE_URL / DATABASE_URL"); process.exit(1); }
if (!origin || !DB || !USER || !KEY) { console.log("✗ Faltan ODOO_URL / ODOO_DB / ODOO_USER / ODOO_API_KEY"); process.exit(1); }

const ORIGIN_PREFIX = "Creativa Studio";
const pgUrl = new URL(dbUrl);
console.log(`Base de la landing: host ${pgUrl.hostname}, base ${pgUrl.pathname.slice(1)}${process.env.AUDIT_DATABASE_URL ? " (AUDIT_DATABASE_URL)" : " (DATABASE_URL)"}`);
console.log(`Odoo: ${new URL(origin).hostname} | base ${DB}`);
console.log("Modo: SOLO LECTURA (Postgres READ ONLY + Odoo search_read).\n");

// ── Postgres: un SELECT dentro de una transacción de solo lectura ───────────
const db = new pg.Client({ connectionString: dbUrl });
await db.connect();
let rows;
try {
  await db.query("begin transaction read only");
  ({ rows } = await db.query(
    `select id, order_number, odoo_order_id, odoo_order_name, odoo_payment_state, created_at
       from orders where odoo_order_id is not null order by id`));
  await db.query("rollback");
} finally {
  await db.end();
}
console.log(`Filas con odoo_order_id: ${rows.length}`);
if (!rows.length) process.exit(0);

// ── Odoo: solo search_read ──────────────────────────────────────────────────
async function rpc(service, method, args) {
  const r = await fetch(`${origin}/jsonrpc`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: 1 }), signal: AbortSignal.timeout(30000) });
  const b = await r.json();
  if (b.error) throw new Error(b.error.data?.message || b.error.message);
  return b.result;
}
const uid = await rpc("common", "authenticate", [DB, USER, KEY, {}]);
if (!uid) { console.log("✗ Login rechazado en Odoo"); process.exit(1); }

const ids = [...new Set(rows.map(r => r.odoo_order_id))];
const found = new Map();
for (let i = 0; i < ids.length; i += 200) {
  // active_test: false → un presupuesto archivado cuenta como existente.
  const part = await rpc("object", "execute_kw", [DB, uid, KEY, "sale.order", "search_read",
    [[["id", "in", ids.slice(i, i + 200)]]],
    { fields: ["name", "state", "client_order_ref", "origin", "partner_id"], context: { active_test: false } }]);
  for (const o of part) found.set(o.id, o);
}

const bad = [];
for (const r of rows) {
  const o = found.get(r.odoo_order_id);
  const reasons = [];
  if (!o) reasons.push("no_existe");
  else {
    if ((o.client_order_ref || "") !== r.order_number) reasons.push("ref_distinto");
    if (!(o.origin || "").startsWith(ORIGIN_PREFIX)) reasons.push("origin_ajeno");
  }
  if (reasons.length) bad.push({ r, o, reasons });
}

// Dos filas apuntando al mismo presupuesto: a lo sumo una es la dueña.
const byOdoo = new Map();
for (const r of rows) byOdoo.set(r.odoo_order_id, [...(byOdoo.get(r.odoo_order_id) ?? []), r.order_number]);
const shared = [...byOdoo].filter(([, v]) => v.length > 1);

console.log(`Presupuestos leídos en Odoo: ${found.size} de ${ids.length}`);
console.log(`Filas sospechosas: ${bad.length}\n`);
const show = (v) => (v === false || v == null || v === "" ? "—" : String(v));
if (bad.length) {
  console.log(["fila_id", "orderNumber", "odoo_order_id", "odoo_name", "ref_en_odoo", "origin_en_odoo", "estado_odoo", "pago_landing", "motivo"].join(" | "));
  for (const { r, o, reasons } of bad) {
    console.log([r.id, r.order_number, r.odoo_order_id, show(o?.name ?? r.odoo_order_name), show(o?.client_order_ref), show(o?.origin), show(o?.state), show(r.odoo_payment_state), reasons.join("+")].join(" | "));
  }
}
if (shared.length) {
  console.log("\nAVISO: presupuestos referenciados por más de una fila (revisar a mano):");
  for (const [id, nums] of shared) console.log(`  odoo_order_id ${id}: ${nums.join(", ")}`);
}

if (bad.length) {
  const list = bad.map(b => b.r.id).join(", ");
  console.log(`
-- PROPUESTA (NO ejecutada por este script). Revisar antes de correr.
-- 1) Ver exactamente las filas que se van a tocar:
SELECT id, order_number, odoo_order_id, odoo_order_name, odoo_payment_state
  FROM orders
 WHERE id IN (${list});

-- 2) Limpiar el vínculo con el presupuesto ajeno:
BEGIN;
UPDATE orders
   SET odoo_order_id = NULL, odoo_order_name = NULL, odoo_payment_state = NULL
 WHERE id IN (${list});
-- Debe decir UPDATE ${bad.length}. Si no: ROLLBACK;
COMMIT;`);
}
