import React, { useEffect, useRef, useState } from "react";

/**
 * "Cómo funciona" — a silent, looping ~16s animation inside a phone frame that
 * shows the funnel in 4 scenes: Diseñás → Enviás → Pagás → Llevás.
 *
 * Each scene walks the real steps: Diseñás (pick product → pick colour → type
 * the personalization), Enviás (download the design file → open Creativa's
 * chat → the image goes out with a sent check), Pagás (abstract payment check)
 * and Llevás (a person at Creativa Studio picking up the finished piece).
 *
 * Programmed animation (SVG + CSS transitions driven by a timeout script, same
 * pattern as customizer-tutorial.tsx): no video file, transforms/opacity only,
 * pauses when the section leaves the viewport (IntersectionObserver) and
 * renders a static final frame under prefers-reduced-motion.
 *
 * `videoSrc` is an escape hatch for later: when provided, a real <video>
 * replaces the programmed animation inside the same frame.
 */

const PALABRAS = ["Diseñás", "Enviás", "Pagás", "Llevás"] as const;
const CAPTIONS = [
  "Elegí el producto, el color y su personalización",
  "Descargá su diseño y envialo al chat de Creativa",
  "Confirmá y aboná su pedido",
  "Retirá su pieza en Creativa Studio",
] as const;
const NOMBRE = "Creativa Studio";
const LOOP_MS = 16500;

// Same demo palette as the customizer tutorial (real brand colours).
const ROJO = "#C1121F";
const ROJO_MANIJA = "#8f0d16";
const VERDE = "#27AE60";
const VERDE_MANIJA = "#1e8a4c";

