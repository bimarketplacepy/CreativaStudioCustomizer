import React from "react";
import { motion } from "framer-motion";

export default function Gallery() {
  return (
    <section className="py-24 bg-zinc-950 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">In The Wild</h2>
        <p className="text-muted-foreground font-mono uppercase">Built for the streets. Made for you.</p>
      </div>

      <div className="w-full overflow-hidden">
        <div className="flex w-full">
          {/* Using the generated images here */}
          <motion.div 
            className="w-1/2 md:w-1/3 shrink-0 px-2 group"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border/50">
              <img 
                src="/lifestyle-1.png" 
                alt="Person holding custom thermos in the city" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                <span className="font-bold text-lg uppercase tracking-wider">Urban Essential</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="w-1/2 md:w-1/3 shrink-0 px-2 group"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border/50">
              <img 
                src="/lifestyle-2.png" 
                alt="Thermos on creative desk" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                <span className="font-bold text-lg uppercase tracking-wider">Studio Setup</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="w-1/2 md:w-1/3 shrink-0 px-2 group hidden md:block"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border/50 bg-card flex items-center justify-center">
              <div className="text-center p-8">
                <h3 className="text-3xl font-black uppercase mb-4 text-primary">Your Turn</h3>
                <p className="font-mono text-muted-foreground text-sm">Design yours and tag @ThermoArt to be featured.</p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
