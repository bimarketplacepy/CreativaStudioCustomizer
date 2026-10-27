import React, { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { whatsappUrl } from "@/lib/contact";
import { scrollToSection, startCustomizer } from "@/lib/section-reveal";

const NAV_ITEMS = [
  { label: "Personalizar", id: "customizer" },
  { label: "Impresión 360°", id: "impresion-360" },
  { label: "Stickers", id: "stickers" },
  { label: "Trabajos", id: "galeria" },
  { label: "Precios", id: "precios" },
];

/** Fotos reales del taller. La primera es la imagen LCP en escritorio: su
 *  srcset/sizes tienen que coincidir con el preload de index.html. */
const COLLAGE = [
  { src: "/galeria/vaso-360", alt: "Vaso impreso a todo color en toda la vuelta con la Dacen F5", caption: "Impresión 360° a todo color" },
  { src: "/galeria/tablamadera", alt: "Tabla de madera con un nombre grabado a láser", caption: "Grabado láser en madera" },
  { src: "/galeria/vasorosa", alt: "Vaso rosa grabado con «Gracias por ser mi mamá»", caption: "Regalo con nombre" },
];
export const HERO_IMAGE_SIZES = "(min-width: 1024px) 400px, 150px";

function Arrow() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function Check() {
  return (
    <svg aria-hidden className="w-4 h-4 shrink-0 text-[var(--cs-laser)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function Chat({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

export default function Hero() {
  // Menú del celular (en md+ el nav va en línea). Arranca cerrado: el hero se
  // pre-renderiza y el primer render tiene que coincidir con el HTML.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    const onScroll = () => setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [menuOpen]);

  // "Traé de tu casa o comprá acá" + lo que quiere grabar: arranca el
  // personalizador con eso cargado (startCustomizer en section-reveal.ts).
  const [own, setOwn] = useState(false);
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const start = (e?: React.FormEvent) => {
    e?.preventDefault();
    track("cta_click", { location: "hero_start", own, text: !!trimmed });
    startCustomizer({ text: trimmed, ownProduct: own });
  };
  const go360 = () => {
    track("cta_click", { location: "hero_360" });
    scrollToSection("impresion-360");
  };

  return (
    <>
      <header id="inicio" className="w-full bg-[var(--cs-ink)] sticky top-0 z-50 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <a href="#inicio" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            <img src="/navbar-logo-v2.webp" alt="Marketplace" width={200} height={40} decoding="async" className="h-5 sm:h-7 object-contain brightness-0 invert shrink-0 w-auto" />
            <span aria-hidden className="w-px h-6 bg-white/25 shrink-0" />
            <img src="/la-creativa-logo-96.webp" alt="" width={32} height={32} decoding="async" className="h-5 sm:h-7 object-contain brightness-0 invert shrink-0 w-auto" />
            <span className="text-[var(--cs-mark)] text-sm sm:text-[15px] font-semibold whitespace-nowrap">Creativa Studio</span>
          </a>
          <nav aria-label="Secciones" className="hidden lg:flex flex-1 justify-center items-center gap-7 text-[15px] text-[var(--cs-mark-dim)] font-medium">
            {NAV_ITEMS.map(item => (
              <a key={item.id} href={`#${item.id}`} onClick={e => { e.preventDefault(); scrollToSection(item.id); }} className="hover:text-white transition-colors">
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href={whatsappUrl("¡Hola! Quiero consultar por una personalización.")}
            target="_blank"
            rel="noopener noreferrer"
            data-track="header"
            className="hidden lg:inline-flex cs-btn cs-btn-ghost-dark cs-btn-sm ml-auto lg:ml-0"
          >
            <Chat className="w-4 h-4" /> Escribinos
          </a>
          <div className="lg:hidden ml-auto flex items-center -mr-2">
            <a
              href={whatsappUrl("¡Hola! Quiero consultar por una personalización.")}
              target="_blank"
              rel="noopener noreferrer"
              data-track="header"
              aria-label="Escribinos por WhatsApp"
              className="inline-flex items-center justify-center w-11 h-11 text-[var(--cs-mark)]"
            >
              <Chat />
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              className="inline-flex items-center justify-center w-11 h-11 text-[var(--cs-mark)]"
            >
              <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="mobile-nav" aria-label="Secciones" className="lg:hidden border-t border-white/10 bg-[var(--cs-ink)] px-4 pb-3">
            {NAV_ITEMS.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={e => { e.preventDefault(); setMenuOpen(false); scrollToSection(item.id); }}
                className="flex items-center min-h-12 text-base text-[var(--cs-mark)] border-b border-white/[0.06] last:border-0"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <section aria-labelledby="hero-title" className="relative bg-[var(--cs-ink)] text-[var(--cs-mark)] overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 pt-9 pb-8 md:pt-16 lg:py-20 grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-10 lg:gap-14 items-center">
          <div className="min-w-0">
            {/* Estático (sin animación de entrada): en celular el <h1> es el LCP. */}
            <h1 id="hero-title" className="font-serif font-light text-white text-[clamp(2.75rem,8.4vw,5.75rem)] leading-[0.98] tracking-[-0.015em]">
              Lo que quieras,<br />
              <em className="italic cs-laser">a tu manera.</em>
            </h1>

            <p className="mt-6 md:mt-7 text-[var(--cs-mark-dim)] text-base md:text-[19px] leading-relaxed max-w-[34rem]">
              Grabado láser en termos, vasos, cuero, madera y cristal, e impresión a todo color
              en 360° alrededor del vaso. Lo diseñás acá, lo ves en 3D y lo confirmás por WhatsApp.
            </p>

            <form onSubmit={start} className="mt-7 md:mt-9 grid gap-2.5 max-w-[34rem]">
              <p id="fork-label" className="text-sm font-semibold text-[var(--cs-mark)]">Traé de tu casa o comprá acá</p>
              <div role="group" aria-labelledby="fork-label" className="grid grid-cols-2 gap-2.5">
                {[
                  { own: false, title: "Lo elijo acá", sub: "Termos y vasos de la tienda", subShort: "De la tienda" },
                  { own: true, title: "Traigo el mío", sub: "Pagás solo el grabado", subShort: "Solo el grabado" },
                ].map(o => {
                  const on = own === o.own;
                  return (
                    <button
                      key={o.title}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setOwn(o.own)}
                      className={`text-left rounded-xl border px-3.5 py-3 sm:px-4 sm:py-3.5 transition-colors ${on ? "border-[var(--cs-laser)] bg-[#2A1E1C] shadow-[inset_0_0_0_1px_var(--cs-laser)]" : "border-white/20 bg-[var(--cs-ink-2)] hover:border-white/40"}`}
                    >
                      <span className="flex items-center justify-between gap-2 text-[15px] sm:text-base font-semibold text-[var(--cs-mark)]">
                        {o.title}
                        <span aria-hidden className={`w-[18px] h-[18px] rounded-full border-[1.5px] grid place-items-center shrink-0 ${on ? "bg-[var(--cs-laser)] border-[var(--cs-laser)]" : "border-white/40"}`}>
                          {on && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                      </span>
                      <span className="block mt-1 text-[12.5px] sm:text-[13.5px] text-[var(--cs-mark-dim)]">
                        <span className="sm:hidden">{o.subShort}</span><span className="hidden sm:inline">{o.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 mt-1">
                <label htmlFor="hero-engrave" className="sr-only">¿Qué querés grabar?</label>
                <input
                  id="hero-engrave"
                  value={text}
                  onChange={e => setText(e.target.value.slice(0, 24))}
                  maxLength={24}
                  autoComplete="off"
                  enterKeyHint="go"
                  placeholder="¿Qué querés grabar? Ej.: Sofía"
                  className="flex-1 min-w-0 min-h-12 rounded-[10px] border border-white/25 bg-[#0F0C0A] px-4 text-base text-white placeholder:text-[#8F857B] focus:outline-none focus:ring-2 focus:ring-[var(--cs-laser)]"
                />
                <button type="submit" className="cs-btn cs-btn-primary">
                  <span className="truncate max-w-[16rem]">{trimmed ? `Ver «${trimmed}» en 3D` : "Verlo en 3D"}</span> <Arrow />
                </button>
              </div>
            </form>

            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--cs-mark-dim)]">
              <li className="flex items-center gap-2"><Check /> Revisamos el diseño con vos</li>
              <li className="flex items-center gap-2"><Check /> Pagás cuando lo confirmás</li>
            </ul>

            <button
              type="button"
              onClick={go360}
              className="group mt-6 inline-flex items-center gap-3 rounded-full border border-[var(--cs-laser)]/50 bg-[var(--cs-laser)]/10 pl-1.5 pr-4 py-1.5 text-left text-sm text-[var(--cs-mark)] hover:bg-[var(--cs-laser)]/20 transition-colors"
            >
              <span className="rounded-full bg-[var(--cs-bordo)] text-white text-xs font-bold px-2.5 py-1">360°</span>
              <span>Tu diseño en toda la vuelta del vaso, a todo color</span>
              <span className="w-4 h-4 transition-transform group-hover:translate-x-0.5"><Arrow /></span>
            </button>
          </div>

          {/* Fotos reales: collage en escritorio, tira deslizable en celular. */}
          <div className="min-w-0">
            <div className="hidden lg:block relative h-[560px]">
              {COLLAGE.map((p, i) => (
                <figure
                  key={p.src}
                  className={`absolute m-0 overflow-hidden rounded-[18px] shadow-[0_30px_60px_-24px_rgba(0,0,0,0.75)] ${
                    i === 0 ? "left-[6%] top-0 w-[400px] max-w-[64%] h-[500px]" : i === 1 ? "right-0 top-[90px] w-[250px] max-w-[42%] h-[290px]" : "right-[12%] bottom-0 w-[240px] max-w-[40%] h-[190px]"
                  }`}
                >
                  <img
                    src={`${p.src}.webp`}
                    srcSet={`${p.src}-700.webp 700w, ${p.src}.webp 900w`}
                    sizes={i === 0 ? HERO_IMAGE_SIZES : "250px"}
                    alt={p.alt}
                    width={900}
                    height={1125}
                    // lazy también la principal: el collage está oculto en
                    // celular (sin esto bajaba ~100 KB de más) y en escritorio
                    // el <link rel=preload media> de index.html ya la trae.
                    loading="lazy"
                    fetchPriority={i === 0 ? "high" : "auto"}
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <figcaption className="absolute left-3 bottom-3 text-[13px] font-medium text-white bg-black/70 px-2.5 py-1.5 rounded-lg">{p.caption}</figcaption>
                </figure>
              ))}
            </div>
            <div className="lg:hidden -mx-5 sm:-mx-6 px-5 sm:px-6 flex gap-2.5 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {COLLAGE.map((p, i) => (
                <figure key={p.src} className="relative m-0 shrink-0 w-[150px] sm:w-[200px] aspect-[5/6] rounded-[14px] overflow-hidden snap-start">
                  <img
                    src={`${p.src}-700.webp`}
                    alt={p.alt}
                    width={700}
                    height={875}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <figcaption className="absolute left-2 bottom-2 right-2 text-[11.5px] font-medium text-white bg-black/70 px-2 py-1 rounded-md">{p.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
