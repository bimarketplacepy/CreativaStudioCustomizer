/**
 * Las secciones bajo el fold se montan recién cuando se acercan al viewport
 * (DeferUntilVisible con `revealable`). Eso deja fuera de la carga inicial su
 * JS (framer-motion, Radix Slider, el fetch del catálogo) y su render.
 *
 * El costo: sus ids (#stickers, #precios, #contacto…) no existen hasta que se
 * montan. scrollToSection() resuelve la navegación interna: monta todas las
 * secciones revelables, espera a que el id aparezca y recién ahí scrollea.
 *
 * Módulo chico y sin dependencias a propósito: lo importa el hero (chunk de
 * entrada) y lo comparte con DeferUntilVisible (chunk de la app).
 */

let revealed = false;
const listeners = new Set<() => void>();

export function isRevealed(): boolean {
  return revealed;
}

export function onReveal(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function revealAllSections(): void {
  if (revealed) return;
  revealed = true;
  listeners.forEach(fn => fn());
}

/**
 * Scroll suave al elemento y, al terminar, una corrección si quedó corrido: en
 * el camino se puede montar algo de arriba (el personalizador, por
 * IntersectionObserver) y cambiar de alto. Sin `scrollend` (Safari viejo)
 * simplemente no corrige.
 */
function scrollAndSettle(target: HTMLElement): void {
  target.scrollIntoView({ behavior: "smooth" });
  window.addEventListener(
    "scrollend",
    () => {
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      if (Math.abs(target.getBoundingClientRect().top - margin) > 8) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    },
    { once: true },
  );
}

/**
 * La herramienta de stickers vive dentro del personalizador (modo "Stickers").
 * #stickers es la sección que la presenta (stickers-promo.tsx); openStickerTool()
 * abre la herramienta, e ir a #customizer vuelve al modo de productos. El modo
 * queda guardado por si el personalizador todavía no montó (es diferido); al
 * montar lo toma con takeCustomizerMode().
 */
export type CustomizerMode = "products" | "stickers";
export const CUSTOMIZER_MODE_EVENT = "cs:customizer-mode";
let pendingMode: CustomizerMode | null = null;

export function takeCustomizerMode(): CustomizerMode | null {
  const m = pendingMode;
  pendingMode = null;
  return m;
}

function requestMode(mode: CustomizerMode): void {
  pendingMode = mode;
  window.dispatchEvent(new Event(CUSTOMIZER_MODE_EVENT));
}

/** Abre la herramienta de stickers (el personalizador en modo "Stickers"). */
export function openStickerTool(): void {
  requestMode("stickers");
  scrollToId("customizer");
}

/** Scroll suave a un id de sección, montándola antes si estaba diferida. */
export function scrollToSection(id: string): void {
  if (id === "customizer") requestMode("products");
  scrollToId(id);
}

function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (el) {
    scrollAndSettle(el);
    return;
  }
  revealAllSections();
  // Los chunks pueden tardar en bajar: reintentar por frame hasta que el id
  // exista y no quede ningún placeholder de sección (data-section-pending, el
  // fallback de Suspense en home.tsx) por encima, porque al resolverse cambia
  // de alto y correría el destino. Con tope, por si el id no existe.
  const deadline = performance.now() + 5000;
  const retry = () => {
    const target = document.getElementById(id);
    const settled =
      target &&
      ![...document.querySelectorAll("[data-section-pending]")].some(
        el => el.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    if (target && (settled || performance.now() >= deadline)) {
      scrollAndSettle(target);
    } else if (performance.now() < deadline) {
      requestAnimationFrame(retry);
    }
  };
  requestAnimationFrame(retry);
}

/**
 * Arranque del personalizador desde fuera (portada, sección 360°, precios):
 * texto a grabar, "Traigo el mío" o impresión a color. Mismo patrón que el
 * modo: queda pendiente si el personalizador todavía no montó, y si ya está
 * montado lo toma al instante por el evento.
 */
export interface StartIntent {
  text?: string;
  ownProduct?: boolean;
  technique?: "color";
}
export const CUSTOMIZER_START_EVENT = "cs:customizer-start";
let pendingStart: StartIntent | null = null;

export function takeStartIntent(): StartIntent | null {
  const s = pendingStart;
  pendingStart = null;
  return s;
}

export function startCustomizer(intent: StartIntent): void {
  pendingStart = intent;
  window.dispatchEvent(new Event(CUSTOMIZER_START_EVENT));
  scrollToSection("customizer");
}
