import React, { useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Img = { src: string; caption: string };

/**
 * Lightbox de la galería — overlay propio, sin librerías. Se monta recién al
 * primer tap sobre una miniatura (lazy en gallery.tsx), así no suma nada al
 * bundle inicial ni al camino crítico. Muestra la variante 900w que ya existe
 * en /galeria y el caption siempre visible (en móvil no hay hover).
 * Cierres: X (44px), tap fuera de la foto, Escape y swipe vertical.
 */
export default function GalleryLightbox({ images, index, onClose, onNavigate }: {
  images: Img[];
  index: number;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const img = images[index];
  const count = images.length;
  const go = (i: number) => onNavigate((i + count) % count);

  // Escape cierra; flechas navegan. Scroll del body bloqueado mientras esté abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  });

  // Gestos: swipe horizontal navega, swipe vertical (>80px) cierra.
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    gesture.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) { onClose(); return; }
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ampliada: ${img.caption}`}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      style={{ touchAction: "none" }}
      onClick={onClose}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (gesture.current = null)}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white/90 hover:bg-white/25 active:bg-white/25 transition-colors"
        style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* stopPropagation: tocar la foto o el caption no cierra; el fondo sí. */}
      <figure className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <img
          key={img.src}
          src={img.src}
          alt={img.caption}
          width={900}
          height={900}
          decoding="async"
          className="w-full max-h-[76vh] object-contain rounded-xl select-none"
          draggable={false}
        />
        <figcaption className="mt-4 flex items-center justify-between gap-3 text-white">
          <span className="text-sm font-light">{img.caption}</span>
          <span className="text-xs tabular-nums text-white/60 shrink-0" aria-hidden>
            {index + 1} / {count}
          </span>
        </figcaption>
      </figure>

      <button
        type="button"
        aria-label="Anterior"
        onClick={(e) => { e.stopPropagation(); go(index - 1); }}
        className="absolute left-2 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white/90 hover:bg-white/25 active:bg-white/25 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        aria-label="Siguiente"
        onClick={(e) => { e.stopPropagation(); go(index + 1); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white/90 hover:bg-white/25 active:bg-white/25 transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
