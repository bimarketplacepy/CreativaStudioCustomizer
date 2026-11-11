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
 * con los orígenes de la tienda (CS_SHOP_ORIGINS, con patrones para los builds
 * de staging: lib/shop-origins.ts): el servidor los inyecta en
 * <meta name="cs-shop-origins"> (server.mjs); en desarrollo salen del build.
 * postMessage no acepta comodines: el destino es siempre el origen real de la
 * ficha, validado contra esas reglas.
 */
import * as React from "react";
import { isShopOrigin, parseShopOrigins, type ShopOriginRule } from "./shop-origins";

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

let rulesCache: ShopOriginRule[] | null = null;
/** Reglas de los orígenes de la tienda (exactos o patrones de staging). */
export function shopOriginRules(): ShopOriginRule[] {
  if (rulesCache) return rulesCache;
  const meta = typeof document !== "undefined"
    ? document.querySelector<HTMLMetaElement>('meta[name="cs-shop-origins"]')?.content ?? ""
    : "";
  const raw = meta || (typeof __CS_SHOP_ORIGINS__ === "string" ? __CS_SHOP_ORIGINS__ : "");
  return (rulesCache = parseShopOrigins(raw));
}

/**
 * Origen de la ficha que contiene el iframe, solo si está en la lista. Sale de
 * `ancestorOrigins` (Chrome, Safari) o del referrer (el iframe se abre desde la
 * ficha). Sin coincidencia: null y no se manda nada.
 */
export function parentShopOrigin(): string | null {
  if (!isOdooEmbed) return null;
  const rules = shopOriginRules();
  const candidates = [
    window.location.ancestorOrigins?.[0],
    document.referrer ? originOf(document.referrer) : null,
  ].filter((o): o is string => !!o);
  return candidates.find(o => isShopOrigin(rules, o)) ?? null;
}

export type ShopMessage =
  | { type: "cs:ready" }
  | { type: "cs:close" }
  | { type: "cs:resize"; height: number }
  | { type: "cs:checkout"; portalUrl: string };

let readySent = false;
let closeSent = false;

/** Manda un mensaje a la ficha, con su origen exacto como destino. Devuelve si se mandó. */
export function postToShop(msg: ShopMessage): boolean {
  const target = parentShopOrigin();
  if (!target) return false;
  if (msg.type === "cs:checkout" && !/^\/my\/orders\/\d+\?access_token=[\w-]+/.test(msg.portalUrl)) return false;
  if (msg.type === "cs:ready") readySent = true;
  if (msg.type === "cs:close") closeSent = true;
  window.parent.postMessage(msg, target);
  return true;
}

/** Fallo de carga antes de cs:ready: cerrar el panel en lugar de dejar la ficha esperando. */
export function closeIfNotReady(): void {
  if (isOdooEmbed && !readySent && !closeSent) postToShop({ type: "cs:close" });
}

/** Sin cs:ready a los 15 s (la ficha corta a los 25 s): algo quedó trabado. */
const EMBED_READY_TIMEOUT_MS = 15_000;
const CHUNK_ERROR = /dynamically imported module|importing a module script failed|loading chunk/i;

/**
 * Vigía del embebido (desde main.tsx, antes de pedir App): cs:close si un
 * chunk JS o CSS no baja, si falla un import() dinámico o si cs:ready no
 * llega a tiempo. Después de cs:ready no hace nada: el editor ya se usa.
 */
export function startEmbedWatchdog(): void {
  if (!isOdooEmbed) return;
  const timer = window.setTimeout(closeIfNotReady, EMBED_READY_TIMEOUT_MS);
  const onResourceError = (e: Event) => {
    const t = e.target;
    if (t instanceof HTMLScriptElement || (t instanceof HTMLLinkElement && /stylesheet|modulepreload/.test(t.rel))) closeIfNotReady();
  };
  const onRejection = (e: PromiseRejectionEvent) => {
    const r = e.reason as { message?: unknown } | undefined;
    if (CHUNK_ERROR.test(String(r?.message ?? r ?? ""))) closeIfNotReady();
  };
  window.addEventListener("error", onResourceError, true);
  window.addEventListener("unhandledrejection", onRejection);
  // Vite avisa así cuando un chunk precargado no baja.
  window.addEventListener("vite:preloadError", closeIfNotReady);
  const stop = () => {
    if (!readySent && !closeSent) return;
    window.clearTimeout(timer);
    window.removeEventListener("error", onResourceError, true);
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("vite:preloadError", closeIfNotReady);
    window.clearInterval(poll);
  };
  const poll = window.setInterval(stop, 500);
}