const CSS = `
.fd-frame {
  width: min(232px, 64vw);
  background: #1A1614; border-radius: 30px; padding: 9px;
  box-shadow: 0 20px 50px -16px rgba(26,22,20,.35);
  position: relative;
}
.fd-notch {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  width: 62px; height: 6px; border-radius: 4px; background: rgba(255,255,255,.14);
  z-index: 3; pointer-events: none;
}
.fd-screen {
  position: relative; overflow: hidden; border-radius: 22px;
  background: #fff; aspect-ratio: 9 / 15.2;
}
.fd-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

.fd-esc {
  position: absolute; inset: 0; padding: 22px 13px 14px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  opacity: 0; transform: translateY(14px) scale(.97);
  transition: opacity .4s ease, transform .45s cubic-bezier(.34,1.4,.64,1);
  pointer-events: none;
}
.fd-esc.fd-on { opacity: 1; transform: none; }
.fd-fase {
  position: absolute; inset: 0; padding: 22px 13px 14px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  opacity: 0; transform: translateX(12px);
  transition: opacity .35s ease, transform .4s cubic-bezier(.34,1.4,.64,1);
}
.fd-fase.fd-on { opacity: 1; transform: none; }

.fd-palabra {
  font-size: clamp(1.5rem, 4vw, 2.1rem); line-height: 1.1;
  color: #1A1614; text-align: center;
  animation: fd-palabra-in .5s cubic-bezier(.34,1.45,.64,1) both;
}
.fd-caption {
  font-size: 11px; color: #9c9488; text-align: center;
  animation: fd-palabra-in .5s .08s cubic-bezier(.34,1.45,.64,1) both;
}
/* Entrance keeps a readable floor (not 0): under CPU pressure the compositor
   can hold the "from" frame for several hundred ms, and a fully transparent
   word would just blink out at every scene change. */
@keyframes fd-palabra-in {
  from { opacity: .3; transform: translateY(8px) scale(.97); }
  to   { opacity: 1; transform: none; }
}

/* Scene 1 — mini customizer: product → colour → text */
.fd-lbl {
  align-self: flex-start; font-size: 8.5px; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: #b9b2a8; margin-bottom: -6px;
}
.fd-pills { display: flex; gap: 6px; align-self: flex-start; }
.fd-pill {
  border: 1.2px solid #d9d9de; border-radius: 999px; background: #fff;
  padding: 4px 10px; font-size: 10px; color: #5f574d; white-space: nowrap;
  transition: border-color .25s, color .25s, background .25s;
}
.fd-pill.fd-sel { border-color: #8B1A2F; color: #8B1A2F; background: #fdf3f6; font-weight: 700; }
.fd-input {
  width: 148px; border: 1.2px solid #d9d9de; border-radius: 9px;
  background: #fff; padding: 6px 9px; font-size: 10.5px; color: #1c1c1e;
  min-height: 15px; text-align: left; align-self: flex-start;
}
.fd-caret {
  display: inline-block; width: 1px; height: 11px; background: #8B1A2F;
  vertical-align: -2px; animation: fd-blink 1s steps(1) infinite;
}
@keyframes fd-blink { 50% { opacity: 0; } }
.fd-dots { display: flex; gap: 8px; align-self: flex-start; }
.fd-dot {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid transparent; transition: border-color .25s, transform .25s;
}
.fd-dot.fd-sel { border-color: #8B1A2F; transform: scale(1.18); }
.fd-termo-capa { transition: opacity .5s ease; }

/* Scene 2A — download the design */
.fd-preview {
  background: #faf7f2; border: 1px solid #ece4d8; border-radius: 12px;
  padding: 8px 16px; display: flex; align-items: center; justify-content: center;
}
.fd-btn-desc {
  display: flex; align-items: center; gap: 6px;
  border-radius: 999px; background: #8B1A2F; color: #fff;
  padding: 6px 14px; font-size: 10.5px; font-weight: 700;
  transition: transform .25s cubic-bezier(.34,1.6,.64,1);
}
.fd-btn-desc.fd-press { transform: scale(.85); }
.fd-file {
  display: flex; align-items: center; gap: 6px;
  border: 1.2px solid #d9d9de; border-radius: 9px; background: #fff;
  padding: 5px 10px; font-size: 9.5px; color: #5f574d;
  opacity: 0; transform: translateY(10px) scale(.85);
  transition: opacity .3s, transform .4s cubic-bezier(.34,1.5,.64,1);
}
.fd-file.fd-show { opacity: 1; transform: none; }

/* Scene 2B — Creativa chat */
.fd-chat {
  width: 100%; flex: 1; border-radius: 12px; background: #efe9e2;
  position: relative; overflow: hidden; max-height: 210px;
}
.fd-chat-head {
  height: 26px; background: #1e8a4c; display: flex; align-items: center; gap: 6px; padding: 0 9px;
}
.fd-chat-head i { width: 14px; height: 14px; border-radius: 50%; background: rgba(255,255,255,.5); }
.fd-chat-head b { width: 62px; height: 4.5px; border-radius: 3px; background: rgba(255,255,255,.55); }
.fd-burbuja {
  position: absolute; right: 8px;
  background: #dcf3d0; border-radius: 10px 10px 3px 10px;
  padding: 6px 7px 4px; box-shadow: 0 2px 5px rgba(0,0,0,.08);
  opacity: 0; transform: translateY(28px) scale(.75);
  transition: opacity .35s ease, transform .45s cubic-bezier(.34,1.5,.64,1);
}
.fd-burbuja.fd-show { opacity: 1; transform: none; }
.fd-burbuja-msg { bottom: 84px; font-size: 9.5px; color: #2c3a2c; }
.fd-burbuja-img { bottom: 10px; }
.fd-burbuja-foto {
  background: #fff; border-radius: 7px; padding: 4px 10px;
  display: flex; align-items: center; justify-content: center;
}
.fd-burbuja-meta { display: flex; justify-content: flex-end; margin-top: 2px; height: 9px; }
.fd-tilde { opacity: 0; transition: opacity .3s; }
.fd-tilde.fd-show { opacity: 1; }

/* Scene 3 — payment check */
.fd-pago { position: relative; height: 108px; width: 140px; }
.fd-tarjeta {
  position: absolute; left: 50%; top: 0; margin-left: -40px;
  width: 80px; height: 50px; border-radius: 8px;
  background: linear-gradient(135deg, #2a2320, #4a3f38);
  transform: translateY(-6px) rotate(-6deg); opacity: 0;
  transition: transform .55s cubic-bezier(.34,1.4,.64,1), opacity .4s;
}
.fd-esc.fd-on .fd-tarjeta { opacity: 1; transform: none; transition-delay: .25s; }
.fd-tarjeta i {
  position: absolute; left: 8px; top: 9px; width: 18px; height: 12px;
  border-radius: 3px; background: #d9b26a; display: block;
}
.fd-tarjeta b {
  position: absolute; left: 8px; bottom: 8px; width: 40px; height: 4.5px;
  border-radius: 3px; background: rgba(255,255,255,.35); display: block;
}
.fd-check { position: absolute; left: 50%; bottom: 0; margin-left: -24px; }
.fd-check circle {
  stroke-dasharray: 133; stroke-dashoffset: 133;
  transition: stroke-dashoffset .7s ease .1s;
}
.fd-check path {
  stroke-dasharray: 32; stroke-dashoffset: 32;
  transition: stroke-dashoffset .35s ease .75s;
}
.fd-check.fd-go circle, .fd-check.fd-go path { stroke-dashoffset: 0; }

/* Scene 4 — pick-up at the studio */
.fd-retiro { position: relative; }
.fd-brillo-clip { overflow: hidden; }
.fd-brillo {
  position: absolute; top: -20%; left: 0; width: 20px; height: 140%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.55), transparent);
  transform: translateX(-50px) skewX(-18deg);
}
.fd-esc.fd-on .fd-brillo { animation: fd-shine 1.5s ease .55s both; }
@keyframes fd-shine {
  from { transform: translateX(-50px) skewX(-18deg); }
  to   { transform: translateX(160px) skewX(-18deg); }
}
.fd-pasos { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
.fd-paso {
  font-size: 8px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  color: #b9b2a8; transition: color .3s, transform .3s;
}
.fd-paso.fd-lit { color: #8B1A2F; transform: scale(1.08); }
.fd-flecha { font-size: 8px; color: #d5cec4; }

@media (prefers-reduced-motion: reduce) {
  .fd-esc, .fd-fase, .fd-burbuja, .fd-dot, .fd-pill, .fd-btn-desc, .fd-file, .fd-paso, .fd-termo-capa { transition: none; }
  .fd-palabra, .fd-caption, .fd-caret { animation: none; }
  .fd-esc.fd-on .fd-brillo { animation: none; }
  .fd-check circle, .fd-check path { transition: none; }
}
`;

