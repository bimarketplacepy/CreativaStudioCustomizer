import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Guía de primer uso de la pantalla de Diseño del celular: oscurece la pantalla,
 * deja a la vista los controles (agregar, girar, AR, Listo) con una frase
 * corta numerada en cada uno y se desvanece sola a los pocos segundos (o al
 * tocar en cualquier lado). Se muestra una sola vez por dispositivo.
 *
 * Va DENTRO de MobileDesignScreen (que es `fixed`): se ubica con absolute
 * inset-0 y mide los controles con getBoundingClientRect.
 */

export interface DesignTip {
  /** Control que se señala. Si no está en pantalla (ej. AR sin soporte), el paso no se muestra. */
  target: React.RefObject<HTMLElement | null>;
  text: string;
  /** Dónde va la frase respecto del control. */
  place: "left" | "below-left" | "above-left" | "center";
  /** Hueco con la forma del control (píldora); "none" para el visor (queda oscurecido, la frase va encima). */
  shape?: "pill" | "none";
}

const STORAGE_KEY = "cs-design-tips";
const SHOW_DELAY_MS = 700;
const VISIBLE_MS = 6500;

interface Box { x: number; y: number; w: number; h: number }

export function DesignTips({ tips, enabled }: { tips: DesignTip[]; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [boxes, setBoxes] = useState<(Box | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Una sola vez por dispositivo; recién cuando la pantalla está lista.
  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch { /* sin storage: se muestra igual, una vez por carga */ }
    const show = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* idem */ }
      setOpen(true);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(show);
  }, [enabled]);

  useEffect(() => {
    if (!open) return;
    const hide = setTimeout(() => setOpen(false), VISIBLE_MS);
    return () => clearTimeout(hide);
  }, [open]);

  // Posición de cada control, relativa a la pantalla de Diseño.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const root = rootRef.current?.getBoundingClientRect();
      if (!root) return;
      setBoxes(tips.map(t => {
        const r = t.target.current?.getBoundingClientRect();
        if (!r || r.width === 0 || r.height === 0) return null;
        return { x: r.left - root.left, y: r.top - root.top, w: r.width, h: r.height };
      }));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, tips]);

  const shown = tips
    .map((t, i) => ({ ...t, box: boxes[i] }))
    .filter((t): t is DesignTip & { box: Box } => !!t.box);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={rootRef}
          key="design-tips"
          role="status"
          aria-label="Cómo usar el diseñador"
          className="absolute inset-0 z-[70] cursor-pointer select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          transition={{ duration: 0.3 }}
          onClick={() => setOpen(false)}
        >
          {/* Fondo oscuro con un hueco sobre cada control señalado. */}
          <svg className="absolute inset-0 w-full h-full" aria-hidden>
            <defs>
              <mask id="design-tips-holes">
                <rect width="100%" height="100%" fill="white" />
                {shown.map((t, i) => t.shape === "none" ? null : (
                  <rect key={i} x={t.box.x - 5} y={t.box.y - 5} width={t.box.w + 10} height={t.box.h + 10} rx={t.box.h / 2 + 5} fill="black" />
                ))}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(20,16,14,0.62)" mask="url(#design-tips-holes)" />
          </svg>

          {shown.map((t, i) => (
            <div key={i} className="absolute" style={bubbleStyle(t.place, t.box)}>
              <motion.p
                className="w-max max-w-[13rem] flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-[13px] leading-snug font-medium text-foreground shadow-lg"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.3 }}
              >
                <span className="shrink-0 w-5 h-5 mt-px grid place-items-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                  {i + 1}
                </span>
                <span>{t.text}</span>
              </motion.p>
            </div>
          ))}

          {/* Cómo cerrarla y cuánto falta para que se cierre sola. */}
          <div className="absolute inset-x-0 bottom-[38%] flex flex-col items-center gap-2 pointer-events-none">
            <span className="text-xs font-medium text-white/90">Tocá en cualquier lado para empezar</span>
            <span className="block w-24 h-1 rounded-full bg-white/25 overflow-hidden">
              <motion.span
                className="block h-full bg-white"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: VISIBLE_MS / 1000, ease: "linear" }}
              />
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Frase junto al control, sin salirse de la pantalla (16 px de margen). */
function bubbleStyle(place: DesignTip["place"], b: Box): React.CSSProperties {
  const gap = 12;
  switch (place) {
    case "left":
      return { right: `calc(100% - ${b.x - gap}px)`, top: b.y + b.h / 2, transform: "translateY(-50%)" };
    case "below-left":
      return { right: `max(16px, calc(100% - ${b.x + b.w}px))`, top: b.y + b.h + gap };
    case "above-left":
      return { right: `max(16px, calc(100% - ${b.x + b.w}px))`, bottom: `calc(100% - ${b.y - gap}px)` };
    case "center":
      return { left: "50%", top: b.y + b.h * 0.3, transform: "translateX(-50%)" };
  }
}
