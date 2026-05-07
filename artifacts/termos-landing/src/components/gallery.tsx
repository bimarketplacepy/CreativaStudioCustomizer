import React from "react";
import { motion } from "framer-motion";

const COLORS = [
  { name: "Rojo Pasión",   hex: "#E63946", light: false },
  { name: "Azul Oceano",   hex: "#2D6A9F", light: false },
  { name: "Verde Selva",   hex: "#2D9B5C", light: false },
  { name: "Negro Matte",   hex: "#1A1A1A", light: false },
  { name: "Lila Suave",    hex: "#9B5DE5", light: false },
  { name: "Arena Dorada",  hex: "#E9C46A", light: true  },
  { name: "Coral Sunset",  hex: "#F4A261", light: true  },
  { name: "Lavanda",       hex: "#C9A8E2", light: true  },
];

export default function Gallery() {
  const scrollToCustomizer = () => {
    document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Color picker section — Stanley "Shop by color" style */}
      <section id="gallery" className="bg-white pt-20 pb-4 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400 mb-3 font-medium">Colección</p>
            <h2 className="text-4xl md:text-5xl font-black uppercase text-black leading-none">
              Elegí tu<br />color
            </h2>
          </motion.div>
        </div>

        <div className="flex overflow-x-auto gap-0 pb-0 scrollbar-hide">
          {COLORS.map((c, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              onClick={scrollToCustomizer}
              style={{ backgroundColor: c.hex }}
              className="relative flex-shrink-0 w-48 h-56 flex flex-col justify-end p-4 group transition-transform hover:-translate-y-1"
            >
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: c.light ? "#111" : "#fff" }}
              >
                {c.name}
              </span>
              <span
                className="text-[10px] uppercase tracking-widest opacity-60 mt-0.5"
                style={{ color: c.light ? "#111" : "#fff" }}
              >
                Personalizar →
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Full-bleed CTA — black strip */}
      <section className="bg-black py-24 px-6">
        <motion.div
          className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] mb-4">La Creativa</p>
            <h3 className="text-4xl md:text-6xl font-black uppercase text-white leading-none">
              Hace tu<br /><span className="text-red-500">diseño</span><br />ahora.
            </h3>
          </div>
          <button
            onClick={scrollToCustomizer}
            className="shrink-0 border-2 border-white text-white font-black px-10 py-5 text-xs uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-colors"
          >
            Personalizar Ahora
          </button>
        </motion.div>
      </section>
    </>
  );
}
