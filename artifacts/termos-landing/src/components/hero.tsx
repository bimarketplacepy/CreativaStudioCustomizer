import React, { useCallback, useState } from "react";
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
              src="/navbar-logo.webp"
              alt="MarketPlace"
              width={120}
              height={32}
              decoding="async"
              className="h-5 sm:h-8 object-contain brightness-0 invert shrink-0 w-auto"
            />
            <span aria-hidden className="text-white/25 text-sm sm:text-lg font-light leading-none shrink-0">|</span>
            <img
              src="/la-creativa-logo-new.webp"
              alt="Creativa Studio"
              width={120}
              height={32}
              decoding="async"
              className="h-5 sm:h-8 object-contain brightness-0 invert shrink-0 w-auto"
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
            base, fading in as the carousel advances. The overlay keeps the copy
            legible no matter which image is showing. keyed por bgSrc: al cambiar,
            la nueva imagen remonta y la clase .hero-bg-fade la funde a 0.55.
            (Antes era un AnimatePresence de framer-motion.) */}
        <div className="absolute inset-0 z-0">
          {bgSrc && (
            <img
              key={bgSrc}
              // Usa la variante 700px: el fondo va desenfocado (blur-3xl), no
              // necesita resolución, y así en móvil reusa el mismo archivo que
              // ya bajó el carrusel en vez de traer el 900px aparte.
              src={bgSrc.replace(/\.webp$/, "-700.webp")}
              alt=""
              aria-hidden
              className="hero-bg-fade absolute inset-0 h-full w-full object-cover object-center scale-125 blur-3xl"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/45" />
        </div>

        {/* Hairline accent at the base — a single restrained mark, not a rainbow */}
        <div className="absolute bottom-0 left-0 h-px w-full bg-white/10" />
        <div className="absolute bottom-0 left-0 h-px w-24 bg-[#8B1A2F]" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-14 lg:gap-0">
          {/* Left — editorial copy. Renders static (no entrance animation): the
              <h1> is the LCP element on mobile, so it must paint the instant
              React commits, not fade in. */}
          <div className="flex-1">
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

          </div>

          {/* Right — carrusel de trabajos realizados (divide la pantalla) */}
          <div className="flex-1 flex items-center justify-center w-full">
            <HeroCarousel onImageChange={handleImageChange} />
          </div>
        </div>
      </section>
    </>
  );
}
