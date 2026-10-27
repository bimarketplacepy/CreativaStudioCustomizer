import React from "react";

/**
 * "Así de simple": la secuencia real del pedido (por eso numerada). Va antes
 * del personalizador para que se sepa qué pasa después de «Enviar».
 */
const THUMBS = [
  { src: "/galeria/termomate-700.webp", alt: "Termo con mate grabado" },
  { src: "/galeria/guampaforrada-700.webp", alt: "Guampa forrada en cuero" },
  { src: "/galeria/cajitamadera-700.webp", alt: "Caja de madera con iniciales" },
];

function Step({ n, title, children, art }: { n: number; title: string; children: React.ReactNode; art: React.ReactNode }) {
  return (
    <li className="grid gap-4 content-start">
      <div className="relative h-40 md:h-52 rounded-2xl overflow-hidden bg-white">{art}</div>
      <h3 className="flex items-baseline gap-3 text-lg md:text-xl font-semibold text-[var(--cs-ink)]">
        <span aria-hidden className="font-serif font-light text-3xl md:text-4xl leading-none text-[var(--cs-bordo)]">{n}</span>
        {title}
      </h3>
      <p className="text-[15px] md:text-base text-[var(--cs-grafito)] leading-relaxed">{children}</p>
    </li>
  );
}

export default function HowItWorks() {
  return (
    <section id="como-funciona" aria-labelledby="how-title" className="scroll-mt-16 bg-[var(--cs-acero)]">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 md:py-20">
        <h2 id="how-title" className="font-serif font-light text-[var(--cs-ink)] text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05]">
          Así de simple
        </h2>
        <ol className="mt-8 md:mt-10 grid md:grid-cols-3 gap-8 md:gap-7 list-none p-0">
          <Step
            n={1}
            title="Elegí la pieza o traé la tuya"
            art={
              <div className="grid grid-cols-3 gap-2 p-3 h-full">
                {THUMBS.map(t => (
                  <img key={t.src} src={t.src} alt={t.alt} width={700} height={700} loading="lazy" decoding="async" className="w-full h-full object-cover rounded-[10px]" />
                ))}
              </div>
            }
          >
            Termos, vasos, cuero, madera o cristal de la tienda, o stickers con tu diseño. Si ya tenés tu termo, pagás solo el grabado.
          </Step>
          <Step
            n={2}
            title="Diseñala y mirala en 3D"
            art={<img src="/galeria/paso-3d.webp" alt="Vaso en el visor 3D del personalizador" width={700} height={667} loading="lazy" decoding="async" className="w-full h-full object-contain bg-[#ECECEC]" />}
          >
            Texto, ícono, tu logo o un diseño a todo color en 360°. Girás la pieza y ves cómo queda.
          </Step>
          <Step
            n={3}
            title="Confirmá por WhatsApp"
            art={
              <div className="absolute inset-0 bg-[#E7E2D8] p-4 grid content-center gap-2.5" aria-hidden>
                <span className="absolute right-2.5 top-2.5 text-[11px] font-semibold bg-[var(--cs-ink)] text-white px-1.5 py-1 rounded-md">Ejemplo</span>
                <div className="justify-self-end max-w-[88%] bg-[#DCF3C8] text-[#1b2a12] rounded-xl rounded-br-sm px-3 py-2 text-[13px] leading-snug shadow-sm">
                  <b className="block text-xs text-[#3c5b23]">Pedido CS-0142</b>
                  Vaso Sunbeam 1183 ml, negro, grabado «Sofía».
                </div>
                <div className="justify-self-start max-w-[88%] bg-white text-[#222] rounded-xl rounded-bl-sm px-3 py-2 text-[13px] leading-snug shadow-sm">
                  ¡Hola! Te mandamos el diseño final para que lo confirmes.
                </div>
              </div>
            }
          >
            Te mostramos el diseño final antes de producir. Pagás recién cuando lo aprobás.
          </Step>
        </ol>
      </div>
    </section>
  );
}
