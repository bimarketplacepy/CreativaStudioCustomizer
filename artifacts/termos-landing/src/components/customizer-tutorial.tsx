import React, { useEffect, useRef, useState } from "react";

/**
 * Guía del personalizador — a short 3-step guide.
 *
 * No longer opens automatically (the funnel animation between the hero and the
 * customizer already explains the flow): it only opens on demand, via the
 * "tuto:abrir" event fired by the "Ver cómo funciona" link in the customizer
 * header.
 *
 * Three short steps, advanced manually ("Siguiente" / "Saltar" always visible,
 * X in the corner, tap outside or Escape to close). Each step plays a small
 * self-contained animation in the visor.
 *
 * Fully self-contained layer: own `tuto-`-prefixed CSS, no globals touched
 * besides the body scroll lock while open.
 */

// Kept for continuity with the auto-open era: closing still records the flag,
// so if the auto-trigger ever returns, visitors who already saw it stay opted
// out. Harmless otherwise (the modal is now manual-only).
const STORAGE_KEY = "tutoPersonalizadorVisto";
const marcarVisto = () => {
  try { localStorage.setItem(STORAGE_KEY, "nunca"); } catch { /* private mode */ }
};

const PASOS = [
  { tab: "Producto", titulo: "Elegí tu producto", caption: "Material primero, producto después." },
  { tab: "Diseño", titulo: "Escribí tu nombre y mirálo en 3D", caption: "El texto se graba en la pieza al instante." },
  { tab: "Enviar", titulo: "Envialo por WhatsApp", caption: "Confirmás el diseño y coordinamos el resto." },
];

const FRASE = "Tu Marca";
const ROJO = "#C1121F";
const ROJO_MANIJA = "#8f0d16";

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
  max-height: calc(100dvh - 24px); overflow-y: auto;
  padding: 20px 18px 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,.3);
  position: relative;
  transform: translateY(12px) scale(.97);
  transition: transform .25s ease;
}
.tuto-overlay.tuto-visible .tuto-card { transform: none; }

