import React, { useEffect, useRef } from "react";
import { LOW_END } from "@/lib/device-tier";

/**
 * Vaso girable de la sección «Todo el vaso, a todo color» (CSS 3D, sin
 * three.js): un vaso con un diseño de ejemplo que se gira con el dedo, el
 * mouse, las flechas o los botones de las caras, y debajo el diseño entero
 * desenrollado (como el archivo que recibe la Dacen F5) con un recuadro que
 * marca la parte visible.
 *
 * Desde el 27/10/2026 la sección muestra el video real del taller en su lugar
 * y este componente queda guardado. Para volver a mostrarlo, en print-360.tsx:
 *   import Vaso360 from "./vaso-360";
 * y poner <Vaso360 /> donde está <DacenVideo /> (o revertir el commit
 * «Sección 360°: el video reemplaza al vaso girable»). La etiqueta git
 * `seccion-360-vaso-y-video` marca el estado con los dos juntos.
 * Los estilos .v360-* siguen en src/index.css.
 */
/** Desplegado del vaso de 900 ml según dacenPrintSize (production-dacen.ts),
 *  medido sobre el modelo 3D. Actualizar cuando estén las medidas con calibre. */
const FLAT_LABEL = "Vaso 900 ml · ≈ 312 × 165 mm";

/** Caras del panel «Todo el vaso (360°)»: frente al centro del archivo (u = 0,5),
 *  costura atrás (u = 0), izquierda en u = 0,75 (face-area.ts). */
const FACES = [
  { name: "Frente", u: 0.5 },
  { name: "Derecha", u: 0.25 },
  { name: "Atrás", u: 0 },
  { name: "Izquierda", u: 0.75 },
] as const;
const TICKS = ["Atrás", "Derecha", "Frente", "Izquierda"] as const;

/** Arte de ejemplo: panorama continuo (sin salto en la costura) con un mensaje
 *  que da la vuelta: «Lo que quieras» al frente, «a tu manera» atrás. */
function makeArt(W: number, H: number): string {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  if (!g) return "";
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1d2a52"); sky.addColorStop(0.45, "#7b4a78"); sky.addColorStop(0.72, "#f08a5d"); sky.addColorStop(1, "#f6c27a");
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const sun = g.createRadialGradient(W * 0.5, H * 0.62, 0, W * 0.5, H * 0.62, H * 0.5);
  sun.addColorStop(0, "rgba(255,236,190,.95)"); sun.addColorStop(0.18, "rgba(255,205,140,.7)"); sun.addColorStop(1, "rgba(255,180,120,0)");
  g.fillStyle = sun; g.fillRect(0, 0, W, H);
  // Cerros periódicos en x: el borde izquierdo empalma con el derecho.
  const ridge = (base: number, amp: number, col: string, ph: number) => {
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 2) {
      const t = (x / W) * Math.PI * 2;
      g.lineTo(x, base - amp * (0.55 * Math.sin(3 * t + ph) + 0.3 * Math.sin(7 * t + ph * 2) + 0.15 * Math.sin(13 * t + ph * 3)));
    }
    g.lineTo(W, H); g.closePath(); g.fillStyle = col; g.fill();
  };
  ridge(H * 0.7, H * 0.1, "#5a2f4a", 0.4);
  ridge(H * 0.8, H * 0.08, "#3a1f33", 1.7);
  ridge(H * 0.9, H * 0.05, "#22141f", 2.6);
  g.fillStyle = "rgba(255,255,255,.7)";
  for (let i = 0; i < 70; i++) {
    const x = ((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1) * W;
    const y = ((((Math.sin(i * 78.233) * 12345.678) % 1) + 1) % 1) * H * 0.3;
    g.fillRect(x, y, 1.6, 1.6);
  }
  g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `italic 300 ${Math.round(H * 0.17)}px 'Cronos Pro', Georgia, serif`;
  g.fillText("Lo que quieras", W * 0.5, H * 0.3);
  g.fillText("a tu manera", 0, H * 0.3);
  g.fillText("a tu manera", W, H * 0.3);
  g.font = `600 ${Math.round(H * 0.06)}px Inter, sans-serif`;
  g.globalAlpha = 0.9;
  g.fillText("TU MARCA", W * 0.25, H * 0.52);
  g.fillText("TU MARCA", W * 0.75, H * 0.52);
  return c.toDataURL("image/jpeg", 0.86);
}

