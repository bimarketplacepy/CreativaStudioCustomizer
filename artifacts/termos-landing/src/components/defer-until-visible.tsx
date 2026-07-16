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
export default function DeferUntilVisible({
  children,
  id,
  minHeight = "90vh",
  rootMargin = "600px",
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
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin]);

  // The wrapper reserves the section's height so nothing jumps (CLS stays 0).
  return (
    <div ref={ref} id={id} style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  );
}
