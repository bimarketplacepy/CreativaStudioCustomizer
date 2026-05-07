import React from "react";
import { motion } from "framer-motion";

const STATS = [
  { num: "24H", sub: "/ 12H", label: "Frío & Calor", desc: "Doble pared al vacío — tecnología de aislamiento profesional." },
  { num: "18/8", sub: "", label: "Acero Premium", desc: "Grado alimentario. Resistente al uso diario intensivo." },
  { num: "100%", sub: "", label: "Personalizable", desc: "Color, texto, acabado e ícono. Completamente tuyo." },
  { num: "PY", sub: "", label: "Envío nacional", desc: "Empaquetado con cuidado y entregado en todo el país." },
];

export default function Features() {
  return (
    <section className="bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto">
        {STATS.map((s, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: idx * 0.07 }}
            className={`flex items-center gap-8 px-6 py-10 border-b border-neutral-100 last:border-0 ${
              idx % 2 === 1 ? "bg-neutral-50" : "bg-white"
            }`}
          >
            {/* Big number */}
            <div className="shrink-0 w-32 text-right">
              <span className="text-5xl font-black text-black leading-none tracking-tight">
                {s.num}
              </span>
              {s.sub && (
                <span className="text-xl font-black text-neutral-400 leading-none">{s.sub}</span>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-12 bg-neutral-200 shrink-0" />

            {/* Label + desc */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-10">
              <p className="text-sm font-black uppercase tracking-[0.15em] text-black w-40 shrink-0">{s.label}</p>
              <p className="text-sm text-neutral-500 leading-relaxed max-w-md">{s.desc}</p>
            </div>

            {/* Right accent bar */}
            <div className="hidden lg:block shrink-0 w-1 h-10 bg-red-600 rounded-full" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
