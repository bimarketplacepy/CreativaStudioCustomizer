// Precomprime el build (dist/public) con brotli y gzip: deja `archivo.br` y
// `archivo.gz` al lado de cada JS, CSS, .glb, .wasm, etc., y server.mjs los
// sirve tal cual.
//
// Antes server.mjs comprimía en el primer pedido con brotli calidad 11
// sincrónico: con autoscale cada instancia nueva arranca en frío, y el primer
// visitante (justo el que abre el personalizador desde la tienda) esperaba
// ~3 s mientras se comprimía three.js con el servidor trabado.
//
// Archivos grandes (> 4 MB: el motor wasm y el modelo del recortador de
// fondos) solo van con gzip: brotli 11 sobre 44 MB tarda minutos.

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompress, gzip, constants } from "node:zlib";
import { promisify } from "node:util";

const brotli = promisify(brotliCompress);
const gz = promisify(gzip);
const ROOT = fileURLToPath(new URL("../dist/public", import.meta.url));

// Mismos tipos que COMPRESSIBLE / ASYNC_GZIP_EXT en server.mjs.
const EXT = new Set([
  ".js", ".mjs", ".css", ".html", ".json", ".svg", ".txt", ".xml", ".webmanifest",
  ".ttf", ".otf", ".glb", ".wasm", ".onnx",
]);
const MIN = 1024;
const BROTLI_MAX = 4 * 1024 * 1024;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let files = 0, raw = 0, br = 0;
const t0 = Date.now();
const jobs = [];
for await (const file of walk(ROOT)) {
  if (!EXT.has(extname(file).toLowerCase())) continue;
  // index.html se sirve sin precomprimir: server.mjs le inyecta cosas por pedido.
  if (file === join(ROOT, "index.html")) continue;
  const size = (await stat(file)).size;
  if (size < MIN) continue;
  jobs.push((async () => {
    const buf = await readFile(file);
    const g = await gz(buf, { level: 9 });
    // Si casi no achica (.glb con Draco, por ejemplo), no vale la pena.
    if (g.length > size * 0.95) return;
    await writeFile(`${file}.gz`, g);
    files++; raw += size;
    if (size <= BROTLI_MAX) {
      const b = await brotli(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: size } });
      if (b.length < g.length) { await writeFile(`${file}.br`, b); br += b.length; return; }
    }
    br += g.length;
  })());
}
await Promise.all(jobs);
console.log(`[precompress] ${files} archivos, ${(raw / 1024).toFixed(0)} KB → ${(br / 1024).toFixed(0)} KB (br/gz) en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
