import React from "react";
import { motion } from "framer-motion";

const COLOR_STRIP = [
  "#E63946", "#2D6A9F", "#2D9B5C", "#1A1A1A",
  "#9B5DE5", "#F4A261", "#E9C46A", "#6D6875",
];

export default function Hero() {
  const scrollToCustomizer = () => {
    document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Navbar — black, Stanley-style */}
      <header className="w-full bg-[#2a2a2a] sticky top-0 z-50">
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
              alt="Creativa Studio"
              className="h-8 object-contain brightness-0 invert"
            />
          </div>
          <nav className="hidden md:flex flex-1 justify-center items-center gap-8 text-xs text-white/60 uppercase tracking-widest font-medium">
            <a href="#" className="hover:text-white transition-colors">Inicio</a>
            <a
              href="#customizer"
              onClick={e => { e.preventDefault(); scrollToCustomizer(); }}
              className="hover:text-white transition-colors"
            >
              Personalizar
            </a>
            <a href="#gallery" className="hover:text-white transition-colors">Galeria</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </nav>
        </div>
      </header>

      {/* Hero — full bleed dark, editorial */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-[#2a2a2a]">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-bg-thermos.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/75" />
        </div>

        {/* Giant ghost watermark */}
        <span
          aria-hidden
          className="pointer-events-none select-none absolute right-[-2vw] bottom-[-4vw] text-[28vw] font-black uppercase leading-none text-white/[0.03]"
        >
          TERMO
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

            <h1 className="text-[clamp(3rem,9vw,7rem)] font-black leading-[0.9] uppercase text-white mb-8">
              Diseña<br />
              tu propio<br />
              <span className="text-[#8B1A2F]">Termo.</span>
            </h1>

            <p className="text-white/50 text-base max-w-sm mb-10 leading-relaxed">
              Elegí el color, texto y acabado. Su termo único, como usted.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={scrollToCustomizer}
                className="bg-[#8B1A2F] hover:bg-[#721527] text-white font-bold px-8 py-4 text-xs uppercase tracking-[0.2em] transition-colors"
              >
                Personalizar Ahora
              </button>
              <button
                onClick={() => document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" })}
                className="border border-white/20 hover:border-white/60 text-white/70 hover:text-white font-bold px-8 py-4 text-xs uppercase tracking-[0.2em] transition-colors"
              >
                Ver Colores
              </button>
            </div>

            {/* Stats row */}
            <div className="flex gap-8 mt-12 pt-10 border-t border-white/10">
              <div>
                <p className="text-white text-2xl font-black">+500</p>
                <p className="text-white/40 text-xs uppercase tracking-wider mt-0.5">Clientes felices</p>
              </div>
              <div>
                <p className="text-white text-2xl font-black">12</p>
                <p className="text-white/40 text-xs uppercase tracking-wider mt-0.5">Colores disponibles</p>
              </div>
              <div>
                <p className="text-white text-2xl font-black">100%</p>
                <p className="text-white/40 text-xs uppercase tracking-wider mt-0.5">Personalizado</p>
              </div>
            </div>
          </motion.div>

          {/* Right — brand logo on light panel */}
          <motion.div
            className="flex-1 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative w-72 h-72 lg:w-96 lg:h-96">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-white/5 border border-white/10" />
              {/* Inner panel */}
              <div className="absolute inset-8 rounded-full bg-[#2a2a2a] flex items-center justify-center shadow-2xl">
                <motion.img
                  src="/la-creativa-logo-new.png"
                  alt="Creativa Studio"
                  className="w-3/5 object-contain"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
