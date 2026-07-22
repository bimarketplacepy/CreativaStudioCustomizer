import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Minimal in-memory fixed-window rate limiter (per IP). Enough to stop
 * casual spam on order creation without pulling in a dependency; state is
 * per-instance, which is fine for this scale.
 */
export function rateLimit(opts: { max: number; windowMs: number }): RequestHandler {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    // Behind the Replit proxy the client IP is the first x-forwarded-for hop.
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ||
      req.socket.remoteAddress ||
      "unknown";

    const windowStart = now - opts.windowMs;
    const recent = (hits.get(ip) ?? []).filter((t) => t > windowStart);

    if (recent.length >= opts.max) {
      res.status(429).json({ message: "Demasiados pedidos desde esta IP. Probá de nuevo más tarde." });
      return;
    }

    recent.push(now);
    hits.set(ip, recent);

    // Opportunistic cleanup so the map never grows unbounded.
    if (hits.size > 1000) {
      for (const [key, times] of hits) {
        if (times.every((t) => t <= windowStart)) hits.delete(key);
      }
    }

    next();
  };
}
