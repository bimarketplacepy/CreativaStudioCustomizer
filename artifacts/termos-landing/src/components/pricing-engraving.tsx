import React from "react";
import { ENGRAVING_BASE, ENGRAVING_PLANS } from "@/lib/engraving-plans";
import { engravingPrice, formatGs, useCatalog } from "@/lib/odoo-catalog";
import { PRICING } from "@/lib/pricing";
import { PEN_OPTIONS } from "@/lib/materials";
import { whatsappUrl } from "@/lib/contact";
import { startCustomizer } from "@/lib/section-reveal";
import { track } from "@/lib/analytics";

const ROW = "flex items-baseline justify-between gap-6 py-4 md:py-5 border-b border-white/10";
const LABEL = "text-[var(--cs-mark)] text-[15px] md:text-base leading-snug";
const PRICE = "shrink-0 font-serif text-xl md:text-2xl text-white tabular-nums";
/** Lo que todavía no tiene precio publicado (PRICING.enabled en false). */
const QUOTED = "shrink-0 text-[13px] font-semibold text-[var(--cs-mark-dim)]";

export default function PricingEngraving() {
  // Precios de grabado desde Odoo (servicios GRAB-*) cuando existen; si no, los
  // publicados en engraving-plans.ts. Misma fuente que el precio del personalizador.
  const catalog = useCatalog();
  return (
    <section id="precios" aria-labelledby="precios-title" className="scroll-mt-16 bg-[var(--cs-ink)] text-[var(--cs-mark)] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 md:py-24 grid lg:grid-cols-[minmax(0,1fr)_400px] gap-10 lg:gap-16 items-start">
        <div className="min-w-0">
          <h2 id="precios-title" className="font-serif font-light text-white text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05]">
            Precios del grabado
          </h2>
          {/* Antes: "incluido en todos los planes" junto a un plan que cobra
              justamente eso — se leía como si el grabado fuera gratis. */}
          <p className="mt-4 text-[var(--cs-mark-dim)] text-base md:text-[17px] leading-relaxed max-w-[36rem]">
            Grabado láser: se suma al precio de la pieza, que ves en el personalizador. Todos los planes
            incluyen {ENGRAVING_BASE.toLowerCase()}.
          </p>

          <div className="mt-8 flex flex-col">
            {ENGRAVING_PLANS.map(plan => (
              <div key={plan.id} className={`${ROW} first:border-t`}>
                <p className={LABEL}>{plan.shortLabel}</p>
                <span className={PRICE}>{formatGs(engravingPrice(catalog, plan.id))}</span>
              </div>
            ))}
            <div className={ROW}>
              <p className={LABEL}>Escritura extra (segundo texto, tapa o base)</p>
              <span className={PRICE}>+ {formatGs(PRICING.laser.extraText)}</span>
            </div>
            <div className={ROW}>
              <p className={LABEL}>Grabado de bolígrafos, por unidad</p>
              <span className={PRICE}>desde {formatGs(Math.min(...PEN_OPTIONS.map(o => o.price)))}</span>
            </div>
            {/* Impresión a color (Dacen F5, 360°) y stickers todavía no publican
                montos (PRICING.enabled): se listan igual para que no parezca que
                no existen. */}
            {!PRICING.enabled.dacen && (
              <div className={ROW}>
                <p className={LABEL}>Impresión a todo color y 360° en vasos y termos</p>
                <span className={QUOTED}>A cotizar</span>
              </div>
            )}
            {!PRICING.enabled.stickers && (
              <div className={ROW}>
                <p className={LABEL}>Stickers</p>
                <span className={QUOTED}>A cotizar</span>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-[18px] border border-[var(--cs-laser)]/45 bg-[#2A1E1C] p-6 md:p-7 grid gap-4">
          <h3 className="font-serif font-light text-white text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.08]">¿Traés tu termo o tu vaso?</h3>
          <p className="text-[var(--cs-mark-dim)] text-[15px] leading-relaxed">
            Pagás solo la personalización, aunque no lo hayas comprado acá.
          </p>
          <button
            type="button"
            onClick={() => { track("cta_click", { location: "precios_propio" }); startCustomizer({ ownProduct: true }); }}
            className="cs-btn cs-btn-primary w-full"
          >
            Personalizar el mío
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
          <a
            href={whatsappUrl("¡Hola! Quisiera cotizar una impresión a color en 360° o stickers.")}
            target="_blank"
            rel="noopener noreferrer"
            data-track="precios_cotizar"
            className="cs-btn cs-btn-ghost-dark w-full"
          >
            Cotizar 360° o stickers
          </a>
        </aside>
      </div>
    </section>
  );
}
