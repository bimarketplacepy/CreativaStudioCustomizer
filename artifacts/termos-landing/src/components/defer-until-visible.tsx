import React, { useEffect, useRef, useState } from "react";
import { isRevealed, onReveal } from "@/lib/section-reveal";

/**
 * Renders its children only once the placeholder scrolls near the viewport.
 * Used to gate the heavy Three.js customizer: its ~300 KB chunk (and the WebGL
 * scene setup that follows) then downloads and executes as the visitor
 * approaches it, instead of competing with first paint / LCP and inflating TBT.
 *
 * `rootMargin` gives the chunk a head start so it's ready by the time the
 * section is actually on screen. Once shown, it stays shown.
 */
/**
 * Default rootMargin, responsive. On phones 600px was self-defeating: with a
 * ~823px viewport, hero (92vh) + the section above left the customizer wrapper
 * at ~1.090px from the top — under the 823+600px trigger line — so the ~1.1 MB
 * Three.js chunk downloaded AT LOAD, competing with the LCP image and CSS
 * (Lighthouse's "991 KiB unused JS"). 200px keeps the head start for a real
 * scroll gesture without firing on first paint. Desktop keeps the generous
 * margin: bandwidth is plentiful and the fold is taller.
 */
function isPhone(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function defaultRootMargin(): string {
  return isPhone() ? "200px" : "600px";
}

/**
 * En celular, además, nada se carga antes del primer scroll. El margen solo no
 * alcanzaba: con un hero alto (~950px en 412×823) el personalizador quedaba a
 * 1013px, 10px adentro de la línea de 823+200px, y el chunk de Three.js + el
 * .glb bajaban igual al abrir la página. Un scroll (del usuario, de un CTA o
 * de un deep link) arma la observación; la página abierta en el tope, no.
 */
function useScrolled(enabled: boolean): boolean {
  const [scrolled, setScrolled] = useState(() => !enabled || typeof window === "undefined" || window.scrollY > 0);
  useEffect(() => {
    if (scrolled) return;
    const on = () => setScrolled(true);
    window.addEventListener("scroll", on, { passive: true, once: true });
    return () => window.removeEventListener("scroll", on);
  }, [scrolled]);
  return scrolled;
}

export default function DeferUntilVisible({
  children,
  id,
  minHeight = "90vh",
  rootMargin,
  revealable = false,
}: {
  children: React.ReactNode;
  /** Anchor id kept on the always-present wrapper so in-page links (e.g.
   *  "Comenzar" → #customizer) resolve even before the children mount. */
  id?: string;
  minHeight?: string;
  rootMargin?: string;
  /** Also mount when revealAllSections() fires (in-page nav to a section that
   *  is not mounted yet — see lib/section-reveal.ts). Off for the customizer:
   *  jumping past it must not pull in Three.js. */
  revealable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(() => revealable && isRevealed());
  const armed = useScrolled(isPhone());

  useEffect(() => {
    if (!revealable || show) return;
    return onReveal(() => setShow(true));
  }, [revealable, show]);

  useEffect(() => {
    if (show || !armed) return;
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (very old browser): just render eagerly.
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: rootMargin ?? defaultRootMargin() },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin, armed]);

  // The wrapper reserves the section's height so nothing jumps (CLS stays 0).
  // scroll-mt-20: el header sticky (64px) no tapa el inicio al navegar al anchor.
  return (
    <div ref={ref} id={id} className="scroll-mt-20" style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  );
}
