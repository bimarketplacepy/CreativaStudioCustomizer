import React, { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HeroCarousel from "@/components/hero-carousel";

/** Solid fallback shown before any carousel image is active. */
const HERO_BASE = "#1A1614";

export default function Hero() {
  // Backdrop echoes the current carousel image, blurred; solid until the first.
  const [bgSrc, setBgSrc] = useState<string | null>(null);
  const handleImageChange = useCallback((src: string) => setBgSrc(src), []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToCustomizer = () => scrollTo("customizer");

  return (
    <>
      {/* Navbar — warm near-black, editorial */}
      <header id="inicio" className="w-full bg-[#1A1614] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <img
              src="/navbar-logo.png"
              alt="MarketPlace"
              className="h-5 sm:h-8 object-contain brightness-0 invert shrink-0"
            />
            <span aria-hidden className="text-white/25 text-sm sm:text-lg font-light leading-none shrink-0">|</span>
            <img
              src="/la-creativa-logo-new.png"
              alt="Creativa Studio"
              className="h-5 sm:h-8 object-contain brightness-0 invert shrink-0"
            />
            <span className="text-white/70 text-[11px] sm:text-sm font-semibold tracking-wide whitespace-nowrap">
              Creativa Studio
            </span>
          </div>
          <nav className="hidden md:flex flex-1 justify-center items-center gap-8 text-xs text-white/60 uppercase tracking-widest font-medium">
            {[
              { label: "Inicio", id: "inicio" },
              { label: "Personalizar", id: "customizer" },
              { label: "Precios", id: "precios" },
              { label: "Contacto", id: "contacto" },
            ].map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={e => { e.preventDefault(); scrollTo(item.id); }}
                className="hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero — full bleed dark, editorial */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden" style={{ backgroundColor: HERO_BASE }}>
        {/* Background — a blurred echo of the active carousel image over a solid
            base, cross-fading as the carousel advances. The overlay keeps the
            copy legible no matter which image is showing. */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="sync">
            {bgSrc && (
              <motion.img
                key={bgSrc}
                src={bgSrc}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover object-center scale-125 blur-3xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.55 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/45" />
        </div>

        {/* Hairline accent at the base — a single restrained mark, not a rainbow */}
        <div className="absolute bottom-0 left-0 h-px w-full bg-white/10" />
        <div className="absolute bottom-0 left-0 h-px w-24 bg-[#8B1A2F]" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-14 lg:gap-0">
          {/* Left — editorial copy */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-white/55 text-[11px] uppercase tracking-[0.4em] mb-10 font-medium">
              Creativa Studio · Personalización
            </p>

            <h1 className="font-serif font-light text-[clamp(2.6rem,6vw,4.75rem)] leading-[1.05] tracking-[-0.015em] text-white/95 mb-8">
              Personalice su propia<br />
              <span className="italic">pieza exclusiva.</span>
            </h1>

            <p className="text-white/70 text-base md:text-lg max-w-md mb-12 leading-relaxed font-light">
              Elija el formato, el color y el grabado. Una pieza de excelencia, tan única como quien la lleva.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={scrollToCustomizer}
                className="bg-[#8B1A2F] hover:bg-[#721527] text-white px-9 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors"
              >
                Comenzar
              </button>
              <button
                onClick={() => scrollTo("precios")}
                className="border border-white/20 hover:border-white/50 text-white/70 hover:text-white px-9 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors"
              >
                Ver precios
              </button>
            </div>

          </motion.div>

          {/* Right — carrusel de trabajos realizados (divide la pantalla) */}
          <motion.div
            className="flex-1 flex items-center justify-center w-full"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeroCarousel onImageChange={handleImageChange} />
          </motion.div>
        </div>
      </section>
    </>
  );
}
