import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * IPs de proxies propios: loopback/privadas (server.mjs, red interna) y los
 * rangos del balanceador de Google que usa el edge de Replit.
 */
function isProxyHop(ip: string): boolean {
  const v4 = ip.replace(/^::ffff:/, "");
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(v4)) return true;
  if (/^35\.191\./.test(v4) || /^130\.211\.[0-3]\./.test(v4)) return true;
  const lower = ip.toLowerCase();
  return lower === "::1" || /^(fc|fd|fe80)/.test(lower);
}

/**
 * IP real del cliente. X-Forwarded-For lo puede mandar el propio cliente con
 * cualquier valor, y cada proxy AGREGA la IP que vio al final. Por eso se
 * recorre de derecha a izquierda salteando los proxies propios: la primera IP
 * que queda es la que vio nuestro edge, y lo que el cliente inventó a la
 * izquierda nunca se lee.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const chain = (typeof forwarded === "string" ? forwarded.split(",") : [])
    .map((s) => s.trim())
    .filter(Boolean);
  const socket = req.socket.remoteAddress;
  if (socket) chain.push(socket);
  for (let i = chain.length - 1; i >= 0; i--) {
    if (!isProxyHop(chain[i])) return chain[i];
  }
  return chain[0] ?? "unknown";
}

/** Más IPs distintas que esto en memoria: se descartan las más viejas. */
const MAX_KEYS = 5000;

/**
 * Minimal in-memory fixed-window rate limiter (per IP). Enough to stop
 * casual spam on order creation without pulling in a dependency; state is
 * per-instance, which is fine for this scale.
 */
export function rateLimit(opts: { max: number; windowMs: number }): RequestHandler {
  const hits = new Map<string, number[]>();
  let lastSweep = 0;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = clientIp(req);

    const windowStart = now - opts.windowMs;
    const recent = (hits.get(ip) ?? []).filter((t) => t > windowStart);

    if (recent.length >= opts.max) {
      res.status(429).json({ message: "Demasiados pedidos desde esta IP. Probá de nuevo más tarde." });
      return;
    }

    recent.push(now);
    // delete + set: la clave pasa al final del orden de inserción, así las
    // primeras del Map son siempre las menos recientes.
    hits.delete(ip);
    hits.set(ip, recent);

    // Limpieza de vencidas como mucho una vez por minuto (no en cada request),
    // y un tope duro para que el Map no crezca sin límite.
    if (hits.size > MAX_KEYS && now - lastSweep > 60_000) {
      lastSweep = now;
      for (const [key, times] of hits) {
        if (times.every((t) => t <= windowStart)) hits.delete(key);
      }
    }
    while (hits.size > MAX_KEYS) {
      const oldest = hits.keys().next().value;
      if (oldest === undefined) break;
      hits.delete(oldest);
    }

    next();
  };
}

/**
 * Solo pedidos desde la propia landing: si el navegador manda Origin, tiene
 * que ser el mismo host. Sin esto, cualquier sitio podría usar /api/ai/* con
 * los navegadores (y las IPs) de sus visitantes.
 */
export function sameOriginOnly(req: Request, res: Response, next: NextFunction) {
  if (isSameOrigin(req)) {
    next();
    return;
  }
  res.status(403).json({ message: "Origen no permitido." });
}

export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // mismo origen en GET, o fuera de un navegador
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