/** The demo termo, engraving-ready. The green body sits on a fading layer so
 *  the recolour reads as a quick swipe instead of a hard cut. The name renders
 *  in up to two engraved lines ("Creativa" / "Studio"). */
function TermoSVG({
  verde,
  texto,
  width = 84,
  shine = false,
}: {
  verde: boolean;
  texto: string;
  width?: number;
  shine?: boolean;
}) {
  const height = (160 / 92) * width;
  const lineas = texto ? texto.split(" ").slice(0, 2) : [];
  return (
    <div className={shine ? "fd-brillo-clip relative" : "relative"} style={{ width, height }}>
      <svg width={width} height={height} viewBox="0 0 92 160" aria-hidden="true">
        <ellipse cx="46" cy="152" rx="30" ry="5" fill="rgba(0,0,0,.12)" />
        <path
          d="M22 55 q-16 0 -16 18 v20 q0 18 16 18 v-10 q-8 0 -8 -9 v-18 q0-9 8-9 z"
          fill={ROJO_MANIJA}
        />
        <path
          className="fd-termo-capa"
          d="M22 55 q-16 0 -16 18 v20 q0 18 16 18 v-10 q-8 0 -8 -9 v-18 q0-9 8-9 z"
          fill={VERDE_MANIJA}
          style={{ opacity: verde ? 1 : 0 }}
        />
        <path
          d="M24 45 q0-10 10-11 h24 q10 1 10 11 v92 q0 14 -14 15 h-16 q-14 -1 -14 -15 z"
          fill={ROJO}
        />
        <path
          className="fd-termo-capa"
          d="M24 45 q0-10 10-11 h24 q10 1 10 11 v92 q0 14 -14 15 h-16 q-14 -1 -14 -15 z"
          fill={VERDE}
          style={{ opacity: verde ? 1 : 0 }}
        />
        <rect x="30" y="48" width="7" height="95" rx="3.5" fill="rgba(255,255,255,.35)" />
        <path d="M32 34 q0-8 8-8 h12 q8 0 8 8 v4 h-28 z" fill="#151515" />
        <rect x="30" y="36" width="32" height="7" rx="2" fill="#222" />
        {lineas.map((l, i) => (
          <text
            key={i}
            x="46"
            y={lineas.length === 2 ? 92 + i * 13 : 98}
            textAnchor="middle"
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              fill: "#fff",
              fontFamily: "Georgia, serif",
              letterSpacing: ".4px",
              opacity: 1,
              transition: "opacity .3s",
            }}
          >
            {l}
          </text>
        ))}
      </svg>
      {shine && <div className="fd-brillo" aria-hidden="true" />}
    </div>
  );
}

