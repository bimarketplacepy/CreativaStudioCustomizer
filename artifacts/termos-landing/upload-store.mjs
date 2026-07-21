// Store for design-preview images, shared by the Vite dev server
// (configureServer middleware) and the production static server (server.mjs).
//
// The customizer captures an image of the finished 3D piece and POSTs it here;
// we hand back a public URL (/u/<id>.png|jpg) that goes into the WhatsApp
// message so the image previews in the chat.
//
// Durability: every upload is written to the Replit Object Storage bucket
// (configured in .replit), so the URL keeps working across server restarts and
// autoscale instances — WhatsApp may fetch the preview, and the shop may open
// the link, long after the instance that served the upload is gone. A small
// in-memory cache fronts the bucket for fast repeated serves, and doubles as
// the only store if the bucket is unreachable (e.g. running outside Replit).

const MAX_ENTRIES = 60;
const TTL_MS = 60 * 60 * 1000; // memory-cache TTL; the bucket copy has no TTL
// Roomy enough for the raw-PNG fallback when the client-side JPEG re-encode
// fails; the normal path sends a ~1080px JPEG well under 1 MB.
const MAX_BYTES = 8 * 1024 * 1024;

/** id -> { buf: Buffer, type: string, at: number } */
const store = new Map();

let clientPromise = null;
/** Lazy Object Storage client; resolves null when the bucket is unavailable. */
function getClient() {
  if (!clientPromise) {
    clientPromise = import("@replit/object-storage")
      .then(({ Client }) => new Client())
      .catch(() => null);
  }
  return clientPromise;
}
// Initialising the client (import + sidecar auth) costs seconds; kick it off at
// server start so the first customer upload never pays for it.
getClient();

const objectName = (id, ext) => `design-previews/${id}.${ext}`;
const extToType = (ext) => (ext === "png" ? "image/png" : "image/jpeg");

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
 * Handle POST /api/design-preview with JSON body `{ dataUrl }` (a data: PNG or
 * JPEG). Responds `{ url: "/u/<id>.<ext>" }`. The bucket write is awaited so a
 * returned URL is durable, but a bucket failure never blocks the flow — the
 * memory copy still serves it for the immediate capture → send round-trip.
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
    const ext = m[1] === "image/jpeg" ? "jpg" : "png";
    store.set(id, { buf, type: m[1], at: Date.now() });

    // Persist to the bucket for durability, but never hold the response
    // hostage: the customer's WhatsApp flow races this endpoint against a
    // timeout, and the memory copy already serves the immediate round-trip.
    // Waiting briefly covers the common case (a warm client finishes in
    // ~150 ms); anything slower keeps running in the background.
    const persisted = (async () => {
      const client = await getClient();
      if (!client) return;
      const result = await client.uploadFromBytes(objectName(id, ext), buf);
      if (result && result.ok === false) {
        console.error("design-preview: bucket upload failed:", result.error?.message ?? result.error);
      }
    })().catch((err) => {
      console.error("design-preview: bucket upload failed:", err?.message ?? err);
    });
    await Promise.race([persisted, new Promise((r) => setTimeout(r, 2500))]);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ url: `/u/${id}.${ext}` }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: String((err && err.message) || err) }));
  }
}

/** Memory-cache miss: pull the image back from the bucket and re-warm the cache. */
async function fetchFromBucket(id, ext) {
  const client = await getClient();
  if (!client) return null;
  try {
    const result = await client.downloadAsBytes(objectName(id, ext));
    if (!result.ok) return null;
    // v1 of the SDK wraps the payload in a single-element array.
    const buf = Array.isArray(result.value) ? result.value[0] : result.value;
    if (!buf || !buf.length) return null;
    const entry = { buf, type: extToType(ext), at: Date.now() };
    store.set(id, entry);
    return entry;
  } catch {
    return null;
  }
}

async function serve(id, ext, res) {
  const entry = store.get(id) ?? (await fetchFromBucket(id, ext));
  if (!entry) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", entry.type);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.end(entry.buf);
}

/**
 * Serve GET /u/<id>.<ext>. Returns true if the path matched — the response is
 * then answered (possibly asynchronously, after a bucket round-trip); false
 * lets the caller fall through to its normal routing.
 */
export function handleServeRequest(pathname, res) {
  const m = pathname.match(/^\/u\/([a-z0-9]+)\.(png|jpe?g)$/i);
  if (!m) return false;
  const ext = m[2].toLowerCase() === "png" ? "png" : "jpg";
  serve(m[1], ext, res);
  return true;
}
