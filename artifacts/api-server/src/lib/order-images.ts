// Storage for order preview images, following the same pattern as the
// landing's design-preview store: Replit Object Storage as the durable copy
// (survives restarts/autoscale), fronted by a small in-memory cache that also
// keeps things working when the bucket is unreachable (e.g. outside Replit).

import { logger } from "./logger";

/** Decoded image cap (~3MB) — the customizer sends a ~1080px JPEG well below this. */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const MAX_CACHE_ENTRIES = 60;

type Entry = { buf: Buffer; type: string };
const cache = new Map<string, Entry>();

type StorageClient = {
  uploadFromBytes(name: string, buf: Buffer): Promise<{ ok: boolean; error?: unknown }>;
  downloadAsBytes(name: string): Promise<{ ok: boolean; value?: Buffer | Buffer[] }>;
};

let clientPromise: Promise<StorageClient | null> | null = null;
/** Lazy Object Storage client; resolves null when the bucket is unavailable. */
function getClient(): Promise<StorageClient | null> {
  if (!clientPromise) {
    clientPromise = import("@replit/object-storage")
      .then(({ Client }) => new Client() as unknown as StorageClient)
      .catch(() => null);
  }
  return clientPromise;
}
// Client init (import + sidecar auth) costs seconds; warm it at server start.
getClient();

export type ParsedImage = { buf: Buffer; type: string; ext: "png" | "jpg" };

/** Parse and validate a base64 image data URL. Returns null when invalid. */
export function parseImageDataUrl(dataUrl: string): ParsedImage | "too-large" | null {
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/i);
  if (!m) return null;
  const buf = Buffer.from(m[2]!, "base64");
  if (buf.length > MAX_IMAGE_BYTES) return "too-large";
  const type = m[1]!.toLowerCase();
  return { buf, type, ext: type === "image/png" ? "png" : "jpg" };
}

function cacheSet(name: string, entry: Entry) {
  cache.set(name, entry);
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value as string;
    cache.delete(oldest);
  }
}

/**
 * Store an arbitrary order file under `name` and return it. Bucket write raced
 * against a short timeout so a slow sidecar never blocks the order flow — the
 * memory copy serves the immediate reads while the upload finishes behind.
 */
export async function storeOrderFile(name: string, buf: Buffer, type: string): Promise<string> {
  cacheSet(name, { buf, type });

  const persisted = (async () => {
    const client = await getClient();
    if (!client) return;
    const result = await client.uploadFromBytes(name, buf);
    if (result && result.ok === false) {
      logger.error({ name, error: result.error }, "order file: bucket upload failed");
    }
  })().catch((err) => {
    logger.error({ name, err }, "order file: bucket upload failed");
  });
  await Promise.race([persisted, new Promise((r) => setTimeout(r, 2500))]);

  return name;
}

/** Store the preview under `orders/<orderNumber>.<ext>` and return the name. */
export function storeOrderImage(orderNumber: string, img: ParsedImage): Promise<string> {
  return storeOrderFile(`orders/${orderNumber}.${img.ext}`, img.buf, img.type);
}

/** Content type inferred from a stored object name. */
function typeForName(name: string): string {
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

/** Fetch a stored preview (memory cache first, then bucket). Null when missing. */
export async function loadOrderImage(name: string): Promise<Entry | null> {
  const hit = cache.get(name);
  if (hit) return hit;

  const client = await getClient();
  if (!client) return null;
  try {
    const result = await client.downloadAsBytes(name);
    if (!result.ok) return null;
    // v1 of the SDK wraps the payload in a single-element array.
    const buf = Array.isArray(result.value) ? result.value[0] : result.value;
    if (!buf || !buf.length) return null;
    const entry: Entry = { buf, type: typeForName(name) };
    cacheSet(name, entry);
    return entry;
  } catch {
    return null;
  }
}