/** Scene 4: a person at the Creativa counter carrying their finished piece. */
function RetiroSVG({ nombre }: { nombre: string }) {
  return (
    <div className="fd-retiro">
      <svg width="176" height="130" viewBox="0 0 176 130" aria-hidden="true">
        {/* Awning — suggests the studio storefront, no logos */}
        {[0, 1, 2, 3].map(i => (
          <path
            key={i}
            d={`M${8 + i * 40} 6 h40 v10 a20 8 0 0 1 -40 0 z`}
            fill={i % 2 === 0 ? "#8B1A2F" : "#f0e7db"}
          />
        ))}
        <rect x="8" y="2" width="160" height="6" rx="2" fill="#4a3f38" />
        {/* Counter */}
        <rect x="10" y="92" width="86" height="10" rx="3" fill="#d9cfc0" />
        <rect x="16" y="102" width="74" height="24" rx="2" fill="#e9e1d3" />
        {/* Person (neutral silhouette) carrying the piece */}
        <circle cx="132" cy="38" r="11" fill="#4a3f38" />
        <path d="M114 126 v-44 q0-20 18-20 q18 0 18 20 v44 z" fill="#4a3f38" />
        {/* Arm reaching the termo */}
        <path d="M118 70 q-10 4 -16 12" stroke="#4a3f38" strokeWidth="7" strokeLinecap="round" fill="none" />
        {/* Small bag in the other hand */}
        <path d="M148 96 h16 v22 h-16 z" fill="#f0e7db" stroke="#c9bda9" strokeWidth="1.5" />
        <path d="M151 96 q5 -8 10 0" stroke="#c9bda9" strokeWidth="1.5" fill="none" />
      </svg>
      {/* The engraved piece, handed over the counter */}
      <div style={{ position: "absolute", left: 78, top: 34 }}>
        <TermoSVG verde texto={nombre} width={40} shine />
      </div>
    </div>
  );
}

