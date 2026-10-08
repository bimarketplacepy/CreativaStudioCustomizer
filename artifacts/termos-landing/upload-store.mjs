// Read-only store for LEGACY design-preview images (/u/<id>.png|jpg), shared by
// the Vite dev server and the production server (server.mjs).
//
// The upload endpoint (POST /api/design-preview) was removed: the customizer
// now creates orders via POST /api/orders (api-server), which stores the
// preview itself. The public, unauthenticated upload let anyone write 8 MB
// files to the bucket with no rate limit and no expiry. Serving is kept so
// links already sent in past WhatsApp chats keep working.
//
// Durability: every upload is written to the Replit Object Storage bucket
// (configured in .replit), so the URL keeps working across server restarts and
// autoscale instances — WhatsApp may fetch the preview, and the shop may open
// the link, long after the instance that served the upload is gone. A small
// in-memory cache fronts the bucket for fast repeated serves, and doubles as
// the only store if the bucket is unreachable (e.g. running outside Replit).

const MAX_ENTRIES = 60;
const TTL_MS = 60 * 60 * 1000; // memory-cache TTL; the bucket copy has no TTL

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
