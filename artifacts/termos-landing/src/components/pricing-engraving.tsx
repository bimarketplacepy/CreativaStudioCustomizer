import React from "react";
import { motion, MotionConfig } from "framer-motion";
import { ENGRAVING_BASE, ENGRAVING_PLANS } from "@/lib/engraving-plans";
import { engravingPrice, formatGs, useCatalog } from "@/lib/odoo-catalog";

export default function PricingEngraving() {
  // Precios de grabado desde Odoo (servicios GRAB-*) cuando existen; si no, los
  // publicados en engraving-plans.ts. Misma fuente que el precio del personalizador.
  const catalog = useCatalog();
  return (
    // py alineado al ritmo del resto de las secciones (antes py-24/32, outlier).
    <section id="precios" className="scroll-mt-20 bg-[#1A1614] py-16 md:py-24 px-6">
      <MotionConfig reducedMotion="user">
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="text-center mb-16">
          <p className="text-white/60 text-[11px] font-semibold uppercase tracking-[0.35em] mb-5">
            Tarifas del grabado láser
          </p>
          {/* Antes: "incluido en todos los planes" junto a un plan que cobra
              justamente eso — se leía como si el grabado fuera gratis. */}
          <p className="text-white/50 text-sm font-light leading-relaxed">
            Es el precio del grabado y se suma al de la pieza, que ves en el personalizador.
            Todos los planes incluyen {ENGRAVING_BASE.toLowerCase()}. ¿Traés tu propio termo o vaso? Pagás solo el grabado.
          </p>
        </div>

        <div className="flex flex-col">
          {ENGRAVING_PLANS.map((plan, idx) => (
            <motion.div
              key={plan.id}
              className="flex items-baseline justify-between gap-6 py-5 border-b border-white/10 first:border-t"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
            >
              <p className="text-white/75 text-sm md:text-base font-light leading-snug">
                {plan.shortLabel}
              </p>
              <span className="shrink-0 font-serif text-lg md:text-xl text-white/90 tracking-wide tabular-nums">
                {formatGs(engravingPrice(catalog, plan.id))}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
      </MotionConfig>
    </section>
  );
}
