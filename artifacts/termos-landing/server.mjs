// Production static server for the Creativa Studio landing.
//
// Zero external dependencies — brotli/gzip come from Node's built-in `zlib`,
// so there is nothing to install and nothing that can fail on deploy.
//
// What it does (this is Phases 1, 4 and 5 of the perf work):
//   - Serves the Vite production build from ./dist/public.
//   - Negotiates Content-Encoding (brotli preferred, then gzip) and caches the
//     compressed bytes in memory so each asset is compressed at most once.
//   - Sends `immutable`, 1-year cache for content-hashed assets (/assets/*,
//     fonts, images) and `no-cache` for index.html so deploys are picked up.
//   - Serves the .br/.gz files that scripts/precompress.mjs leaves next to
//     each asset at build time; anything else compressible is compressed once,
//     asynchronously (never with the server blocked), and cached in memory.
//   - Embebido desde la tienda (?embed=odoo&product=<id>): sirve dist/embed.html
//     (sin el hero) con <link rel=preload> de los bloques del personalizador,
//     /api/catalog, el .glb de la pieza y el decoder Draco (embedPreloads).
//   - SPA fallback: unknown non-file routes return index.html.
//   - Serves robots.txt / sitemap.xml / llms.txt as plain text when present.
//   - Framing (PROMPT-ODOO-TIENDA §6): the page can be embedded ONLY by the
//     Odoo shop and ONLY with ?embed=odoo — `Content-Security-Policy:
//     frame-ancestors <CS_SHOP_ORIGINS>`. Every other HTML response sends
//     `frame-ancestors 'none'`. In embed mode the shop origins are also
//     injected as <meta name="cs-shop-origins"> for postMessage (src/lib/embed.ts).
//
// Listens on $PORT (Replit autoscale sets this), defaulting to 3000.

import { createServer, request as httpRequest } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, normalize, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzip, brotliCompress, constants as zlibConstants } from "node:zlib";
import { promisify } from "node:util";
import { handleServeRequest } from "./upload-store.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "dist", "public");
// HTML del embebido sin el hero (scripts/prerender.mjs); si falta, index.html.
const EMBED_HTML = join(__dirname, "dist", "embed.html");
const HAS_EMBED_HTML = existsSync(EMBED_HTML);
const PORT = Number(process.env.PORT) || 3000;

/**
 * Orígenes exactos de la tienda Odoo que pueden incrustar el personalizador
 * (CS_SHOP_ORIGINS, separados por coma o espacio). Solo https (o localhost).
 */
function parseShopOrigins(raw) {
  const out = [];
  for (const part of String(raw || "").split(/[\s,]+/)) {
    if (!part) continue;
    try {
      const u = new URL(part);
      const local = u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname);
      if ((u.protocol === "https:" || local) && !out.includes(u.origin)) out.push(u.origin);
    } catch { /* se ignora lo que no es una URL */ }
  }
  return out;
}
const SHOP_ORIGINS = parseShopOrigins(process.env.CS_SHOP_ORIGINS);

/** CSP de incrustación: la tienda solo con ?embed=odoo; el resto, nadie. */
function frameAncestors(embed, origins = SHOP_ORIGINS) {
  return embed && origins.length ? `frame-ancestors ${origins.join(" ")}` : "frame-ancestors 'none'";
}

/**
 * El HTML que llega desde la tienda lleva los orígenes de la tienda: en el
 * iframe (?embed=odoo) para postMessage, y en el respaldo sin iframe (?odoo=)
 * para el «Volver a la tienda» (src/lib/embed.ts). Embebido, además oculta
 * desde el primer pintado la portada pre-renderizada (main.tsx la quita).
 */
function injectShopOrigins(html, hideHero, preloads = "") {
  const meta = `<meta name="cs-shop-origins" content="${SHOP_ORIGINS.join(" ")}">` +
    (hideHero ? "<style>#hero-root{display:none!important}</style>" : "");
  // Las precargas van al principio del <head>: el navegador las pide antes de
  // leer el resto (GTM, JSON-LD, CSS).
  const withPreloads = preloads ? html.replace(/(<meta charset[^>]*>)/i, `$1${preloads}`) : html;
  return withPreloads.replace("</head>", `${meta}</head>`);
}

