import React, { useEffect, useRef } from "react";
import { whatsappUrl } from "@/lib/contact";
import { startCustomizer } from "@/lib/section-reveal";
import { track } from "@/lib/analytics";
import { MACHINES } from "@/lib/machines";
import { LOW_END } from "@/lib/device-tier";

/**
 * Impresión 360° a todo color con la Dacen F5 (DACEN.md §10–12). En vez de
 * contar la vuelta, la muestra con el video real del taller: la máquina
 * imprimiendo un vaso mientras gira. (El vaso girable en CSS 3D que estaba
 * antes quedó guardado en vaso-360.tsx, con instrucciones para volver a usarlo.)
 *
 * Todo lo que se afirma sale de la ficha de la máquina y de lo que el taller
 * confirmó: imprime girando la pieza, CMYK + base blanca automática, piezas
 * cilíndricas dentro de MACHINES.dacen.limits. El monto se cotiza
 * (PRICING.enabled.dacen = false).
 */
const LIMITS = MACHINES.dacen.limits!;
const cm = (mm: number) => (mm / 10).toLocaleString("es-PY", { maximumFractionDigits: 1 });
/** Video real del taller: la Dacen F5 imprimiendo un vaso mientras gira.
 *  Baja recién cerca de la pantalla y se reproduce solo mientras se ve. En
 *  gama baja, con ahorro de datos o con «reducir movimiento» no arranca solo:
 *  muestra la imagen fija y un botón (en gama baja, la versión de 540 px). */
function DacenVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [auto] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    return !LOW_END && !saveData && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [userPaused, setUserPaused] = React.useState(false);

  const visible = useRef(false);
  const wantPlay = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      if (e.isIntersecting) setNear(true);
      // Fuera de pantalla, siempre en pausa (batería y datos).
      if (!e.isIntersecting) { if (!v.paused) v.pause(); return; }
      if (auto && !userPaused && v.paused && v.currentSrc) v.play().catch(() => {});
    }, { rootMargin: "200px 0px", threshold: 0 });
    io.observe(v);
    return () => io.disconnect();
  }, [auto, userPaused]);

  // Las <source> se agregan recién al acercarse: hay que pedirle al video que
  // las cargue, y arrancar si corresponde (solo o porque el cliente tocó ▶).
  useEffect(() => {
    const v = ref.current;
    if (!near || !v) return;
    v.load();
    if ((auto && !userPaused && visible.current) || wantPlay.current) {
      wantPlay.current = false;
      v.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      setUserPaused(false);
      track("video_play", { video: "dacen-360" });
      if (!near) { wantPlay.current = true; setNear(true); return; }
      v.play().catch(() => {});
    } else {
      setUserPaused(true);
      v.pause();
    }
  };

  return (
    <figure className="m-0 grid gap-3 w-full max-w-[460px] mx-auto">
      <div className="relative w-full aspect-[4/5] rounded-[20px] overflow-hidden bg-black shadow-[0_30px_60px_-24px_rgba(0,0,0,0.75)]">
        <video
          ref={ref}
          muted
          loop
          playsInline
          preload="none"
          poster="/video/dacen-360-poster.webp"
          aria-label="La impresora Dacen F5 imprimiendo un diseño floral alrededor de un vaso mientras gira"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="w-full h-full object-cover"
        >
          {near && (LOW_END
            ? <source src="/video/dacen-360-540.mp4" type="video/mp4" />
            : <>
                <source src="/video/dacen-360.webm" type="video/webm" />
                <source src="/video/dacen-360.mp4" type="video/mp4" />
              </>)}
        </video>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausar el video" : "Reproducir el video"}
          className={`absolute grid place-items-center rounded-full text-white transition-colors ${playing
            ? "right-2.5 bottom-2.5 w-10 h-10 bg-black/55 hover:bg-black/75"
            : "inset-0 m-auto w-14 h-14 bg-black/60 hover:bg-black/80"}`}
        >
          {playing
            ? <svg aria-hidden className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            : <svg aria-hidden className="w-6 h-6 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
        </button>
      </div>
      <figcaption className="text-sm leading-snug text-[var(--cs-mark-dim)]">
        <b className="block text-[var(--cs-mark)] font-semibold">Así imprime nuestra Dacen F5</b>
        Video real del taller: el vaso gira mientras la tinta UV se cura con la luz violeta.
      </figcaption>
    </figure>
  );
}

export default function Print360() {
  const design = (location: string) => {
    track("cta_click", { location });
    startCustomizer({ technique: "color" });
  };
  return (
    <section id="impresion-360" aria-labelledby="p360-title" className="scroll-mt-16 bg-[var(--cs-ink)] text-[var(--cs-mark)] border-t border-white/[0.06]">
      {/* El video real de la Dacen F5 ocupa el lugar que tenía el vaso girable
          (guardado en vaso-360.tsx). Celular: título → video → datos.
          Escritorio: el video a la izquierda, el texto y los datos a la derecha. */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 md:py-24 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto] gap-x-16 gap-y-7 lg:gap-y-0">
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:self-end">
          <h2 id="p360-title" className="font-serif font-light text-white text-[clamp(2.5rem,6vw,4rem)] leading-[1]">
            Todo el vaso,<br /><em className="italic">a todo color.</em>
          </h2>
          <p className="mt-4 md:mt-5 text-[var(--cs-mark-dim)] text-base md:text-lg leading-relaxed max-w-[30em]">
            Imprimimos tu diseño directo sobre el vaso mientras gira, con nuestra{" "}
            <strong className="text-[var(--cs-mark)] font-semibold">impresora UV cilíndrica Dacen F5</strong>. Una foto, tu marca o tu idea, de un lado al otro.
          </p>
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:self-center">
          <DacenVideo />
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-2 lg:self-start">
          <dl className="lg:mt-8 grid grid-cols-3 border-t border-white/[0.14]">
            {[
              { k: "360°", v: "Toda la vuelta del cuerpo del vaso" },
              { k: "CMYK + blanco", v: "Fotos y degradados sobre cualquier color" },
              { k: `${cm(LIMITS.minDiameterMm)}–${cm(LIMITS.maxDiameterMm)} cm`, v: `De diámetro, hasta ${cm(LIMITS.maxLengthMm)} cm de alto` },
            ].map((f, i) => (
              <div key={f.k} className={`grid gap-1.5 content-start pt-4 ${i ? "pl-3 md:pl-4 border-l border-white/[0.14]" : "pr-3"}`}>
                <dt className="font-serif font-light text-white text-[20px] md:text-[28px] leading-[1.05]">{f.k}</dt>
                <dd className="text-[12px] md:text-[13.5px] leading-snug text-[var(--cs-mark-dim)]">{f.v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => design("print360_design")} className="cs-btn cs-btn-primary">
              Diseñar mi vaso 360°
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
            <button type="button" onClick={() => design("print360_arte")} className="cs-btn cs-btn-ghost-dark">
              Tengo el arte listo
            </button>
          </div>
          <p className="mt-4 text-sm text-[var(--cs-mark-dim)]">
            El precio depende del diseño y la cantidad:{" "}
            <a
              href={whatsappUrl("¡Hola! Quiero cotizar una impresión 360° a todo color.")}
              target="_blank"
              rel="noopener noreferrer"
              data-track="print360_cotizar"
              className="font-semibold text-[var(--cs-mark)] underline underline-offset-4 decoration-white/30 hover:decoration-white"
            >
              te lo pasamos por WhatsApp
            </a>.
          </p>
        </div>
      </div>
    </section>
  );
}