.tuto-x {
  position: absolute; top: 10px; right: 10px; z-index: 6;
  width: 30px; height: 30px; border: 0; border-radius: 50%;
  background: #f2f2f4; color: #8a8a8e; cursor: pointer;
  display: grid; place-items: center; font-size: 14px; line-height: 1;
}
.tuto-x:hover { color: #1c1c1e; }

.tuto-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; padding-right: 30px; }
.tuto-head .tuto-paso { color: var(--tuto-brand); font-weight: 800; font-size: .8rem; letter-spacing: .04em; }
.tuto-head .tuto-titulo { font-size: .85rem; color: #8a8a8e; }

.tuto-bars { display: flex; gap: 6px; margin-bottom: 12px; }
.tuto-bars i { flex: 1; height: 5px; border-radius: 3px; background: #e7e7ec; transition: background .3s; }
.tuto-bars i.tuto-on { background: var(--tuto-brand); }

.tuto-visor {
  background: #f5eaec; border-radius: 14px; height: 170px;
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}

.tuto-termo-txt {
  font-size: 9px; font-weight: 700; fill: #fff;
  opacity: 0; transition: opacity .3s;
  font-family: Georgia, serif; letter-spacing: .5px;
}
.tuto-termo-txt.tuto-show { opacity: 1; }

.tuto-panel { margin-top: 12px; min-height: 158px; position: relative; }
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

.tuto-botones { display: flex; gap: 10px; align-items: center; }
.tuto-saltar {
  flex: 0 0 auto; background: none; border: 0; cursor: pointer;
  color: #8a8a8e; font-size: .85rem; padding: 12px 14px;
  text-decoration: underline; text-underline-offset: 3px;
}
.tuto-saltar:hover { color: #1c1c1e; }
.tuto-cta {
  flex: 1; padding: 12px; border: 0; border-radius: 999px;
  background: var(--tuto-brand); color: #fff;
  font-size: .92rem; font-weight: 700; cursor: pointer;
}
.tuto-cta:active { transform: scale(.98); }

.tuto-tabs {
  display: flex; gap: 4px; background: #f2f2f4;
  border-radius: 999px; padding: 4px; margin-bottom: 12px; margin-right: 34px;
}
.tuto-tabs span {
  flex: 1; text-align: center; font-size: .78rem; font-weight: 600;
  color: #8a8a8e; padding: 6px 4px; border-radius: 999px;
  transition: background .3s, color .3s;
}
.tuto-tabs span.tuto-on {
  background: #fff; color: var(--tuto-brand);
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}

@media (min-width: 768px) {
  .tuto-card { max-width: 440px; }
}

@media (prefers-reduced-motion: reduce) {
  .tuto-tap, .tuto-escena, .tuto-overlay, .tuto-card, .tuto-visor, .tuto-bars i, .tuto-tabs span { transition: none; }
  .tuto-wsp.tuto-pulso, .tuto-caret { animation: none; }
}
`;

export default function CustomizerTutorial() {
  const [habilitado, setHabilitado] = useState(false);
  const [visible, setVisible] = useState(false);
  // Snapshot at mount: which chrome the modal shows (step bars vs tab strip).
  const [esDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );
  const [paso, setPaso] = useState(0);
  const [selTermo, setSelTermo] = useState(false);
  const [selAcero, setSelAcero] = useState(false);
  const [typed, setTyped] = useState("");
  const [grabado, setGrabado] = useState(false);
  const [pulso, setPulso] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const tapRef = useRef<HTMLDivElement>(null);
  const pillTermoRef = useRef<HTMLSpanElement>(null);
  const pillAceroRef = useRef<HTMLSpanElement>(null);
  const btnWspRef = useRef<HTMLButtonElement>(null);
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

  /** Closing by any path (X, Saltar, outside, Escape, completing) counts as
   *  seen: the modal never auto-opens again. Manual replay stays available. */
  const cerrar = () => {
    limpiar();
    setVisible(false);
    document.body.style.overflow = "";
    marcarVisto();
  };

  const siguiente = () => {
    if (paso >= PASOS.length - 1) { cerrar(); return; }
    setPaso(p => p + 1);
  };

  // Manual-only: the modal opens exclusively via "tuto:abrir", the event fired
  // by the "Ver cómo funciona" link in the customizer header. (The scroll
  // auto-trigger was removed — the funnel animation already explains the flow.)
  useEffect(() => {
    setHabilitado(true);

    const abrirManual = () => {
      setPaso(0);
      setVisible(true);
    };
    window.addEventListener("tuto:abrir", abrirManual);
    return () => {
      window.removeEventListener("tuto:abrir", abrirManual);
    };
  }, []);

  // While open: lock body scroll and close on Escape.
  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Per-step micro-animation: replays whenever the step (re)shows.
  useEffect(() => {
    if (!visible) return;
    limpiar();
    tapRef.current?.classList.remove("tuto-show");
    if (paso === 0) {
      setSelAcero(false);
      setSelTermo(false);
      wait(() => tocar(pillAceroRef.current, () => setSelAcero(true)), 600);
      wait(() => tocar(pillTermoRef.current, () => setSelTermo(true)), 2000);
      wait(() => tapRef.current?.classList.remove("tuto-show"), 3400);
    } else if (paso === 1) {
      setTyped("");
      setGrabado(false);
      FRASE.split("").forEach((_, i) => {
        wait(() => setTyped(FRASE.slice(0, i + 1)), 500 + i * 130);
      });
      wait(() => setGrabado(true), 500 + FRASE.length * 130 + 300);
    } else {
      setPulso(false);
      wait(() => tocar(btnWspRef.current, () => setPulso(true)), 600);
    }
    return limpiar;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, paso]);

  if (!habilitado) return null;

  return (
    <div
      className={`tuto-overlay${visible ? " tuto-visible" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Cómo funciona el personalizador"
      onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
    >
      <style>{CSS}</style>
      <div className="tuto-card" ref={cardRef}>
        <button className="tuto-x" type="button" aria-label="Cerrar" onClick={cerrar}>✕</button>

        {esDesktop ? (
          // Desktop chrome: an editor-style tab strip, like the real desktop
          // customizer (which has tabs/panels, not a numbered wizard).
          <div className="tuto-tabs">
            {PASOS.map((p, i) => (
              <span key={p.tab} className={i === paso ? "tuto-on" : ""}>{p.tab}</span>
            ))}
          </div>
        ) : (
          <>
            <div className="tuto-head">
              <span className="tuto-paso">PASO {paso + 1} DE {PASOS.length}</span>
              <span className="tuto-titulo">{PASOS[paso].tab}</span>
            </div>
            <div className="tuto-bars">
              {PASOS.map((_, i) => <i key={i} className={i <= paso ? "tuto-on" : ""} />)}
            </div>
          </>
        )}

        {/* Visor: termo SVG that gets engraved live */}
        <div className="tuto-visor">
          <svg width="86" height="150" viewBox="0 0 92 160" aria-hidden="true">
            <ellipse cx="46" cy="152" rx="30" ry="5" fill="rgba(0,0,0,.12)" />
            <path
              d="M22 55 q-16 0 -16 18 v20 q0 18 16 18 v-10 q-8 0 -8 -9 v-18 q0-9 8-9 z"
              fill={ROJO_MANIJA}
            />
            <path
              d="M24 45 q0-10 10-11 h24 q10 1 10 11 v92 q0 14 -14 15 h-16 q-14 -1 -14 -15 z"
              fill={ROJO}
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

        {/* Step panel */}
        <div className="tuto-panel">
          {/* Paso 1: material first, then the products it offers — the same
              top-to-bottom order as the real customizer's step 1. */}
          <div className={`tuto-escena${paso === 0 ? " tuto-activa" : ""}`}>
            <div className="tuto-lbl">Material</div>
            <div className="tuto-fila">
              <span ref={pillAceroRef} className={`tuto-pill${selAcero ? " tuto-sel" : ""}`}>🛡 Acero con pintura recubierta</span>
              <span className="tuto-pill">Cuero</span>
            </div>
            <div className="tuto-lbl" style={{ marginTop: 10 }}>Producto</div>
            <div className="tuto-fila">
              <span ref={pillTermoRef} className={`tuto-pill${selTermo ? " tuto-sel" : ""}`}>Termo</span>
              <span className="tuto-pill">Vaso</span>
              <span className="tuto-pill">Hoppie</span>
            </div>
          </div>

          {/* Paso 2: text — typed live and engraved onto the 3D piece */}
          <div className={`tuto-escena${paso === 1 ? " tuto-activa" : ""}`}>
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

          {/* Paso 3: summary + WhatsApp */}
          <div className={`tuto-escena${paso === 2 ? " tuto-activa" : ""}`}>
            <div className="tuto-resumen">
              <div><span>Producto</span><span>Termo · 32oz</span></div>
              <div><span>Material</span><span>Acero pintado</span></div>
              <div><span>Texto</span><span>"{FRASE}"</span></div>
            </div>
            <button ref={btnWspRef} className={`tuto-wsp${pulso ? " tuto-pulso" : ""}`} tabIndex={-1} type="button">
              Continuar por WhatsApp
            </button>
          </div>
        </div>

        <p className="tuto-caption">{PASOS[paso].titulo} — {PASOS[paso].caption}</p>

        {/* Siguiente + Saltar, always visible */}
        <div className="tuto-botones">
          <button className="tuto-saltar" type="button" onClick={cerrar}>
            Saltar
          </button>
          <button className="tuto-cta" type="button" onClick={siguiente}>
            {paso >= PASOS.length - 1 ? "Empezar a personalizar" : "Siguiente"}
          </button>
        </div>

        {/* The animated "finger" (imperatively positioned; purely decorative) */}
        <div className="tuto-tap" ref={tapRef} aria-hidden="true" />
      </div>
    </div>
  );
}
