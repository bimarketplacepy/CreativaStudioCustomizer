import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GALLERY_IMAGES } from "@/lib/gallery-images";

const INTERVAL_MS = 3500;

/**
 * Panel de imagen cuadrado (1:1, igual que las fotos) que va pasando entre los
 * trabajos ya realizados (carpeta "Creativa Studio Fotos"). Al coincidir la
 * proporción del marco con la de las fotos, cada una llena el cuadro completo,
 * todas se ven del mismo tamaño y sin bandas vacías.
 * Se muestra al lado del texto del hero, dividiendo la pantalla.
 */
export default function HeroCarousel({ onImageChange }: { onImageChange?: (src: string) => void }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = GALLERY_IMAGES.length;

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => {
      setIndex(i => (i + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  // Precarga la siguiente imagen para que la transición sea fluida.
  useEffect(() => {
    const next = new Image();
    next.src = GALLERY_IMAGES[(index + 1) % count].src;
  }, [index, count]);

  const current = GALLERY_IMAGES[index];

  // Report the active image up so the hero can echo it as a blurred backdrop.
  useEffect(() => {
    onImageChange?.(current.src);
  }, [current.src, onImageChange]);

  const go = (i: number) => setIndex((i + count) % count);

  return (
    <div
      className="relative w-full max-w-[512px] mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Marco cuadrado — las fotos son 1:1, así que llenan el marco exacto,
          se ven del mismo tamaño y sin espacios vacíos. */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-900 ring-1 ring-white/10 shadow-2xl">
        <AnimatePresence mode="sync">
          <motion.img
            key={current.src}
            src={current.src}
            alt={current.caption}
            className="absolute inset-0 h-full w-full object-cover"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
            transition={{ duration: reduceMotion ? 0.2 : 0.9, ease: [0.16, 1, 0.3, 1] }}
            loading="eager"
          />
        </AnimatePresence>

        {/* Degradado inferior para legibilidad del rótulo */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Etiqueta superior */}
        <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 backdrop-blur-sm">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/70">
            Trabajos realizados
          </span>
        </div>

        {/* Rótulo del trabajo actual */}
        <div className="absolute inset-x-5 bottom-14">
          <AnimatePresence mode="wait">
            <motion.p
              key={current.caption}
              className="text-lg font-semibold text-white drop-shadow"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              {current.caption}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Flechas */}
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => go(index - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => go(index + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>

      {/* Barra de progreso / puntos */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {GALLERY_IMAGES.map((img, i) => (
          <button
            key={img.src}
            type="button"
            aria-label={`Ir a ${img.caption}`}
            onClick={() => go(i)}
            className={
              "h-1.5 rounded-full transition-all " +
              (i === index ? "w-6 bg-[#8B1A2F]" : "w-1.5 bg-white/25 hover:bg-white/50")
            }
          />
        ))}
      </div>
    </div>
  );
}
