import React from "react";
import { motion } from "framer-motion";

const features = [
  {
    title: "Double Wall Vacuum",
    desc: "Keeps your vibe icy cold for 24h or blazing hot for 12h. No sweat, literally.",
    color: "bg-secondary"
  },
  {
    title: "Pro-Grade Steel",
    desc: "18/8 stainless steel that survives drops, kicks, and your daily commute.",
    color: "bg-accent"
  },
  {
    title: "High-Def Printing",
    desc: "Your design baked into the surface. Won't scratch, fade, or peel off.",
    color: "bg-primary"
  }
];

export default function Features() {
  return (
    <section className="py-32 px-6 bg-zinc-950 relative border-b border-border/50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group relative p-8 bg-card border border-border hover:border-foreground/20 transition-colors overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-2 h-full ${feature.color} transform origin-left transition-transform duration-300 group-hover:scale-x-[15] opacity-20`} />
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight relative z-10">{feature.title}</h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed relative z-10">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
