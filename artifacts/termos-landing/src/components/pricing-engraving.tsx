import React from "react";
import { motion } from "framer-motion";
import { PenTool } from "lucide-react";
import { ENGRAVING_BASE, ENGRAVING_PLANS } from "@/lib/engraving-plans";

export default function PricingEngraving() {
  return (
    <section id="precios" className="bg-[#2a2a2a] py-24 px-6">
      <motion.div
        className="max-w-3xl mx-auto flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <PenTool className="w-10 h-10 text-white mb-4" strokeWidth={1.5} />
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-white mb-3">
          Precios de Grabados
        </h2>
        <p className="text-white/40 text-sm mb-14">
          {ENGRAVING_BASE} incluido en todos los planes. El valor del producto se cotiza aparte.
        </p>

        <div className="w-full flex flex-col gap-12">
          {ENGRAVING_PLANS.map((plan, idx) => (
            <motion.div
              key={plan.id}
              className="flex flex-col items-center gap-5"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.1 }}
            >
              <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.15em] text-white leading-relaxed">
                {plan.shortLabel}
              </p>
              <div className="border-2 border-[#8B1A2F] rounded-full px-8 py-3">
                <span className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  {plan.priceLabel}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
