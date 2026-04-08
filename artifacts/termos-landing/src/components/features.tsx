import React from "react";
import { motion } from "framer-motion";
import { Thermometer, Shield, Paintbrush2, Package } from "lucide-react";

const features = [
  {
    icon: <Thermometer className="w-6 h-6" />,
    title: "Doble pared al vacio",
    desc: "Mantiene tu bebida fria 24h o caliente 12h. Tecnologia de aislamiento profesional.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Acero 18/8 Premium",
    desc: "Material de grado alimentario. Resistente a golpes y al uso diario intensivo.",
  },
  {
    icon: <Paintbrush2 className="w-6 h-6" />,
    title: "Impresion de alta definicion",
    desc: "Tu diseno fusionado con el acero. No se raya, no se desvanece, no se pela.",
  },
  {
    icon: <Package className="w-6 h-6" />,
    title: "Envio rapido y seguro",
    desc: "Empaquetado con cuidado y entregado en todo el pais en tiempo record.",
  },
];

export default function Features() {
  return (
    <section className="py-16 bg-secondary/50 border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="bg-white rounded-xl p-6 border border-border shadow-xs hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-primary mb-4">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
