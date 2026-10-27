import React, { useState } from "react";
import { EXAMPLES, exampleUrl } from "@/lib/sticker-examples";
import { STICKER_MAX_CM, STICKER_MAX_QTY, STICKER_MIN_CM, STICKER_FINISHES } from "@/lib/sticker-pricing";
import { whatsappUrl } from "@/lib/contact";
import { openStickerTool } from "@/lib/section-reveal";
import { track } from "@/lib/analytics";

/**
 * «Stickers con tu diseño»: presenta la herramienta de stickers, que vive
 * dentro del personalizador (modo "Stickers"). Liviana a propósito: no carga
 * la herramienta; «Crear mis stickers» la abre (openStickerTool).
 *
 * Los datos (3 a 28 cm, 1 a 1.000 unidades, silueta o rectángulo, Brillante o
 * Relieve 3D) salen de sticker-pricing.ts, la misma fuente de la herramienta.
 * La plancha usa los diseños de ejemplo de la herramienta y lo dice.
 */
const URLS = EXAMPLES.map(e => exampleUrl(e.svg));
/** Plancha: posición (% de la plancha), ancho (fracción del ancho) y giro. */
const SHEET = [
  { i: 0, x: 7, y: 9, w: 0.37, r: -6 },
  { i: 1, x: 54, y: 6, w: 0.33, r: 5 },
  { i: 2, x: 40, y: 52, w: 0.45, r: -3 },
  { i: 0, x: 10, y: 62, w: 0.18, r: 8 },
  { i: 1, x: 81, y: 60, w: 0.15, r: -10 },
];
const fmt = (n: number) => n.toLocaleString("es-PY");

export default function StickersPromo() {
  const [finish, setFinish] = useState(STICKER_FINISHES[0].id);
  const finishDef = STICKER_FINISHES.find(f => f.id === finish) ?? STICKER_FINISHES[0];
  const relieve = finish === "relieve";
  // El acabado se describe sin promesas que la herramienta no hace: solo el
  // primer enunciado de cada descripción («Colores vivos…», «Tinta con volumen…»).
  const finishLine = finishDef.desc.split(". ")[0].replace(/\.$/, "") + ".";

  return (
    <section id="stickers" aria-labelledby="stk-title" className="scroll-mt-16 bg-[var(--cs-acero)]">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 md:py-24 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-10 lg:gap-16 items-center">
        <div className="min-w-0">
          <h2 id="stk-title" className="font-serif font-light text-[var(--cs-ink)] text-[clamp(2.5rem,6vw,4rem)] leading-[1]">
            Stickers con<br /><em className="italic">tu diseño.</em>
          </h2>
          <p className="mt-4 md:mt-5 text-[var(--cs-grafito)] text-base md:text-lg leading-relaxed max-w-[30em]">
            Subí tu logo, un dibujo o una foto y lo imprimimos a todo color, cortado con la forma de tu diseño.
            Para termos, notebooks, celulares o el packaging de tu marca.
          </p>

          <div role="group" aria-label="Acabado" className="mt-6 inline-flex p-1 gap-1 rounded-xl bg-white border border-[#D3D3D1]">
            {STICKER_FINISHES.map(f => (
              <button
                key={f.id}
                type="button"
                aria-pressed={finish === f.id}
                onClick={() => { setFinish(f.id); track("stickers_promo_finish", { finish: f.id }); }}
                className={`min-h-11 px-4 rounded-[9px] text-sm font-semibold transition-colors ${finish === f.id ? "bg-[var(--cs-ink)] text-white" : "text-[var(--cs-grafito)] hover:bg-[var(--cs-acero)]"}`}
              >
                {f.name}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-sm text-[var(--cs-grafito)]" aria-live="polite">{finishLine}</p>

          <dl className="mt-7 grid grid-cols-3 border-t border-[#D3D3D1]">
            {[
              { k: "Desde 1", v: `unidad, hasta ${fmt(STICKER_MAX_QTY)}` },
              { k: `${fmt(STICKER_MIN_CM)}–${fmt(STICKER_MAX_CM)} cm`, v: "el lado más largo" },
              { k: "Silueta", v: "o rectángulo con esquinas redondeadas" },
            ].map((f, i) => (
              <div key={f.k} className={`grid gap-1.5 content-start pt-4 ${i ? "pl-3 md:pl-4 border-l border-[#D3D3D1]" : "pr-3"}`}>
                <dt className="font-serif font-light text-[var(--cs-ink)] text-[20px] md:text-[28px] leading-[1.05]">{f.k}</dt>
                <dd className="text-[12px] md:text-[13.5px] leading-snug text-[var(--cs-grafito)]">{f.v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => { track("cta_click", { location: "stickers_promo" }); openStickerTool(); }}
              className="cs-btn cs-btn-primary"
            >
              Crear mis stickers
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
            <a
              href={whatsappUrl("¡Hola! Quiero cotizar stickers con mi diseño.")}
              target="_blank"
              rel="noopener noreferrer"
              data-track="stickers_cotizar"
              className="cs-btn cs-btn-ghost"
            >
              Cotizar por WhatsApp
            </a>
          </div>
          <p className="mt-4 text-sm text-[var(--cs-grafito)]">Antes de pedir lo ves a tamaño real. El precio te lo pasamos por WhatsApp.</p>
        </div>

        {/* Plancha de ejemplo sobre la cuadrícula de 1 cm de la herramienta. */}
        <div
          aria-hidden
          className={`stk-sheet relative h-[330px] sm:h-[440px] lg:h-[520px] rounded-[22px] overflow-hidden shadow-[0_30px_60px_-30px_rgba(22,18,15,0.45)] ${relieve ? "is-relieve" : ""}`}
        >
          <span className="absolute right-4 top-4 z-10 text-[11.5px] font-semibold text-white bg-[var(--cs-ink)] px-2 py-1.5 rounded-md">Diseños de ejemplo</span>
          {SHEET.map((s, k) => (
            <div
              key={k}
              className="stk-item absolute"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w * 100}%`, ["--r" as string]: `rotate(${s.r}deg)`, ["--m" as string]: `url("${URLS[s.i]}")` }}
            >
              <img src={URLS[s.i]} alt="" className="block w-full h-auto" />
            </div>
          ))}
          <div className="stk-ruler absolute left-[7%] top-[53%] w-[37%]"><span>7 cm</span></div>
          <span className="absolute left-4 bottom-3.5 text-xs font-medium text-[#5F5753]">Cada cuadro = 1 cm</span>
        </div>
      </div>
    </section>
  );
}