// Dominio público. El viejo (creativastudiopy.com) sigue conectado en Replit
// y redirige acá con 301, salvo /api/* y /u/*: los links de pedidos ya
// enviados por WhatsApp se siguen sirviendo tal cual en el dominio viejo.
const PUBLIC_HOST = process.env.PUBLIC_HOST || "creativastudio.marketplace.com.py";
const LEGACY_HOSTS = new Set(["creativastudiopy.com", "www.creativastudiopy.com"]);

// ── API server (pedidos) ────────────────────────────────────────────────────
// El @workspace/api-server (Express + Postgres) corre como proceso hijo en un
// puerto interno y este server le reenvía todo /api/*. Si el bundle no está o el hijo se cae, el proxy
// responde 502 y el personalizador cae a su fallback de WhatsApp sin pedido.
const API_PORT = Number(process.env.API_PORT) || 3101;
const API_DIST = join(__dirname, "..", "api-server", "dist", "index.mjs");

// EMBEDDED_API=false: el api-server corre como otro servicio (deployment de
// Replit por artefactos, donde el router manda /api/* directo a él). Entonces
// no se levanta una copia acá, y /admin se redirige a /api/admin.
const EMBEDDED_API = process.env.EMBEDDED_API !== "false";

function startApiServer() {
  if (!EMBEDDED_API) return;
  if (!existsSync(API_DIST)) {
    console.warn(`[termos-landing] api-server bundle not found at ${API_DIST}; /api/orders disabled`);
    return;
  }
  const child = spawn(process.execPath, ["--enable-source-maps", API_DIST], {
    env: { ...process.env, PORT: String(API_PORT) },
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    console.error(`[termos-landing] api-server exited (code ${code}); restarting in 2s`);
    setTimeout(startApiServer, 2000);
  });
}
startApiServer();

/** Reenvía la request tal cual al api-server interno; 502 si no responde. */
function proxyToApi(req, res) {
  const upstream = httpRequest(
    {
      host: "127.0.0.1",
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    },
  );
  upstream.on("error", () => {
    // Si el api-server se cortó a mitad de la respuesta ya no se puede mandar
    // un 502 (writeHead tiraría ERR_HTTP_HEADERS_SENT): cortar la conexión.
    if (res.headersSent) return res.destroy();
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "API no disponible" }));
  });
  req.pipe(upstream);
}

// ── Precargas del embebido (?embed=odoo&product=<id>) ───────────────────────
// Sin esto el navegador descubre todo en cascada: JS de entrada → App →
// personalizador → /api/catalog → visor 3D → .glb → decoder Draco. Con las
// precargas pide todo junto apenas llega el HTML. El .glb y Draco van con
// prioridad baja: el editor (y cs:ready) no los espera. El JS del visor (three,
// ~160 KB brotli) no se precarga: medido, le robaba ancho de banda al editor
// (cs:ready +200 ms) y el 3D no terminaba antes (RESULTADOS-ODOO-TIENDA §9).

/** Debe coincidir con DRACO_PATH en src/components/thermos-3d.tsx. */
const DRACO_PATH = "/draco/v1/";
const MANIFEST = join(ROOT, ".vite", "manifest.json");
const EMBED_MODEL = join(__dirname, "dist", "server", "embed-model.js");

