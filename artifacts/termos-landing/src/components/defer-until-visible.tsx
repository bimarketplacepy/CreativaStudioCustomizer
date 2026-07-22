import React, { useEffect, useRef, useState } from "react";

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
function defaultRootMargin(): string {
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
    return "200px";
  }
  return "600px";
}

export default function DeferUntilVisible({
  children,
  id,
  minHeight = "90vh",
  rootMargin,
}: {
  children: React.ReactNode;
  /** Anchor id kept on the always-present wrapper so in-page links (e.g.
   *  "Comenzar" → #customizer) resolve even before the children mount. */
  id?: string;
  minHeight?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
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
  }, [show, rootMargin]);

  // The wrapper reserves the section's height so nothing jumps (CLS stays 0).
  // scroll-mt-20: el header sticky (64px) no tapa el inicio al navegar al anchor.
  return (
    <div ref={ref} id={id} className="scroll-mt-20" style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  );
}