export default function FunnelDemo({ videoSrc }: { videoSrc?: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutsRef = useRef<number[]>([]);

  const [reducida] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [playing, setPlaying] = useState(false);

  const [escena, setEscena] = useState(0);
  const [prodSel, setProdSel] = useState(false);
  const [verde, setVerde] = useState(false);
  const [typed, setTyped] = useState("");
  const [press, setPress] = useState(false);
  const [bajado, setBajado] = useState(false);
  const [fase2, setFase2] = useState(false);
  const [burbujaMsg, setBurbujaMsg] = useState(false);
  const [burbujaImg, setBurbujaImg] = useState(false);
  const [tilde, setTilde] = useState(false);
  const [pagado, setPagado] = useState(false);
  const [luces, setLuces] = useState(0);

  const wait = (fn: () => void, ms: number) => {
    timeoutsRef.current.push(window.setTimeout(fn, ms));
  };
  const limpiar = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  /** Full loop script; re-invokes itself while the section stays on screen. */
  const reproducir = () => {
    limpiar();
    setEscena(0);
    setProdSel(false);
    setVerde(false);
    setTyped("");
    setPress(false);
    setBajado(false);
    setFase2(false);
    setBurbujaMsg(false);
    setBurbujaImg(false);
    setTilde(false);
    setPagado(false);
    setLuces(0);

    // Escena 1 — Diseñás: elegir producto → elegir color → escribir el texto.
    wait(() => setProdSel(true), 600);
    wait(() => setVerde(true), 1500);
    NOMBRE.split("").forEach((_, i) => {
      wait(() => setTyped(NOMBRE.slice(0, i + 1)), 2400 + i * 115);
    });

    // Escena 2 — Enviás: descargar el archivo → chat de Creativa → enviar.
    wait(() => setEscena(1), 5300);
    wait(() => setPress(true), 5900);
    wait(() => { setPress(false); setBajado(true); }, 6200);
    wait(() => setFase2(true), 7400);
    wait(() => setBurbujaMsg(true), 8000);
    wait(() => setBurbujaImg(true), 8600);
    wait(() => setTilde(true), 9500);

    // Escena 3 — Pagás: el check se dibuja solo (transición CSS).
    wait(() => setEscena(2), 10700);
    wait(() => setPagado(true), 11200);

    // Escena 4 — Llevás: retiro en el local; los 4 pasos se iluminan en fila.
    wait(() => setEscena(3), 12900);
    [0, 1, 2, 3].forEach(i => {
      wait(() => setLuces(i + 1), 13900 + i * 320);
    });

    wait(reproducir, LOOP_MS);
  };

  // Pause off-viewport: the loop only runs while ~25% of the section shows.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setPlaying(true);
      return;
    }
    const io = new IntersectionObserver(
      entries => setPlaying(entries.some(e => e.isIntersecting)),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (videoSrc) {
      const v = videoRef.current;
      if (!v) return;
      if (playing) v.play().catch(() => {});
      else v.pause();
      return;
    }
    if (reducida) return;
    if (!playing) { limpiar(); return; }
    reproducir();
    return limpiar;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, videoSrc]);

  // Static final frame for prefers-reduced-motion: no timers, everything lit.
  const est = reducida && !videoSrc;
  const escenaActiva = est ? 3 : escena;

  const scrollToCustomizer = () => {
    document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      id="como-funciona"
      className="bg-[#faf7f2] border-b border-border py-10 md:py-16 px-4 sm:px-6"
    >
      <style>{CSS}</style>
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <p className="text-[#8B1A2F] text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-5 md:mb-7">
          Cómo funciona
        </p>
        <h2 className="sr-only">Cómo funciona: diseñás, enviás, pagás y llevás</h2>

        {/* Big scene word + one-line caption — the only copy of the animation */}
        <div className="flex flex-col items-center gap-1 mb-4 md:mb-5 min-h-[3.4rem]" aria-hidden="true">
          <span key={escenaActiva} className="fd-palabra font-serif font-light">
            {PALABRAS[escenaActiva]}
          </span>
          <span key={`c${escenaActiva}`} className="fd-caption font-light">
            {CAPTIONS[escenaActiva]}
          </span>
        </div>

        <div className="fd-frame">
          <div className="fd-notch" />
          <div className="fd-screen">
            {videoSrc ? (
              <video ref={videoRef} className="fd-video" src={videoSrc} muted loop playsInline autoPlay />
            ) : (
              <>
                {/* Escena 1 — Diseñás: producto → color → personalización */}
                <div className={`fd-esc${escenaActiva === 0 ? " fd-on" : ""}`}>
                  <TermoSVG verde={est ? true : verde} texto={est ? NOMBRE : typed} width={72} />
                  <span className="fd-lbl">Producto</span>
                  <div className="fd-pills">
                    <span className={`fd-pill${prodSel || est ? " fd-sel" : ""}`}>Termo</span>
                    <span className="fd-pill">Vaso</span>
                    <span className="fd-pill">Hoppie</span>
                  </div>
                  <span className="fd-lbl">Color</span>
                  <div className="fd-dots">
                    <span className={`fd-dot${!verde && !est ? " fd-sel" : ""}`} style={{ background: ROJO }} />
                    <span className={`fd-dot${verde || est ? " fd-sel" : ""}`} style={{ background: VERDE }} />
                    <span className="fd-dot" style={{ background: "#1E3A5F" }} />
                    <span className="fd-dot" style={{ background: "#111" }} />
                  </div>
                  <span className="fd-lbl">Personalización</span>
                  <div className="fd-input">
                    <span>{est ? NOMBRE : typed}</span>
                    {!est && <span className="fd-caret" />}
                  </div>
                </div>

                {/* Escena 2 — Enviás: descarga del archivo → chat de Creativa */}
                <div className={`fd-esc${escenaActiva === 1 ? " fd-on" : ""}`}>
                  {/* Fase A — descargar el diseño terminado */}
                  <div className={`fd-fase${!fase2 ? " fd-on" : ""}`}>
                    <div className="fd-preview">
                      <TermoSVG verde texto={NOMBRE} width={58} />
                    </div>
                    <span className={`fd-btn-desc${press ? " fd-press" : ""}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 3v12m0 0 5-5m-5 5-5-5M4 21h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Descargar diseño
                    </span>
                    <span className={`fd-file${bajado ? " fd-show" : ""}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="4" y="3" width="16" height="18" rx="2" stroke="#8B1A2F" strokeWidth="2" />
                        <circle cx="9.5" cy="10" r="1.6" fill="#8B1A2F" />
                        <path d="M5 18 l5-5 4 4 3-3 3 3" stroke="#8B1A2F" strokeWidth="2" strokeLinejoin="round" fill="none" />
                      </svg>
                      mi-diseño.png
                    </span>
                  </div>
                  {/* Fase B — el chat de Creativa: mensaje + imagen + check */}
                  <div className={`fd-fase${fase2 || est ? " fd-on" : ""}`}>
                    <div className="fd-chat">
                      <div className="fd-chat-head"><i /><b /></div>
                      <div className={`fd-burbuja fd-burbuja-msg${burbujaMsg || est ? " fd-show" : ""}`}>
                        ¡Hola! Quiero este diseño 😊
                      </div>
                      <div className={`fd-burbuja fd-burbuja-img${burbujaImg || est ? " fd-show" : ""}`}>
                        <div className="fd-burbuja-foto">
                          <TermoSVG verde texto={NOMBRE} width={40} />
                        </div>
                        <div className="fd-burbuja-meta">
                          <svg
                            className={`fd-tilde${tilde || est ? " fd-show" : ""}`}
                            width="13" height="9" viewBox="0 0 14 10" aria-hidden="true"
                          >
                            <path d="M1 5.5 L4 8.5 L9 2" fill="none" stroke="#1e8a4c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M6 5.5 L9 8.5 L13 2.5" fill="none" stroke="#1e8a4c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Escena 3 — Pagás */}
                <div className={`fd-esc${escenaActiva === 2 ? " fd-on" : ""}`}>
                  <div className="fd-pago">
                    <span className="fd-tarjeta"><i /><b /></span>
                    <svg
                      className={`fd-check${pagado || est ? " fd-go" : ""}`}
                      width="48" height="48" viewBox="0 0 54 54" aria-hidden="true"
                    >
                      <circle cx="27" cy="27" r="21" fill="none" stroke="#1e8a4c" strokeWidth="2.5" strokeLinecap="round" transform="rotate(-90 27 27)" />
                      <path d="M18 27.5 L24 33.5 L36 21.5" fill="none" stroke="#1e8a4c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Escena 4 — Llevás: retiro en Creativa Studio */}
                <div className={`fd-esc${escenaActiva === 3 ? " fd-on" : ""}`}>
                  <RetiroSVG nombre={NOMBRE} />
                  <div className="fd-pasos">
                    {PALABRAS.map((p, i) => (
                      <React.Fragment key={p}>
                        {i > 0 && <span className="fd-flecha" aria-hidden="true">→</span>}
                        <span className={`fd-paso${(est ? 4 : luces) > i ? " fd-lit" : ""}`}>{p}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={scrollToCustomizer}
          className="mt-6 md:mt-8 border border-[#1A1614]/20 hover:border-[#1A1614]/50 text-[#5f574d] hover:text-[#1A1614] px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors"
        >
          Probar el personalizador
        </button>
      </div>
    </section>
  );
}
