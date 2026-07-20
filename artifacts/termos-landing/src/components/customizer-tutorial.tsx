import React, { useEffect, useRef, useState } from "react";

/**
 * Onboarding modal with a self-playing preview of the customizer.
 *
 * Opens automatically the first time the visitor scrolls the #customizer
 * section into view (35% threshold — works the same for touch scroll, mouse
 * wheel or the "Comenzar" anchor). Inside, a ~13s looping animation replays a
 * full use case: pick product + material → tap a colour (the thermos recolours
 * live) → type a name (engraved onto the piece) → summary + WhatsApp.
 *
 * Fully self-contained layer: own `tuto-`-prefixed CSS, no globals touched
 * besides the body scroll lock while open, and a localStorage flag
 * ("tutoPersonalizadorVisto") when the visitor opts out for good.
 */

const STORAGE_KEY = "tutoPersonalizadorVisto";
const SECTION_ID = "customizer";

const TITULOS = ["Producto", "Estilo", "Diseño", "Resumen"];
const CAPTIONS = [
  "Elegí tu producto y material",
  "Tocá un color y velo en vivo",
  "Escribí tu nombre o marca",
  "Confirmá y pedilo por WhatsApp",
];

// Real brand palette (see COLORS in customizer.tsx). The demo termo starts in
// "Rojo Marketplace" and recolours to "Verde Esmeralda" on tap.
const ROJO = "#C1121F";
const ROJO_MANIJA = "#8f0d16";
const VERDE = "#27AE60";
const VERDE_MANIJA = "#1e8a4c";
const SWATCHES = [ROJO, "#1E3A5F", VERDE, "#F4A261", "#023E8A", "#6D4C41", "#111111", "#DDDDDD"];

const FRASE = "Tu Marca";

