import React from "react";
import { motion } from "framer-motion";
import { GALLERY_IMAGES } from "@/lib/gallery-images";

/** A curated selection of real work — a lookbook, not a dump of every file. */
const CURATED = GALLERY_IMAGES.slice(0, 12);

export default function Gallery() {
  const scrollToCustomizer = () => {
    document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="galeria" className="bg-white py-20 md:py-28 px-6 border-t border-border">
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
                alt={img.caption}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <figcaption className="pointer-events-none absolute inset-x-4 bottom-4 translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                <span className="text-sm font-light text-white drop-shadow">{img.caption}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        {/* Single, quiet closing CTA */}
        <div className="mt-16 flex flex-col items-center text-center gap-6">
          <h3 className="font-serif font-light text-2xl md:text-3xl text-[#1A1614]">
            ¿La suya, cuál sería?
          </h3>
          <button
            onClick={scrollToCustomizer}
            className="bg-[#8B1A2F] hover:bg-[#721527] text-white px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors"
          >
            Comenzar
          </button>
        </div>
      </div>
    </section>
  );
}
