import React from "react";
import { motion } from "framer-motion";


export default function Gallery() {
  const scrollToCustomizer = () => {
    document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Full-bleed CTA — black strip */}
      <section className="bg-[#2a2a2a] py-24 px-6">
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
