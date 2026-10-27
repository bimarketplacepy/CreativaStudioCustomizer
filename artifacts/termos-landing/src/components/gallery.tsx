import React, { Suspense, lazy, useMemo, useState } from "react";
import { GALLERY_IMAGES, type GalleryKind } from "@/lib/gallery-images";
import { track } from "@/lib/analytics";
import { scrollToSection, startCustomizer } from "@/lib/section-reveal";
import { requestDesignPreset } from "@/lib/design-preset";

// El lightbox se monta recién al primer tap: su chunk no toca el bundle inicial.
const GalleryLightbox = lazy(() => import("@/components/gallery-lightbox"));

/** «Todo» muestra la selección variada; cada material, todas sus fotos. */
const FILTERS: { id: "todo" | GalleryKind; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "color", label: "Impresión a color" },
  { id: "acero", label: "Acero" },
  { id: "cuero", label: "Cuero" },
  { id: "madera", label: "Madera" },
  { id: "cristal", label: "Cristal" },
  { id: "otros", label: "Otros" },
];

export default function Gallery() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("todo");
  const images = useMemo(
    () => GALLERY_IMAGES.filter(img => (filter === "todo" ? img.featured : img.kind === filter)),
    [filter],
  );
  const [lightbox, setLightbox] = useState<number | null>(null);

  const designLike = (idx: number) => {
    const img = images[idx];
    if (!img) return;
    setLightbox(null);
    // La foto 360° no tiene preset de producto: va directo al panel 360°.
    if (img.kind === "color" && !img.preset) {
      track("cta_click", { location: "galeria_disenar_igual", product: "360" });
      startCustomizer({ technique: "color" });
      return;
    }
    if (!img.preset) return;
    track("cta_click", { location: "galeria_disenar_igual", product: img.preset.materialProductId });
    requestDesignPreset(img.preset);
    scrollToSection("customizer");
  };
  const canDesignLike = (idx: number) => !!images[idx]?.preset || images[idx]?.kind === "color";

  return (
    <section id="galeria" aria-labelledby="galeria-title" className="scroll-mt-16 bg-[var(--cs-acero)]">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 md:py-24">
        <h2 id="galeria-title" className="font-serif font-light text-[var(--cs-ink)] text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05]">
          Piezas que ya viven con alguien
        </h2>
        <p className="mt-3 text-[var(--cs-grafito)] text-base md:text-lg max-w-[36rem]">
          Trabajos reales del taller. Si te gusta uno, empezá el tuyo desde esa pieza.
        </p>

        <div role="group" aria-label="Filtrar por material" className="mt-7 -mx-5 sm:mx-0 px-5 sm:px-0 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => { setFilter(f.id); track("gallery_filter", { kind: f.id }); }}
              className={`shrink-0 min-h-11 px-4 rounded-full border text-sm font-medium transition-colors ${
                filter === f.id
                  ? "bg-[var(--cs-ink)] border-[var(--cs-ink)] text-white"
                  : "bg-white border-[var(--cs-line)] text-[var(--cs-grafito)] hover:border-[var(--cs-ink)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <ul className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-7 list-none p-0">
          {images.map((img, idx) => (
            <li key={img.src} className="grid gap-2.5 content-start">
              <div className="group relative aspect-[4/5] overflow-hidden rounded-[14px] bg-neutral-200">
                <img
                  src={img.src}
                  // Celda de ~190px en celular (2 col) a ~296px en escritorio
                  // (4 col): el navegador elige el archivo de 700px.
                  srcSet={`${img.src.replace(/\.webp$/, "-700.webp")} 700w, ${img.src} 900w`}
                  sizes="(min-width: 1280px) 296px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                  alt={img.caption}
                  width={900}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                />
                <button
                  type="button"
                  aria-label={`Ver en grande: ${img.caption}`}
                  onClick={() => setLightbox(idx)}
                  className="absolute inset-0 z-10 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--cs-bordo)]"
                />
                {canDesignLike(idx) && (
                  <button
                    type="button"
                    onClick={() => designLike(idx)}
                    className="absolute right-2 bottom-2 z-20 inline-flex items-center gap-1.5 min-h-9 px-2.5 rounded-lg bg-white/95 text-[var(--cs-ink)] text-[12.5px] font-semibold shadow-sm hover:bg-white"
                  >
                    <svg aria-hidden className="w-3.5 h-3.5 text-[var(--cs-bordo)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                    Diseñar uno igual
                  </button>
                )}
              </div>
              <p className="text-sm md:text-[15px] text-[var(--cs-ink)] leading-snug">{img.caption}</p>
            </li>
          ))}
        </ul>

        {lightbox !== null && (
          <Suspense fallback={null}>
            <GalleryLightbox
              images={images}
              index={lightbox}
              onClose={() => setLightbox(null)}
              onNavigate={setLightbox}
              onDesignLike={designLike}
            />
          </Suspense>
        )}
      </div>
    </section>
  );
}