let manifestChunks = null;
/** Bloques JS del personalizador (src del manifest de Vite → archivos), en orden de necesidad. */
async function embedChunks() {
  if (manifestChunks) return manifestChunks;
  try {
    const manifest = JSON.parse(await readFile(MANIFEST, "utf-8"));
    const entry = Object.values(manifest).find(c => c.isEntry);
    const seen = new Set(entry ? [entry.file] : []);
    // Un bloque que además importa otro bloque (customizer, del que thermos-3d
    // toma código compartido) queda con clave "_archivo.js" y sin src: se busca
    // por el nombre del bloque dinámico.
    const keyOf = (src) => manifest[src] ? src : Object.keys(manifest).find(k =>
      manifest[k].isDynamicEntry && manifest[k].name === src.replace(/^.*\//, "").replace(/\.\w+$/, ""));
    const collect = (src) => {
      const key = keyOf(src);
      const out = [];
      const walk = (k) => {
        const c = manifest[k];
        if (!c || seen.has(c.file)) return;
        seen.add(c.file);
        for (const i of c.imports ?? []) walk(i);
        out.push(`/${c.file}`);
      };
      walk(key);
      return out;
    };
    manifestChunks = {
      // La entrada ya está como <script type=module> en el HTML; la precarga
      // con prioridad alta la pone primera (si no, compite con el resto).
      entry: entry ? `/${entry.file}` : null,
      editor: [...collect("src/App.tsx"), ...collect("src/components/customizer.tsx")],
    };
  } catch {
    manifestChunks = { entry: null, editor: [] };
  }
  return manifestChunks;
}

// Catálogo de Odoo (para saber el .glb de la variante). Embebido en este
// proceso, al api-server interno; en el deployment por artefactos (/api/* es
// otro servicio), por la URL pública. Se guarda 5 min y nunca demora el HTML
// más de CATALOG_WAIT_MS: si no llegó, la página sale sin el .glb precargado.
const CATALOG_URL = process.env.CS_CATALOG_URL
  || (EMBEDDED_API ? `http://127.0.0.1:${API_PORT}/api/catalog` : `https://${PUBLIC_HOST}/api/catalog`);
const CATALOG_TTL_MS = 5 * 60_000;
const CATALOG_WAIT_MS = 300;
let catalogCache = { at: 0, data: null, job: null };
function loadCatalog() {
  if (!catalogCache.job) {
    catalogCache.job = fetch(CATALOG_URL, { signal: AbortSignal.timeout(10_000) })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && Array.isArray(d.products)) catalogCache = { ...catalogCache, at: Date.now(), data: d }; })
      .catch(() => {})
      .finally(() => { catalogCache.job = null; });
  }
  return catalogCache.job;
}
async function catalogForPreload() {
  if (!catalogCache.data || Date.now() - catalogCache.at > CATALOG_TTL_MS) {
    const job = loadCatalog();
    if (!catalogCache.data) await Promise.race([job, new Promise(r => setTimeout(r, CATALOG_WAIT_MS))]);
  }
  return catalogCache.data;
}

let embedModelUrl = null;
async function modelUrlFor(variantId) {
  if (!/^\d{1,10}$/.test(variantId ?? "")) return null;
  try {
    embedModelUrl ??= (await import(pathToFileURL(EMBED_MODEL).href)).embedModelUrl;
    const catalog = await catalogForPreload();
    const url = catalog ? embedModelUrl(catalog, Number(variantId)) : null;
    // Solo un archivo que existe en el build.
    return url && url.startsWith("/models/") && (await resolveFile(url.split("?")[0])) ? url : null;
  } catch {
    return null;
  }
}

/** Si el .glb usa Draco (lee solo el JSON del encabezado; queda en memoria). */
const dracoCache = new Map();
async function usesDraco(modelUrl) {
  if (dracoCache.has(modelUrl)) return dracoCache.get(modelUrl);
  let draco = false;
  try {
    const buf = await readFile(join(ROOT, modelUrl.split("?")[0]));
    const len = buf.readUInt32LE(12);
    draco = buf.subarray(20, 20 + len).toString("utf-8").includes("KHR_draco_mesh_compression");
  } catch { /* sin precarga */ }
  dracoCache.set(modelUrl, draco);
  return draco;
}

