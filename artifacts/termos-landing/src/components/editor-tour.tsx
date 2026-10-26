import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Onboarding de la pantalla de Diseño del celular, en tres capas:
 * 1. EditorTour: tres pasos, de a un cartel (Coachmark), solo la primera visita.
 * 2. Hint: avisos puntuales (AR, Listo) sin scrim, que no bloquean.
 * 3. El "Arrastrá para girar" del lienzo vive en customizer.tsx.
 *
 * Todo va DENTRO de la pantalla de Diseño (MobileDesignScreen, que es `fixed`):
 * absolute inset-0 y posiciones medidas con getBoundingClientRect.
 */

export const TOUR_KEY = "mkp.editor.tour.v1";
export const HINT_AR_KEY = "mkp.editor.hint.ar.v1";
export const HINT_DONE_KEY = "mkp.editor.hint.done.v1";

/** localStorage puede fallar (modo privado, bloqueado): nunca rompe la app. */
export function seen(key: string): boolean {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}
export function markSeen(key: string): void {
  try { localStorage.setItem(key, "1"); } catch { /* se mostrará de nuevo */ }
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const EASE = "cubic-bezier(.4,0,.2,1)";

export interface TourStep {
  target: React.RefObject<HTMLElement | null>;
  title: string;
  body: string;
  placement: "top" | "bottom";
  pad: number;
  radius: number;
}

interface Rect { x: number; y: number; w: number; h: number }

/**
 * Tour de pasos con spotlight real (box-shadow enorme, sin máscaras). Los pasos
 * cuyo target no está en el DOM se saltean. Mientras está abierto, la UI de
 * abajo no recibe toques: un toque en cualquier lado avanza.
 */
export function EditorTour({ steps, open, onClose }: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const reduce = usePrefersReducedMotion();
  const [i, setI] = useState(0);
  const [layout, setLayout] = useState<{
    spot: Rect; radius: number; card: { x: number; y: number; w: number };
    tail: { x: number; y: number };
  } | null>(null);

  const live = steps.filter(s => {
    const r = s.target.current?.getBoundingClientRect();
    return !!r && r.width > 0 && r.height > 0;
  });
  const step = live[Math.min(i, live.length - 1)];
  const last = i >= live.length - 1;

  useEffect(() => { if (open) setI(0); }, [open]);
  useEffect(() => { if (open && live.length === 0) onClose(); }, [open, live.length, onClose]);

  const measure = useCallback(() => {
    const root = rootRef.current, card = cardRef.current, el = step?.target.current;
    if (!root || !card || !el) return;
    const sb = root.getBoundingClientRect();
    const tb = el.getBoundingClientRect();
    const x = tb.left - sb.left, y = tb.top - sb.top;
    const pad = step.pad;
    const cw = sb.width < 258 ? sb.width - 24 : 234;
    card.style.width = `${cw}px`;
    const ch = card.offsetHeight;
    const cx = clamp(x + tb.width / 2 - cw / 2, 12, sb.width - cw - 12);
    let cy = step.placement === "top" ? y - pad - 16 - ch : y + tb.height + pad + 16;
    cy = clamp(cy, 12, sb.height - ch - 12);
    setLayout({
      spot: { x: x - pad, y: y - pad, w: tb.width + pad * 2, h: tb.height + pad * 2 },
      radius: step.radius,
      card: { x: cx, y: cy, w: cw },
      tail: {
        x: clamp(x + tb.width / 2 - cx - 6, 18, cw - 30),
        y: step.placement === "top" ? ch - 6 : -6,
      },
    });
  }, [step]);

  // Recalcular en cada paso y en resize / rotación.
  useLayoutEffect(() => {
    if (!open || !step) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, step, measure]);

  // Foco en la acción primaria al abrir cada paso (recién visible, ya medido).
  const placed = layout !== null;
  useEffect(() => { if (open && placed) nextRef.current?.focus({ preventScroll: true }); }, [open, i, placed]);

  const advance = () => (last ? onClose() : setI(n => n + 1));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "Tab") {
      // Tab cicla solo entre Saltar y Siguiente.
      e.preventDefault();
      (document.activeElement === nextRef.current ? skipRef : nextRef).current?.focus();
    }
  };

  if (!open || !step) return null;

  const move = reduce ? "opacity .12s" : `all .28s ${EASE}`;
  const cardMove = reduce ? "opacity .12s" : `left .28s ${EASE}, top .28s ${EASE}`;
  const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <div ref={rootRef} className="absolute inset-0 z-[70]" onKeyDown={onKeyDown}>
      {/* Capa que captura los toques: nada de abajo es interactivo durante el tour. */}
      <div className="absolute inset-0" onClick={advance} aria-hidden />
      {layout && (
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            left: layout.spot.x, top: layout.spot.y, width: layout.spot.w, height: layout.spot.h,
            borderRadius: layout.radius, boxShadow: "0 0 0 9999px rgba(26,19,17,.62)", transition: move,
          }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-tour-title"
        className="absolute bg-white text-foreground rounded-[14px] pt-[13px] px-[15px] pb-[11px] shadow-[0_10px_26px_rgba(26,19,17,.3)]"
        style={{
          left: layout?.card.x ?? 12, top: layout?.card.y ?? 12, width: layout?.card.w ?? 234,
          visibility: layout ? "visible" : "hidden", transition: cardMove,
        }}
      >
        {layout && (
          <span
            aria-hidden
            className="absolute w-3 h-3 bg-white rotate-45 rounded-[2px]"
            style={{ left: layout.tail.x, top: layout.tail.y }}
          />
        )}
        <h4 id="editor-tour-title" className="relative font-serif text-[15px] font-bold tracking-[-.01em] mb-[3px]">
          {step.title}
        </h4>
        <p className="relative text-[12.5px] leading-[1.4] text-[#7B726B]">{step.body}</p>
        <div className="relative flex items-center gap-2.5 mt-[11px]">
          <span className="text-[11px] text-[#7B726B] tabular-nums">{i + 1} de {live.length}</span>
          <button
            ref={skipRef}
            type="button"
            onClick={onClose}
            className={`ml-auto text-xs text-[#7B726B] bg-transparent border-0 px-0.5 py-1 rounded ${focusRing}`}
          >
            Saltar
          </button>
          <button
            ref={nextRef}
            type="button"
            onClick={advance}
            className={`rounded-full bg-primary text-primary-foreground text-[12.5px] font-bold px-[15px] py-[7px] ${focusRing}`}
          >
            {last ? "Entendido" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Aviso puntual anclado a un control: sin scrim, no bloquea ni roba el foco.
 * Se oculta solo a `ms` o (con `dismissOnTap`) al primer toque en cualquier lado.
 */
export function Hint({ target, text, show, ms, onDone, align = "below", dismissOnTap }: {
  target: React.RefObject<HTMLElement | null>;
  text: string;
  show: boolean;
  ms: number;
  onDone: () => void;
  /** Debajo del control (AR, en el header) o arriba (Listo, abajo de todo). */
  align?: "below" | "above";
  dismissOnTap?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ right: number; top?: number; bottom?: number; tail: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useLayoutEffect(() => {
    if (!show) { setVisible(false); return; }
    const root = rootRef.current?.getBoundingClientRect();
    const tb = target.current?.getBoundingClientRect();
    if (!root || !tb || tb.width === 0) { onDoneRef.current(); return; }
    const right = Math.max(12, root.right - tb.right);
    setPos({
      right,
      ...(align === "below" ? { top: tb.bottom - root.top + 10 } : { bottom: root.bottom - tb.top + 10 }),
      // Cola al centro del control, medido desde la derecha del aviso.
      tail: Math.max(10, root.right - right - (tb.left + tb.width / 2) - 4.5),
    });
    const id = requestAnimationFrame(() => setVisible(true));
    const hide = setTimeout(() => setVisible(false), ms);
    const done = setTimeout(() => onDoneRef.current(), ms + 260);
    const tap = () => { setVisible(false); setTimeout(() => onDoneRef.current(), 260); };
    if (dismissOnTap) window.addEventListener("pointerdown", tap, { once: true });
    return () => {
      cancelAnimationFrame(id); clearTimeout(hide); clearTimeout(done);
      window.removeEventListener("pointerdown", tap);
    };
  }, [show, target, ms, align, dismissOnTap]);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[65]" aria-live="polite">
      {show && pos && (
        <div
          role="status"
          className="absolute max-w-[170px] rounded-[9px] bg-[#1E1A18] px-[11px] py-[7px] text-[11.5px] font-bold text-white shadow-[0_6px_16px_rgba(26,19,17,.3)] motion-safe:transition-[opacity,translate] duration-[250ms]"
          style={{
            right: pos.right, top: pos.top, bottom: pos.bottom,
            opacity: visible ? 1 : 0,
            translate: visible ? "0 0" : `0 ${align === "below" ? -4 : 4}px`,
          }}
        >
          {text}
          <span
            aria-hidden
            className="absolute w-[9px] h-[9px] bg-[#1E1A18] rotate-45"
            style={{ right: pos.tail, ...(align === "below" ? { top: -4 } : { bottom: -4 }) }}
          />
        </div>
      )}
    </div>
  );
}
