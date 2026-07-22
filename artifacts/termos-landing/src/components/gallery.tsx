import React, { Suspense, lazy, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { GALLERY_IMAGES } from "@/lib/gallery-images";

/** A curated selection of real work — a lookbook, not a dump of every file. */
const CURATED = GALLERY_IMAGES.slice(0, 12);

// El lightbox se monta recién al primer tap: su chunk no toca el bundle inicial.
const GalleryLightbox = lazy(() => import("@/components/gallery-lightbox"));

export default function Gallery() {
  const scrollToCustomizer = () => {
    document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth" });
  };
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <section id="galeria" className="scroll-mt-20 bg-white py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <p className="text-[#8B1A2F] text-[11px] font-semibold uppercase tracking-[0.3em] mb-4">
            El taller
          </p>
          <h2 className="font-serif font-light text-3xl md:text-5xl text-[#1A1614] leading-[1.1] mb-5">
            Piezas que ya viven con alguien
          </h2>
          <p className="text-[#5f574d] font-light text-lg leading-relaxed">
            Una selección de trabajos realizados en Creativa Studio. Cada una, pensada para una sola persona.
          </p>
        </div>

        {/* Lookbook grid */}
        <MotionConfig reducedMotion="user">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {CURATED.map((img, idx) => (
            <motion.figure
              key={img.src}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: (idx % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-100"
            >
              <img
                src={img.src}
                // Same -700/900 pair the hero uses. The grid cell renders at
                // ~190px on mobile (2 cols) / ~296px on desktop (4 cols), so
                // the browser picks the 700px file instead of always paying
                // for the 900px one (~222 KiB saved page-wide per Lighthouse).
                srcSet={`${img.src.replace(/\.webp$/, "-700.webp")} 700w, ${img.src} 900w`}
                sizes="(min-width: 1280px) 296px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                alt={img.caption}
                width={900}
                height={900}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <figcaption className="pointer-events-none absolute inset-x-4 bottom-4 translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                <span className="text-sm font-light text-white drop-shadow">{img.caption}</span>
              </figcaption>
              {/* Tap → lightbox con la variante 900w y el caption visible (en
                  táctil no existe el hover que revela el figcaption). */}
              <button
                type="button"
                aria-label={`Ver en grande: ${img.caption}`}
                onClick={() => setLightbox(idx)}
                className="absolute inset-0 z-10 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8B1A2F]"
              />
            </motion.figure>
          ))}
        </div>
        </MotionConfig>

        {lightbox !== null && (
          <Suspense fallback={null}>
            <GalleryLightbox
              images={CURATED}
              index={lightbox}
              onClose={() => setLightbox(null)}
              onNavigate={setLightbox}
            />
          </Suspense>
        )}

        {/* Single, quiet closing CTA */}
        <div className="mt-16 flex flex-col items-center text-center gap-6">
          <h3 className="font-serif font-light text-2xl md:text-3xl text-[#1A1614]">
            ¿La suya, cuál sería?
          </h3>
          <button
            onClick={scrollToCustomizer}
            className="bg-[#8B1A2F] hover:bg-[#721527] active:bg-[#721527] text-white px-10 py-4 min-h-12 text-xs font-semibold uppercase tracking-[0.25em] transition-colors"
          >
            Personalizar mi producto
          </button>
        </div>
      </div>
    </section>
  );
}