/** <link> de precarga para el HTML embebido de esa variante. */
async function embedPreloads(variantId) {
  const { entry, editor } = await embedChunks();
  const model = await modelUrlFor(variantId);
  const low = ' fetchpriority="low"';
  const tags = [
    ...(entry ? [`<link rel="modulepreload" href="${entry}" fetchpriority="high">`] : []),
    ...editor.map(f => `<link rel="modulepreload" href="${f}" fetchpriority="high">`),
    // Mismo modo que el fetch() de react-query (cors, credenciales same-origin).
    `<link rel="preload" as="fetch" href="/api/catalog" crossorigin="anonymous" fetchpriority="high">`,
    ...(model ? [`<link rel="preload" as="fetch" href="${model}" crossorigin="anonymous"${low}>`] : []),
    ...(model && await usesDraco(model) ? [
      `<link rel="preload" as="fetch" href="${DRACO_PATH}draco_wasm_wrapper.js" crossorigin="anonymous"${low}>`,
      `<link rel="preload" as="fetch" href="${DRACO_PATH}draco_decoder.wasm" crossorigin="anonymous"${low}>`,
    ] : []),
  ];
  return tags.join("");
}
// Arranque en frío (autoscale): el catálogo se pide ya, no con el primer embebido.
if (SHOP_ORIGINS.length) setTimeout(loadCatalog, 1000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".glb": "model/gltf-binary",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".wasm": "application/wasm",
  ".otf": "font/otf",
};

// .glb: Draco ya comprime la geometría, pero el JSON y los buffers sueltos
// achican algo; solo se sirven comprimidos si el build dejó el .gz/.br.
const PRECOMPRESSED_ONLY = new Set(["model/gltf-binary"]);

// Text-based types are worth compressing, and so are raw TTF/OTF fonts (they're
// uncompressed containers — brotli shaves ~50%). WOFF2/images are already
// compressed, so we leave them alone to avoid burning CPU for no gain.
const COMPRESSIBLE = new Set([
  "text/html; charset=utf-8",
  "text/javascript; charset=utf-8",
  "text/css; charset=utf-8",
  "application/json; charset=utf-8",
  "image/svg+xml",
  "text/plain; charset=utf-8",
  "application/xml; charset=utf-8",
  "application/manifest+json",
  "font/ttf",
  "font/otf",
]);

// Binarios grandes del recortador de fondos (motor wasm 14 MB, modelo 44 MB):
// gzip asíncrono (en el pool de hilos, no traba el servidor como el brotli
// síncrono de arriba), una sola vez y cacheado en memoria (~34 MB en total).
const ASYNC_GZIP_EXT = new Set([".wasm", ".onnx"]);
const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);
const pendingCompress = new Map();

// In-memory cache of compressed payloads, keyed by `path|encoding`.
const compressedCache = new Map();

/**
 * Comprime fuera del hilo principal (pool de libuv): un pedido que llega
 * mientras tanto no espera. Calidad 11 solo para lo chico (HTML, docs);
 * lo grande que no vino precomprimido usa 5, que es ~10× más rápido.
 */
function compress(buffer, encoding) {
  return encoding === "br"
    ? brotliAsync(buffer, {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: buffer.length < 64 * 1024 ? 11 : 5,
          [zlibConstants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
        },
      })
    : gzipAsync(buffer, { level: buffer.length < 64 * 1024 ? 9 : 6 });
}

/** Comprime una vez por clave aunque lleguen pedidos simultáneos. */
async function compressOnce(key, load, encoding) {
  const hit = compressedCache.get(key);
  if (hit) return hit;
  let job = pendingCompress.get(key);
  if (!job) {
    job = load().then(buf => compress(buf, encoding));
    pendingCompress.set(key, job);
    job.then(p => compressedCache.set(key, p), () => {}).finally(() => pendingCompress.delete(key));
  }
  return job;
}

/** Versión precomprimida en el build (archivo.br / archivo.gz), si hay y el cliente la acepta. */
const precompressedCache = new Map();
async function precompressed(filePath, acceptEncoding = "") {
  const tries = [];
  if (acceptEncoding.includes("br")) tries.push(["br", ".br"]);
  if (acceptEncoding.includes("gzip")) tries.push(["gzip", ".gz"]);
  for (const [encoding, ext] of tries) {
    const p = filePath + ext;
    let size = precompressedCache.get(p);
    if (size === undefined) {
      try { size = (await stat(p)).size; } catch { size = null; }
      precompressedCache.set(p, size);
    }
    if (size !== null) return { encoding, path: p, size };
  }
  return null;
}

