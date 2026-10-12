/**
 * Eventos del embudo → dataLayer de GTM. index.html crea el dataLayer antes de
 * cargar gtm.js (que va diferido), así que los eventos tempranos quedan en cola
 * y no se pierden. En GTM: un trigger "Evento personalizado" por nombre.
 *
 * Eventos:
 *   cta_click                 { location }              CTA del hero/galería → personalizador
 *   whatsapp_click            { location }              cualquier link directo a WhatsApp
 *   customizer_view           {}                        el personalizador entró en pantalla (1 vez)
 *   customizer_step           { step, step_name }       avance/retroceso del wizard móvil
 *   customizer_material_select{ material }
 *   customizer_product_select { material, product }
 *   customizer_size_select    { product, size }
 *   order_submit              { product, material, technique, has_text, has_icon, has_image }
 *   order_created             { order_number, product }
 *   order_fallback            { product }               backend caído/lento: salió solo por WhatsApp
 *   sticker_upload            { background_removed }    diseño subido en la sección Stickers
 *   sticker_order_submit      { size_mm, quantity, finish, cut, has_image }
 */
type Params = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function track(event: string, params: Params = {}): void {
  try {
    (window.dataLayer = window.dataLayer || []).push({ event, ...params });
  } catch {
    /* la analítica nunca debe romper la UI */
  }
}

/**
 * Un único listener delegado para todo link a wa.me: cubre FAB, footer y
 * "A tu medida" sin cablear cada <a>. `location` sale de un `data-track` del
 * ancestro más cercano, o del id de la sección que contiene al link.
 */
export function initWhatsAppLinkTracking(): void {
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href*="wa.me/"]');
      if (!a) return;
      const tagged = a.closest<HTMLElement>("[data-track]")?.dataset.track;
      const section = a.closest("section, footer, header");
      track("whatsapp_click", { location: tagged ?? (section?.id || section?.tagName.toLowerCase() || "unknown") });
    },
    { capture: true },
  );
}
