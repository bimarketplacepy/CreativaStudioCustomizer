/**
 * "Diseñar uno igual": la galería le pide al personalizador que arranque con un
 * producto. Puede pasar antes de que el personalizador esté montado (es una
 * sección diferida), así que el pedido queda guardado hasta que lo consuma.
 */
export interface DesignPreset {
  materialId: string;
  materialProductId: string;
}

const EVENT = "cs:design-preset";
let pending: DesignPreset | null = null;

export function requestDesignPreset(p: DesignPreset): void {
  pending = p;
  window.dispatchEvent(new Event(EVENT));
}

/** El personalizador se suscribe al montar; recibe también un pedido previo. */
export function onDesignPreset(fn: (p: DesignPreset) => void): () => void {
  const flush = () => {
    if (!pending) return;
    const p = pending;
    pending = null;
    fn(p);
  };
  flush();
  window.addEventListener(EVENT, flush);
  return () => window.removeEventListener(EVENT, flush);
}