function pickEncoding(acceptEncoding = "") {
  if (acceptEncoding.includes("br")) return "br";
  if (acceptEncoding.includes("gzip")) return "gzip";
  return null;
}

// Content-hashed assets (Vite emits `name-[hash].ext`) and immutable media can
// be cached forever. index.html must always revalidate.
function cacheControlFor(pathname, search = new URLSearchParams()) {
  if (pathname === "/index.html" || pathname === "/") {
    return "no-cache";
  }
  if (
    pathname.startsWith("/assets/") ||
    // Decoder Draco: carpeta versionada (draco/v1/, ver thermos-3d.tsx).
    /^\/draco\/v\d+\//.test(pathname) ||
    // Modelos 3D: products.ts los pide con ?v=N y sube N cuando cambian.
    (pathname.startsWith("/models/") && search.has("v")) ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/galeria/") ||
    // Videos: como la galería, se versionan cambiando el nombre del archivo.
    pathname.startsWith("/video/") ||
    // Modelo del recortador de fondos (44 MB): se versiona por nombre de archivo.
    pathname.startsWith("/ai/") ||
    /\.[0-9a-f]{8,}\.[a-z0-9]+$/i.test(pathname)
  ) {
    return "public, max-age=31536000, immutable";
  }
  // Other top-level static files (logos, favicon): cache a day, revalidate.
  return "public, max-age=86400";
}

// robots.txt / sitemap.xml / llms.txt are generated from the request's Host so
// they carry the correct absolute URLs on the .replit.app domain today and on
// any custom domain later — no hardcoded origin to keep in sync.
function originFrom(req) {
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function dynamicDoc(pathname, req) {
  const origin = originFrom(req);
  if (pathname === "/robots.txt") {
    return {
      type: "text/plain; charset=utf-8",
      body: `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
    };
  }
  if (pathname === "/sitemap.xml") {
    return {
      type: "application/xml; charset=utf-8",
      body:
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `  <url>\n    <loc>${origin}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n` +
        `</urlset>\n`,
    };
  }
  if (pathname === "/llms.txt") {
    return {
      type: "text/plain; charset=utf-8",
      body:
        `# Creativa Studio\n\n` +
        `> Taller de personalización dentro de Marketplace (Avda. España, Paraguay). ` +
        `Termos, vasos, guampas, tablas, cajas, billeteras y más, con grabado láser a medida e impresión a todo color en 360° sobre vasos y termos cilíndricos (impresora UV Dacen F5).\n\n` +
        `## Secciones\n` +
        `- [Personalizador 3D](${origin}/#customizer): elegí formato, color y grabado o un diseño 360° a todo color, y previsualizá la pieza en 3D.\n` +
        `- [Impresión 360°](${origin}/#impresion-360): impresión UV a todo color en toda la vuelta del vaso.\n` +
        `- [Precios y grabado](${origin}/#precios): planes de grabado láser; impresión a color y 360° a cotizar.\n` +
        `- [Trabajos realizados](${origin}/#galeria): galería de piezas ya personalizadas.\n` +
        `- [Stickers](${origin}/#stickers): stickers con tu diseño, desde 1 unidad, de 3 a 28 cm, brillantes o con relieve 3D.\n` +
        `- [Contacto](${origin}/#contacto): WhatsApp, Instagram y ubicación del taller.\n\n` +
        `## Contacto\n` +
        `- WhatsApp: +595 981 124607\n` +
        `- Instagram: https://www.instagram.com/creativastudio.py\n` +
        `- Ubicación: Local dentro de MarketPlace, Avda. España, Paraguay\n`,
    };
  }
  return null;
}

/** Rutas que existen en la app (wouter, src/App.tsx). Sumar acá cada ruta
 *  nueva (p. ej. /personalizar), o el servidor la va a responder con 404. */
const SPA_ROUTES = new Set(["/"]);

async function resolveFile(pathname) {
  // Block path traversal, then map the URL onto the build directory.
  // Una URL mal codificada (/%E0%A4%A) hace tirar URIError a decodeURIComponent:
  // se trata como archivo inexistente en vez de dejar que tumbe el proceso.
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const clean = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  // Archivos con punto (.vite/manifest.json) no se publican.
  if (/(^|[/\\])\./.test(clean)) return null;
  let filePath = join(ROOT, clean);
  if (!filePath.startsWith(ROOT)) return null;

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) {
      filePath = join(filePath, "index.html");
      await stat(filePath);
    }
    return filePath;
  } catch {
    return null;
  }
}

