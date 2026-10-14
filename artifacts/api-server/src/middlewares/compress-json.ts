import type { NextFunction, Request, Response } from "express";
import { brotliCompressSync, gzipSync, constants as zlib } from "node:zlib";

/** Debajo de esto la compresión no compensa el header extra. */
const MIN_BYTES = 1024;

/**
 * Comprime con brotli/gzip la respuesta de `res.json()` según Accept-Encoding.
 *
 * En producción /api/* llega directo a este server (sin server.mjs delante) y
 * el edge de Replit no comprime: GET /api/catalog viajaba como ~38 KB de JSON
 * crudo en cada carga de la landing. Brotli lo deja en ~5 KB.
 *
 * Pensado para respuestas JSON chicas/medianas y por ruta (no global): la
 * compresión es síncrona, y no conviene aplicarla a payloads de MB como los
 * previews de pedidos del panel.
 */
export function compressJson(req: Request, res: Response, next: NextFunction): void {
  const accept = String(req.headers["accept-encoding"] ?? "");
  const encoding = accept.includes("br") ? "br" : accept.includes("gzip") ? "gzip" : null;
  res.vary("Accept-Encoding");
  if (!encoding) {
    next();
    return;
  }

  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    const raw = Buffer.from(JSON.stringify(body));
    if (raw.length < MIN_BYTES) return json(body);
    const compressed =
      encoding === "br"
        ? brotliCompressSync(raw, {
            params: {
              [zlib.BROTLI_PARAM_QUALITY]: 5,
              [zlib.BROTLI_PARAM_SIZE_HINT]: raw.length,
            },
          })
        : gzipSync(raw, { level: 6 });
    res.setHeader("Content-Encoding", encoding);
    res.type("application/json");
    return res.send(compressed);
  };
  next();
}
