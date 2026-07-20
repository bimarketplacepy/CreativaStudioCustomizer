#!/usr/bin/env node
/**
 * Anti-regression gate for the landing. Run after every publish:
 *
 *   node scripts/check-prod.mjs [origin]     (default: https://creativastudiopy.com)
 *   node scripts/check-prod.mjs --local      (checks only the local build budgets)
 *
 * Exits non-zero if any check fails, so it can gate CI or be run by hand.
 *
 * WHY THIS EXISTS: production must run server.mjs (autoscale run command =
 * `pnpm --filter @workspace/termos-landing run start`). Every time a publish
 * reverted to plain static serving of dist/public, compression, Cache-Control,
 * llms.txt and the /api/design-preview endpoint silently died — and Lighthouse
 * dropped ~20 points. These checks catch that within seconds.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist", "public");

const args = process.argv.slice(2);
const localOnly = args.includes("--local");
const ORIGIN = args.find((a) => a.startsWith("http")) ?? "https://creativastudiopy.com";

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => { failures++; console.error(`  ✗ ${msg}`); };

// ── Budgets sobre el build local ─────────────────────────────────────────────
console.log("\n== Presupuestos del build (dist/public) ==");
try {
  const assets = readdirSync(join(DIST, "assets"));
  const entry = assets.find((f) => /^index-.*\.js$/.test(f));
  const css = assets.find((f) => /^index-.*\.css$/.test(f));

  const brSize = (p) => brotliCompressSync(readFileSync(p)).length;

  const entryBr = brSize(join(DIST, "assets", entry));
  entryBr <= 150 * 1024
    ? ok(`JS inicial (${entry}): ${(entryBr / 1024).toFixed(1)} KB brotli ≤ 150 KB`)
    : bad(`JS inicial ${(entryBr / 1024).toFixed(1)} KB brotli > presupuesto 150 KB`);

  const cssBr = brSize(join(DIST, "assets", css));
  cssBr <= 40 * 1024
    ? ok(`CSS (${css}): ${(cssBr / 1024).toFixed(1)} KB brotli ≤ 40 KB`)
    : bad(`CSS ${(cssBr / 1024).toFixed(1)} KB brotli > presupuesto 40 KB`);

  // Imagen más pesada del sitio ≤ 150 KB.
  let heaviest = { f: "", s: 0 };
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(webp|jpe?g|png|avif)$/i.test(f) && st.size > heaviest.s)
        heaviest = { f, s: st.size };
    }
  };
  walk(DIST);
  heaviest.s <= 150 * 1024
    ? ok(`Imagen más pesada: ${heaviest.f} ${(heaviest.s / 1024).toFixed(0)} KB ≤ 150 KB`)
    : bad(`Imagen ${heaviest.f} pesa ${(heaviest.s / 1024).toFixed(0)} KB > 150 KB`);

  // Sin TTF/OTF en el build: las fuentes van en woff2 (≈ mitad de peso).
  const fonts = readdirSync(join(DIST, "fonts"));
  const rawFonts = fonts.filter((f) => /\.(ttf|otf)$/i.test(f));
  rawFonts.length === 0
    ? ok("Fuentes: todas woff2, sin TTF/OTF crudas")
    : bad(`Fuentes sin convertir en el build: ${rawFonts.join(", ")}`);

  // llms.txt debe existir como archivo estático (respaldo si el hosting es estático).
  try {
    const llms = readFileSync(join(DIST, "llms.txt"), "utf8");
    llms.startsWith("# ")
      ? ok("llms.txt presente en el build y con formato de spec (H1)")
      : bad("llms.txt del build no empieza con H1");
  } catch {
    bad("llms.txt no está en dist/public (¿se borró public/llms.txt?)");
  }
} catch (e) {
  bad(`No se pudo auditar dist/public — ¿corriste el build? (${e.message})`);
}

// ── Producción ───────────────────────────────────────────────────────────────
if (!localOnly) {
  console.log(`\n== Producción (${ORIGIN}) ==`);
  const get = (path, opts = {}) =>
    fetch(ORIGIN + path, { headers: { "Accept-Encoding": "br, gzip" }, ...opts });

  try {
    const html = await get("/");
    const entryMatch = (await html.text()).match(/\/assets\/index-[\w-]+\.js/);
    if (!entryMatch) bad("No se encontró el <script> del entry en el HTML");
    else {
      // fetch de Node descomprime solo; content-encoding queda en headers.
      const js = await get(entryMatch[0]);
      const enc = js.headers.get("content-encoding");
      enc === "br" || enc === "gzip"
        ? ok(`JS con compresión activa (content-encoding: ${enc})`)
        : bad(`JS SIN comprimir (content-encoding: ${enc ?? "ausente"}) — el deployment no está corriendo server.mjs`);

      const cc = js.headers.get("cache-control") ?? "";
      cc.includes("immutable")
        ? ok(`Assets con Cache-Control immutable (${cc})`)
        : bad(`Assets sin caché immutable (cache-control: ${cc || "ausente"})`);
    }

    const llms = await get("/llms.txt");
    const llmsBody = await llms.text();
    (llms.headers.get("content-type") ?? "").includes("text/plain") && llmsBody.trimStart().startsWith("#")
      ? ok("llms.txt en text/plain con formato de spec")
      : bad("llms.txt no responde text/plain con H1 (¿fallback SPA devolviendo HTML?)");

    const nf = await get("/noexiste.xyz");
    nf.status === 404
      ? ok("Ruta inexistente con extensión devuelve 404 (server.mjs vivo)")
      : bad(`/noexiste.xyz devolvió ${nf.status} (hosting estático con catch-all)`);

    const api = await fetch(ORIGIN + "/api/design-preview", { method: "POST" });
    api.status !== 404
      ? ok(`POST /api/design-preview responde ${api.status} (endpoint activo)`)
      : bad("POST /api/design-preview → 404 (la API no está desplegada)");
  } catch (e) {
    bad(`Error de red contra producción: ${e.message}`);
  }
}

console.log(failures === 0 ? "\nTodo OK ✅" : `\n${failures} chequeo(s) FALLARON ❌`);
process.exit(failures === 0 ? 0 : 1);