const CSS = `
.tuto-overlay {
  position: fixed; inset: 0;
  background: rgba(15,15,20,0.55);
  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px; z-index: 9999;
  opacity: 0; pointer-events: none;
  transition: opacity .25s ease;
}
.tuto-overlay.tuto-visible { opacity: 1; pointer-events: auto; }

.tuto-card {
  --tuto-brand: hsl(var(--primary));
  background: #fff; color: #1c1c1e;
  border-radius: 18px; max-width: 400px; width: 100%;
  padding: 20px 18px 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,.3);
  position: relative;
  transform: translateY(12px) scale(.97);
  transition: transform .25s ease;
}
.tuto-overlay.tuto-visible .tuto-card { transform: none; }

.tuto-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.tuto-head .tuto-paso { color: var(--tuto-brand); font-weight: 800; font-size: .8rem; letter-spacing: .04em; }
.tuto-head .tuto-titulo { font-size: .85rem; color: #8a8a8e; }

.tuto-bars { display: flex; gap: 6px; margin-bottom: 12px; }
.tuto-bars i { flex: 1; height: 5px; border-radius: 3px; background: #e7e7ec; transition: background .3s; }
.tuto-bars i.tuto-on { background: var(--tuto-brand); }

.tuto-visor {
  background: #f5eaec; border-radius: 14px; height: 190px;
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  transition: background .5s;
}
.tuto-visor.tuto-verde { background: #EAF4EC; }

.tuto-termo-txt {
  font-size: 9px; font-weight: 700; fill: #fff;
  opacity: 0; transition: opacity .3s;
  font-family: Georgia, serif; letter-spacing: .5px;
}
.tuto-termo-txt.tuto-show { opacity: 1; }

.tuto-panel { margin-top: 12px; min-height: 132px; position: relative; }
.tuto-escena {
  position: absolute; inset: 0;
  opacity: 0; transform: translateX(14px);
  transition: opacity .3s, transform .3s;
  pointer-events: none;
}
.tuto-escena.tuto-activa { opacity: 1; transform: none; }

.tuto-lbl { font-size: .8rem; font-weight: 700; margin: 2px 0 8px; }
.tuto-fila { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

.tuto-pill {
  border: 1.5px solid #d9d9de; border-radius: 999px;
  padding: 7px 14px; font-size: .82rem; background: #fff;
  transition: border-color .2s, color .2s, background .2s;
  white-space: nowrap;
}
.tuto-pill.tuto-sel { border-color: var(--tuto-brand); color: var(--tuto-brand); background: #fdf3f6; font-weight: 700; }

.tuto-dot {
  width: 26px; height: 26px; border-radius: 50%;
  border: 2px solid transparent; position: relative;
  transition: border-color .2s, transform .2s;
}
.tuto-dot.tuto-sel { border-color: var(--tuto-brand); transform: scale(1.12); }
.tuto-dot.tuto-sel::after {
  content: "\\2713"; position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: .7rem; font-weight: 800;
}

.tuto-fake-input {
  border: 1.5px solid #d9d9de; border-radius: 10px;
  padding: 9px 12px; font-size: .85rem; color: #1c1c1e;
  min-height: 20px; background: #fff;
}
.tuto-caret {
  display: inline-block; width: 1px; height: 14px;
  background: var(--tuto-brand); vertical-align: -2px;
  animation: tuto-blink 1s steps(1) infinite;
}
@keyframes tuto-blink { 50% { opacity: 0; } }

.tuto-resumen { font-size: .78rem; border: 1px solid #eee; border-radius: 10px; overflow: hidden; }
.tuto-resumen > div { display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #f2f2f4; }
.tuto-resumen > div:last-child { border-bottom: 0; }
.tuto-resumen span:first-child { color: #8a8a8e; }
.tuto-resumen span:last-child { font-weight: 600; }

.tuto-wsp {
  margin-top: 8px; width: 100%; border: 0; border-radius: 999px;
  background: var(--tuto-brand); color: #fff; font-weight: 700;
  padding: 10px; font-size: .88rem;
}
.tuto-wsp.tuto-pulso { animation: tuto-pulso 1.2s ease infinite; }
@keyframes tuto-pulso {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / .35); }
  50%      { box-shadow: 0 0 0 10px hsl(var(--primary) / 0); }
}

.tuto-tap {
  position: absolute; width: 34px; height: 34px; border-radius: 50%;
  background: hsl(var(--primary) / .28); border: 2px solid hsl(var(--primary) / .55);
  pointer-events: none; z-index: 5;
  opacity: 0; transform: scale(.5);
  transition: left .5s ease, top .5s ease, opacity .25s, transform .25s;
}
.tuto-tap.tuto-show { opacity: 1; transform: scale(1); }
.tuto-tap.tuto-pressing { transform: scale(.72); }

.tuto-caption {
  text-align: center; font-size: .82rem; color: #8a8a8e;
  margin: 10px 0 12px; min-height: 18px;
}
.tuto-cta {
  width: 100%; padding: 12px; border: 0; border-radius: 999px;
  background: var(--tuto-brand); color: #fff;
  font-size: .95rem; font-weight: 700; cursor: pointer;
}
.tuto-cta:active { transform: scale(.98); }
.tuto-skip {
  display: block; margin: 8px auto 0; background: none; border: 0;
  color: #8a8a8e; font-size: .8rem; cursor: pointer; text-decoration: underline;
}

@media (prefers-reduced-motion: reduce) {
  .tuto-tap, .tuto-escena, .tuto-overlay, .tuto-card, .tuto-visor, .tuto-bars i { transition: none; }
  .tuto-wsp.tuto-pulso, .tuto-caret { animation: none; }
}
`;

