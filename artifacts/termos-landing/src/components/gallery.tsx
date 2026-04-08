import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Maria G.",
    city: "Asuncion",
    text: "El termo llego perfecto y con mi nombre impreso de manera hermosa. Lo llevo al trabajo todos los dias.",
    rating: 5,
  },
  {
    name: "Carlos R.",
    city: "Luque",
    text: "Excelente calidad, el diseno quedo tal cual lo configure. El color no se desgasto nada despues de meses.",
    rating: 5,
  },
  {
    name: "Ana P.",
    city: "Fernando de la Mora",
    text: "Lo regalé para un cumpleanos y fue el regalo mas original. Lo quiero personalizar para mi ahora!",
    rating: 5,
  },
];

export default function Gallery() {
  return (
    <section id="gallery" className="py-16 bg-secondary/30 border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Lo que dicen nuestros clientes</h2>
          <p className="text-muted-foreground">Miles de clientes en todo el pais ya personalizaron su termo.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="bg-white rounded-xl border border-border p-6 shadow-xs hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-1 mb-3">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-foreground text-sm leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-primary font-bold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.city}, Paraguay</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 bg-primary rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 text-primary-foreground"
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
