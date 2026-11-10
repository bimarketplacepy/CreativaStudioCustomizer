/**
 * La landing abierta desde la tienda Odoo (PROMPT-ODOO-TIENDA §2, contrato con
 * el módulo website_creativa_studio):
 *
 *  - `?embed=odoo&product=<product.product id>` — dentro del iframe del panel
 *    de la ficha: solo el personalizador, con pieza, color y tamaño fijos.
 *  - `?odoo=<id>&volver=<url de la ficha>` — respaldo sin iframe (camino 1 de
 *    PLAN-ODOO §6): la landing completa con el producto preseleccionado y un
 *    «Volver a la tienda».
 *
 * Mensajes con la ficha (`{ type, ... }`): cs:ready, cs:close,
 * cs:resize { height }, cs:checkout { portalUrl }. Se mandan y se aceptan SOLO
 * con los orígenes de la tienda (CS_SHOP_ORIGINS): el servidor los inyecta en
 * <meta name="cs-shop-origins"> (server.mjs); en desarrollo salen del build.
 */

declare const __CS_SHOP_ORIGINS__: string;

const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();

const toId = (v: string | null) => (v && /^\d{1,10}$/.test(v) ? Number(v) : null);

/** Dentro del iframe de la ficha de Odoo. */
export const isOdooEmbed = params.get("embed") === "odoo" && typeof window !== "undefined" && window.parent !== window;

/** Variante de la tienda que llega fija desde la ficha (embebida o con ?odoo=). */
export const storeVariantId: number | null = params.get("embed") === "odoo" ? toId(params.get("product")) : toId(params.get("odoo"));

/** Origen exacto de una URL https, o null. */
function originOf(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || (u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname)) ? u.origin : null;
  } catch {
    return null;
  }
}

/** Orígenes de la tienda permitidos (exactos, sin barra final). */
export function shopOrigins(): string[] {
  const meta = typeof document !== "undefined"
    ? document.querySelector<HTMLMetaElement>('meta[name="cs-shop-origins"]')?.content ?? ""
    : "";
  const raw = meta || (typeof __CS_SHOP_ORIGINS__ === "string" ? __CS_SHOP_ORIGINS__ : "");
  return [...new Set(raw.split(/[\s,]+/).map(originOf).filter((o): o is string => !!o))];
}

/**
 * Origen de la ficha que contiene el iframe, solo si está en la lista. Sale de
 * `ancestorOrigins` (Chrome, Safari) o del referrer (el iframe se abre desde la
 * ficha). Sin coincidencia: null y no se manda nada.
 */
export function parentShopOrigin(): string | null {
  if (!isOdooEmbed) return null;
  const allowed = shopOrigins();
  const candidates = [
    window.location.ancestorOrigins?.[0],
    document.referrer ? originOf(document.referrer) : null,
  ].filter((o): o is string => !!o);
  return candidates.find(o => allowed.includes(o)) ?? null;
}

export type ShopMessage =
  | { type: "cs:ready" }
  | { type: "cs:close" }
  | { type: "cs:resize"; height: number }
  | { type: "cs:checkout"; portalUrl: string };

/** Manda un mensaje a la ficha, con su origen exacto como destino. Devuelve si se mandó. */
export function postToShop(msg: ShopMessage): boolean {
  const target = parentShopOrigin();
  if (!target) return false;
  if (msg.type === "cs:checkout" && !/^\/my\/orders\/\d+\?access_token=[\w-]+/.test(msg.portalUrl)) return false;
  window.parent.postMessage(msg, target);
  return true;
}

/**
 * Escucha mensajes de la ficha: solo del iframe padre, de un origen de la
 * lista y con la forma `{ type: "cs:…" }`. Devuelve la función para dejar de escuchar.
 */
export function onShopMessage(handler: (msg: { type: string } & Record<string, unknown>) => void): () => void {
  if (!isOdooEmbed) return () => {};
  const listener = (e: MessageEvent) => {
    if (e.source !== window.parent || !shopOrigins().includes(e.origin)) return;
    const d = e.data as unknown;
    if (!d || typeof d !== "object" || typeof (d as { type?: unknown }).type !== "string" || !(d as { type: string }).type.startsWith("cs:")) return;
    handler(d as { type: string } & Record<string, unknown>);
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}

/** Avisa el alto del contenido a la ficha (cs:resize), cuando cambia. */
export function startResizeReports(el: HTMLElement): () => void {
  if (!isOdooEmbed || typeof ResizeObserver === "undefined") return () => {};
  let last = 0;
  const ro = new ResizeObserver(() => {
    const h = Math.ceil(el.scrollHeight);
    if (Math.abs(h - last) < 4) return;
    last = h;
    postToShop({ type: "cs:resize", height: h });
  });
  ro.observe(el);
  return () => ro.disconnect();
}

/**
 * «Volver a la tienda» del respaldo sin iframe: la URL de la ficha, solo si es
 * de un origen de la tienda (nunca un redirect abierto).
 */
export function backToShopUrl(): string | null {
  const raw = params.get("volver");
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return shopOrigins().includes(u.origin) ? u.toString() : null;
  } catch {
    return null;
  }
}
