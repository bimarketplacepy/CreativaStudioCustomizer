import React, { useEffect, useRef, useState } from "react";
import { GALLERY_IMAGES } from "@/lib/gallery-images";

const INTERVAL_MS = 3500;

/**
 * `sizes` describe el ancho real del marco: ~100vw menos el padding del hero en
 * móvil, y 512px fijo en desktop. Con eso el browser en un móvil DPR~1.75
 * (~640 device px) elige la variante de 700px en vez de la de 900px.
 *
 * IMPORTANTE: este string debe ser idéntico al `imagesizes` del <link
 * rel="preload"> del LCP en index.html, o el preload de la primera imagen se
 * desperdicia (bajaría un recurso distinto).
 */
const CAROUSEL_SIZES = "(min-width: 1024px) 512px, calc(100vw - 3rem)";

/** Deriva la ruta de la variante 700px a partir de la original de 900px. */
const variant700 = (src: string) => src.replace(/\.webp$/, "-700.webp");
const srcSetFor = (src: string) => `${variant700(src)} 700w, ${src} 900w`;

/**
 * Panel de imagen cuadrado (1:1, igual que las fotos) que va pasando entre los
 * trabajos ya realizados (carpeta "Creativa Studio Fotos"). Al coincidir la
 * proporción del marco con la de las fotos, cada una llena el cuadro completo,
 * todas se ven del mismo tamaño y sin bandas vacías.
 * Se muestra al lado del texto del hero, dividiendo la pantalla.
 *
 * Las transiciones son CSS puro (clase .hero-img-fade / .hero-caption-rise en
 * index.css). Antes usaba framer-motion, pero eso lo metía en el bundle de
 * entrada y competía con el LCP; ahora el primer frame pinta sin animación y
 * sin JS de animación en el critical path.
 */
export default function HeroCarousel({ onImageChange }: { onImageChange?: (src: string) => void }) {
  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = GALLERY_IMAGES.length;

  // El primer frame es el elemento LCP: se pinta estático, sin fade. Sólo los
  // frames siguientes hacen cross-fade.
  const firstPaint = useRef(true);
  useEffect(() => {
    firstPaint.current = false;
  }, []);

  // Con prefers-reduced-motion el carrusel no avanza solo (WCAG 2.2.2);
  // flechas y swipe siguen operativos.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Tras una interacción manual (flecha o swipe), el autoplay espera 8s.
  const resumeTimer = useRef<number | null>(null);
  const noteInteraction = () => {
    setTouchPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setTouchPaused(false), 8000);
  };
  useEffect(() => () => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
  }, []);

  useEffect(() => {
    if (hoverPaused || touchPaused || reducedMotion || count <= 1) return;
    const id = window.setInterval(() => {
      setIndex(i => (i + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [hoverPaused, touchPaused, reducedMotion, count]);

  // Precarga la siguiente imagen para que la transición sea fluida. Bajo lg el
  // marco muestra la variante 700px: precargar esa, no la 900 (datos móviles).
  useEffect(() => {
    const src = GALLERY_IMAGES[(index + 1) % count].src;
    const next = new Image();
    next.src = window.matchMedia("(min-width: 1024px)").matches ? src : variant700(src);
  }, [index, count]);

  const current = GALLERY_IMAGES[index];

  // Report the active image up so the hero can echo it as a blurred backdrop.
  useEffect(() => {
    onImageChange?.(current.src);
  }, [current.src, onImageChange]);

  const go = (i: number) => setIndex((i + count) % count);

  // Swipe táctil: touch-action pan-y deja el scroll vertical al navegador (si
  // el gesto es vertical llega pointercancel y no navegamos); acá sólo se
  // resuelve el desplazamiento horizontal al soltar.
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return; // el mouse ya tiene flechas + hover
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    noteInteraction();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      go(index + (dx < 0 ? 1 : -1));
    }
  };

  return (
    <div
      className="relative w-full max-w-[512px] mx-auto"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      {/* Marco cuadrado — las fotos son 1:1, así que llenan el marco exacto,
          se ven del mismo tamaño y sin espacios vacíos. */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-900 ring-1 ring-white/10 shadow-2xl"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        {/* keyed por src: al cambiar el índice, React remonta la <img> y la clase
            .hero-img-fade retriggerea el cross-fade. El primer frame no lleva la
            clase (firstPaint) para no retrasar el LCP. */}
        <img
          key={current.src}
          src={current.src}
          srcSet={srcSetFor(current.src)}
          sizes={CAROUSEL_SIZES}
          alt={current.caption}
          width={900}
          height={900}
          className={
            "absolute inset-0 h-full w-full object-cover" +
            (firstPaint.current ? "" : " hero-img-fade")
          }
          loading="eager"
          decoding="async"
          // The first frame is the hero's LCP element — prioritise it.
          fetchPriority={index === 0 ? "high" : "auto"}
        />

        {/* Degradado inferior para legibilidad del rótulo */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Etiqueta superior */}
        <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 backdrop-blur-sm">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/70">
            Trabajos realizados
          </span>
        </div>

        {/* Rótulo del trabajo actual — key por índice para que el fade se
            retriggeree en cada cambio (varias fotos comparten caption). */}
        <div className="absolute inset-x-5 bottom-14">
          <p key={index} className="hero-caption-rise text-lg font-semibold text-white drop-shadow">
            {current.caption}
          </p>
        </div>

        {/* Flechas */}
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => { go(index - 1); noteInteraction(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white active:bg-black/70"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => { go(index + 1); noteInteraction(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white active:bg-black/70"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>

      {/* Contador de posición — reemplaza a los 31 puntos de 6px, ilegibles
          como indicador. aria-hidden: la imagen activa ya se anuncia por su
          alt y las flechas dan la navegación accesible. */}
      <div className="mt-4 flex items-center justify-center" aria-hidden="true">
        <span className="text-xs tabular-nums tracking-[0.2em] text-white/70">
          {index + 1} / {count}
        </span>
      </div>
    </div>
  );
}
