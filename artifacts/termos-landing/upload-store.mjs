// Tiny in-memory store for design-preview PNGs, shared by the Vite dev server
// (configureServer middleware) and the production static server (server.mjs).
//
// The customizer captures a PNG of the finished 3D piece and POSTs it here; we
// keep it in memory and hand back a public URL (/u/<id>.png) that goes into the
// WhatsApp message so the image previews in the chat.
//
// Caveats (v1): the store is in-memory, so entries are lost on restart and are
// not shared across autoscale instances. For the immediate "capture → send"
// flow this is fine in dev and single-instance prod. The durable upgrade is the
// Replit object-storage bucket already configured in .replit.

const MAX_ENTRIES = 60;
const TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB per image

/** id -> { buf: Buffer, type: string, at: number } */
const store = new Map();

function prune() {
  const now = Date.now();
  for (const [id, e] of store) {
    if (now - e.at > TTL_MS) store.delete(id);
  }
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    store.delete(oldest);
  }
}

function makeId() {
  // No crypto import needed; collision-safe enough for short-lived previews.
  return (
    Date.now().toString(36) +
    Math.floor(Math.random() * 1e9).toString(36)
  );
}

/** Read the full request body as a Buffer, rejecting oversized payloads. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BYTES) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * Handle POST /api/design-preview with JSON body `{ dataUrl }` (a data: PNG).
 * Responds `{ url: "/u/<id>.png" }`. Returns true if it handled the request.
 */
export async function handleUploadRequest(req, res) {
  try {
    const raw = await readBody(req);
    let dataUrl;
    try {
      dataUrl = JSON.parse(raw.toString("utf8")).dataUrl;
    } catch {
      dataUrl = null;
    }
    const m = typeof dataUrl === "string" && dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
    if (!m) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "invalid dataUrl" }));
      return;
    }
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > MAX_BYTES) {
      res.statusCode = 413;
      res.end(JSON.stringify({ error: "too large" }));
      return;
    }
    prune();
    const id = makeId();
    store.set(id, { buf, type: m[1], at: Date.now() });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ url: `/u/${id}.png` }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: String((err && err.message) || err) }));
  }
}

/**
 * Serve GET /u/<id>.png. Returns true if the path matched (and was handled),
 * false otherwise so the caller can fall through to its normal routing.
 */
export function handleServeRequest(pathname, res) {
  const m = pathname.match(/^\/u\/([a-z0-9]+)\.png$/i);
  if (!m) return false;
  const entry = store.get(m[1]);
  if (!entry) {
    res.statusCode = 404;
    res.end("Not found");
    return true;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", entry.type);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.end(entry.buf);
  return true;
}
