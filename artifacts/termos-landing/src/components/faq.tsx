import React from "react";
import { FAQ } from "@/lib/faq";
import { whatsappUrl } from "@/lib/contact";

/** Preguntas frecuentes: <details> nativo (teclado y lector de pantalla sin JS extra). */
export default function Faq() {
  return (
    <section id="preguntas" aria-labelledby="faq-title" className="scroll-mt-16 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 md:py-24 grid lg:grid-cols-[360px_minmax(0,1fr)] gap-8 lg:gap-16">
        <div className="grid gap-4 content-start">
          <h2 id="faq-title" className="font-serif font-light text-[var(--cs-ink)] text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05]">
            Antes de pedir
          </h2>
          <p className="text-[var(--cs-grafito)] text-base leading-relaxed max-w-[28rem]">
            Si tu duda no está acá, escribinos y te respondemos por WhatsApp.
          </p>
          <a
            href={whatsappUrl("¡Hola! Tengo una consulta antes de hacer mi pedido.")}
            target="_blank"
            rel="noopener noreferrer"
            data-track="faq"
            className="cs-btn cs-btn-ghost w-fit"
          >
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
            Escribinos
          </a>
        </div>
        <div className="border-t border-[var(--cs-line)]">
          {FAQ.map((f, i) => (
            <details key={f.q} open={i === 0} className="group border-b border-[var(--cs-line)]">
              <summary className="flex items-start justify-between gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-[16px] md:text-[17px] font-semibold text-[var(--cs-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cs-bordo)] rounded-sm">
                {f.q}
                <svg aria-hidden className="w-5 h-5 mt-0.5 shrink-0 text-[var(--cs-grafito)] transition-transform duration-200 group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </summary>
              <p className="pb-5 -mt-1 text-[15px] md:text-base text-[var(--cs-grafito)] leading-relaxed max-w-[60ch]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
