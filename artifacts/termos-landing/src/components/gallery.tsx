import React from "react";
import { motion } from "framer-motion";

export default function Gallery() {
  return (
    <section id="gallery" className="py-16 bg-secondary/30 border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-primary rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 text-primary-foreground"
        >
          <div>
            <h3 className="text-2xl font-bold mb-1">Hace tu diseno ahora</h3>
            <p className="text-primary-foreground/80 text-sm">Cada termo es unico, como vos. Empieza a personalizar en minutos.</p>
          </div>
          <button
            onClick={() => document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth" })}
            className="shrink-0 bg-white text-primary font-semibold px-6 py-3 rounded-lg hover:bg-red-50 transition-colors text-sm shadow-sm"
          >
            Personalizar ahora
          </button>
        </motion.div>
      </div>
    </section>
  );
}
