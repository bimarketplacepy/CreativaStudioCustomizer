import React from "react";
import { Type, Shapes, ImageIcon, Layers, Zap, Sparkles, Shield } from "lucide-react";

/** What can be personalized — shown above the customizer to set expectations. */
const WHAT = [
  { icon: Type, title: "Texto y nombres", desc: "Nombres, apellidos, frases o fechas en la tipografía que elija." },
  { icon: Shapes, title: "Íconos y símbolos", desc: "Sume un ícono de nuestra galería a su diseño." },
  { icon: ImageIcon, title: "Logos y fotos", desc: "Suba su logo o una foto y la adaptamos a la pieza." },
  { icon: Layers, title: "Muchos materiales", desc: "Acero con pintura recubierta, acero inoxidable, cristal, madera, cuero, acrílico, plástico y bolígrafos." },
];

/** Los dos acabados de acero disponibles, cada uno con su línea descriptiva. */
const STEELS = [
  { icon: Layers, title: "Acero con pintura recubierta", desc: "Acero con recubrimiento de pintura electroestática de alta durabilidad, en el color y acabado que elija." },
  { icon: Shield, title: "Acero inoxidable", desc: "El mismo acero en su acabado natural cepillado: clásico, atemporal y sin pintura." },
];

const TECHNIQUES = [
  { icon: Zap, title: "Grabado láser", desc: "El acabado clásico y atemporal: su diseño marcado a láser, para siempre. Disponible en casi todos los materiales." },
  { icon: Sparkles, title: "Impresión a todo color", desc: "¿Prefiere su logo o foto con todos sus colores? Los reproducimos vivos y con detalle sobre vasos y termos de acero." },
];

export default function PersonalizationInfo() {
  return (
    <section id="personalizaciones" className="py-12 md:py-28 px-4 sm:px-6 bg-[#faf7f2] border-b border-border">
      <div className="max-w-7xl mx-auto">
        <div className="mb-7 md:mb-14 max-w-2xl">
          <p className="text-[#8B1A2F] text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-2 md:mb-4">
            Posibilidades
          </p>
          <h2 className="font-serif font-light text-[1.6rem] leading-[1.15] md:text-5xl text-[#1A1614] mb-2.5 md:mb-5 md:leading-[1.1]">
            ¿Qué puede personalizar?
          </h2>
          <p className="text-[#5f574d] leading-relaxed font-light text-sm sm:text-base md:text-lg">
            Algunos ejemplos de lo que se puede grabar o imprimir. En el personalizador podrá
            ver cómo queda su pieza con su texto, un ícono o su logo.
          </p>
        </div>

        {/* What can be personalized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5 mb-2.5 sm:mb-5">
          {WHAT.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-[#ece4d8] rounded-xl sm:rounded-2xl p-3.5 sm:p-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#faf7f2] text-[#8B1A2F] border border-[#ece4d8] flex items-center justify-center mb-2.5 sm:mb-4">
                <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={1.5} />
              </div>
              <h3 className="font-medium text-[13px] sm:text-base text-[#1A1614] mb-1 sm:mb-1.5 leading-snug">{title}</h3>
              <p className="text-[11px] sm:text-sm text-[#7a7266] leading-relaxed font-light">{desc}</p>
            </div>
          ))}
        </div>

        {/* Los dos acabados de acero */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-5 mb-2.5 sm:mb-5">
          {STEELS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-[#ece4d8] rounded-xl sm:rounded-2xl p-3.5 sm:p-6 flex items-start gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full bg-[#faf7f2] text-[#8B1A2F] border border-[#ece4d8] flex items-center justify-center">
                <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-medium text-[13px] sm:text-base text-[#1A1614] mb-1 sm:mb-1.5 leading-snug">{title}</h3>
                <p className="text-[11px] sm:text-sm text-[#7a7266] leading-relaxed font-light">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Techniques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-5">
          {TECHNIQUES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-[#ece4d8] rounded-xl sm:rounded-2xl p-3.5 sm:p-6 flex items-start gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full bg-[#faf7f2] text-[#8B1A2F] border border-[#ece4d8] flex items-center justify-center">
                <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-medium text-[13px] sm:text-base text-[#1A1614] mb-1 sm:mb-1.5 leading-snug">{title}</h3>
                <p className="text-[11px] sm:text-sm text-[#7a7266] leading-relaxed font-light">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Discreet closing note — replaces the loud alert box. */}
        <p className="mt-6 md:mt-10 text-[10px] sm:text-xs text-[#9c9488] leading-relaxed max-w-3xl font-light">
          Esta página permite simular cómo se vería su pieza personalizada; no procesa compras ni pagos, y las
          opciones son ejemplos de lo posible.
        </p>
      </div>
    </section>
  );
}