async function serve(req, res) {
  const method = req.method || "GET";

  const url = new URL(req.url || "/", "http://localhost");
  let pathname = url.pathname;

  // Previews legacy (/u/<id>.png) de links ya enviados por WhatsApp. Solo
  // lectura: el upload público POST /api/design-preview se eliminó.
  if ((method === "GET" || method === "HEAD") && handleServeRequest(pathname, res)) {
    return;
  }

  // Resto de /api/* (pedidos, health) → api-server interno. /admin es el
  // panel interno del taller (vive en el api-server); si no se proxya acá,
  // caería en el fallback del SPA.
  if (!EMBEDDED_API && (pathname === "/admin" || pathname === "/admin/")) {
    res.writeHead(302, { Location: "/api/admin" });
    res.end();
    return;
  }
  if (pathname.startsWith("/api/") || pathname === "/admin" || pathname.startsWith("/admin/")) {
    proxyToApi(req, res);
    return;
  }

  const host = (req.headers["host"] || "").toLowerCase().replace(/:\d+$/, "");
  if (LEGACY_HOSTS.has(host) && (method === "GET" || method === "HEAD")) {
    res.writeHead(301, { Location: `https://${PUBLIC_HOST}${req.url || "/"}`, "Cache-Control": "public, max-age=86400" });
    res.end();
    return;
  }

  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end("Method Not Allowed");
    return;
  }

  // Generated text docs (robots/sitemap/llms) served as plain text/XML.
  const doc = dynamicDoc(pathname, req);
  if (doc) {
    const payload = Buffer.from(doc.body, "utf-8");
    const encoding = pickEncoding(req.headers["accept-encoding"]);
    const headers = {
      "Content-Type": doc.type,
      "Cache-Control": "public, max-age=3600",
      Vary: "Accept-Encoding",
    };
    if (encoding) {
      const compressed = await compress(payload, encoding);
      res.writeHead(200, { ...headers, "Content-Encoding": encoding, "Content-Length": compressed.length });
      res.end(method === "HEAD" ? undefined : compressed);
    } else {
      res.writeHead(200, { ...headers, "Content-Length": payload.length });
      res.end(method === "HEAD" ? undefined : payload);
    }
    return;
  }

  let filePath = await resolveFile(pathname);

  // SPA fallback: a route with no file extension falls back to index.html so
  // client-side routing (wouter) works on deep links. Las rutas que no existen
  // en la app (SPA_ROUTES) reciben el mismo HTML con estado 404: la app
  // muestra «Esta página no existe» y los buscadores no la indexan como copia
  // de la portada (antes respondía 200, un «soft 404»).
  let status = 200;
  if (!filePath && !extname(pathname)) {
    if (!SPA_ROUTES.has(pathname.replace(/\/+$/, "") || "/")) status = 404;
    pathname = "/index.html";
    filePath = join(ROOT, "index.html");
  }
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
  const cacheControl = cacheControlFor(pathname, url.searchParams);
  const acceptEncoding = req.headers["accept-encoding"] || "";

  const isHtml = type.startsWith("text/html");
  const embed = isHtml && url.searchParams.get("embed") === "odoo";
  // Respaldo sin iframe: la ficha manda ?odoo=<variante>&volver=<ficha>.
  const fromShop = embed || (isHtml && /^\d{1,10}$/.test(url.searchParams.get("odoo") ?? ""));
  const baseHeaders = {
    "Content-Type": type,
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    Vary: "Accept-Encoding",
    ...(isHtml ? { "Content-Security-Policy": frameAncestors(embed) } : {}),
  };

  // Desde la tienda: el HTML con los orígenes de la tienda adentro. Embebido,
  // además sin el hero y con las precargas de la pieza (embedPreloads).
  if (fromShop) {
    const encodingE = pickEncoding(acceptEncoding);
    const shell = embed && HAS_EMBED_HTML ? EMBED_HTML : filePath;
    const preloads = embed ? await embedPreloads(url.searchParams.get("product")) : "";
    const html = async () => Buffer.from(injectShopOrigins(await readFile(shell, "utf-8"), embed && shell === filePath, preloads), "utf-8");
    // La clave es el resultado (no el id que manda la URL): no crece con ids inventados.
    const payload = encodingE
      ? await compressOnce(`${shell}|${embed ? "embed" : "odoo"}|${preloads}|${encodingE}`, html, encodingE)
      : await html();
    res.writeHead(status, {
      ...baseHeaders,
      ...(encodingE ? { "Content-Encoding": encodingE } : {}),
      "Content-Length": payload.length,
    });
    res.end(method === "HEAD" ? undefined : payload);
    return;
  }

  try {
    // Precomprimido en el build: se manda el archivo .br/.gz tal cual.
    const pre = (COMPRESSIBLE.has(type) || PRECOMPRESSED_ONLY.has(type) || ASYNC_GZIP_EXT.has(extname(filePath).toLowerCase()))
      && !isHtml ? await precompressed(filePath, acceptEncoding) : null;
    if (pre) {
      res.writeHead(status, { ...baseHeaders, "Content-Encoding": pre.encoding, "Content-Length": pre.size });
      if (method === "HEAD") { res.end(); return; }
      createReadStream(pre.path).on("error", () => res.destroy()).pipe(res);
      return;
    }

    // Sin precomprimido: se comprime una vez, en segundo plano, y queda en memoria.
    const asyncGzip = ASYNC_GZIP_EXT.has(extname(filePath).toLowerCase()) && acceptEncoding.includes("gzip");
    const encoding = asyncGzip ? "gzip" : COMPRESSIBLE.has(type) ? pickEncoding(acceptEncoding) : null;
    if (encoding) {
      const payload = await compressOnce(`${filePath}|${encoding}`, () => readFile(filePath), encoding);
      res.writeHead(status, {
        ...baseHeaders,
        "Content-Encoding": encoding,
        "Content-Length": payload.length,
      });
      res.end(method === "HEAD" ? undefined : payload);
      return;
    }

    // Uncompressed (images, fonts, video): stream straight from disk.
    const info = await stat(filePath);
    // Pedidos por partes (Range): Safari en iPhone no reproduce un video si el
    // servidor no los atiende, y los demás navegadores los usan para adelantar.
    const range = status === 200 ? /^bytes=(\d*)-(\d*)$/.exec(req.headers["range"] || "") : null;
    if (range && (range[1] || range[2])) {
      let start = range[1] ? Number(range[1]) : info.size - Number(range[2]);
      let end = range[1] && range[2] ? Number(range[2]) : info.size - 1;
      start = Math.max(0, start);
      end = Math.min(end, info.size - 1);
      if (start > end || start >= info.size) {
        res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        ...baseHeaders,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${info.size}`,
        "Content-Length": end - start + 1,
      });
      if (method === "HEAD") {
        res.end();
        return;
      }
      createReadStream(filePath, { start, end }).pipe(res);
      return;
    }
    res.writeHead(status, { ...baseHeaders, "Accept-Ranges": "bytes", "Content-Length": info.size });
    if (method === "HEAD") {
      res.end();
      return;
    }
    createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
}

// Red de seguridad: un error inesperado en una request responde 500 y se
// loguea, pero nunca termina el proceso (un rechazo sin manejar lo mataba).
createServer((req, res) => {
  serve(req, res).catch((err) => {
    console.error("[termos-landing] error sirviendo", req.method, req.url, err);
    if (res.headersSent) return res.destroy();
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Error interno");
  });
}).listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`[termos-landing] production server listening on :${PORT} (serving ${ROOT})`);
});
