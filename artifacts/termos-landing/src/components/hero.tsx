import React, { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HeroCarousel from "@/components/hero-carousel";

const COLOR_STRIP = [
  "#E63946", "#2D6A9F", "#2D9B5C", "#1A1A1A",
  "#9B5DE5", "#F4A261", "#E9C46A", "#6D6875",
];

/** Solid fallback shown before any carousel image is active. */
const HERO_BASE = "#2a2a2a";

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
      {/* Navbar — black, Stanley-style */}
      <header id="inicio" className="w-full bg-[#2a2a2a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/navbar-logo.png"
              alt="MarketPlace"
              className="h-8 object-contain brightness-0 invert"
            />
            <span aria-hidden className="text-white/30 text-lg leading-none">—</span>
            <img
              src="/la-creativa-logo-new.png"
              alt=""
              aria-hidden
              className="h-8 object-contain brightness-0 invert"
            />
            <span className="text-white/70 text-sm font-semibold tracking-wide whitespace-nowrap">
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

        {/* Giant ghost watermark */}
        <span
          aria-hidden
          className="pointer-events-none select-none absolute right-[-2vw] bottom-[-4vw] text-[28vw] font-black uppercase leading-none text-white/[0.03]"
        >
          CREATIVA
        </span>

        {/* Thin color bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex h-1">
          {COLOR_STRIP.map((c, i) => (
            <div key={i} style={{ backgroundColor: c }} className="flex-1" />
          ))}
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 flex flex-col lg:flex-row items-center gap-12 lg:gap-0">
          {/* Left — editorial copy */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] mb-8 font-medium">
              Creativa Studio — Experiencia Personalizada
            </p>

            <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-black leading-[0.9] uppercase text-white mb-8">
              Personalice su propia<br />
              <span className="text-[#8B1A2F]">Pieza Exclusiva.</span>
            </h1>

            <p className="text-white/50 text-base max-w-sm mb-10 leading-relaxed">
              Elija el formato, el color y el grabado. Un artículo de excelencia, tan único como usted.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={scrollToCustomizer}
                className="bg-[#8B1A2F] hover:bg-[#721527] text-white font-bold px-8 py-4 text-xs uppercase tracking-[0.2em] transition-colors"
              >
                Personalizar Ahora
              </button>
              <button
                onClick={() => scrollTo("precios")}
                className="border border-white/20 hover:border-white/60 text-white/70 hover:text-white font-bold px-8 py-4 text-xs uppercase tracking-[0.2em] transition-colors"
              >
                Ver Precios
              </button>
            </div>

            {/* Stats row */}
            <div className="flex gap-8 mt-12 pt-10 border-t border-white/10">
              <div>
                <p className="text-white text-2xl font-black">5</p>
                <p className="text-white/40 text-xs uppercase tracking-wider mt-0.5">Formatos</p>
              </div>
              <div>
                <p className="text-white text-2xl font-black">12</p>
                <p className="text-white/40 text-xs uppercase tracking-wider mt-0.5">Colores base</p>
              </div>
              <div>
                <p className="text-white text-2xl font-black">100%</p>
                <p className="text-white/40 text-xs uppercase tracking-wider mt-0.5">Personalizado</p>
              </div>
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