/** Vaso girable + desplegado sincronizado. Todo el movimiento va por estilos
 *  directos dentro de un rAF (sin re-render de React por cuadro), y solo
 *  mientras la sección está en pantalla. */
export default function Vaso360() {
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const cupRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const winRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const goRef = useRef<(u: number) => void>(() => {});

  useEffect(() => {
    const stage = stageRef.current, body = bodyRef.current, cup = cupRef.current, strip = stripRef.current;
    if (!stage || !body || !cup || !strip) return;
    let disposed = false;
    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.innerWidth >= 1024;
    const D = wide ? 230 : 180, H = wide ? 300 : 236;
    // Gama baja: menos tiras (cada una es una capa 3D para la GPU) y sin giro
    // solo; se mueve igual con el dedo y con los botones de las caras.
    const N = LOW_END ? 36 : wide ? 64 : 52;
    const r = D / 2, C = Math.PI * D, w = C / N;

    let phi = 0, target: number | null = null, auto = !reduce && !LOW_END, visible = true, last = performance.now();
    const frontU = () => (((0.5 + phi / 360) % 1) + 1) % 1;
    const render = () => {
      body.style.transform = `translateZ(${-r}px) rotateY(${-phi}deg)`;
      const u = frontU();
      const left = (u - 0.25) * 100;
      if (winRefs.current[0]) winRefs.current[0].style.left = `${left}%`;
      if (winRefs.current[1]) winRefs.current[1].style.left = `${left + (left < 0 ? 100 : -100)}%`;
      let best = 0, bd = 9;
      FACES.forEach((f, k) => { const d = Math.abs(((u - f.u + 1.5) % 1) - 0.5); if (d < bd) { bd = d; best = k; } });
      const name = FACES[best].name;
      stage.setAttribute("aria-valuenow", String(Math.round(((phi % 360) + 360) % 360)));
      stage.setAttribute("aria-valuetext", name);
      pillRefs.current.forEach(b => b?.setAttribute("aria-pressed", b.textContent === name && bd < 0.06 ? "true" : "false"));
      tickRefs.current.forEach(t => t?.classList.toggle("on", t.textContent === name));
    };
    const tick = (now: number) => {
      const dt = Math.min(64, now - last); last = now;
      if (target !== null) {
        const d = target - phi;
        if (Math.abs(d) < 0.3) { phi = target; target = null; } else phi += d * Math.min(1, dt / 140);
      } else if (auto) phi += dt * 0.012;
      render();
      // Quieto (sin giro solo ni animación pendiente): no seguir pidiendo cuadros.
      raf = visible && !disposed && (auto || target !== null) ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!raf && visible && !disposed) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    goRef.current = (u: number) => { const p = (u - 0.5) * 360; target = phi + ((((p - phi) % 360) + 540) % 360 - 180); auto = false; wake(); };

    // Armar el cilindro cuando la tipografía ya está (el arte la usa).
    const build = () => {
      if (disposed) return;
      const art = LOW_END ? makeArt(1000, 528) : makeArt(1400, 740);
      cup.style.width = `${D}px`; cup.style.height = `${H}px`;
      body.style.width = `${D}px`; body.style.height = `${H}px`;
      strip.style.backgroundImage = `url(${art})`;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < N; i++) {
        const s = document.createElement("div");
        const a = ((i + 0.5) / N) * 360 - 180;
        s.className = "v360-slice";
        s.style.cssText = `width:${w + 0.8}px;height:${H}px;margin-left:${-w / 2}px;background-image:url(${art});background-size:${C}px ${H}px;background-position:${-i * w}px 0;transform:rotateY(${a}deg) translateZ(${r}px)`;
        frag.appendChild(s);
      }
      body.replaceChildren(frag);
      render();
      wake();
    };
    const fonts = document.fonts;
    if (fonts?.load) Promise.all([fonts.load("italic 300 40px 'Cronos Pro'"), fonts.load("600 20px Inter")]).then(build, build);
    else build();

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }, { rootMargin: "100px" });
    io.observe(stage);

    let drag: { x: number; p: number; id: number } | null = null;
    const down = (e: PointerEvent) => { drag = { x: e.clientX, p: phi, id: e.pointerId }; auto = false; target = null; };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) { try { stage.setPointerCapture(e.pointerId); } catch { /* sin captura */ } }
      phi = drag.p - dx * 0.6;
      render();
    };
    const up = () => { drag = null; };
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") phi += 15;
      else if (e.key === "ArrowRight") phi -= 15;
      else return;
      auto = false; target = null; e.preventDefault(); render();
    };
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    stage.addEventListener("keydown", key);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", up);
      stage.removeEventListener("keydown", key);
    };
  }, []);

  return (
    <div className="grid gap-5 min-w-0">
      <div
        ref={stageRef}
        tabIndex={0}
        role="slider"
        aria-label="Girar el vaso"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={0}
        aria-valuetext="Frente"
        className="relative h-[350px] lg:h-[430px] rounded-[20px] grid place-items-center overflow-hidden cursor-grab active:cursor-grabbing select-none focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--cs-laser)]"
        style={{ touchAction: "pan-y", background: "radial-gradient(120% 90% at 50% 30%, #2b231f 0%, #16120F 70%)" }}
      >
        <div role="group" aria-label="Ver una cara" className="absolute left-3 top-3 lg:left-4 lg:top-4 z-10 flex flex-wrap gap-1.5" onPointerDown={e => e.stopPropagation()}>
          {FACES.map((f, i) => (
            <button
              key={f.name}
              ref={el => { pillRefs.current[i] = el; }}
              type="button"
              onClick={() => goRef.current(f.u)}
              aria-pressed={f.name === "Frente"}
              className="min-h-9 px-3 rounded-full border border-white/20 bg-[rgba(22,18,15,.6)] text-[var(--cs-mark-dim)] text-[13px] font-medium aria-pressed:bg-[var(--cs-mark)] aria-pressed:border-[var(--cs-mark)] aria-pressed:text-[var(--cs-ink)]"
            >
              {f.name}
            </button>
          ))}
        </div>
        <span className="hidden lg:block absolute right-4 top-4 z-10 text-[11.5px] font-semibold text-[var(--cs-ink)] bg-[var(--cs-mark)] px-2 py-1.5 rounded-md">Diseño de ejemplo</span>
        <div aria-hidden className="absolute left-1/2 bottom-[54px] w-[280px] h-[26px] -translate-x-1/2" style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,.6), transparent 70%)" }} />
        <div ref={cupRef} aria-hidden className="relative mt-12" style={{ perspective: "2200px" }}>
          <div className="v360-rim" />
          <div ref={bodyRef} className="relative" style={{ transformStyle: "preserve-3d" }} />
          <div className="v360-shade" />
          <div className="v360-base" />
        </div>
        <span aria-hidden className="absolute right-4 bottom-4 z-10 flex items-center gap-2 text-[12.5px] font-medium text-[var(--cs-mark-dim)]">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7 3 12l5 5M16 7l5 5-5 5M3 12h18" /></svg>
          <span className="lg:hidden">Deslizá para girar</span><span className="hidden lg:inline">Arrastrá para girar</span>
        </span>
      </div>

      <div className="grid gap-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[14.5px] font-semibold text-[var(--cs-mark)]">Así se imprime: tu diseño entero, desenrollado</p>
          <p className="font-mono text-[12.5px] text-[var(--cs-mark-dim)]">{FLAT_LABEL}</p>
        </div>
        <div ref={stripRef} aria-hidden className="relative h-[70px] lg:h-[96px] rounded-lg overflow-hidden outline outline-1 outline-white/20" style={{ backgroundSize: "100% 100%" }}>
          {[0, 1].map(i => (
            <div
              key={i}
              ref={el => { winRefs.current[i] = el; }}
              className="absolute inset-y-0 w-1/2 rounded-md border-2 border-[var(--cs-laser)] bg-[rgba(226,74,95,.10)]"
            />
          ))}
        </div>
        <div aria-hidden className="grid grid-cols-4 text-[12.5px] font-medium text-[var(--cs-mark-dim)]">
          {TICKS.map((t, i) => (
            <span key={t} ref={el => { tickRefs.current[i] = el; }} className="border-l border-white/20 pl-1.5 pt-1.5 [&.on]:text-[var(--cs-mark)]">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
