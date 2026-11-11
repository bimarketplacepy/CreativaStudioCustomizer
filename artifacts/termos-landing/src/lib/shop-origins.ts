/**
 * Orígenes de la tienda Odoo que pueden incrustar el personalizador y hablar
 * con él (CS_SHOP_ORIGINS, separados por coma o espacio). Lo usan el servidor
 * (server.mjs: CSP `frame-ancestors` y <meta name="cs-shop-origins">) y el
 * navegador (lib/embed.ts: destino y validación de cada postMessage). Sin
 * dependencias y solo con sintaxis que Node 24 ejecuta tal cual.
 *
 * Cada entrada es:
 *  - un origen exacto: `https://www.marketplace.com.py` (solo https; http solo
 *    para localhost / 127.0.0.1, en pruebas), o
 *  - un patrón con UN `*` en la primera etiqueta del dominio, para los builds
 *    de Odoo.sh, que cambian de URL en cada build:
 *    `https://marketplace-staging-261109-*.dev.odoo.com`. El `*` es una o más
 *    letras, números o guiones (nunca un punto: no cruza a otro subdominio).
 *
 * CSP solo acepta el comodín como etiqueta entera a la izquierda, así que el
 * patrón va al `frame-ancestors` como `https://*.dev.odoo.com`. postMessage no
 * acepta comodines: el origen real de la ficha se valida contra el patrón
 * estricto y se usa exacto como destino.
 */

export interface ShopOriginRule {
  /** La entrada normalizada (minúsculas, sin ruta). */
  source: string;
  /** Fuente para `frame-ancestors`. */
  csp: string;
  /** ¿Este origen exacto (`https://host[:puerto]`) corresponde a la regla? */
  test: (origin: string) => boolean;
}

const LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function parseOne(raw: string): ShopOriginRule | null {
  const m = raw.trim().toLowerCase().match(/^(https?):\/\/([^/:?#]+)(?::(\d{1,5}))?(?:[/?#].*)?$/);
  if (!m) return null;
  const [, scheme, host, port] = m;
  const labels = host.split(".");

  if (!host.includes("*")) {
    const local = /^(localhost|127\.0\.0\.1)$/.test(host);
    if (scheme !== "https" && !local) return null;
    if (!local && (labels.length < 2 || !labels.every(l => LABEL.test(l)))) return null;
    const origin = `${scheme}://${host}${port ? `:${port}` : ""}`;
    return { source: origin, csp: origin, test: o => o === origin };
  }

  // Patrón: https, sin puerto, un solo `*` y en la primera etiqueta, y al
  // menos dos etiquetas fijas después (nada de `https://*.com`).
  const [first, ...rest] = labels;
  if (scheme !== "https" || port || (host.match(/\*/g) ?? []).length !== 1 || !first.includes("*")) return null;
  if (rest.length < 2 || !rest.every(l => LABEL.test(l))) return null;
  const [pre, post] = first.split("*");
  if (!/^[a-z0-9-]*$/.test(pre) || !/^[a-z0-9-]*$/.test(post)) return null;
  const suffix = rest.join(".");
  const re = new RegExp(`^https://${escape(pre)}[a-z0-9-]+${escape(post)}\\.${escape(suffix)}$`);
  return { source: `https://${host}`, csp: `https://*.${suffix}`, test: o => re.test(o) };
}

/** Reglas de CS_SHOP_ORIGINS; lo que no es un origen o patrón válido se ignora. */
export function parseShopOrigins(raw: string | null | undefined): ShopOriginRule[] {
  const out: ShopOriginRule[] = [];
  for (const part of String(raw ?? "").split(/[\s,]+/)) {
    if (!part) continue;
    const rule = parseOne(part);
    if (rule && !out.some(r => r.source === rule.source)) out.push(rule);
  }
  return out;
}

/** ¿El origen (exacto, como `MessageEvent.origin`) es de la tienda? */
export function isShopOrigin(rules: readonly ShopOriginRule[], origin: string | null | undefined): boolean {
  return !!origin && rules.some(r => r.test(origin));
}

/** Fuentes de `frame-ancestors`, sin repetir. */
export function cspSources(rules: readonly ShopOriginRule[]): string[] {
  return [...new Set(rules.map(r => r.csp))];
}