export default function CustomizerTutorial() {
  // Mounted only while the tutorial can still show; removed for good once the
  // visitor opts out (or after the close fade finishes).
  const [habilitado, setHabilitado] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paso, setPaso] = useState(0);
  const [selTermo, setSelTermo] = useState(false);
  const [selAcero, setSelAcero] = useState(false);
  const [selVerde, setSelVerde] = useState(false);
  const [typed, setTyped] = useState("");
  const [grabado, setGrabado] = useState(false);
  const [pulso, setPulso] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const tapRef = useRef<HTMLDivElement>(null);
  const pillTermoRef = useRef<HTMLSpanElement>(null);
  const pillAceroRef = useRef<HTMLSpanElement>(null);
  const dotVerdeRef = useRef<HTMLSpanElement>(null);
  const btnWspRef = useRef<HTMLButtonElement>(null);
  const yaMostradoRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);

  const wait = (fn: () => void, ms: number) => {
    timeoutsRef.current.push(window.setTimeout(fn, ms));
  };
  const limpiar = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  /** Glide the "finger" onto an element (positions relative to the card),
   *  press it after the glide, and run the visual selection on release. */
  const tocar = (el: HTMLElement | null, luego: () => void) => {
    const card = cardRef.current;
    const tap = tapRef.current;
    if (!el || !card || !tap) { luego(); return; }
    const r = el.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    tap.style.left = `${r.left - c.left + r.width / 2 - 17}px`;
    tap.style.top = `${r.top - c.top + r.height / 2 - 17}px`;
    tap.classList.add("tuto-show");
    wait(() => tap.classList.add("tuto-pressing"), 550);
    wait(() => { tap.classList.remove("tuto-pressing"); luego(); }, 750);
  };

  const irA = (n: number) => {
    setPaso(n);
    tapRef.current?.classList.remove("tuto-show");
  };

  /** Full ~13.5s script. Resets every visual state, replays the four scenes
   *  and re-invokes itself to loop until the modal closes. */
  const reproducir = () => {
    limpiar();
    irA(0);
    setSelTermo(false);
    setSelAcero(false);
    setSelVerde(false);
    setTyped("");
    setGrabado(false);
    setPulso(false);

    // Scene 1 — product + material
    wait(() => tocar(pillTermoRef.current, () => setSelTermo(true)), 700);
    wait(() => tocar(pillAceroRef.current, () => setSelAcero(true)), 2100);
    wait(() => irA(1), 3600);

    // Scene 2 — colour (termo recolours live)
    wait(() => tocar(dotVerdeRef.current, () => setSelVerde(true)), 4300);
    wait(() => irA(2), 6200);

    // Scene 3 — typing, then the engraving fades onto the termo
    FRASE.split("").forEach((_, i) => {
      wait(() => setTyped(FRASE.slice(0, i + 1)), 6900 + i * 130);
    });
    wait(() => setGrabado(true), 6900 + FRASE.length * 130 + 300);
    wait(() => irA(3), 9600);

    // Scene 4 — summary + WhatsApp pulse, then loop
    wait(() => tocar(btnWspRef.current, () => setPulso(true)), 10200);
    wait(reproducir, 13500);
  };

  const cerrar = (recordar: boolean) => {
    limpiar();
    setVisible(false);
    document.body.style.overflow = "";
    if (recordar) {
      try { localStorage.setItem(STORAGE_KEY, "nunca"); } catch { /* private mode */ }
    }
    // Let the fade-out play, then drop the whole layer from the DOM.
    window.setTimeout(() => setHabilitado(false), 300);
  };

  // Trigger: first time 35% of the customizer section is on screen.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "nunca") return;
    } catch { /* localStorage unavailable: still show once */ }
    setHabilitado(true);

    const seccion = document.getElementById(SECTION_ID);
    if (!seccion || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !yaMostradoRef.current) {
          yaMostradoRef.current = true;
          observer.disconnect();
          setVisible(true);
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(seccion);
    return () => observer.disconnect();
  }, []);

  // While open: lock body scroll, close on Escape, run the animation loop.
  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(false); };
    document.addEventListener("keydown", onKey);
    reproducir();
    return () => {
      document.removeEventListener("keydown", onKey);
      limpiar();
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!habilitado) return null;

  return (
    <div
      className={`tuto-overlay${visible ? " tuto-visible" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Cómo funciona el personalizador"
      onClick={(e) => { if (e.target === e.currentTarget) cerrar(false); }}
    >
      <style>{CSS}</style>
      <div className="tuto-card" ref={cardRef}>
        <div className="tuto-head">
          <span className="tuto-paso">PASO {paso + 1} DE 4</span>
          <span className="tuto-titulo">{TITULOS[paso]}</span>
        </div>
        <div className="tuto-bars">
          {TITULOS.map((_, i) => <i key={i} className={i <= paso ? "tuto-on" : ""} />)}
        </div>

        {/* Visor: termo SVG that recolours and gets engraved live */}
        <div className={`tuto-visor${selVerde ? " tuto-verde" : ""}`}>
          <svg width="92" height="160" viewBox="0 0 92 160" aria-hidden="true">
            <ellipse cx="46" cy="152" rx="30" ry="5" fill="rgba(0,0,0,.12)" />
            <path
              d="M22 55 q-16 0 -16 18 v20 q0 18 16 18 v-10 q-8 0 -8 -9 v-18 q0-9 8-9 z"
              style={{ fill: selVerde ? VERDE_MANIJA : ROJO_MANIJA, transition: "fill .6s" }}
            />
            <path
              d="M24 45 q0-10 10-11 h24 q10 1 10 11 v92 q0 14 -14 15 h-16 q-14 -1 -14 -15 z"
              style={{ fill: selVerde ? VERDE : ROJO, transition: "fill .6s" }}
            />
            <rect x="30" y="48" width="7" height="95" rx="3.5" fill="rgba(255,255,255,.35)" />
            <path d="M32 34 q0-8 8-8 h12 q8 0 8 8 v4 h-28 z" fill="#151515" />
            <rect x="30" y="36" width="32" height="7" rx="2" fill="#222" />
            <text
              className={`tuto-termo-txt${grabado ? " tuto-show" : ""}`}
              x="46" y="100" textAnchor="middle"
            >
              {FRASE}
            </text>
          </svg>
        </div>

        {/* Scene panel */}
        <div className="tuto-panel">
          {/* Scene 1: product + material */}
          <div className={`tuto-escena${paso === 0 ? " tuto-activa" : ""}`}>
            <div className="tuto-lbl">Producto</div>
            <div className="tuto-fila">
              <span ref={pillTermoRef} className={`tuto-pill${selTermo ? " tuto-sel" : ""}`}>Termo</span>
              <span className="tuto-pill">Vaso</span>
              <span className="tuto-pill">Hoppie</span>
            </div>
            <div className="tuto-lbl" style={{ marginTop: 10 }}>Material</div>
            <div className="tuto-fila">
              <span ref={pillAceroRef} className={`tuto-pill${selAcero ? " tuto-sel" : ""}`}>🛡 Acero inoxidable</span>
              <span className="tuto-pill">Cuero</span>
            </div>
          </div>

          {/* Scene 2: colour */}
          <div className={`tuto-escena${paso === 1 ? " tuto-activa" : ""}`}>
            <div className="tuto-lbl">Color base del termo</div>
            <div className="tuto-fila" style={{ gap: 10 }}>
              {SWATCHES.map((hex) => (
                <span
                  key={hex}
                  ref={hex === VERDE ? dotVerdeRef : undefined}
                  className={`tuto-dot${hex === VERDE && selVerde ? " tuto-sel" : ""}`}
                  style={{ background: hex }}
                />
              ))}
            </div>
            <div className="tuto-lbl" style={{ marginTop: 10, color: "#8a8a8e", fontWeight: 500 }}>
              {selVerde ? "● Verde Esmeralda" : " "}
            </div>
          </div>

          {/* Scene 3: text */}
          <div className={`tuto-escena${paso === 2 ? " tuto-activa" : ""}`}>
            <div className="tuto-lbl">Texto personalizado</div>
            <div className="tuto-fake-input">
              <span>{typed}</span>
              <span className="tuto-caret" />
            </div>
            <div className="tuto-lbl" style={{ marginTop: 10 }}>Técnica</div>
            <div className="tuto-fila">
              <span className="tuto-pill tuto-sel">⚡ Grabado láser</span>
              <span className="tuto-pill">Impresión UV</span>
            </div>
          </div>

          {/* Scene 4: summary */}
          <div className={`tuto-escena${paso === 3 ? " tuto-activa" : ""}`}>
            <div className="tuto-resumen">
              <div><span>Producto</span><span>Termo · 32oz</span></div>
              <div><span>Color</span><span>Verde Esmeralda</span></div>
              <div><span>Texto</span><span>"{FRASE}"</span></div>
            </div>
            <button ref={btnWspRef} className={`tuto-wsp${pulso ? " tuto-pulso" : ""}`} tabIndex={-1} type="button">
              Continuar por WhatsApp
            </button>
          </div>
        </div>

        <p className="tuto-caption">{CAPTIONS[paso]}</p>
        <button className="tuto-cta" type="button" onClick={() => cerrar(false)}>
          ¡Quiero personalizar el mío!
        </button>
        <button className="tuto-skip" type="button" onClick={() => cerrar(true)}>
          No volver a mostrar
        </button>

        {/* The animated "finger" (imperatively positioned; purely decorative) */}
        <div className="tuto-tap" ref={tapRef} aria-hidden="true" />
      </div>
    </div>
  );
}
