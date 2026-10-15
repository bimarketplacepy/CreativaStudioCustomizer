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
//   - SPA fallback: unknown non-file routes return index.html.
//   - Serves robots.txt / sitemap.xml / llms.txt as plain text when present.
//
// Listens on $PORT (Replit autoscale sets this), defaulting to 3000.

import { createServer, request as httpRequest } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, normalize, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzip, gzipSync, brotliCompressSync, constants as zlibConstants } from "node:zlib";
import { promisify } from "node:util";
import { handleServeRequest } from "./upload-store.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "dist", "public");
const PORT = Number(process.env.PORT) || 3000;

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
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "API no disponible" }));
  });
  req.pipe(upstream);
}

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
  ".wasm": "application/wasm",
  ".otf": "font/otf",
};

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
const pendingGzip = new Map();

// In-memory cache of compressed payloads, keyed by `path|encoding`.
const compressedCache = new Map();

function compress(buffer, encoding) {
  return encoding === "br"
    ? brotliCompressSync(buffer, {
        params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
      })
    : gzipSync(buffer, { level: 9 });
}

function pickEncoding(acceptEncoding = "") {
  if (acceptEncoding.includes("br")) return "br";
  if (acceptEncoding.includes("gzip")) return "gzip";
  return null;
}

// Content-hashed assets (Vite emits `name-[hash].ext`) and immutable media can
// be cached forever. index.html must always revalidate.
function cacheControlFor(pathname) {
  if (pathname === "/index.html" || pathname === "/") {
    return "no-cache";
  }
  if (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/galeria/") ||
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
        `> Taller de personalización premium dentro de MarketPlace (Avda. España, Paraguay). ` +
        `Termos, vasos, guampas, tablas, cajas, billeteras y más, grabados a medida con láser o impresión a color.\n\n` +
        `## Secciones\n` +
        `- [Personalizador 3D](${origin}/#customizer): elegí formato, color y grabado y previsualizá la pieza en 3D.\n` +
        `- [Precios y grabado](${origin}/#precios): planes de grabado láser e impresión a color.\n` +
        `- [Trabajos realizados](${origin}/#galeria): galería de piezas ya personalizadas.\n` +
        `- [Stickers](${origin}/#stickers): stickers personalizados con tu diseño.\n` +
        `- [Contacto](${origin}/#contacto): WhatsApp, Instagram y ubicación del taller.\n\n` +
        `## Contacto\n` +
        `- WhatsApp: +595 981 124607\n` +
        `- Instagram: https://www.instagram.com/creativastudio.py\n` +
        `- Ubicación: Local dentro de MarketPlace, Avda. España, Paraguay\n`,
    };
  }
  return null;
}

async function resolveFile(pathname) {
  // Block path traversal, then map the URL onto the build directory.
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
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

  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD, POST" });
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
      const compressed = compress(payload, encoding);
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
  // client-side routing (wouter) works on deep links.
  if (!filePath && !extname(pathname)) {
    pathname = "/index.html";
    filePath = join(ROOT, "index.html");
  }
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
  const cacheControl = cacheControlFor(pathname);
  const asyncGzip = ASYNC_GZIP_EXT.has(extname(filePath).toLowerCase())
    && (req.headers["accept-encoding"] || "").includes("gzip");
  const encoding = asyncGzip ? "gzip" : COMPRESSIBLE.has(type) ? pickEncoding(req.headers["accept-encoding"]) : null;

  const baseHeaders = {
    "Content-Type": type,
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    Vary: "Accept-Encoding",
  };

  try {
    if (encoding) {
      const key = `${filePath}|${encoding}`;
      let payload = compressedCache.get(key);
      if (!payload && asyncGzip) {
        // Pedidos simultáneos comparten la misma compresión.
        let job = pendingGzip.get(key);
        if (!job) {
          job = readFile(filePath).then(buf => gzipAsync(buf, { level: 6 }));
          pendingGzip.set(key, job);
          job.finally(() => pendingGzip.delete(key)).catch(() => {});
        }
        payload = await job;
        compressedCache.set(key, payload);
      } else if (!payload) {
        payload = compress(await readFile(filePath), encoding);
        compressedCache.set(key, payload);
      }
      res.writeHead(200, {
        ...baseHeaders,
        "Content-Encoding": encoding,
        "Content-Length": payload.length,
      });
      res.end(method === "HEAD" ? undefined : payload);
      return;
    }

    // Uncompressed (images, fonts): stream straight from disk.
    const info = await stat(filePath);
    res.writeHead(200, { ...baseHeaders, "Content-Length": info.size });
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

createServer(serve).listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`[termos-landing] production server listening on :${PORT} (serving ${ROOT})`);
});