/**
 * Escucha mensajes de la ficha: solo del iframe padre, de un origen de la
 * lista y con la forma `{ type: "cs:…" }`. Devuelve la función para dejar de escuchar.
 */
export function onShopMessage(handler: (msg: { type: string } & Record<string, unknown>) => void): () => void {
  if (!isOdooEmbed) return () => {};
  const listener = (e: MessageEvent) => {
    if (e.source !== window.parent || !isShopOrigin(shopOriginRules(), e.origin)) return;
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
    return isShopOrigin(shopOriginRules(), u.origin) ? u.toString() : null;
  } catch {
    return null;
  }
}

// ── Parte visible del iframe ─────────────────────────────────────────────────
// La ficha estira el iframe al alto del contenido (cs:resize), así que un
// `position: fixed` centrado queda en la mitad del documento, no donde mira el
// cliente. IntersectionObserver, dentro de un iframe de otro origen, recorta
// contra la ventana de la ficha: con franjas invisibles de 50 px (umbrales
// cada 10 px) se sabe qué banda del iframe se ve, sin mensajes nuevos.

/** Banda visible del iframe, en coordenadas del documento (px). */
export interface VisibleBand { top: number; bottom: number }

const STRIP_PX = 50;
let band: VisibleBand | null = null;
const bandListeners = new Set<() => void>();
let bandStarted = false;

function startVisibleBand(): void {
  if (bandStarted || !isOdooEmbed || typeof IntersectionObserver === "undefined") return;
  bandStarted = true;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;top:0;left:0;width:1px;pointer-events:none;opacity:0;z-index:-1";
  document.body.appendChild(host);
  const seen = new Map<Element, VisibleBand | null>();
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const r = e.intersectionRect;
      seen.set(e.target, e.isIntersecting && r.height > 0 ? { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY } : null);
    }
    let top = Infinity, bottom = -Infinity;
    for (const b of seen.values()) if (b) { top = Math.min(top, b.top); bottom = Math.max(bottom, b.bottom); }
    const next = bottom > top ? { top, bottom } : null;
    if (next?.top === band?.top && next?.bottom === band?.bottom) return;
    band = next;
    bandListeners.forEach(l => l());
  }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
  // Una franja cada 50 px de alto; se rehacen cuando cambia el alto.
  let built = 0;
  const build = () => {
    const h = Math.ceil(document.documentElement.scrollHeight);
    if (Math.abs(h - built) < STRIP_PX) return;
    built = h;
    io.disconnect();
    seen.clear();
    host.replaceChildren();
    host.style.height = `${h}px`;
    for (let y = 0; y < h; y += STRIP_PX) {
      const s = document.createElement("div");
      s.style.cssText = `position:absolute;left:0;width:1px;top:${y}px;height:${Math.min(STRIP_PX, h - y)}px`;
      host.appendChild(s);
      io.observe(s);
    }
  };
  build();
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(build).observe(document.body);
}

/**
 * Embebido: la banda del iframe que el cliente tiene en pantalla (null fuera
 * del embebido o mientras no se sabe). Para centrar modales donde se ven.
 */
export function useVisibleBand(): VisibleBand | null {
  const subscribe = React.useCallback((cb: () => void) => {
    startVisibleBand();
    bandListeners.add(cb);
    window.addEventListener("scroll", cb, { passive: true });
    return () => { bandListeners.delete(cb); window.removeEventListener("scroll", cb); };
  }, []);
  return React.useSyncExternalStore(subscribe, () => band, () => null);
}
