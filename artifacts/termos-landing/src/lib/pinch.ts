/**
 * Pellizco con dos dedos sobre el visor 3D: agranda o achica el diseño que se
 * está editando (reemplaza a los botones + / − en el celular).
 *
 * Se registra ANTES que los listeners propios del visor: así, cuando apoya el
 * segundo dedo, el visor ya sabe que es un pellizco (`isActive()`) y no lo toma
 * como otro arrastre. Mientras el pellizco está habilitado se bloquea el zoom
 * de la página (touchstart/touchmove con dos dedos y los `gesture*` de Safari).
 */
export type PinchPhase = "start" | "move" | "end";

export interface PinchOptions {
  /** ¿Hay un diseño en edición? Si no, dos dedos no hacen nada especial. */
  enabled: () => boolean;
  /**
   * `factor` es la distancia actual entre los dedos dividida la inicial
   * (1 = sin cambio). "move" llega a lo sumo una vez por cuadro.
   */
  onPinch: (phase: PinchPhase, factor: number) => void;
  /**
   * Sin diseño en edición: al apoyar el segundo dedo se pregunta si el gesto
   * cae sobre un diseño (lo selecciona y devuelve true). Así se pellizca sin
   * tener que tocarlo antes.
   */
  claim?: (points: { x: number; y: number }[]) => boolean;
}

export function trackPinch(el: HTMLElement, opts: PinchOptions) {
  const pts = new Map<number, { x: number; y: number }>();
  let active = false;
  let startDist = 1;
  let factor = 1;
  let raf = 0;

  const dist = () => {
    const [a, b] = [...pts.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && !active && (opts.enabled() || !!opts.claim?.([...pts.values()]))) {
      active = true;
      startDist = Math.max(1, dist());
      factor = 1;
      opts.onPinch("start", 1);
    }
  };
  const onMove = (e: PointerEvent) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!active || pts.size < 2) return;
    factor = dist() / startDist;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; opts.onPinch("move", factor); });
  };
  const onUp = (e: PointerEvent) => {
    if (!pts.delete(e.pointerId)) return;
    if (active && pts.size < 2) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      active = false;
      opts.onPinch("end", factor);
    }
  };
  const blockTouch = (e: TouchEvent) => {
    if (e.touches.length >= 2 && (active || opts.enabled()) && e.cancelable) e.preventDefault();
  };
  const blockGesture = (e: Event) => { if (opts.enabled()) e.preventDefault(); };

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  el.addEventListener("touchstart", blockTouch, { passive: false });
  el.addEventListener("touchmove", blockTouch, { passive: false });
  el.addEventListener("gesturestart", blockGesture);
  el.addEventListener("gesturechange", blockGesture);

  return {
    /** Dos dedos apoyados con el pellizco en curso. */
    isActive: () => active,
    dispose: () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("touchstart", blockTouch);
      el.removeEventListener("touchmove", blockTouch);
      el.removeEventListener("gesturestart", blockGesture);
      el.removeEventListener("gesturechange", blockGesture);
    },
  };
}
