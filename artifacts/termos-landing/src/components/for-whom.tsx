import React from "react";
import { whatsappUrl } from "@/lib/contact";
import { startCustomizer } from "@/lib/section-reveal";
import { track } from "@/lib/analytics";

/**
 * "Para quién": reemplaza Posibilidades + A tu medida + Empresas. Un bloque por
 * intención del cliente, con foto real y una sola acción. Cada WhatsApp lleva
 * un mensaje distinto para clasificar el pedido.
 */
function Arrow() {
  return (
    <svg aria-hidden className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const TILE = "group relative overflow-hidden rounded-[18px] text-white flex items-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cs-bordo)]";
const SHADE = "absolute inset-0 bg-gradient-to-b from-black/0 from-20% to-[rgba(22,18,15,0.92)] to-80%";
const IMG = "absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]";

export default function ForWhom() {
  return (
    <section id="para-quien" aria-labelledby="who-title" className="scroll-mt-16 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 md:py-24">
        <h2 id="who-title" className="font-serif font-light text-[var(--cs-ink)] text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] max-w-[14em]">
          Un regalo, tu marca o esa idea que tenés
        </h2>
        <div className="mt-8 md:mt-10 grid md:grid-cols-[1.25fr_1fr] md:grid-rows-2 gap-4 md:gap-5">
          <button
            type="button"
            onClick={() => { track("cta_click", { location: "who_regalo" }); startCustomizer({}); }}
            className={`${TILE} min-h-[340px] md:min-h-[540px] md:row-span-2 text-left`}
          >
            <img src="/galeria/vasorosa-700.webp" srcSet="/galeria/vasorosa-700.webp 700w, /galeria/vasorosa.webp 900w" sizes="(min-width: 768px) 55vw, 100vw" alt="" width={900} height={900} loading="lazy" decoding="async" className={IMG} />
            <span className={SHADE} />
            <span className="relative p-5 md:p-7 grid gap-2">
              <span className="font-serif font-light text-3xl md:text-4xl">Regalos con nombre</span>
              <span className="text-[15px] text-[#E8DFD6] max-w-[28em]">Cumpleaños, Día de la Madre, egresados. Su nombre o una frase en la pieza que usa todos los días.</span>
              <span className="mt-1 inline-flex items-center gap-2 text-[15px] font-semibold">Diseñar un regalo <Arrow /></span>
            </span>
          </button>
          <a
            href={whatsappUrl("Hola, quiero consultar por personalización corporativa en cantidad.")}
            target="_blank"
            rel="noopener noreferrer"
            data-track="empresas"
            className={`${TILE} min-h-[250px]`}
          >
            <img src="/galeria/hoppiedisenouv-700.webp" alt="" width={700} height={700} loading="lazy" decoding="async" className={IMG} />
            <span className={SHADE} />
            <span className="relative p-5 md:p-6 grid gap-1.5">
              <span className="font-serif font-light text-[28px] md:text-[32px]">Empresas y eventos</span>
              <span className="text-[15px] text-[#E8DFD6]">Tu logo en cantidad: grabado, impreso en 360° o en stickers para tu packaging y eventos, con descuento por volumen.</span>
              <span className="mt-1 inline-flex items-center gap-2 text-[15px] font-semibold">Pedir presupuesto <Arrow /></span>
            </span>
          </a>
          <a
            href={whatsappUrl("¡Hola! ¿Qué tal? Quisiera personalizar algo que no vi en la página. ¿Me ayudan a resolverlo?")}
            target="_blank"
            rel="noopener noreferrer"
            data-track="a-tu-medida"
            className={`${TILE} min-h-[250px]`}
          >
            <img src="/galeria/cajitamadera-700.webp" alt="" width={700} height={700} loading="lazy" decoding="async" className={IMG} />
            <span className={SHADE} />
            <span className="relative p-5 md:p-6 grid gap-1.5">
              <span className="font-serif font-light text-[28px] md:text-[32px]">¿No lo ves acá?</span>
              <span className="text-[15px] text-[#E8DFD6]">Otro material, otro formato: lo resolvemos con vos.</span>
              <span className="mt-1 inline-flex items-center gap-2 text-[15px] font-semibold">Contanos tu idea <Arrow /></span>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
