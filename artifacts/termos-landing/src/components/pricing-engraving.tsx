import React from "react";
import { motion } from "framer-motion";
import { ENGRAVING_BASE, ENGRAVING_PLANS } from "@/lib/engraving-plans";

export default function PricingEngraving() {
  return (
    <section id="precios" className="bg-[#1A1614] py-24 md:py-32 px-6">
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="text-center mb-16">
          <p className="text-white/40 text-[11px] font-semibold uppercase tracking-[0.35em] mb-5">
            Tarifas
          </p>
          <p className="text-white/50 text-sm font-light leading-relaxed">
            {ENGRAVING_BASE} incluido en todos los planes. El valor de la pieza se cotiza aparte.
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
                {plan.priceLabel}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
