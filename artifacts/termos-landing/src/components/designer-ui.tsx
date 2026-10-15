import React, { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";

/**
 * Piezas visuales del editor por capas (personalizador de drinkware): elección
 * de tipografía, tamaño, botones segmentados, la bandeja de herramientas del
 * celular y los diseños rápidos. Solo presentación: el estado vive en
 * customizer.tsx.
 */

export interface FontOption {
  id: string;
  name: string;
  style: React.CSSProperties;
}

/** Las seis tipografías a la vista (clásica, manuscrita, moderna y divertida); el resto en "Ver todas". */
export const FEATURED_FONT_IDS = ["f1", "f13", "f15", "f2", "f9", "f14"];

/**
 * Tipografías: primero las destacadas, mostrando el texto del cliente con cada
 * letra. "Ver todas" despliega el resto (recién ahí se bajan esas fuentes).
 * `strip`: una fila que se desliza (celular); `grid`: dos columnas (escritorio).
 */
export function FontPicker({ fonts, value, onChange, sampleText, variant = "grid" }: {
  fonts: FontOption[];
  value: string;
  onChange: (id: string) => void;
  sampleText: string;
  variant?: "grid" | "strip";
}) {
  const [all, setAll] = useState(false);
  const featured = FEATURED_FONT_IDS.map(id => fonts.find(f => f.id === id)).filter((f): f is FontOption => !!f);
  // La elegida siempre a la vista, aunque no sea de las destacadas.
  const current = fonts.find(f => f.id === value);
  const base = current && !featured.includes(current) ? [current, ...featured] : featured;
  const shown = all ? [...base, ...fonts.filter(f => !base.includes(f))] : base;
  const sample = sampleText.trim().split("\n")[0] || "Tu texto";
  const chip = (f: FontOption) => {
    const on = f.id === value;
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => onChange(f.id)}
        aria-pressed={on}
        title={f.name}
        className={`min-w-0 rounded-xl border px-3 py-2 text-left transition-colors active:scale-[0.98] ${
          on ? "border-primary bg-[#f5eaec] ring-1 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-secondary/50"
        } ${variant === "strip" ? "shrink-0 max-w-[11rem]" : ""}`}
      >
        <span className={`block truncate text-lg leading-tight ${on ? "text-primary" : "text-foreground"}`} style={f.style}>{sample}</span>
        <span className="block truncate text-[11px] text-muted-foreground mt-0.5">{f.name}</span>
      </button>
    );
  };
  const more = (
    <button
      type="button"
      onClick={() => setAll(a => !a)}
      className={`text-sm font-medium text-primary hover:underline ${variant === "strip" ? "shrink-0 px-3" : "justify-self-start"}`}
    >
      {all ? "Ver menos" : `Ver todas (${fonts.length})`}
    </button>
  );
  if (variant === "strip") {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]">
        {shown.map(chip)}
        {more}
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">{shown.map(chip)}</div>
      {more}
    </div>
  );
}

/** Slider de tamaño con el valor a la vista (a … A · 45%). */
export function ScaleSlider({ label, value, min, max, onChange, step = 0.05 }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  const v = Math.max(min, Math.min(max, value));
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[11px] font-bold text-muted-foreground leading-none" aria-hidden>a</span>
        <Slider
          value={[Math.round(v * 100)]}
          onValueChange={([x]) => onChange(Math.max(min, Math.min(max, x / 100)))}
          min={Math.round(min * 100)}
          max={Math.round(max * 100)}
          step={Math.round(step * 100)}
          className="flex-1"
          aria-label={label}
        />
        <span className="shrink-0 text-lg font-bold text-muted-foreground leading-none" aria-hidden>A</span>
        <span className="shrink-0 w-10 text-right text-[11px] font-semibold text-primary tabular-nums">{Math.round(v * 100)}%</span>
      </div>
    </div>
  );
}

/** Botones segmentados (una sola opción): cara, zona, etc. */
export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-full border border-border bg-white p-0.5 gap-0.5">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 min-h-10 rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors ${
            value === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface Tool {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}

/** Fila fija de herramientas de la capa elegida (celular), al alcance del pulgar. */
export function ToolTray({ tools }: { tools: Tool[] }) {
  return (
    <div role="toolbar" aria-label="Herramientas" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${tools.length}, minmax(0, 1fr))` }}>
      {tools.map(t => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={t.onClick}
            aria-pressed={t.active}
            className={`min-h-14 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors active:scale-95 ${
              t.active ? "bg-[#f5eaec] text-primary" : t.danger ? "text-red-700" : "text-muted-foreground"
            }`}
          >
            <Icon className={`w-5 h-5 ${t.active ? "text-primary" : t.danger ? "text-red-700" : "text-foreground"}`} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export interface QuickStartOption {
  id: string;
  title: string;
  sample: string;
  onPick: () => void;
}

/** "¿Qué querés grabar?": puntos de partida que arman las capas ya ubicadas. */
export function QuickStart({ options, columns = 2 }: { options: QuickStartOption[]; columns?: 2 | 4 }) {
  return (
    <div className={`grid gap-2 ${columns === 4 ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-2"}`}>
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={o.onPick}
          className="min-h-16 rounded-xl border border-border px-3 py-2.5 text-left hover:border-primary/40 hover:bg-secondary/50 active:scale-[0.98] transition"
        >
          <span className="block text-sm font-semibold text-foreground leading-tight">{o.title}</span>
          <span className="block text-xs text-muted-foreground mt-0.5 truncate">{o.sample}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Alto y desplazamiento del área visible del navegador. Con el teclado abierto
 * en el celular el área se achica: el editor a pantalla completa se ajusta a
 * ella para que el campo de texto quede arriba del teclado y el vaso a la vista.
 */
export function useVisualViewport(active: boolean): { height: number; top: number } | null {
  const [vv, setVv] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const v = window.visualViewport;
    const read = () => setVv(v ? { height: v.height, top: v.offsetTop } : { height: window.innerHeight, top: 0 });
    read();
    v?.addEventListener("resize", read);
    v?.addEventListener("scroll", read);
    window.addEventListener("resize", read);
    return () => {
      v?.removeEventListener("resize", read);
      v?.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [active]);
  return active ? vv : null;
}
