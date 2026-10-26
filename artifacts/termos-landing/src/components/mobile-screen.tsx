import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft } from "lucide-react";

/**
 * Área visible de la pantalla: con el teclado abierto se achica (y en iPhone
 * además se corre). `keyboard` = el alto bajó bastante respecto del máximo visto.
 */
export function useVisualViewport() {
  const read = () => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    return { height: vv?.height ?? (typeof window !== "undefined" ? window.innerHeight : 800), top: vv?.offsetTop ?? 0 };
  };
  const [vp, setVp] = useState(read);
  const maxH = useRef(vp.height);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => setVp(read());
    vv.addEventListener("resize", on);
    vv.addEventListener("scroll", on);
    return () => { vv.removeEventListener("resize", on); vv.removeEventListener("scroll", on); };
  }, []);
  maxH.current = Math.max(maxH.current, vp.height);
  return { ...vp, keyboard: vp.height < maxH.current - 150 };
}

/**
 * Paso de Diseño en el celular: UNA pantalla fija, sin scroll de página. El
 * producto queda siempre arriba y las opciones se desplazan debajo, así cada
 * cambio se ve en el momento (antes había que subir a mirar el termo después
 * de cada opción). Va en un portal sobre la página; "Atrás" del celular
 * vuelve al paso anterior en vez de salir del sitio.
 */
export function MobileDesignScreen({ title, subtitle, right, top, height, onBack, nav, children }: {
  title: string;
  subtitle?: string;
  /** Acción a la derecha de la cabecera (Ver en AR). */
  right?: React.ReactNode;
  top: number; height: number;
  onBack: () => void;
  nav: React.ReactNode;
  children: React.ReactNode;
}) {
  // Sin scroll de la página detrás.
  useEffect(() => {
    const h = document.documentElement, b = document.body;
    const prev = [h.style.overflow, b.style.overflow];
    h.style.overflow = "hidden";
    b.style.overflow = "hidden";
    return () => { h.style.overflow = prev[0]; b.style.overflow = prev[1]; };
  }, []);

  // "Atrás" del celular: una entrada propia en el historial.
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  useEffect(() => {
    let popped = false;
    window.history.pushState({ csDesign: true }, "");
    const onPop = () => { popped = true; onBackRef.current(); };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!popped && window.history.state?.csDesign) window.history.back();
    };
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="md:hidden fixed inset-x-0 z-50 bg-white flex flex-col"
      style={{ top, height }}
    >
      <div className="shrink-0 flex items-center gap-1 px-1 border-b border-border" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver al paso anterior"
          className="w-11 h-11 grid place-items-center rounded-full text-muted-foreground active:bg-secondary"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 text-center leading-tight py-1.5">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
        {right ?? <span className="w-11" aria-hidden />}
      </div>
      {children}
      {nav}
    </div>,
    document.body,
  );
}
