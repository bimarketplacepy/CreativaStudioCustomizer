import React from "react";
import { Type, Shapes, ImageIcon, Layers, Zap, Sparkles, Info, MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/contact";

/** What can be personalized — shown above the customizer to set expectations. */
const WHAT = [
  { icon: Type, title: "Texto y nombres", desc: "Nombres, apellidos, frases o fechas en la tipografía que elijas." },
  { icon: Shapes, title: "Íconos y símbolos", desc: "Sumá un ícono de nuestra galería a tu diseño." },
  { icon: ImageIcon, title: "Logos y fotos", desc: "Subí tu logo o una foto y la adaptamos al producto." },
  { icon: Layers, title: "Muchos materiales", desc: "Acero, cristal, madera, cuero, acrílico, plástico y bolígrafos." },
];

const TECHNIQUES = [
  { icon: Zap, title: "Grabado láser", desc: "Monocromático y permanente. Disponible en todos los materiales." },
  { icon: Sparkles, title: "Eufy Make (UV DTF)", desc: "Impresión a todo color, solo en drinkware de acero con pintura electrostática." },
];

const consultaMsg =
  "Hola! Vi el personalizador en la web y quiero consultar por una personalización específica.";

export default function PersonalizationInfo() {
  return (
    <section id="personalizaciones" className="py-16 px-6 bg-secondary/30 border-b border-border">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 max-w-2xl">
          <p className="text-primary text-xs font-semibold uppercase tracking-[0.2em] mb-2">
            Posibilidades
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            ¿Qué podés personalizar?
          </h2>
          <p className="text-muted-foreground">
            Estos son algunos ejemplos de lo que se puede grabar o imprimir. En el personalizador de abajo
            podés probar cómo quedaría tu producto con tu texto, un ícono o tu logo.
          </p>
        </div>

        {/* What can be personalized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {WHAT.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-border rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-[#f5eaec] text-primary flex items-center justify-center mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Techniques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {TECHNIQUES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-border rounded-2xl p-5 flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-[#f5eaec] text-primary flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* "Want something else?" + disclaimer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-border rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">¿Buscás algo que no está acá?</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Los productos y ejemplos que ves son solo algunas de las personalizaciones posibles. Si querés
              algo específico que no aparece en la página, escribinos y lo resolvemos juntos.
            </p>
            <a
              href={whatsappUrl(consultaMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors self-start"
            >
              <MessageCircle className="w-4 h-4" />
              Consultar por WhatsApp
            </a>
          </div>

          <div className="bg-[#fdf6f0] border border-[#e7cdbd] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Importante — esto es un simulador</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Esta página <span className="font-semibold text-foreground">solo sirve para simular</span> cómo se
              vería tu producto personalizado. <span className="font-semibold text-foreground">No es una tienda
              online</span>: acá no se procesan compras ni pagos, y las opciones mostradas son ejemplos de
              personalizaciones posibles. Para concretar tu pedido tenés que contactarte por WhatsApp con los
              botones indicados.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
