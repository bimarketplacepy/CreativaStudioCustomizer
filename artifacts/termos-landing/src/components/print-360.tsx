import React from "react";
import { whatsappUrl } from "@/lib/contact";
import { startCustomizer } from "@/lib/section-reveal";
import { track } from "@/lib/analytics";
import { MACHINES } from "@/lib/machines";

/**
 * Impresión 360° a todo color con la Dacen F5 (DACEN.md §10–12). Todo lo que
 * se afirma sale de la ficha de la máquina y de lo que el taller confirmó:
 * imprime girando la pieza, CMYK + base blanca automática, piezas cilíndricas
 * dentro de los límites de MACHINES.dacen. El monto se cotiza
 * (PRICING.enabled.dacen = false).
 */
const LIMITS = MACHINES.dacen.limits!;
const cm = (mm: number) => (mm / 10).toLocaleString("es-PY", { maximumFractionDigits: 1 });

const FACTS = [
  { k: "360°", v: "Toda la vuelta del cuerpo del vaso, sin dejar un costado en blanco." },
  { k: "Color", v: "Fotos, degradados y logos a todo color, con base blanca para que se vean sobre cualquier pintura." },
  { k: "Piezas", v: `Vasos, termos y botellas cilíndricas de ${cm(LIMITS.minDiameterMm)} a ${cm(LIMITS.maxDiameterMm)} cm de diámetro y hasta ${cm(LIMITS.maxLengthMm)} cm de alto.` },
  { k: "3D", v: "Lo ves girando en el personalizador antes de pedirlo." },
];

/** Vista desde arriba del vaso: la banda impresa cubre la vuelta entera y los
 *  logos se ubican en cualquiera de las cuatro caras del panel 360°. */
function TopView() {
  const faces = [
    { label: "Frente", x: 100, y: 196, anchor: "middle" },
    { label: "Atrás", x: 100, y: 4, anchor: "middle" },
    { label: "Derecha", x: 186, y: 100, anchor: "start" },
    { label: "Izquierda", x: 14, y: 100, anchor: "end" },
  ] as const;
  return (
    <svg viewBox="-62 -14 324 224" className="w-full h-auto" role="img" aria-label="Vista desde arriba: la impresión rodea el vaso entero, con frente, derecha, atrás e izquierda">
      <circle cx="100" cy="100" r="70" fill="none" stroke="var(--cs-laser)" strokeWidth="14" strokeDasharray="2 3" opacity="0.9" />
      <circle cx="100" cy="100" r="58" fill="var(--cs-ink-2)" stroke="rgb(239 230 218 / .25)" />
      <text x="100" y="108" textAnchor="middle" fill="var(--cs-mark)" fontSize="24" fontFamily="var(--app-font-serif, serif)">360°</text>
      {faces.map(f => (
        <text key={f.label} x={f.x} y={f.y} textAnchor={f.anchor} fill="var(--cs-mark-dim)" fontSize="15" fontFamily="Inter, sans-serif" dominantBaseline="middle">
          {f.label}
        </text>
      ))}
    </svg>
  );
}

export default function Print360() {
  const design = () => {
    track("cta_click", { location: "print360_design" });
    startCustomizer({ technique: "color" });
  };
  return (
    <section id="impresion-360" aria-labelledby="p360-title" className="scroll-mt-16 bg-[var(--cs-ink)] text-[var(--cs-mark)] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 md:py-24 grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 lg:gap-16 items-center">
        <figure className="relative m-0 rounded-[18px] overflow-hidden shadow-[0_30px_60px_-24px_rgba(0,0,0,0.75)] max-w-md mx-auto lg:max-w-none w-full">
          <img
            src="/galeria/vaso-360.webp"
            srcSet="/galeria/vaso-360-700.webp 700w, /galeria/vaso-360.webp 900w"
            sizes="(min-width: 1024px) 520px, (min-width: 640px) 448px, 100vw"
            alt="Vaso impreso a todo color en toda la vuelta con la Dacen F5: paisaje, helicóptero y logos alrededor del cuerpo"
            width={900}
            height={1125}
            loading="lazy"
            decoding="async"
            className="w-full h-auto aspect-[4/5] object-cover"
          />
          <figcaption className="absolute left-3 bottom-3 text-[13px] font-medium text-white bg-black/70 px-2.5 py-1.5 rounded-lg">
            Impreso en nuestro taller con la Dacen F5
          </figcaption>
        </figure>

        <div className="min-w-0">
          <h2 id="p360-title" className="font-serif font-light text-white text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.02] tracking-[-0.01em]">
            Todo el vaso, a todo color.
          </h2>
          <p className="mt-5 text-[var(--cs-mark-dim)] text-base md:text-lg leading-relaxed max-w-[38rem]">
            Tenemos una <strong className="text-[var(--cs-mark)] font-semibold">impresora UV cilíndrica Dacen F5</strong>: imprime directo
            sobre el vaso mientras lo gira, así tu diseño da la vuelta completa. Una foto de punta a punta, la identidad de tu
            marca o tu idea, con todos sus colores.
          </p>

          <div className="mt-8 grid sm:grid-cols-[minmax(0,1fr)_200px] gap-8 items-start">
            <dl className="grid gap-4">
              {FACTS.map(f => (
                <div key={f.k} className="grid grid-cols-[4.25rem_1fr] gap-3 items-baseline border-b border-white/10 pb-4 last:border-0 last:pb-0">
                  <dt className="font-serif text-2xl text-white leading-none">{f.k}</dt>
                  <dd className="text-[15px] leading-relaxed">{f.v}</dd>
                </div>
              ))}
            </dl>
            <div className="hidden sm:block"><TopView /></div>
          </div>

          <div className="mt-9 grid md:grid-cols-2 gap-3">
            <div className="rounded-[14px] border border-white/15 p-5 grid gap-3 content-start">
              <h3 className="text-base font-semibold text-white">Armalo acá</h3>
              <p className="text-sm text-[var(--cs-mark-dim)] leading-relaxed">
                Subí una foto de fondo y sumá hasta 4 logos y tu texto en el frente, los costados o atrás.
              </p>
              <button type="button" onClick={design} className="cs-btn cs-btn-primary mt-1">
                Diseñar mi vaso 360°
                <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
            <div className="rounded-[14px] border border-white/15 p-5 grid gap-3 content-start">
              <h3 className="text-base font-semibold text-white">Traé tu arte</h3>
              <p className="text-sm text-[var(--cs-mark-dim)] leading-relaxed">
                ¿Trabajás con un diseñador? En el personalizador bajás la plantilla a tamaño real de tu vaso y subís el arte completo.
              </p>
              <a
                href={whatsappUrl("¡Hola! Quiero cotizar una impresión 360° a todo color.")}
                target="_blank"
                rel="noopener noreferrer"
                data-track="print360_cotizar"
                className="cs-btn cs-btn-ghost-dark mt-1"
              >
                Cotizar por WhatsApp
              </a>
            </div>
          </div>
          <p className="mt-4 text-sm text-[var(--cs-mark-dim)]">
            El precio depende del diseño y la cantidad: te lo pasamos por WhatsApp. Ideal también para empresas y eventos.
          </p>
        </div>
      </div>
    </section>
  );
}
