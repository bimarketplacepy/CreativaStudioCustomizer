import React from "react";
import { MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/contact";

/**
 * "A su medida" + "Empresas" — the two WhatsApp invites that used to close the
 * customizer section. Extracted to their own section so the landing can order
 * them after "Posibilidades" without touching their markup.
 */
export default function CustomRequests() {
  return (
    <section id="a-su-medida" className="bg-white border-b border-border py-14 md:py-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Personalizar algo más — emphasized invite */}
        <div className="relative overflow-hidden rounded-3xl bg-[#1A1614] px-8 py-14 md:px-14 md:py-16 text-center flex flex-col items-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-24 bg-[#8B1A2F]" />
          <p className="text-[#d9a3ae] text-[11px] font-semibold uppercase tracking-[0.3em] mb-5">
            A su medida
          </p>
          <h3 className="font-serif font-light text-3xl md:text-5xl text-white leading-[1.12] max-w-2xl mb-5">
            ¿Busca algo que no aparece aquí?
          </h3>
          <p className="text-white/60 font-light text-base md:text-lg max-w-xl leading-relaxed mb-9">
            Lo que ve en la página es apenas una parte de lo posible. Si imagina una pieza distinta —otro
            material, otro formato, un pedido especial— la creamos con usted. Cuéntenos su idea y la
            resolvemos juntos.
          </p>
          <a
            href={whatsappUrl("¡Hola! ¿Qué tal? Quisiera personalizar algo que no vi en la página. ¿Me ayudan a resolverlo?")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#8B1A2F] hover:bg-[#721527] text-white px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors"
          >
            <MessageCircle className="w-4 h-4" strokeWidth={1.75} />
            Escríbanos
          </a>
        </div>

        {/* Personalizaciones corporativas — pedidos en cantidad para empresas */}
        <div className="mt-6">
          <div className="rounded-3xl border border-border bg-secondary/40 px-8 py-10 md:px-14 md:py-12 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="flex-1">
              <p className="text-[#8B1A2F] text-[11px] font-semibold uppercase tracking-[0.3em] mb-3">
                Empresas
              </p>
              <h3 className="font-serif font-light text-2xl md:text-3xl text-[#1A1614] mb-3">
                Personalizaciones corporativas
              </h3>
              <p className="text-[#5f574d] font-light text-sm md:text-base leading-relaxed max-w-2xl">
                Regalos empresariales, merchandising y eventos: para empresas y pedidos en cantidad
                ofrecemos descuentos por volumen. Cuéntenos qué necesita y le preparamos una
                propuesta a medida.
              </p>
            </div>
            <a
              href={whatsappUrl("Hola, quiero consultar por personalización corporativa en cantidad.")}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 self-start md:self-center inline-flex items-center gap-2.5 bg-[#8B1A2F] hover:bg-[#721527] text-white px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors"
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.75} />
              Consultar por volumen
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
