import React, { useState, useRef, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Check, Palette, Type, Box, Pipette, ImageIcon, MoveHorizontal, MoveVertical,
  Shapes, Zap, Sparkles, Wallet, TreePine, Square, PenLine, Wine, CupSoda, Snowflake,
  Shield, Scissors,
  Minus, Plus, Move,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Info,
  WrapText, Rows3, CornerDownLeft, Settings2, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, Crosshair, CirclePlay, Orbit,
} from "lucide-react";
import Thermos3D from "./thermos-3d";
import Object3D from "./object-3d";
import ImageUpload from "./image-upload";
import { ENGRAVING_PLANS, type EngravingPlanId } from "@/lib/engraving-plans";
import type { ProcessedImage } from "@/lib/image-processing";
import { DEFAULT_PRODUCT_ID, getProduct, getSize, type ProductDef } from "@/lib/products";
import { getObject } from "@/lib/objects";
import {
  DEFAULT_ART_PLACEMENT, DEFAULT_TEXT_PLACEMENT, LINE_HEIGHT_PRESETS, DEFAULT_LINE_HEIGHT,
  type Placement, type TextAlign, type TextLayout, type LineHeightPreset,
} from "@/lib/placement";
import {
  markHalfExtents, computeFaceTextLayout, bandMetrics, TEXTURE_W, TEXTURE_H,
  wrap360MaxScale, wrap360Fits, type MarkSpec,
} from "@/lib/engraving-maps";
import {
  FRONT_FACE, padToPlacement, placementToPad,
  clampPlacementToFrontArea, type MarkHalfExtents,
} from "@/lib/face-area";
import {
  MATERIALS, DEFAULT_MATERIAL_ID, getMaterial, allowsColorPrint, type MaterialId,
} from "@/lib/materials";
import { ENGRAVING_ICONS, iconToDataUrl } from "@/lib/engraving-icons";
import { whatsappUrl } from "@/lib/contact";
import { dataUrlToJpeg, downloadDataUrl } from "@/lib/share";
import { useCreateOrder, type CreateOrderRequest } from "@workspace/api-client-react";
import { Download, Loader2 } from "lucide-react";

/** Text scale bounds. Capped low so a name never blows out past the band. */
const TEXT_SCALE_MIN = 0.3;
const TEXT_SCALE_MAX = 1.2;

/** Engraving text length cap. Line breaks (manual disposition) don't count
 *  toward it, so the user always gets 30 *visible* characters to work with. */
const MAX_TEXT_CHARS = 30;
const visibleTextLen = (s: string) => [...s].filter(c => c !== "\n").length;
function capEngravingText(raw: string, max = MAX_TEXT_CHARS): string {
  let count = 0;
  let out = "";
  for (const ch of raw) {
    if (ch === "\n") { out += ch; continue; }
    if (count >= max) continue;
    out += ch;
    count++;
  }
  return out;
}

/**
 * Text size control: a single sliding dot (same slider as the placement pad's
 * "Tamaño"). Bound to the text placement scale — as the text grows, the engraving
 * auto-wraps long rows onto the line below, Instagram-style. Small (a) on the
 * left, large (A) on the right.
 */
function TextSizeSlider({ scale, onScale, maxScale }: { scale: number; onScale: (s: number) => void; maxScale?: number }) {
  // "Envolvente 360°" caps the slider at the largest size that still completes
  // the lap without the text meeting itself.
  const max = Math.max(TEXT_SCALE_MIN, Math.min(TEXT_SCALE_MAX, maxScale ?? TEXT_SCALE_MAX));
  return (
    <div className="mt-3 pt-3 border-t border-border">
      <Label className="text-xs text-muted-foreground mb-2 block">Tamaño del texto</Label>
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[11px] font-bold text-muted-foreground leading-none">a</span>
        <Slider
          value={[Math.min(scale, max) * 100]}
          onValueChange={([v]) => onScale(Math.min(v / 100, max))}
          min={Math.round(TEXT_SCALE_MIN * 100)}
          max={Math.round(max * 100)}
          step={5}
          className="flex-1"
          aria-label="Tamaño del texto"
        />
        <span className="shrink-0 text-lg font-bold text-muted-foreground leading-none">A</span>
        <span className="shrink-0 w-10 text-right text-[11px] font-semibold text-primary tabular-nums">
          {Math.round(Math.min(scale, max) * 100)}%
        </span>
      </div>
    </div>
  );
}

const COLORS = [
  { id: "c1", hex: "#C1121F", name: "Rojo Marketplace" },
  { id: "c2", hex: "#1E3A5F", name: "Azul Marino" },
  { id: "c3", hex: "#2D6A4F", name: "Verde Bosque" },
  { id: "c4", hex: "#F4A261", name: "Naranja Suave" },
  { id: "c5", hex: "#023E8A", name: "Azul Real" },
  { id: "c6", hex: "#6D4C41", name: "Café Chocolate" },
  { id: "c7", hex: "#111111", name: "Negro Intenso" },
  { id: "c8", hex: "#DDDDDD", name: "Blanco Perla" },
  { id: "c9", hex: "#7B2D8B", name: "Violeta" },
  { id: "c10", hex: "#2D9CDB", name: "Celeste" },
  { id: "c11", hex: "#EB5757", name: "Coral" },
  { id: "c12", hex: "#27AE60", name: "Verde Esmeralda" },
];

/** Shade steps used to build the tone ramp around the selected base colour. */
const TONE_STEPS = [-0.5, -0.32, -0.16, 0, 0.16, 0.32, 0.5];

function shadeHex(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  const ch = (shift: number) => {
    const v = (num >> shift) & 0xff;
    return Math.round(v + (target - v) * t)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** Spanish article for a drinkware product name: "del termo", "de la copa". */
const FEMININE_PRODUCTS = new Set(["copa", "guampa", "botella", "chopera"]);
function productArticle(singular: string): string {
  return FEMININE_PRODUCTS.has(singular.toLowerCase()) ? "de la" : "del";
}

const FINISHES: { id: string; name: string; material?: MaterialId }[] = [
  { id: "matte", name: "Mate" },
  { id: "glossy", name: "Brillante" },
  { id: "metallic", name: "Metálico" },
  { id: "gradient", name: "Degradado" },
  // Solo se ofrece en material Cuero: aspecto mate tipo cuero forrado.
  { id: "cuero", name: "Cuero", material: "cuero" },
  // Acero inoxidable natural: acabado fijo cepillado, sin pintura.
  { id: "inox", name: "Cepillado", material: "inox" },
];

/** Gris acero claro del acabado inoxidable natural (no se pinta). */
const INOX_HEX = "#C7C9CC";

const FONTS = [
  { id: "f1",  name: "Abril Fatface",     style: { fontFamily: "'Abril Fatface', serif", letterSpacing: "0.05em" } },
  { id: "f2",  name: "Anthony Hunter",    style: { fontFamily: "'Anthony Hunter', cursive", fontStyle: "italic" } },
  { id: "f3",  name: "Billion Dreams",    style: { fontFamily: "'Billion Dreams', cursive" } },
  { id: "f4",  name: "Blendaria",         style: { fontFamily: "'Blendaria', sans-serif" } },
  { id: "f5",  name: "Bree Serif",        style: { fontFamily: "'Bree Serif', serif" } },
  { id: "f23", name: "Bulgatti",          style: { fontFamily: "'Bulgatti', cursive" } },
  { id: "f6",  name: "Cronos Pro",        style: { fontFamily: "'Cronos Pro', serif", fontWeight: 600 } },
  { id: "f7",  name: "Ellisha",           style: { fontFamily: "'Ellisha', cursive", fontStyle: "italic" } },
  { id: "f8",  name: "Freestyle Script",  style: { fontFamily: "'Freestyle Script', cursive", fontWeight: 400 } },
  { id: "f9",  name: "Heavitas",          style: { fontFamily: "'Heavitas', sans-serif" } },
  { id: "f10", name: "Impacted",          style: { fontFamily: "'Impacted', sans-serif" } },
  { id: "f11", name: "KG Dark Side",      style: { fontFamily: "'KG Dark Side', cursive" } },
  { id: "f12", name: "Kissing Season",    style: { fontFamily: "'Kissing Season', cursive" } },
  { id: "f13", name: "Libre Baskerville", style: { fontFamily: "'Libre Baskerville', serif" } },
  { id: "f14", name: "Milkshake",         style: { fontFamily: "'Milkshake', cursive" } },
  { id: "f15", name: "Pacifico",          style: { fontFamily: "'Pacifico', cursive" } },
  { id: "f16", name: "Party Confetti",    style: { fontFamily: "'Party Confetti', cursive" } },
  { id: "f17", name: "Quimil",            style: { fontFamily: "'Quimil', serif" } },
  { id: "f18", name: "Renogare",          style: { fontFamily: "'Renogare', sans-serif" } },
  { id: "f19", name: "Rimouski Sb",       style: { fontFamily: "'Rimouski Sb', serif" } },
  { id: "f20", name: "Square 721",        style: { fontFamily: "'Square 721', sans-serif" } },
  { id: "f21", name: "TT Rounds Neue",    style: { fontFamily: "'TT Rounds Neue', sans-serif", fontWeight: 600 } },
  { id: "f22", name: "Versalita",         style: { fontFamily: "'Arial', sans-serif", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const } },
];

/** Engraving techniques offered on drinkware. */
const TECHNIQUES = [
  { id: "laser", name: "Grabado láser", desc: "Monocromático, permanente sobre el acero.", color: false },
  { id: "eufy",  name: "Impresión UV", desc: "Impresión a todo color sobre el producto.", color: true },
] as const;
type TechniqueId = (typeof TECHNIQUES)[number]["id"];

/** Personalization kinds shared by the drinkware tabs and the simple flow. */
const KINDS = [
  { id: "text",   name: "Texto",    icon: Type },
  { id: "icons",  name: "Íconos",   icon: Shapes },
  { id: "images", name: "Imágenes", icon: ImageIcon },
] as const;
type KindId = (typeof KINDS)[number]["id"];

const MATERIAL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  cup: CupSoda,
  steel: Shield,
  wallet: Wallet,
  tree: TreePine,
  square: Square,
  pen: PenLine,
  wine: Wine,
  cooler: Snowflake,
};

// Tactile press feedback (active:scale) gives every selection a sub-100ms
// physical "click" — the invisible dopamine beat — without extra markup.
const activeCard = "border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30 active:scale-[0.97]";
const idleCard = "border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50 active:scale-[0.97]";

// Editor tab as a segment of a pill control: equal width, icon over label on
// mobile / inline on desktop, so all tabs always fit — no cut-off scroll.
const SEG_TAB = "flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-lg py-1.5 px-1 text-[11px] sm:text-sm font-medium text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-colors";

// ── Mobile wizard chrome ─────────────────────────────────────────────────────
// On phones the customizer is a step-by-step wizard (progress + fixed nav)
// instead of one long scroll. Desktop keeps the full layout.

/** Compact progress header: "Paso N de M" + a bar segment per step. */
function WizardProgress({ step, labels }: { step: number; labels: string[] }) {
  const total = labels.length;
  return (
    <div className="md:hidden mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Paso {step} de {total}</span>
        <span className="text-xs text-muted-foreground">{labels[step - 1]}</span>
      </div>
      <div className="flex gap-1.5">
        {labels.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
    </div>
  );
}

/** Fixed bottom nav: Back (all but first step) + Next (all but last step). */
function WizardNav({ step, total, onBack, onNext, nextLabel }: {
  step: number; total: number; onBack: () => void; onNext: () => void; nextLabel?: string;
}) {
  return (
    <div
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-border px-4 pt-3 flex items-center gap-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={onBack}
        disabled={step === 1}
        className="inline-flex items-center gap-1 px-4 py-3 min-h-11 rounded-full border border-border text-sm font-medium text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" /> Atrás
      </button>
      {step < total && (
        <button
          type="button"
          onClick={onNext}
          className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-3 min-h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm active:scale-[0.98] transition-transform"
        >
          {nextLabel ?? "Siguiente"} <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/** Material picker as a horizontal row of scrollable pills (mobile Step 1). */
function MaterialChips({ materials, value, onChange }: {
  materials: typeof MATERIALS; value: MaterialId; onChange: (id: MaterialId) => void;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-3 block">Material</Label>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x [scrollbar-width:thin]">
        {materials.map(m => {
          const Icon = MATERIAL_ICON[m.icon] ?? Box;
          const on = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              title={m.desc}
              className={`snap-start shrink-0 inline-flex items-center gap-2 px-4 py-2.5 border rounded-full text-sm font-medium whitespace-nowrap transition-all ${on ? activeCard : idleCard}`}
            >
              <Icon className="w-4 h-4 shrink-0" /> {m.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Product picker (or pen) as scrollable pills for the chosen material (mobile Step 1). */
function ProductChips({ material, value, onChange }: {
  material: (typeof MATERIALS)[number]; value: string; onChange: (id: string) => void;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-3 block">
        {material.pens ? "Bolígrafo" : "Producto"}
      </Label>
      {material.pens ? (
        <div className="inline-flex items-center gap-2 px-4 py-2.5 border rounded-full text-sm font-medium bg-[#f5eaec] border-primary text-primary ring-1 ring-primary/30">
          <PenLine className="w-4 h-4" /> Bolígrafo
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x [scrollbar-width:thin]">
          {material.products.map(p => {
            const on = p.id === value;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange(p.id)}
                title={p.desc}
                className={`snap-start shrink-0 inline-flex items-center px-4 py-2.5 border rounded-full text-sm font-medium whitespace-nowrap transition-all ${on ? activeCard : idleCard}`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Grid of preset icons the customer can engrave. Toggles selection off on re-click. */
function IconPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {ENGRAVING_ICONS.map(ic => {
        const active = value === ic.id;
        return (
          <button
            key={ic.id}
            type="button"
            title={ic.name}
            onClick={() => onChange(active ? null : ic.id)}
            className={`aspect-square rounded-lg border flex items-center justify-center transition-all ${active ? activeCard : `${idleCard} !text-foreground`}`}
          >
            <svg viewBox="0 0 24 24" className={`w-7 h-7 ${active ? "text-primary" : "text-foreground"}`} dangerouslySetInnerHTML={{ __html: ic.body }} />
          </button>
        );
      })}
    </div>
  );
}

/** Laser vs Eufy Make picker shown once the customer is personalizing. */
function TechniqueSelector({ value, onChange }: { value: TechniqueId; onChange: (id: TechniqueId) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {TECHNIQUES.map(t => {
        const active = value === t.id;
        const Icon = t.color ? Sparkles : Zap;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`text-left p-3 border rounded-xl transition-all ${active ? activeCard : idleCard}`}
          >
            <span className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <span className="font-semibold text-sm">{t.name}</span>
              {t.color && (
                <span className="ml-auto text-[11px] font-medium uppercase tracking-wide rounded-full px-2.5 py-0.5 bg-[#1A1614] text-white/90">
                  Todo color
                </span>
              )}
            </span>
            <span className="block text-xs text-muted-foreground mt-1">{t.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Direct-manipulation controls for one engraved element (text or art).
 *
 * The core is a drag pad: a square that stands in for the product face. The user
 * drags the element to move it (updates u/v live) and drags the corner handle to
 * scale it (updates scale live) — so "how do I move and resize this" is answered
 * by the widget itself, no abstract X/Y sliders. A precise size row (−/+ and a
 * slider with a live %) and the orientation toggle sit underneath.
 */
const PAD_BASE = 0.15; // element half-size as a fraction of the pad, at scale 1

/**
 * Compact, semi-transparent position pad that floats over the 3D visor. Appears
 * only while a design is active. Four arrows nudge the active mark, the centre
 * button recentres it, and the whole thing collapses to a single grip button so
 * it never gets in the way of the product.
 */
function DesignNudgeControl({ side, onNudge, onCenter }: {
  side: "left" | "right";
  onNudge: (dx: number, dy: number) => void;
  onCenter: () => void;
}) {
  const [open, setOpen] = useState(true);
  const pos = side === "left" ? "left-2.5" : "right-2.5";
  // 36px + gap 6px: targets tocables sin que el pad (≈132×154px) desborde el
  // visor móvil (mínimo 210px de alto, ancho ≈328px en un viewport de 360).
  const btn = "w-9 h-9 grid place-items-center rounded-md text-foreground/75 hover:text-primary hover:bg-white active:scale-90 transition";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mostrar controles de posición"
        className={`absolute bottom-2.5 ${pos} z-20 w-9 h-9 grid place-items-center rounded-full bg-white/70 backdrop-blur-sm border border-border shadow-sm text-primary`}
      >
        <Move className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className={`absolute bottom-2.5 ${pos} z-20 rounded-xl bg-white/70 backdrop-blur-sm border border-border shadow-md p-1.5 select-none touch-none`}>
      <div className="flex items-center justify-between gap-3 px-1 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Posición</span>
        {/* p-2 -m-1: agranda el target táctil (~30px) sin mover el layout. */}
        <button type="button" onClick={() => setOpen(false)} aria-label="Ocultar controles" className="p-2 -m-1 text-muted-foreground hover:text-foreground active:text-foreground">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <span />
        <button type="button" aria-label="Subir" className={btn} onClick={() => onNudge(0, -1)}><ChevronUp className="w-4 h-4" /></button>
        <span />
        <button type="button" aria-label="Mover a la izquierda" className={btn} onClick={() => onNudge(-1, 0)}><ChevronLeft className="w-4 h-4" /></button>
        <button type="button" aria-label="Centrar" className={btn} onClick={onCenter}><Crosshair className="w-4 h-4" /></button>
        <button type="button" aria-label="Mover a la derecha" className={btn} onClick={() => onNudge(1, 0)}><ChevronRight className="w-4 h-4" /></button>
        <span />
        <button type="button" aria-label="Bajar" className={btn} onClick={() => onNudge(0, 1)}><ChevronDown className="w-4 h-4" /></button>
        <span />
      </div>
    </div>
  );
}

/** Chip sobre el visor que enseña el gesto de rotación. Bien visible (13px,
 *  fondo black/55 sobre el canvas), desaparece con el primer toque sobre el
 *  visor y no vuelve en la sesión. pointer-events-none: nunca intercepta el
 *  gesto que enseña. */
function RotateHintChip() {
  const [visible, setVisible] = useState(() => {
    try { return sessionStorage.getItem("cs-rotate-hint") !== "1"; } catch { return true; }
  });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!visible) return;
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const dismiss = () => {
      try { sessionStorage.setItem("cs-rotate-hint", "1"); } catch { /* sin storage: solo esta vista */ }
      setVisible(false);
    };
    parent.addEventListener("pointerdown", dismiss, { once: true });
    return () => parent.removeEventListener("pointerdown", dismiss);
  }, [visible]);
  if (!visible) return null;
  return (
    <div ref={ref} className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3.5 py-2 text-[13px] font-medium text-white backdrop-blur-sm">
        <MoveHorizontal className="w-4 h-4" aria-hidden />
        Arrastre para girar
      </span>
    </div>
  );
}

function PlacementControls({
  value,
  onChange,
  withSize,
  hideOrientation,
}: {
  value: Placement;
  onChange: (next: Placement) => void;
  withSize?: boolean;
  /** Flat objects have a single face: relabel the note. */
  flat?: boolean;
  /** Single-face mode: the pad represents ONLY the front-face rectangle. */
  singleFace?: boolean;
  /** Mark half-extents (placement space) — sizes the proxy in single-face mode. */
  frontExtents?: MarkHalfExtents;
  /** width/height of the editable rectangle, so the pad mirrors its real shape. */
  areaAspect?: number;
  /** Hide the orientation toggle (it lives inside "Texto Personalizado" for text). */
  hideOrientation?: boolean;
}) {
  // Position now lives on the 3D visor (drag + floating pad), so this component
  // only carries size and orientation. See DesignNudgeControl / moveActivePlacement.
  const clampScale = (n: number) => Math.max(0.3, Math.min(1.5, n));
  const set = (patch: Partial<Placement>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      {/* Precise size row with live % */}
      {withSize && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground">Tamaño</Label>
            <span className="text-[11px] font-semibold text-primary tabular-nums">{Math.round(value.scale * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Achicar"
              onClick={() => set({ scale: clampScale(Math.round((value.scale - 0.1) * 10) / 10) })}
              className="w-9 h-9 shrink-0 grid place-items-center rounded-md border border-border text-muted-foreground hover:border-primary/50 hover:text-primary active:scale-95 transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <Slider
              value={[value.scale * 100]}
              onValueChange={([v]) => set({ scale: v / 100 })}
              min={30}
              max={150}
              step={5}
              className="flex-1"
            />
            <button
              type="button"
              aria-label="Agrandar"
              onClick={() => set({ scale: clampScale(Math.round((value.scale + 0.1) * 10) / 10) })}
              className="w-9 h-9 shrink-0 grid place-items-center rounded-md border border-border text-muted-foreground hover:border-primary/50 hover:text-primary active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Orientation (hidden for text — it lives inside "Texto Personalizado") */}
      {!hideOrientation && (
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Orientación</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["horizontal", "vertical"] as const).map(o => (
            <button
              key={o}
              onClick={() => set({ orientation: o })}
              className={`flex items-center justify-center gap-2 p-2.5 border rounded-lg text-sm font-medium transition-all active:scale-[0.97] ${
                value.orientation === o
                  ? "border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50"
              }`}
            >
              {o === "horizontal" ? <MoveHorizontal className="w-4 h-4" /> : <MoveVertical className="w-4 h-4" />}
              {o === "horizontal" ? "Horizontal" : "Vertical"}
            </button>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Editor-style alignment buttons for multi-line text (left/center/right/justify). */
const TEXT_ALIGNS: { id: TextAlign; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "left",    label: "Izquierda",  Icon: AlignLeft },
  { id: "center",  label: "Centrado",   Icon: AlignCenter },
  { id: "right",   label: "Derecha",    Icon: AlignRight },
  { id: "justify", label: "Justificado", Icon: AlignJustify },
];

function AlignButtons({ value, onChange, className, disabledIds }: { value: TextAlign | undefined; onChange: (a: TextAlign) => void; className?: string; disabledIds?: TextAlign[] }) {
  const active = value ?? "center";
  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`} role="group" aria-label="Alineación del texto">
      {TEXT_ALIGNS.map(a => {
        const on = active === a.id;
        const disabled = disabledIds?.includes(a.id) ?? false;
        return (
          <button
            key={a.id}
            type="button"
            title={disabled ? `${a.label} (no disponible en esta disposición)` : a.label}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(a.id)}
            className={`w-9 h-9 grid place-items-center rounded-full border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${
              on ? "border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30" : "border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50"
            }`}
          >
            <a.Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

/** Text disposition (how the mark splits into lines) — matches the align pills. */
const TEXT_LAYOUTS: { id: TextLayout; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "auto",    label: "Automático",           Icon: WrapText },
  { id: "stack",   label: "Una palabra por línea", Icon: Rows3 },
  { id: "manual",  label: "Saltos manuales",       Icon: CornerDownLeft },
  { id: "wrap360", label: "Envolvente 360°",       Icon: Orbit },
];

function LayoutButtons({ value, onChange, className, disabledIds, disabledReason }: {
  value: TextLayout | undefined;
  onChange: (l: TextLayout) => void;
  className?: string;
  disabledIds?: TextLayout[];
  /** Tooltip shown on the disabled options, explaining why. */
  disabledReason?: string;
}) {
  const active = value ?? "auto";
  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`} role="group" aria-label="Disposición del texto">
      {TEXT_LAYOUTS.map(l => {
        const on = active === l.id;
        const disabled = disabledIds?.includes(l.id) ?? false;
        return (
          <button
            key={l.id}
            type="button"
            title={disabled ? disabledReason ?? `${l.label} (no disponible)` : l.label}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(l.id)}
            className={`w-9 h-9 grid place-items-center rounded-full border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${
              on ? "border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30" : "border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50"
            }`}
          >
            <l.Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

/** Interlineado (row spacing) presets — important when words are stacked. */
const LINE_HEIGHT_OPTIONS: { id: LineHeightPreset; label: string }[] = [
  { id: "compacto", label: "Compacto" },
  { id: "normal",   label: "Normal" },
  { id: "amplio",   label: "Amplio" },
];
/** Nearest preset to a stored numeric line-height (so the right pill lights up). */
function lineHeightPresetOf(lh: number | undefined): LineHeightPreset {
  const v = lh ?? DEFAULT_LINE_HEIGHT;
  let best: LineHeightPreset = "normal";
  let bestD = Infinity;
  for (const { id } of LINE_HEIGHT_OPTIONS) {
    const d = Math.abs(LINE_HEIGHT_PRESETS[id] - v);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}

function LineHeightButtons({ value, onChange, className }: { value: number | undefined; onChange: (mul: number) => void; className?: string }) {
  const active = lineHeightPresetOf(value);
  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`} role="group" aria-label="Interlineado">
      {LINE_HEIGHT_OPTIONS.map(o => {
        const on = active === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(LINE_HEIGHT_PRESETS[o.id])}
            className={`h-9 px-3 grid place-items-center rounded-full border text-xs font-medium transition-all active:scale-95 ${
              on ? "border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30" : "border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Horizontal, scrollable font picker — a strip of chips each previewing the
 * chosen name in its own typeface. Replaces the tall two-column grid so the
 * font choice takes one compact row instead of a whole screen on mobile.
 */
function FontCarousel({ fonts, value, onChange, sampleText }: {
  fonts: typeof FONTS;
  value: string;
  onChange: (id: string) => void;
  sampleText: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x [scrollbar-width:thin]">
      {fonts.map((f, i) => {
        const on = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            title={f.name}
            className={`snap-start shrink-0 w-[104px] px-3 py-2.5 border rounded-xl text-center transition-all ${on ? activeCard : idleCard}`}
          >
            <span className={`block text-lg leading-tight truncate ${on ? "text-primary" : "text-foreground"}`} style={f.style}>
              {sampleText || f.name}
            </span>
            <span className="block text-[11px] text-muted-foreground mt-0.5 truncate">{i + 1}. {f.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Progressive-disclosure wrapper: keeps advanced controls collapsed behind a
 * "Más opciones" toggle so the basic path (write a name, pick a font) stays
 * uncluttered. The defaults already produce a good result, so most users never
 * open it.
 */
function AdvancedOptions({ children, label = "Ajustes avanzados" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pt-4 border-t border-border">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Settings2 className="w-4 h-4" />
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-5 space-y-6">{children}</div>}
    </div>
  );
}

/** Ink colours offered for UV-printed text. */
const TEXT_INK_PRESETS = ["#161616", "#ffffff", "#8B1A2F", "#1e40af", "#15803d", "#b45309", "#db2777", "#6d28d9"];

/** Text colour picker — only shown when the piece is UV-printed (impresión a color). */
function TextColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-2 block">Color del texto</Label>
      <div className="flex items-center gap-2 flex-wrap">
        {TEXT_INK_PRESETS.map(hex => {
          const on = value.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              title={hex}
              className={`w-8 h-8 rounded-full border transition-all ${on ? "ring-2 ring-primary ring-offset-2" : "border-border hover:scale-105"}`}
              style={{ backgroundColor: hex }}
            />
          );
        })}
        <label className="relative w-8 h-8 rounded-full overflow-hidden border border-border cursor-pointer hover:border-primary/40" title="Color personalizado">
          <span className="absolute inset-0" style={{ backgroundColor: value }} />
          <span className="absolute inset-0 flex items-center justify-center"><Pipette className="w-4 h-4 text-white mix-blend-difference" /></span>
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="Color de texto personalizado"
          />
        </label>
      </div>
    </div>
  );
}

/** Multi-line engraving text field: a textarea with a newline-aware char cap
 *  (line breaks don't count) so "Saltos manuales" works without eating budget. */
function EngravingTextField({ text, onText, layout, onFocusChange, limitNotice }: {
  text: string;
  onText: (t: string) => void;
  layout: TextLayout | undefined;
  /** Focus tracking (drives the Envolvente 360° auto-rotation while typing). */
  onFocusChange?: (focused: boolean) => void;
  /** Shown when extra characters were blocked (wrap-around at max length). */
  limitNotice?: string | null;
}) {
  return (
    <>
      <Textarea
        value={text}
        onChange={(e) => onText(capEngravingText(e.target.value))}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        placeholder="Tu nombre o texto"
        rows={2}
        className="text-base text-center border-border focus-visible:ring-primary resize-none leading-snug"
      />
      <div className="flex items-center justify-between mt-1.5 gap-2">
        {layout === "manual" ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3 shrink-0" /> Enter para saltar de línea
          </span>
        ) : <span />}
        <p className="text-xs text-muted-foreground text-right whitespace-nowrap">{visibleTextLen(text)}/{MAX_TEXT_CHARS} caracteres</p>
      </div>
      {limitNotice && (
        <p className="text-xs text-primary/90 flex items-center gap-1.5 rounded-lg bg-[#f5eaec] border border-primary/20 px-3 py-2 mt-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          {limitNotice}
        </p>
      )}
    </>
  );
}

/**
 * Text toolbar: disposition + alignment + line-height, all writing back to the
 * text placement. Shared by both text tabs (drinkware and flat objects) so the
 * two surfaces stay identical. `onChange` receives the full next placement, so
 * callers can pass either the clamping setter or the raw state setter.
 */
function TextDispositionToolbar({ placement, onChange, wrapDisabledReason }: {
  placement: Placement;
  onChange: (next: Placement) => void;
  /** When set, "Envolvente 360°" is disabled with this tooltip. */
  wrapDisabledReason?: string;
}) {
  const layout = placement.layout ?? "auto";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-medium text-foreground">Disposición del texto</Label>
        <LayoutButtons
          value={layout}
          disabledIds={wrapDisabledReason ? ["wrap360"] : undefined}
          disabledReason={wrapDisabledReason}
          onChange={(l) => onChange({
            ...placement,
            layout: l,
            // "Justificado" no aplica a una palabra por línea: cae a izquierda.
            align: l === "stack" && placement.align === "justify" ? "left" : placement.align,
            // Envolvente 360°: una sola línea horizontal alrededor del cuerpo.
            orientation: l === "wrap360" ? "horizontal" : placement.orientation,
          })}
        />
      </div>
      {/* Los `title` no existen en touch: el motivo de una opción deshabilitada
          se muestra como texto visible, no solo como tooltip. */}
      {wrapDisabledReason && (
        <p className="text-xs text-muted-foreground">{wrapDisabledReason}</p>
      )}
      {layout === "wrap360" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 rounded-lg bg-secondary/50 border border-border px-3 py-2">
          <Info className="w-3.5 h-3.5 shrink-0" />
          Pasamos a edición libre: el texto envuelve todo el contorno del producto.
        </p>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-medium text-foreground">Alineación</Label>
        <AlignButtons
          value={placement.align}
          onChange={(a) => onChange({ ...placement, align: a })}
          disabledIds={layout === "stack" ? ["justify"] : undefined}
        />
      </div>
      {layout === "stack" && (
        <p className="text-xs text-muted-foreground">
          "Justificado" no está disponible con una palabra por línea.
        </p>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-medium text-foreground">Interlineado</Label>
        <LineHeightButtons
          value={placement.lineHeight}
          onChange={(mul) => onChange({ ...placement, lineHeight: mul })}
        />
      </div>
    </div>
  );
}

/** Orientation toggle (Horizontal / Vertical) — lives inside "Texto Personalizado". */
function OrientationToggle({ value, onChange, verticalDisabledReason }: {
  value: Placement["orientation"];
  onChange: (o: "horizontal" | "vertical") => void;
  /** When set, "Vertical" is disabled with this tooltip (Envolvente 360°). */
  verticalDisabledReason?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-2 block">Orientación</Label>
      <div className="grid grid-cols-2 gap-2">
        {(["horizontal", "vertical"] as const).map(o => {
          const disabled = o === "vertical" && !!verticalDisabledReason;
          return (
          <button
            key={o}
            type="button"
            disabled={disabled}
            title={disabled ? verticalDisabledReason : undefined}
            onClick={() => onChange(o)}
            className={`flex items-center justify-center gap-2 p-2.5 border rounded-lg text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${
              (value ?? "horizontal") === o
                ? "border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30"
                : "border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50"
            }`}
          >
            {o === "horizontal" ? <MoveHorizontal className="w-4 h-4" /> : <MoveVertical className="w-4 h-4" />}
            {o === "horizontal" ? "Horizontal" : "Vertical"}
          </button>
          );
        })}
      </div>
      {/* Visible en touch (el `title` solo aparece con mouse). */}
      {verticalDisabledReason && (
        <p className="text-xs text-muted-foreground mt-1.5">{verticalDisabledReason}</p>
      )}
    </div>
  );
}

/** Tiny silhouette drawn straight from the product's lathe profile. */
function ProductGlyph({ product, className, style }: { product: ProductDef; className?: string; style?: React.CSSProperties }) {
  const pts = product.profile;
  const last = pts[pts.length - 1];
  const maxR = Math.max(...pts.map(p => p[0]));
  const bottomY = pts[0][1];

  const isFlip = product.cap === "flip";
  const isArch = product.handle === "cap-arch";

  // Cap height and radius per style
  const capH = product.cap === "screw" ? 0.42
             : isFlip                  ? 0.38
             : product.cap === "lid"   ? 0.18
             : 0;
  const capR = last[0] * (product.cap === "screw" ? 1.16 : isFlip ? 1.02 : 1.06);
  const topY = last[1] + capH;

  // Arch handle: needs extra vertical room above the cap
  const archH = isArch ? capR * 1.55 : 0;  // space reserved above cap top
  const archW = capR * 0.68;                // half-width between posts (matches photo)
  const archSW = maxR * 0.13;              // stroke width

  // All SVG y-coords are offset down by archH so the arch fits in the viewBox
  const pt = (r: number, y: number) =>
    `${(maxR + r).toFixed(3)},${(archH + topY - y).toFixed(3)}`;
  const right = pts.map(([r, y]) => pt(r, y));
  const left  = [...pts].reverse().map(([r, y]) => pt(-r, y));
  const bodyPath = `M ${right.join(" L ")} L ${left.join(" L ")} Z`;

  const svgCapTop = archH;               // where the cap rect starts in SVG y
  const archTop   = archH * 0.10;        // small margin from top of viewBox
  const totalH    = archH + topY - bottomY;

  // Legacy cap-d / body handle (non-arch products only)
  const handleOnCap = product.handle === "cap-d";
  const hR  = handleOnCap ? capR * 0.42 : maxR * 0.5;
  const hCx = maxR + (handleOnCap ? capR : maxR);
  const hCy = archH + (handleOnCap ? capH / 2 : (topY - bottomY) * 0.5);

  return (
    <svg
      viewBox={`0 0 ${(maxR * 2.6).toFixed(3)} ${totalH.toFixed(3)}`}
      className={className}
      style={style}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
    >
      {/* Body silhouette */}
      <path d={bodyPath} fill="currentColor" opacity={0.7} />

      {/* Cap / lid */}
      {capH > 0 && (
        <rect
          x={maxR - capR} y={svgCapTop}
          width={capR * 2} height={capH}
          rx={0.05} fill="currentColor"
        />
      )}

      {/* Flip-straw nub: small center button sitting on top of the flip lid */}
      {isFlip && (
        <rect
          x={maxR - capR * 0.20} y={svgCapTop - capH * 0.15}
          width={capR * 0.40} height={capH * 0.17}
          rx={capR * 0.08} fill="currentColor"
        />
      )}

      {/* Arch handle: two vertical posts + horizontal crossbar */}
      {isArch && (
        <path
          d={[
            `M ${(maxR - archW).toFixed(3)} ${svgCapTop.toFixed(3)}`,
            `L ${(maxR - archW).toFixed(3)} ${archTop.toFixed(3)}`,
            `L ${(maxR + archW).toFixed(3)} ${archTop.toFixed(3)}`,
            `L ${(maxR + archW).toFixed(3)} ${svgCapTop.toFixed(3)}`,
          ].join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={archSW}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Square body handle (chopera): top arm → straight drop → bottom arm */}
      {product.handle === "body-square" && (() => {
        const bodyH = last[1] - bottomY;
        const yT = archH + topY - (bottomY + bodyH * 0.90);
        const yB = archH + topY - (bottomY + bodyH * 0.35);
        const x0 = maxR * 2 * 0.97;
        const x1 = maxR * 2.42;
        return (
          <path
            d={`M ${x0} ${yT} L ${x1} ${yT} L ${x1} ${yB} L ${x0} ${yB}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={maxR * 0.15}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })()}

      {/* cap-d or body side handle (non-arch products) */}
      {!isArch && product.handle !== "none" && product.handle !== "body-square" && (
        <path
          d={`M ${hCx} ${hCy - hR} A ${hR} ${hR} 0 0 1 ${hCx} ${hCy + hR}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={maxR * 0.16}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default function Customizer() {
  // On phones the preview panel is full-width and stacked, so keep the 3D canvas
  // compact — a tall canvas there eats the whole screen and hides the sections
  // below. On ≥md it goes back to the roomier desktop sizing.
  const isMobile = useIsMobile();

  // Mobile wizard: the flow is split into steps on phones. Drinkware gets the
  // full four-step flow (Producto · Estilo · Diseño · Resumen); simpler products
  // (flat objects, pens) collapse to two (Producto · Diseño). State is
  // centralised here, so stepping back and forth never loses anything.
  const [mobileStep, setMobileStep] = useState(1);
  const [planTouched, setPlanTouched] = useState(false);

  // STEP 1 — material, STEP 2 — product within the material
  const [materialId, setMaterialId] = useState<MaterialId>(DEFAULT_MATERIAL_ID);
  const material = getMaterial(materialId);
  const [materialProductId, setMaterialProductId] = useState<string>(material.products[0]?.id ?? "");
  const activeMProduct = material.products.find(p => p.id === materialProductId) ?? material.products[0];
  const isDrinkware = !!activeMProduct?.drinkwareProductId;
  // Cristal (glass) pieces render as transparent glass and have no product colour.
  const isGlass = materialId === "cristal";
  // Acero inoxidable natural: sin paleta de colores, acabado cepillado fijo.
  const isInox = materialId === "inox";
  // Non-lathe modelled blanks (box/flat shapes). Pens reuse the pen object.
  const activeObjectId = activeMProduct?.objectId ?? (material.pens ? "boligrafo" : undefined);
  const is3DObject = !isDrinkware && !!activeObjectId;
  const activeObject = activeObjectId ? getObject(activeObjectId) : null;
  // Uploading a custom image is limited to steel drinkware (painted or bare);
  // the steel opener and every other material only allow text or a preset icon.
  const canUploadImage = isDrinkware && (materialId === "acero" || materialId === "inox");
  // A leather-wrapped (forrado) drinkware chars like leather; bare stainless
  // anneals dark (grafito) instead of revealing bright metal.
  const drinkwareEngraveStyle = materialId === "cuero" ? "leather" : isInox ? "inox" : "steel";

  // Drinkware base product (drives the 3D preview, sizes, band)
  const productId = activeMProduct?.drinkwareProductId ?? DEFAULT_PRODUCT_ID;
  const product = getProduct(productId);
  const [size, setSize] = useState(getProduct(DEFAULT_PRODUCT_ID).sizes[1].id);
  const activeSize = getSize(product, size);

  const [color, setColor] = useState(COLORS[0].id);
  const [customHex, setCustomHex] = useState<string | null>(null);
  // Ink colour for UV-printed text (only used when the technique is impresión UV).
  const [textColor, setTextColor] = useState("#161616");
  const [finish, setFinish] = useState(FINISHES[0].id);
  const [text, setText] = useState("");
  const [font, setFont] = useState(FONTS[0].id);
  const activeFont = FONTS.find(f => f.id === font) || FONTS[0];
  const [isOrdered, setIsOrdered] = useState(false);
  // Número del último pedido creado ("CS-0042") para la confirmación breve del
  // paso; null cuando el POST falló y el mensaje salió por el fallback.
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [orderFallback, setOrderFallback] = useState(false);
  // Hook tipado generado por Orval (react-query) para POST /api/orders.
  const { mutateAsync: createOrderAsync } = useCreateOrder();
  // Subida del preview al tocar "Continuar por WhatsApp": estado de carga del botón.
  const [isPreparing, setIsPreparing] = useState(false);
  // PNG snapshot of the finished 3D piece, shown in the Step 4 summary and sent
  // with the WhatsApp message. Captured from the live canvas while it's mounted.
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const previewImgRef = useRef<string | null>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const [plan, setPlan] = useState<EngravingPlanId>(ENGRAVING_PLANS[0].id);
  const [customImage, setCustomImage] = useState<ProcessedImage | null>(null);
  const [textPlacement, setTextPlacement] = useState<Placement>(DEFAULT_TEXT_PLACEMENT);
  const [artPlacement, setArtPlacement] = useState<Placement>(DEFAULT_ART_PLACEMENT);
  // Placement mode: "edición en una cara" (rectángulo en la cara frontal) por
  // defecto. La disposición "Envolvente 360°" necesita el contorno completo,
  // así que al elegirla cambiamos automáticamente a edición libre (con aviso
  // en el toolbar de disposición) y volvemos a una cara al salir de ella.
  const isWrap360 = (textPlacement.layout ?? "auto") === "wrap360";
  const singleFace = !isWrap360;

  const [technique, setTechnique] = useState<TechniqueId>("laser");
  // Eufy (colour) is drinkware-with-coating only; everything else is laser-only.
  const canEufy = allowsColorPrint(materialId, activeMProduct);
  const effectiveTechnique: TechniqueId = canEufy ? technique : "laser";
  const activeTechnique = TECHNIQUES.find(t => t.id === effectiveTechnique) || TECHNIQUES[0];
  const [iconId, setIconId] = useState<string | null>(null);
  const selectedIcon = ENGRAVING_ICONS.find(i => i.id === iconId) ?? null;
  const [simpleKind, setSimpleKind] = useState<KindId>("text");
  // Controlled so we can move off the "Imagen" tab when it's hidden.
  const [drinkTab, setDrinkTab] = useState("color");

  const baseColor = COLORS.find(c => c.id === color) || COLORS[0];
  // El inoxidable natural no se pinta: gris acero fijo, ignora la paleta.
  const activeColorHex = isInox ? INOX_HEX : customHex ?? baseColor.hex;
  const activeColorName = isInox
    ? "Acero natural"
    : customHex ? `${baseColor.name} · ${customHex.toUpperCase()}` : baseColor.name;
  const activePlan = ENGRAVING_PLANS.find(p => p.id === plan) || ENGRAVING_PLANS[0];
  const MaterialGlyph = MATERIAL_ICON[material.icon] ?? Box;

  // ── Mobile wizard step model (derived from the product kind) ───────────────
  const wizardLabels = isDrinkware
    ? ["Producto", "Estilo", "Diseño", "Resumen"]
    : ["Producto", "Diseño"];
  const designStepIndex = isDrinkware ? 3 : 2;
  const isDesignStep = isMobile && mobileStep === designStepIndex;

  // Keep the step in range if the product kind changes the step count.
  React.useEffect(() => {
    setMobileStep(s => Math.min(s, wizardLabels.length));
  }, [wizardLabels.length]);

  // Hide the floating WhatsApp CTA while the customizer section is on screen on
  // mobile, so it never covers the editor controls or the "Personalizar" CTA.
  const sectionRef = useRef<HTMLElement>(null);
  const [customizerInView, setCustomizerInView] = useState(false);
  React.useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setCustomizerInView(e.isIntersecting), { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  React.useEffect(() => {
    document.body.classList.toggle("wa-fab-hidden", isMobile && customizerInView);
    return () => document.body.classList.remove("wa-fab-hidden");
  }, [isMobile, customizerInView]);

  // "Color" is not a tab on mobile (it's Step 2), so never leave it selected.
  React.useEffect(() => {
    if (isMobile && drinkTab === "color") setDrinkTab("text");
  }, [isMobile, drinkTab]);

  // ── Progressive plan inference ─────────────────────────────────────────────
  // Infer the plan from what was designed (logo/photo ⇒ logo, icon ⇒ drawing,
  // text only ⇒ names) and keep it in sync until the customer picks one by hand.
  const inferredPlanId: EngravingPlanId = customImage ? "logo" : iconId ? "drawing" : "names";
  React.useEffect(() => {
    if (!planTouched && isDrinkware && plan !== inferredPlanId) setPlan(inferredPlanId);
  }, [inferredPlanId, planTouched, isDrinkware, plan]);

  // Image upload is stainless-steel drinkware only. (Ya no lo condiciona el plan:
  // los planes/precios se quitaron del personalizador.)
  const allowsImage = canUploadImage;
  // Custom art shown on the 3D — a selected icon takes priority over an upload.
  const artUrl = selectedIcon
    ? iconToDataUrl(selectedIcon)
    : (allowsImage ? customImage?.svgDataUrl ?? null : null);
  const artImageSize: "none" | "small" | "large" = selectedIcon
    ? "large"
    : isDrinkware
      ? activePlan.imageSize
      : customImage
        ? "large"
        : "none";

  // ── Single-face ("una cara") geometry ──────────────────────────────────────
  // The mark specs feed the shared measurer so the pad, the clamp and the 3D
  // texture all agree on how big the text/art is in placement space.
  const textFontFamily = activeFont.style.fontFamily as string | undefined;
  const isColorPrint = effectiveTechnique === "eufy";
  const artNaturalW = selectedIcon ? 256 : customImage?.width ?? 0;
  const artNaturalH = selectedIcon ? 256 : customImage?.height ?? 0;

  // La fuente elegida, ¿ya está cargada? Las medidas (fitting, clamps, tope de
  // envolvente) usan measureText fuera del 3D: si se miden con la fuente
  // fallback quedan mal calculadas hasta la próxima edición. Cargarla acá y
  // "tickear" hace que todos los memos que miden se recalculen al estar lista.
  // Se pide con el mismo peso (900) con el que se graba/mide.
  const [fontTick, setFontTick] = useState(0);
  React.useEffect(() => {
    const fam = textFontFamily?.split(",")[0]?.trim().replace(/['"]/g, "");
    if (!fam || typeof document === "undefined" || !document.fonts?.load) return;
    let alive = true;
    document.fonts.load(`900 32px "${fam}"`).then(() => { if (alive) setFontTick(t => t + 1); }).catch(() => {});
    return () => { alive = false; };
  }, [textFontFamily]);

  const textSpec = React.useMemo<MarkSpec>(
    () => ({ kind: "text", text, fontFamily: textFontFamily, colorPrint: isColorPrint }),
    [text, textFontFamily, isColorPrint],
  );
  const artSpec = React.useMemo<MarkSpec>(
    () => ({ kind: "art", imageSize: artImageSize, artW: artNaturalW, artH: artNaturalH }),
    [artImageSize, artNaturalW, artNaturalH],
  );

  const textExtents = React.useMemo<MarkHalfExtents>(
    () => markHalfExtents(product, textSpec, textPlacement, singleFace),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, textSpec, textPlacement, singleFace, fontTick],
  );
  const artExtents = React.useMemo<MarkHalfExtents>(
    // El arte se edita siempre en una cara (la edición libre es solo del texto).
    () => markHalfExtents(product, artSpec, artPlacement, true),
    [product, artSpec, artPlacement],
  );

  // Full text layout (wrap + auto-shrink) so the UI can flag when the size was
  // trimmed to fit the front-face area.
  const textLayout = React.useMemo(
    () => computeFaceTextLayout(
      product,
      { text, fontFamily: textFontFamily, colorPrint: isColorPrint, orientation: textPlacement.orientation, align: textPlacement.align, layout: textPlacement.layout, lineHeight: textPlacement.lineHeight },
      textPlacement.scale,
      singleFace,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, text, textFontFamily, isColorPrint, textPlacement.orientation, textPlacement.align, textPlacement.layout, textPlacement.lineHeight, textPlacement.scale, singleFace, fontTick],
  );

  // ── "Envolvente 360°" — anti-encime ────────────────────────────────────────
  // Tope del slider de tamaño: la escala más grande con la que el texto todavía
  // completa la vuelta sin superponerse (con el margen de costura del 5%).
  const wrapMaxScale = React.useMemo(() => {
    if (!isWrap360 || !text) return TEXT_SCALE_MAX;
    const m = wrap360MaxScale({ text, fontFamily: textFontFamily, colorPrint: isColorPrint, lineHeight: textPlacement.lineHeight });
    return Math.max(TEXT_SCALE_MIN, Math.min(TEXT_SCALE_MAX, m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWrap360, text, textFontFamily, isColorPrint, textPlacement.lineHeight, fontTick]);

  // Si el texto creció (o cambió la fuente) y la escala actual ya no cabe en la
  // vuelta, bajarla al máximo permitido — el slider queda limitado a ese tope.
  React.useEffect(() => {
    if (!isWrap360) return;
    setTextPlacement(p => (p.scale > wrapMaxScale + 0.001 ? { ...p, scale: wrapMaxScale } : p));
  }, [isWrap360, wrapMaxScale]);

  // Bloqueo de caracteres extra: si ni en el tamaño mínimo legible el texto
  // completa la vuelta, no se aceptan más caracteres (sí borrar).
  const [wrapLimitHit, setWrapLimitHit] = useState(false);
  const handleEngravingText = React.useCallback((t: string) => {
    if (
      isWrap360 &&
      visibleTextLen(t) > visibleTextLen(text) &&
      !wrap360Fits({ text: t, fontFamily: textFontFamily, lineHeight: textPlacement.lineHeight })
    ) {
      setWrapLimitHit(true);
      return;
    }
    setWrapLimitHit(false);
    setText(t);
  }, [isWrap360, text, textFontFamily, textPlacement.lineHeight]);
  React.useEffect(() => {
    if (!isWrap360) setWrapLimitHit(false);
  }, [isWrap360]);

  // Mientras se escribe en esta disposición: rotación automática lenta para ver
  // el texto envolver la pieza en vivo, con el giro manual bloqueado. Al salir
  // del input vuelve el "Arrastre para girar" normal.
  const [textFieldFocused, setTextFieldFocused] = useState(false);
  const wrapSpin = isWrap360 && textFieldFocused && isDrinkware;

  // Shape of the editable rectangle (w/h), so the drag pad mirrors it.
  const faceAreaAspect = React.useMemo(() => {
    const m = bandMetrics(product, TEXTURE_W, TEXTURE_H);
    const AW = 2 * m.face.uHalfWidth * TEXTURE_W;
    const AH = m.face.vHeightFrac * (m.botPx - m.topPx);
    return AH > 0 ? AW / AH : 1;
  }, [product]);

  // Nearest valid placement inside the front-face rectangle for a given mark.
  const clampTextP = React.useCallback(
    (p: Placement) => clampPlacementToFrontArea(p, markHalfExtents(product, textSpec, p, true), product),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, textSpec, fontTick],
  );
  const clampArtP = React.useCallback(
    (p: Placement) => clampPlacementToFrontArea(p, markHalfExtents(product, artSpec, p, true), product),
    [product, artSpec],
  );

  // Setters that keep placements inside the rectangle while in single-face mode.
  // Flat blanks skip it: their face renderer clamps against the real face edges.
  // El arte (ícono/imagen) se clampa SIEMPRE: la edición libre del Envolvente
  // 360° aplica únicamente al texto.
  const applyTextPlacement = (next: Placement) => setTextPlacement(singleFace && !is3DObject ? clampTextP(next) : next);
  const applyArtPlacement = (next: Placement) => setArtPlacement(!is3DObject ? clampArtP(next) : next);

  // Re-clamp when growing the mark or the product changes could push the box out
  // of bounds (typing a longer name, a bigger plan image, switching size, …).
  React.useEffect(() => {
    if (singleFace && !is3DObject) setTextPlacement(p => clampTextP(p));
  }, [singleFace, is3DObject, clampTextP]);
  React.useEffect(() => {
    if (!is3DObject) setArtPlacement(p => clampArtP(p));
  }, [is3DObject, clampArtP]);

  // ── Design drag / nudge (posicionamiento sobre el 3D) ───────────────────────
  // Which mark a drag-on-3D gesture or the floating d-pad moves: follow the open
  // editor tab, then fall back to whatever design actually exists.
  const hasText = !!text;
  const hasArt = !!artUrl && artImageSize !== "none";
  const activeDesignKind: "text" | "art" | null =
    drinkTab === "text" ? (hasText ? "text" : hasArt ? "art" : null)
    : (drinkTab === "icons" || drinkTab === "media") ? (hasArt ? "art" : hasText ? "text" : null)
    : hasText ? "text" : hasArt ? "art" : null;
  const designActive = activeDesignKind !== null;

  // Modo de edición vigente sobre el visor 3D. La "edición libre" del
  // Envolvente 360° es exclusiva del texto: al pasar a Íconos o Imagen (arte
  // activo) volvemos al rectángulo de una cara para poder arrastrar el ícono o
  // la foto, aunque el texto siga envolviendo el producto.
  const editSingleFace = activeDesignKind === "art" ? true : singleFace;

  // Dashed front-face guides appear ONLY while the design is being moved — a drag
  // holds them on; a nudge/center tap flashes them briefly.
  const [guidesActive, setGuidesActive] = useState(false);
  const guidesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashGuides = React.useCallback(() => {
    setGuidesActive(true);
    if (guidesTimer.current) clearTimeout(guidesTimer.current);
    guidesTimer.current = setTimeout(() => setGuidesActive(false), 1100);
  }, []);
  const beginDesignDrag = React.useCallback(() => {
    if (guidesTimer.current) { clearTimeout(guidesTimer.current); guidesTimer.current = null; }
    setGuidesActive(true);
  }, []);
  const endDesignDrag = React.useCallback(() => { flashGuides(); }, [flashGuides]);

  // Move the active mark by a delta in pad space (0..1 across the front-face
  // rectangle). Shared by the drag-on-3D and the floating d-pad. In single-face
  // the delta walks the pad and re-clamps into the rectangle; in free mode it
  // applies straight to u/v (u wraps around the body).
  const moveActivePlacement = React.useCallback((dPadX: number, dPadY: number) => {
    // `sf`: modo una-cara del elemento que se mueve — el texto según su
    // disposición, el arte siempre.
    const apply = (p: Placement, clampFn: (q: Placement) => Placement, sf: boolean): Placement => {
      // Flat blanks (billetera, tabla, caja…): the whole face is the canvas, so
      // u/v walk it edge to edge — corners included. The face renderer
      // (drawPlaced in engraving-face.ts) already stops the mark's bounding box
      // at the face border, so no product-specific clamp is needed here. The
      // termo front-area clamp below would confine the mark to a small central
      // window that doesn't exist on these products.
      if (is3DObject) {
        return { ...p, u: clamp01(p.u + dPadX), v: clamp01(p.v + dPadY) };
      }
      if (sf) {
        const pad = placementToPad(p.u, p.v, product);
        const np = padToPlacement(
          Math.max(0, Math.min(1, pad.padX + dPadX)),
          Math.max(0, Math.min(1, pad.padY + dPadY)),
          product,
        );
        return clampFn({ ...p, u: np.u, v: np.v });
      }
      let u = p.u + dPadX; u -= Math.floor(u);
      const v = Math.max(0, Math.min(1, p.v + dPadY));
      return { ...p, u, v };
    };
    if (activeDesignKind === "text") setTextPlacement(p => apply(p, clampTextP, singleFace));
    else if (activeDesignKind === "art") setArtPlacement(p => apply(p, clampArtP, true));
  }, [singleFace, is3DObject, product, activeDesignKind, clampTextP, clampArtP]);

  const centerActivePlacement = React.useCallback(() => {
    // Face centre for flat blanks; centre of the front-face rectangle (same
    // u, product-tuned v centre, run through the clamp) for drinkware.
    const c = is3DObject ? { u: 0.5, v: 0.5 } : padToPlacement(0.5, 0.5, product);
    const clampT = is3DObject ? (p: Placement) => p : clampTextP;
    const clampA = is3DObject ? (p: Placement) => p : clampArtP;
    if (activeDesignKind === "text") setTextPlacement(p => clampT({ ...p, u: c.u, v: c.v }));
    else if (activeDesignKind === "art") setArtPlacement(p => clampA({ ...p, u: c.u, v: c.v }));
    flashGuides();
  }, [is3DObject, product, activeDesignKind, clampTextP, clampArtP, flashGuides]);

  // Drag delta (fraction of the canvas) → pad delta. The front face fills roughly
  // the middle half of the canvas, so a gain just under 2 tracks the finger.
  const onDesignMove = React.useCallback((dxFrac: number, dyFrac: number) => {
    moveActivePlacement(dxFrac * 1.7, dyFrac * 1.5);
  }, [moveActivePlacement]);

  const NUDGE_STEP = 0.06;

  // ── Snap-to-design para la captura ──────────────────────────────────────────
  // El visor grande registra acá una función que gira la pieza para que un u de
  // textura quede mirando a cámara. Antes de capturar la imagen del resumen la
  // usamos para que el área personalizada salga completa en la foto.
  const thermosSnapRef = useRef<((u: number) => void) | null>(null);

  // u que debe quedar de frente: el centro de la cara frontal en "una cara", o
  // la posición real del texto cuando el modo de edición vigente es libre (el
  // arte se edita siempre en la cara frontal).
  const designFaceU = editSingleFace
    ? FRONT_FACE.uCenter
    : activeDesignKind === "text" ? textPlacement.u
    : FRONT_FACE.uCenter;

  // ── Preview capture ─────────────────────────────────────────────────────────
  // Grab a PNG of the live 3D canvas (preserveDrawingBuffer keeps the last frame
  // readable). Returns null if the canvas isn't mounted (e.g. mobile Step 4).
  const capturePreview = React.useCallback((): string | null => {
    const canvas = previewPanelRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return null;
    try {
      const sw = canvas.width, sh = canvas.height;
      if (!sw || !sh) return null;
      // Upscale the captured frame so the longest side reaches ~1600px (never
      // downscale below native). With the canvas rendering at dpr ≥1.5 the
      // buffer is already large, so the upscale factor stays small and the
      // downloaded image keeps real detail. (The WhatsApp upload derives a
      // lighter ~1080px JPEG from this via dataUrlToJpeg.)
      const TARGET = 1600;
      const factor = Math.max(1, TARGET / Math.max(sw, sh));
      const ow = Math.round(sw * factor);
      const oh = Math.round(sh * factor);
      const off = document.createElement("canvas");
      off.width = ow; off.height = oh;
      const ctx = off.getContext("2d");
      if (!ctx) {
        const raw = canvas.toDataURL("image/png");
        return raw.startsWith("data:image/png") ? raw : null;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(canvas, 0, 0, ow, oh);
      const url = off.toDataURL("image/png");
      return url.startsWith("data:image/png") ? url : null;
    } catch {
      return null;
    }
  }, []);

  // Refresh the stored snapshot ~500ms after the design settles, while the canvas
  // is still on screen (design step / desktop). On mobile the canvas unmounts at
  // Step 4, so this keeps the last good frame captured during Step 3.
  React.useEffect(() => {
    const t = setTimeout(() => {
      const img = capturePreview();
      if (img) { setPreviewImg(img); previewImgRef.current = img; }
    }, 500);
    return () => clearTimeout(t);
  }, [
    capturePreview, isDrinkware, is3DObject, productId, size, activeColorHex,
    finish, text, font, iconId, artUrl, textColor, effectiveTechnique, isGlass,
    singleFace, textPlacement, artPlacement, mobileStep, isMobile,
  ]);

  const handleSelectColor = (id: string) => {
    setColor(id);
    setCustomHex(null);
  };

  const handleSelectMaterial = (id: MaterialId) => {
    setMaterialId(id);
    // La captura anterior pertenece a otro producto: nunca ofrecer descargarla.
    setPreviewImg(null);
    previewImgRef.current = null;
    const m = getMaterial(id);
    const first = m.products[0];
    setMaterialProductId(first?.id ?? "");
    if (first?.drinkwareProductId) {
      const dp = getProduct(first.drinkwareProductId);
      setSize(dp.sizes[1]?.id ?? dp.sizes[0].id);
    }
    // Subir imagen es exclusivo del drinkware de acero (pintado o inox): al
    // salir limpiamos la carga, el plan y la pestaña Imagen si estaba activa.
    if (id !== "acero" && id !== "inox") {
      setCustomImage(null);
      setPlan(ENGRAVING_PLANS[0].id);
      setDrinkTab(t => (t === "media" ? "color" : t));
    }
    // Acabado/color coherentes con el material. Todo producto arranca en Mate
    // por defecto; cuero, cristal e inox fijan su propio acabado.
    if (id === "cuero") {
      setFinish("cuero");
      handleSelectColor("c6"); // Café Chocolate
    } else if (id === "cristal") {
      setFinish("glossy");
      handleSelectColor("c8"); // Blanco Perla
    } else if (id === "inox") {
      setFinish("inox"); // acero natural cepillado, sin pintura
    } else {
      setFinish("matte");
    }
  };

  const handleSelectMaterialProduct = (id: string) => {
    setMaterialProductId(id);
    // Ídem: la captura del producto anterior deja de ser válida.
    setPreviewImg(null);
    previewImgRef.current = null;
    const mp = material.products.find(p => p.id === id);
    if (mp?.drinkwareProductId) {
      const dp = getProduct(mp.drinkwareProductId);
      setSize(dp.sizes[1]?.id ?? dp.sizes[0].id);
    }
  };

  const handleSelectPlan = (id: EngravingPlanId) => {
    setPlanTouched(true);
    setPlan(id);
    const nextPlan = ENGRAVING_PLANS.find(p => p.id === id);
    if (!nextPlan?.allowsImage) setCustomImage(null);
  };

  // Icon and uploaded image are mutually exclusive engraved art.
  const handlePickIcon = (id: string | null) => {
    setIconId(id);
    if (id) setCustomImage(null);
  };
  const handleUploadImage = (img: ProcessedImage | null) => {
    const isNew = !!img && img.svgDataUrl !== customImage?.svgDataUrl && img.svgDataUrl !== customImage?.other?.svgDataUrl;
    setCustomImage(img);
    if (img) {
      setIconId(null);
      // Images size by plan (no size slider), so drop any leftover icon scale.
      // Swapping cut-out/original keeps the placement the customer already set.
      if (isNew) setArtPlacement(p => ({ ...p, scale: 1 }));
      // Toda imagen subida (archivo o URL, chica o grande) se muestra a todo
      // color: la técnica pasa a impresión UV por defecto. El cliente puede
      // volver a láser a mano si lo prefiere.
      if (canEufy) setTechnique("eufy");
    }
  };

  // Solo el TIPO de producto (Termo, Chopera, Copa…), sin tamaño ni material.
  // Compartidos por el resumen visual, el mensaje de WhatsApp y el POST del
  // pedido — una única fuente, cero lógica duplicada.
  const orderProductName = isDrinkware
    ? product.singular
    : material.pens ? "Bolígrafo" : (activeMProduct?.name ?? activeObject?.singular ?? material.name);
  const orderTechniqueName = isDrinkware
    ? activeTechnique.name
    : materialId === "plastico" ? "Plotter de corte" : "Grabado láser";

  /** Campos del pedido — ÚNICA fuente de datos del "Resumen de tu
   *  personalización" (Paso 4) y del mensaje de WhatsApp. Campos sin dato se
   *  omiten por completo (nunca "Texto: —"). */
  const orderFields = (): [string, string][] => {
    const rows: [string, string][] = [
      ["Producto", orderProductName],
      ["Técnica", orderTechniqueName],
    ];
    const trimmedText = text.trim();
    if (trimmedText) rows.push(["Texto", `${trimmedText} (${activeFont.name})`]);
    if (selectedIcon) rows.push(["Ícono", selectedIcon.name]);
    else if (customImage) rows.push(["Logo/foto adjunta", "Sí"]);
    return rows;
  };

  /** Cuerpo del POST /api/orders: los mismos datos del resumen más el snapshot
   *  completo del diseño (suficiente para reabrirlo/reproducirlo después). */
  const orderPayload = (previewImage: string | null): CreateOrderRequest => {
    const trimmedText = text.trim();
    const colorLabel = isGlass
      ? "Cristal transparente"
      : (isDrinkware || activeObject?.colorable)
        ? `${activeColorName} (${activeColorHex})`
        : undefined;
    return {
      product: orderProductName,
      material: material.name,
      color: colorLabel,
      technique: orderTechniqueName,
      customText: trimmedText || undefined,
      font: trimmedText ? activeFont.name : undefined,
      // El color de texto solo aplica en impresión UV (láser es monocromático).
      textColor: trimmedText && effectiveTechnique === "eufy" ? textColor : undefined,
      iconName: selectedIcon?.name,
      hasUploadedImage: !!customImage,
      designState: {
        materialId,
        materialProductId,
        productId,
        sizeId: size,
        colorId: color,
        customHex,
        colorHex: activeColorHex,
        finish,
        technique: effectiveTechnique,
        plan,
        text,
        fontId: font,
        textColor,
        iconId,
        hasCustomImage: !!customImage,
        simpleKind,
        textPlacement,
        artPlacement,
      },
      previewImage: previewImage ?? undefined,
    };
  };

  /** Mensaje de WhatsApp — sale de orderFields(), la misma fuente que el
   *  resumen visual. Con pedido creado suma el número y la URL del diseño. */
  const buildOrderMessage = (orderNumber: string | null, imageUrl: string | null): string => {
    const parts = ["¡Hola! Acabo de armar mi pedido personalizado y quiero coordinarlo con ustedes."];
    if (orderNumber) parts.push(`Pedido: ${orderNumber}`);
    parts.push(...orderFields().map(([k, v]) => `${k}: ${v}`));
    if (imageUrl) parts.push(`Así quedó mi diseño:\n${imageUrl}`);
    // Renglón en blanco entre datos para que WhatsApp lo muestre ordenado.
    return parts.join("\n\n");
  };

  /** Máximo que esperamos al backend de pedidos. Pasado esto, el mensaje sale
   *  igual por WhatsApp sin número de pedido ni URL de imagen: el cliente
   *  SIEMPRE llega a WhatsApp aunque el backend esté caído. */
  const ORDER_TIMEOUT_MS = 8000;

  /** Captura el diseño de frente, crea el pedido (POST /api/orders con specs +
   *  imagen) y abre WhatsApp con el número de pedido y la URL permanente del
   *  preview. Si el POST falla o tarda de más, fallback: mensaje solo con las
   *  especificaciones, más un aviso sutil y el botón "Descargar imagen". */
  const handleOrder = async () => {
    if (isOrdered || isPreparing) return;
    setIsPreparing(true);
    setOrderFallback(false);
    setLastOrderNumber(null);

    // La pestaña debe abrirse sincrónica al click (si no, el bloqueador de
    // pop-ups la mata); la URL de WhatsApp se asigna cuando el pedido está
    // listo. Mientras tanto muestra un texto de espera.
    const win = window.open("", "_blank");
    if (win) {
      try {
        win.document.write(
          '<title>Creando tu pedido…</title><body style="margin:0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#5f574d">Creando tu pedido…</body>'
        );
      } catch { /* pestaña en blanco un instante; nada que hacer */ }
    }

    try {
      // Girar el área personalizada de frente y esperar el repintado, para que
      // la captura muestre el diseño completo.
      thermosSnapRef.current?.(designFaceU);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Captura nítida para el resumen/descarga; al server viaja re-encodeada
      // a JPEG ~1080px (mucho más liviana que el PNG: sube rápido y queda
      // holgada bajo el límite de 3MB del endpoint).
      const full = capturePreview() ?? previewImgRef.current;
      if (full) { setPreviewImg(full); previewImgRef.current = full; }
      const jpeg = full ? await dataUrlToJpeg(full, 1080) : null;

      let orderNumber: string | null = null;
      let imageUrl: string | null = null;
      try {
        const created = await Promise.race([
          createOrderAsync({ data: orderPayload(jpeg) }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("order timeout")), ORDER_TIMEOUT_MS),
          ),
        ]);
        orderNumber = created.orderNumber;
        imageUrl = created.previewImageUrl ?? null;
      } catch {
        // Backend caído o lento: aviso sutil y el mensaje sale solo con specs.
        setOrderFallback(true);
      }

      setLastOrderNumber(orderNumber);
      const url = whatsappUrl(buildOrderMessage(orderNumber, imageUrl));
      if (win && !win.closed) win.location.replace(url);
      else window.open(url, "_blank", "noopener");

      setIsOrdered(true);
      setTimeout(() => setIsOrdered(false), 5000);
    } finally {
      setIsPreparing(false);
    }
  };

  // Precios viven únicamente en la sección "Tarifas"; el CTA del personalizador
  // nunca muestra montos.
  const ctaLabel = "Continuar por WhatsApp";

  // Tabs shown in the modelled-blank panel: Color only if tintable, Imagen only
  // on stainless steel.
  const objectTabs: { key: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "text", label: "Texto", Icon: Type },
    ...(activeObject?.colorable ? [{ key: "color", label: "Color", Icon: Palette }] : []),
    { key: "icons", label: "Íconos", Icon: Shapes },
    ...(canUploadImage ? [{ key: "media", label: "Imagen", Icon: ImageIcon }] : []),
  ];

  // ── Extracted drinkware controls ───────────────────────────────────────────
  // Colour, technique and the plan+order summary are pulled out so both the
  // desktop editor and the mobile wizard steps compose the very same markup —
  // no control is ever duplicated.
  const renderDrinkColor = () => isGlass ? (
    // Glass comes in one finish only: clear. No colour picker, no finish grid.
    <div>
      <Label className="text-sm font-medium text-foreground mb-3 block">Material</Label>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
        <span className="w-8 h-8 rounded-full border border-border bg-gradient-to-br from-white via-secondary to-white shadow-inner shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Cristal transparente</p>
          <p className="text-xs text-muted-foreground">El grabado se ve esmerilado sobre el vidrio.</p>
        </div>
      </div>
    </div>
  ) : isInox ? (
    // El inoxidable natural no se pinta: en lugar de la paleta y el "Tono
    // exacto" se muestra el único acabado disponible, ya seleccionado.
    <div>
      <Label className="text-sm font-medium text-foreground mb-3 block">
        Acabado {productArticle(product.singular)} {product.singular.toLowerCase()}
      </Label>
      <div className="flex items-center gap-3 rounded-xl border border-primary ring-1 ring-primary/30 bg-[#f5eaec]/50 px-4 py-3">
        <span
          className="w-8 h-8 rounded-full border border-border shadow-inner shrink-0"
          style={{ background: "linear-gradient(135deg, #eef0f2 0%, #c7c9cc 45%, #9ea3a8 100%)" }}
        />
        <div>
          <p className="text-sm font-semibold text-foreground">Acero natural cepillado</p>
          <p className="text-xs text-muted-foreground">
            Este material va en su acabado natural, sin pintura. El grabado láser se ve en tono
            oscuro sobre el metal claro.
          </p>
        </div>
      </div>
    </div>
  ) : (
    <>
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Color base {productArticle(product.singular)} {product.singular.toLowerCase()}
        </Label>
        <div className="grid grid-cols-6 md:grid-cols-6 gap-3">
          {COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelectColor(c.id)}
              title={c.name}
              className={`group relative aspect-square rounded-full overflow-hidden transition-all hover:scale-105 focus:outline-none ring-offset-2 ${
                color === c.id && !customHex ? 'ring-2 ring-primary' : 'ring-0'
              }`}
            >
              <div className="absolute inset-0" style={{ backgroundColor: c.hex }} />
              {color === c.id && !customHex && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check className="text-white w-5 h-5 drop-shadow" />
                </div>
              )}
            </button>
          ))}
        </div>
        {activeColorName && (
          <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeColorHex }} />
            {activeColorName}
          </p>
        )}
      </div>

      {/* Fine-tune the exact tone within the selected colour family */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-baseline justify-between mb-1">
          <Label className="text-sm font-medium text-foreground">Tono exacto</Label>
          {customHex && (
            <button
              onClick={() => setCustomHex(null)}
              className="py-1.5 text-xs text-primary hover:underline active:underline"
            >
              Volver al tono original
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Cada color tiene variantes. Elija la que más le guste de la paleta, o marque el tono exacto con el selector.
        </p>
        <div className="flex items-center gap-3">
          <label
            className="relative shrink-0 w-11 h-11 rounded-xl overflow-hidden border border-border cursor-pointer hover:border-primary/40 transition-colors"
            title="Elegir un tono exacto"
          >
            <span className="absolute inset-0" style={{ backgroundColor: activeColorHex }} />
            <span className="absolute inset-0 flex items-center justify-center">
              <Pipette className="w-4 h-4 text-white mix-blend-difference" />
            </span>
            <input
              type="color"
              value={activeColorHex}
              onChange={e => setCustomHex(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Selector de color personalizado"
            />
          </label>

          <div className="grid grid-cols-7 gap-2 flex-1">
            {TONE_STEPS.map(step => {
              const hex = shadeHex(baseColor.hex, step);
              const selected = customHex?.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={step}
                  onClick={() => setCustomHex(hex)}
                  title={hex.toUpperCase()}
                  className={`relative aspect-square rounded-lg overflow-hidden transition-all hover:scale-105 ring-offset-2 ${
                    selected ? 'ring-2 ring-primary' : 'ring-0'
                  }`}
                >
                  <span className="absolute inset-0" style={{ backgroundColor: hex }} />
                  {selected && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Check className="text-white w-3.5 h-3.5 drop-shadow" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  const renderDrinkTechnique = () => (
    <div>
      <Label className="text-sm font-medium mb-2 block">Técnica de grabado</Label>
      {canEufy ? (
        <>
          <TechniqueSelector value={effectiveTechnique} onChange={setTechnique} />
          {effectiveTechnique === "eufy" && (
            <p className="text-xs text-muted-foreground mt-2">
              La impresión UV a todo color se cotiza por WhatsApp según el diseño.
            </p>
          )}
        </>
      ) : (
        <div className="flex items-start gap-2 p-3 border rounded-xl border-border bg-secondary/40">
          <Zap className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold">Grabado láser</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Este producto solo admite grabado láser monocromático. La impresión UV a color
              está reservada al drinkware de acero con pintura electrostática.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // Bloque de acciones compartido por TODOS los productos: CTA de WhatsApp +
  // "Descargar imagen" debajo (cuando hay una captura del diseño disponible).
  const renderOrderActions = () => (
    <>
      <Button
        onClick={handleOrder}
        disabled={isOrdered || isPreparing}
        size="lg"
        className="w-full h-auto min-h-12 py-2.5 text-sm sm:text-base font-semibold leading-tight whitespace-normal bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
      >
        {isPreparing ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Creando tu pedido...</>
        ) : isOrdered ? (
          lastOrderNumber ? `Pedido ${lastOrderNumber} creado ✓` : "Abriendo WhatsApp..."
        ) : ctaLabel}
      </Button>

      {/* Aviso sutil cuando el backend no respondió: el pedido salió igual por
          WhatsApp, solo que sin número ni imagen. */}
      {orderFallback && (
        <p className="text-xs text-amber-700 text-center leading-relaxed">
          No pudimos registrar tu pedido online, pero tus especificaciones salen
          igual por WhatsApp. Si querés, descargá la imagen y sumala al chat.
        </p>
      )}

      {previewImg && (
        <button
          type="button"
          onClick={() => downloadDataUrl(previewImg, "mi-diseno.png")}
          className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <Download className="w-4 h-4" /> Descargar imagen
        </button>
      )}

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Te abrimos WhatsApp para seguir con tu pedido. Si querés, descargá la imagen de tu diseño
        y sumala al chat.
      </p>
    </>
  );

  // Mini-preview 3D pegajoso del wizard móvil (Paso 1 y Paso 2 "Estilo"): una
  // vista compacta del producto elegido que se actualiza en vivo. Los pasos del
  // wizard son mutuamente excluyentes, así que nunca hay dos canvas WebGL
  // montados a la vez (este o el grande del paso de Diseño, jamás ambos).
  const renderMiniPreview = () => (
    <div className="sticky top-0 z-30">
      <div className="relative bg-secondary/30 rounded-2xl border border-border overflow-hidden shadow-lg shadow-black/5">
        {isGlass ? (
          <div className="absolute inset-0 rounded-2xl" style={{ background: "radial-gradient(circle at 50% 38%, #eef2f6 0%, #d3dae2 55%, #aeb8c4 100%)" }} />
        ) : (
          <div className="absolute inset-0 opacity-[0.07] transition-colors duration-500 rounded-2xl" style={{ backgroundColor: isDrinkware ? activeColorHex : "#C1121F" }} />
        )}
        <div className="relative z-10" style={{ height: "32vh", minHeight: 210, maxHeight: 320 }}>
          {isDrinkware ? (
            <Thermos3D
              colorHex={activeColorHex}
              finish={finish}
              text={text}
              fontClass=""
              fontStyle={activeFont.style}
              productId={productId}
              sizeId={size}
              customImageUrl={artUrl}
              imageSize={artImageSize}
              textPlacement={textPlacement}
              artPlacement={artPlacement}
              colorPrint={effectiveTechnique === "eufy"}
              textColor={textColor}
              engraveStyle={drinkwareEngraveStyle}
              singleFace={singleFace}
              showGuides={false}
              frontFaceU={FRONT_FACE.uCenter}
              glass={isGlass}
            />
          ) : is3DObject && activeObject ? (
            <Object3D
              objectId={activeObject.id}
              colorHex={activeObject.colorable ? activeColorHex : undefined}
              text={text}
              fontStyle={activeFont.style}
              customImageUrl={artUrl}
              imageSize={artImageSize}
              textPlacement={textPlacement}
              artPlacement={artPlacement}
            />
          ) : null}
          {(isDrinkware || (is3DObject && activeObject)) && <RotateHintChip />}
          {!isDrinkware && !(is3DObject && activeObject) && (
            // Sin modelo 3D: tarjeta referencial con el glifo del material.
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-white border border-border flex items-center justify-center text-primary shadow-sm">
                <MaterialGlyph className="w-10 h-10" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {material.pens ? "Bolígrafos" : activeMProduct?.name}
                </p>
                <p className="text-xs text-muted-foreground">{material.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-1">
        {isDrinkware || is3DObject ? "Vista en vivo · arrastre para girar" : "Vista previa referencial"}
      </p>
    </div>
  );

  // Paso 4 — Resumen: imagen del diseño + detalle legible + envío por WhatsApp.
  // (Sin planes ni precios: eso vive en la sección "Tarifas".) Los campos salen
  // de orderFields(), la misma fuente que arma el mensaje de WhatsApp.
  const renderDrinkSummary = () => (
    <div className="space-y-4">
      {/* Imagen de vista previa del diseño final, capturada del 3D. */}
      {previewImg && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Vista de tu diseño</Label>
          <div className="rounded-xl border border-border bg-secondary/30 p-2 flex justify-center">
            <img src={previewImg} alt="Vista del diseño final" className="max-h-64 w-auto object-contain" />
          </div>
        </div>
      )}

      {/* Resumen legible de la personalización. */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Resumen de tu personalización</Label>
        <dl className="rounded-xl border border-border divide-y divide-border overflow-hidden text-sm bg-white">
          {orderFields().map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 px-3 py-2">
              <dt className="text-muted-foreground shrink-0">{k}</dt>
              <dd className="font-medium text-foreground text-right break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {renderOrderActions()}
    </div>
  );

  return (
    <section ref={sectionRef} className="py-12 md:py-16 px-4 sm:px-6 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto">
        {/* Header — compact on mobile (the long copy is desktop-only). */}
        <div className="mb-6 md:mb-10">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[#8B1A2F] text-[11px] font-semibold uppercase tracking-[0.3em]">
              El personalizador
            </p>
            {/* Subtle replay of the onboarding demo (customizer-tutorial.tsx
                listens for this event; works even after "No volver a mostrar"). */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("tuto:abrir"))}
              className="inline-flex items-center gap-1.5 min-h-11 py-2 text-xs text-muted-foreground hover:text-primary active:text-primary transition-colors shrink-0"
            >
              <CirclePlay className="w-4 h-4" />
              <span className="underline underline-offset-4 decoration-border hover:decoration-current">
                Ver cómo funciona
              </span>
            </button>
          </div>
          <h2 className="font-serif font-light text-3xl md:text-5xl text-[#1A1614] mb-4 leading-[1.1]">
            Cree su pieza
          </h2>
          <p className="hidden md:block text-[#5f574d] font-light text-lg max-w-xl leading-relaxed">
            Elija el material, luego el producto, y refínelo a su gusto. El diseño final lo coordinamos
            con usted por WhatsApp.
          </p>
        </div>

        {isMobile && <WizardProgress step={mobileStep} labels={wizardLabels} />}

        {/* Desktop: material + product as the original card grids. On mobile these
            are replaced by the Step 1 chip pickers below. */}
        {!isMobile && (
        <>
        {/* STEP 1 — MATERIAL */}
        <div className="mb-8">
          <Label className="text-sm font-medium text-foreground mb-3 block">1 · Tipo de material</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {MATERIALS.map(m => {
              const Icon = MATERIAL_ICON[m.icon] ?? Box;
              const active = materialId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMaterial(m.id)}
                  title={m.desc}
                  className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${active ? activeCard : idleCard}`}
                >
                  <Icon className="w-7 h-7" />
                  <span className="font-medium text-sm text-center leading-tight">{m.name}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{material.desc}</p>
        </div>

        {/* STEP 2 — PRODUCT (or pen-source toggle) */}
        <div className="mb-10">
          <Label className="text-sm font-medium text-foreground mb-3 block">
            2 · {material.pens ? "Bolígrafo" : `Producto en ${material.name.toLowerCase()}`}
          </Label>

          {material.pens ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className={`p-3 border rounded-xl flex flex-col items-center justify-end gap-2 ${activeCard}`}>
                <span className="h-16 flex items-center justify-center">
                  <PenLine className="w-9 h-9" />
                </span>
                <span className="font-medium text-sm text-center leading-tight">Bolígrafo</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {material.products.map(p => {
                const active = materialProductId === p.id;
                const dp = p.drinkwareProductId ? getProduct(p.drinkwareProductId) : null;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectMaterialProduct(p.id)}
                    title={p.desc}
                    className={`p-3 border rounded-xl flex flex-col items-center justify-end gap-2 transition-all ${active ? activeCard : idleCard}`}
                  >
                    {dp ? (
                      <ProductGlyph product={dp} className="h-16 w-full" />
                    ) : (
                      <span className="h-16 flex items-center justify-center">
                        <MaterialGlyph className="w-9 h-9" />
                      </span>
                    )}
                    <span className="font-medium text-sm text-center leading-tight">{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          {!material.pens && activeMProduct?.desc && (
            <p className="text-xs text-muted-foreground mt-3">{activeMProduct.desc}</p>
          )}
        </div>
        </>
        )}

        {/* Mobile Step 1 — Producto: material + product as scrollable chips. */}
        {isMobile && mobileStep === 1 && (
          <motion.div key="wiz-1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-6 pb-28">
            {/* Vista 3D en vivo del producto elegido — se actualiza al cambiar
                material/producto, así se ve qué se está eligiendo. */}
            {renderMiniPreview()}
            <div className="space-y-8">
              <MaterialChips materials={MATERIALS} value={materialId} onChange={handleSelectMaterial} />
              <ProductChips material={material} value={materialProductId} onChange={handleSelectMaterialProduct} />
              {material.desc && <p className="text-xs text-muted-foreground">{material.desc}</p>}
            </div>
          </motion.div>
        )}

        {/* Mobile Step 2 — Color base del producto (drinkware only). La técnica de
            grabado vive ahora en el Paso 3, bajo "Texto Personalizado". */}
        {isMobile && isDrinkware && mobileStep === 2 && (
          <motion.div key="wiz-2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-5 pb-28">
            {/* Live mini-preview — the same compact, sticky 3D as Step 1, updating
                as the colour changes. Only ONE 3D canvas is ever mounted at a time
                (the wizard steps are exclusive), so no second renderer. */}
            {renderMiniPreview()}
            {renderDrinkColor()}
          </motion.div>
        )}

        {/* Design step — 3D preview + editor. Step 3 on drinkware, Step 2 otherwise. */}
        {(!isMobile || mobileStep === designStepIndex) && (
        <div className={isMobile ? "pb-28" : undefined}>
        {/* STEP 3 — CUSTOMIZE */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 lg:items-start">

          {/* PREVIEW AREA */}
          {/* On mobile the preview wrapper is sticky within the tall flex column,
              so the live 3D stays pinned at the top while the editor scrolls
              beneath it — same single canvas, no second WebGL context. */}
          <div className="w-full min-w-0 lg:col-span-4 relative max-lg:sticky max-lg:top-0 max-lg:z-30 lg:self-start">
            <div ref={previewPanelRef} className="lg:sticky lg:top-24 z-20 bg-secondary/30 rounded-2xl border border-border flex flex-col items-center gap-4 overflow-hidden min-h-[280px] md:min-h-[520px] max-lg:shadow-lg max-lg:shadow-black/5">
              {isGlass ? (
                // Glass needs an environment to reflect and a graded backdrop to
                // read against — on flat white the transparency disappears. A soft
                // pearl→mid-grey radial keeps the silhouette legible from any angle.
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: "radial-gradient(circle at 50% 38%, #eef2f6 0%, #d3dae2 55%, #aeb8c4 100%)" }}
                />
              ) : (
                <div
                  className="absolute inset-0 opacity-[0.07] transition-colors duration-500 rounded-2xl"
                  style={{ backgroundColor: isDrinkware ? activeColorHex : "#C1121F" }}
                />
              )}

              {isDrinkware ? (
                <div className="relative z-10 flex flex-col items-center gap-2 w-full h-full">
                  {/* 3D Canvas — taller for bigger sizes; compact on phones */}
                  <div className="relative w-full" style={{ height: (isMobile ? 300 : 480) + Math.round((activeSize.scale - 0.84) * (isMobile ? 110 : 200)) }}>
                    <Thermos3D
                      colorHex={activeColorHex}
                      finish={finish}
                      text={text}
                      fontClass=""
                      fontStyle={activeFont.style}
                      productId={productId}
                      sizeId={size}
                      customImageUrl={artUrl}
                      imageSize={artImageSize}
                      textPlacement={textPlacement}
                      artPlacement={artPlacement}
                      colorPrint={effectiveTechnique === "eufy"}
                      textColor={textColor}
                      engraveStyle={drinkwareEngraveStyle}
                      singleFace={singleFace}
                      editSingleFace={editSingleFace}
                      showGuides={guidesActive}
                      frontFaceU={FRONT_FACE.uCenter}
                      glass={isGlass}
                      designActive={designActive}
                      onDesignMove={onDesignMove}
                      onDesignDragStart={beginDesignDrag}
                      onDesignDragEnd={endDesignDrag}
                      snapToURef={thermosSnapRef}
                      autoSpin={wrapSpin}
                      rotationLocked={wrapSpin}
                    />
                    {/* Floating position control — over the visor, on the side that
                        least covers the piece (left for the termo, whose D-grip is on
                        the right). Only while a design is active. */}
                    {designActive && (
                      <DesignNudgeControl
                        side={product.handle === "body-d" || product.handle === "body-square" ? "left" : "right"}
                        onNudge={(dx, dy) => { moveActivePlacement(dx * NUDGE_STEP, dy * NUDGE_STEP); flashGuides(); }}
                        onCenter={centerActivePlacement}
                      />
                    )}
                    {!designActive && !wrapSpin && <RotateHintChip />}
                  </div>

                  <div className="flex items-center gap-3 -mt-1 mb-1">
                    <p className="text-xs text-muted-foreground">
                      {wrapSpin
                        ? "Girando para mostrar el texto envolvente…"
                        : designActive
                        ? (editSingleFace ? "Arrastre el diseño sobre el producto" : "Arrastre para girar")
                        : "Arrastre para girar"}
                    </p>
                  </div>

                  {/* Summary badges — hidden on mobile to keep the sticky preview compact. */}
                  <div className="hidden md:flex flex-wrap gap-2 justify-center px-4 pb-4">
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                      {product.singular}
                    </span>
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground flex items-center gap-1">
                      {isGlass ? (
                        <>
                          <span className="w-2 h-2 rounded-full inline-block border border-border bg-gradient-to-br from-white to-secondary" />
                          Cristal transparente
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: activeColorHex }} />
                          {activeColorName}
                        </>
                      )}
                    </span>
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                      {activeTechnique.name}
                    </span>
                  </div>
                </div>
              ) : is3DObject && activeObject ? (
                <div className="relative z-10 flex flex-col items-center gap-2 w-full h-full">
                  <div className="relative w-full" style={{ height: isMobile ? 300 : 460 }}>
                    <Object3D
                      objectId={activeObject.id}
                      colorHex={activeObject.colorable ? activeColorHex : undefined}
                      text={text}
                      fontStyle={activeFont.style}
                      customImageUrl={artUrl}
                      imageSize={artImageSize}
                      textPlacement={textPlacement}
                      artPlacement={artPlacement}
                      designActive={designActive}
                      onDesignMove={onDesignMove}
                      onDesignDragStart={beginDesignDrag}
                      onDesignDragEnd={endDesignDrag}
                    />
                    {designActive && (
                      <DesignNudgeControl
                        side="right"
                        onNudge={(dx, dy) => { moveActivePlacement(dx * NUDGE_STEP, dy * NUDGE_STEP); flashGuides(); }}
                        onCenter={centerActivePlacement}
                      />
                    )}
                    {!designActive && <RotateHintChip />}
                  </div>

                  <p className="text-xs text-muted-foreground -mt-1 mb-1">
                    {designActive ? "Arrastre el diseño sobre el producto" : "Arrastre para girar"}
                  </p>

                  <div className="flex flex-wrap gap-2 justify-center px-4 pb-4">
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                      {material.pens ? "Bolígrafo" : activeMProduct?.name ?? activeObject.singular}
                    </span>
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground flex items-center gap-1">
                      {materialId === "plastico" ? (
                        <><Scissors className="w-3 h-3" /> Plotter de corte</>
                      ) : (
                        <><Zap className="w-3 h-3" /> Grabado láser</>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center justify-center gap-4 w-full h-full min-h-[360px] md:min-h-[520px] p-8 text-center">
                  <div className="w-32 h-32 rounded-3xl bg-white border border-border flex items-center justify-center text-primary shadow-sm">
                    <MaterialGlyph className="w-16 h-16" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {material.pens ? "Bolígrafos" : activeMProduct?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{material.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                      {KINDS.find(k => k.id === simpleKind)?.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Vista previa referencial. El diseño final lo coordinamos con usted por WhatsApp antes de producir.
                  </p>
                </div>
              )}

              <AnimatePresence>
                {isOrdered && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 bg-[#1A1614]/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center rounded-2xl"
                  >
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                      className="w-16 h-16 rounded-full bg-[#8B1A2F] text-white flex items-center justify-center mb-6 ring-1 ring-white/20"
                    >
                      <Check className="w-8 h-8" strokeWidth={1.75} />
                    </motion.div>
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25, duration: 0.5 }}
                      className="font-serif font-light text-2xl md:text-3xl text-white mb-2"
                    >
                      Su pieza está lista.
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="text-sm text-white/60 font-light max-w-xs leading-relaxed"
                    >
                      Le abrimos WhatsApp para continuar con su pedido. Envíe el mensaje y coordinamos los detalles.
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* CONTROLS AREA */}
          <div className="w-full min-w-0 lg:col-span-8 bg-white rounded-2xl border border-border">
            {isDrinkware ? (
              <Tabs value={drinkTab} onValueChange={setDrinkTab} className="w-full">
                <div className="px-4 sm:px-6 pt-4 pb-1">
                  <TabsList className="w-full flex gap-1 bg-secondary/50 rounded-xl p-1 h-auto">
                    {/* On mobile "Color" moves to the Estilo step. All segments are
                        equal-width and always visible — no arrows, no scroll. */}
                    {!isMobile && (
                    <TabsTrigger value="color" className={SEG_TAB}>
                      <Palette className="w-4 h-4 shrink-0" /> <span className="truncate">Color</span>
                    </TabsTrigger>
                    )}
                    <TabsTrigger value="text" className={SEG_TAB}>
                      <Type className="w-4 h-4 shrink-0" /> <span className="truncate">Texto</span>
                    </TabsTrigger>
                    <TabsTrigger value="icons" className={SEG_TAB}>
                      <Shapes className="w-4 h-4 shrink-0" /> <span className="truncate">Íconos</span>
                    </TabsTrigger>
                    {canUploadImage && (
                      <TabsTrigger value="media" className={SEG_TAB}>
                        <ImageIcon className="w-4 h-4 shrink-0" /> <span className="truncate">Imagen</span>
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <div className="p-4 sm:p-5 min-h-[280px]">
                  {/* COLOR TAB (desktop editor; on mobile colour lives in Step 2 "Estilo") */}
                  {!isMobile && (
                  <TabsContent value="color" className="mt-0 space-y-5">
                    {renderDrinkColor()}
                  </TabsContent>
                  )}

                  {/* TEXT TAB */}
                  <TabsContent value="text" className="mt-0 space-y-5">
                    {/* BÁSICO — escribir, elegir técnica de grabado y orientación. */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-3 block">Texto Personalizado</Label>
                        <EngravingTextField
                          text={text}
                          onText={handleEngravingText}
                          layout={textPlacement.layout}
                          onFocusChange={setTextFieldFocused}
                          limitNotice={wrapLimitHit ? "El texto alcanzó el máximo para envolver el producto." : null}
                        />
                      </div>

                      {/* Técnica de grabado — global (afecta texto, ícono e imagen).
                          En impresión UV aparece el color del texto/diseño; en láser
                          el diseño queda monocromático. */}
                      {renderDrinkTechnique()}
                      {isColorPrint && (
                        <TextColorPicker value={textColor} onChange={setTextColor} />
                      )}

                      {/* Orientación del texto (al final de los controles de Texto). */}
                      <OrientationToggle
                        value={textPlacement.orientation}
                        onChange={(o) => applyTextPlacement({ ...textPlacement, orientation: o })}
                        verticalDisabledReason={isWrap360 ? "El texto envolvente 360° va en horizontal alrededor del cuerpo" : undefined}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground mb-3 block">Elija su tipografía</Label>
                      <FontCarousel fonts={FONTS} value={font} onChange={setFont} sampleText={text} />
                    </div>

                    <div>
                      <TextSizeSlider
                        scale={textPlacement.scale}
                        onScale={(s) => applyTextPlacement({ ...textPlacement, scale: s })}
                        maxScale={isWrap360 ? wrapMaxScale : undefined}
                      />
                      {textLayout.shrunk && (
                        <p className="text-xs text-primary/90 flex items-center gap-1.5 rounded-lg bg-[#f5eaec] border border-primary/20 px-3 py-2 mt-2">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          Tamaño ajustado automáticamente para que entre en el área.
                        </p>
                      )}
                    </div>

                    {/* AVANZADO — oculto hasta que se necesite. Los defaults (una cara,
                        centrado, automático, interlineado normal, horizontal) ya dan un
                        resultado lindo sin abrir esto. */}
                    <AdvancedOptions>
                      <div>
                        <TextDispositionToolbar placement={textPlacement} onChange={applyTextPlacement} />
                      </div>
                    </AdvancedOptions>
                  </TabsContent>

                  {/* ICONS TAB */}
                  <TabsContent value="icons" className="mt-0 space-y-5">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-1 block">Elija un ícono</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Sume un ícono a su {product.singular.toLowerCase()}. Toque de nuevo para quitarlo.
                      </p>
                      <IconPicker value={iconId} onChange={handlePickIcon} />
                    </div>

                    {/* Tamaño/orientación del ícono, sólo cuando hay uno elegido. */}
                    {selectedIcon && (
                    <AdvancedOptions>
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-1 block">Tamaño y orientación del ícono</Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Arrastrá el ícono sobre el {product.singular.toLowerCase()} para ubicarlo, o usá el control de posición del visor. Acá ajustás su tamaño.
                        </p>
                        <PlacementControls
                          value={artPlacement}
                          onChange={applyArtPlacement}
                          withSize
                          singleFace={singleFace}
                          frontExtents={artExtents}
                          areaAspect={faceAreaAspect}
                        />
                      </div>
                    </AdvancedOptions>
                    )}
                  </TabsContent>

                  {/* LOGO / PHOTO TAB — stainless steel only */}
                  {canUploadImage && (
                  <TabsContent value="media" className="mt-0 space-y-5">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-1 block">Logo o foto</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Suba su logo o su foto: se imprime a todo color (impresión UV) sobre el {product.singular.toLowerCase()}. Si tiene un fondo liso se lo quitamos automáticamente.
                      </p>

                      {activePlan.allowsImage ? (
                        <>
                          <ImageUpload
                            imageSize={activePlan.imageSize === "large" ? "large" : "small"}
                            value={customImage}
                            onChange={handleUploadImage}
                          />
                          <p className="text-xs text-muted-foreground mt-3">
                            Con el plan <span className="font-medium text-foreground">{activePlan.shortLabel}</span> la
                            imagen va en tamaño {activePlan.imageSize === "large" ? "grande (logo)" : "chico (dibujo)"}, ya definido por el plan.
                          </p>

                          {customImage && (
                            <div className="pt-4 mt-4 border-t border-border">
                              <Label className="text-sm font-medium text-foreground mb-1 block">Orientación de la imagen</Label>
                              <p className="text-xs text-muted-foreground mb-3">
                                Arrastrá la imagen sobre el {product.singular.toLowerCase()} para ubicarla, o usá el control de posición del visor.
                              </p>
                              <PlacementControls
                                value={artPlacement}
                                onChange={applyArtPlacement}
                                singleFace={singleFace}
                                frontExtents={artExtents}
                                areaAspect={faceAreaAspect}
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="border border-dashed border-border rounded-xl p-6 text-center space-y-3">
                          <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto" />
                          <p className="text-sm text-muted-foreground">
                            El plan de solo nombres no incluye imagen. Elija un plan con dibujo o logo para subir su foto.
                          </p>
                          <div className="flex justify-center gap-2">
                            {ENGRAVING_PLANS.filter(p => p.allowsImage).map(p => (
                              <button
                                key={p.id}
                                onClick={() => handleSelectPlan(p.id)}
                                className="text-xs font-medium border border-border rounded-lg px-3 py-2 text-foreground hover:border-primary/40 hover:bg-secondary/50 transition-colors"
                              >
                                {p.shortLabel}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  )}
                </div>

                {/* PLAN + ORDER — desktop only; on mobile this is Step 4 (Resumen).
                    La técnica de grabado vive ahora en el tab Texto (Paso 3). */}
                {!isMobile && (
                <div className="px-6 pb-6 pt-4 border-t border-border space-y-4">
                  {renderDrinkSummary()}
                </div>
                )}
              </Tabs>
            ) : is3DObject && activeObject ? (
              /* MODELLED BLANK — laser-only personalization (wood, leather, acrylic, plastic, bare steel, pens) */
              <Tabs key={activeObject.id} defaultValue="text" className="w-full">
                <div className="px-4 sm:px-6 pt-4 pb-1">
                  <TabsList className="w-full flex gap-1 bg-secondary/50 rounded-xl p-1 h-auto">
                    {objectTabs.map(({ key, label, Icon }) => (
                      <TabsTrigger key={key} value={key} className={SEG_TAB}>
                        <Icon className="w-4 h-4 shrink-0" /> <span className="truncate">{label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="p-4 sm:p-5 min-h-[280px]">
                  <p className="text-xs text-muted-foreground mb-5">
                    {activeObject.desc} Vea cómo se vería con su texto, un ícono o su logo.
                  </p>

                  {/* COLOR TAB — colourable blanks only */}
                  {activeObject.colorable && (
                    <TabsContent value="color" className="mt-0 space-y-5">
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-3 block">Color del Producto</Label>
                        <div className="grid grid-cols-6 gap-3">
                          {COLORS.map(c => (
                            <button
                              key={c.id}
                              onClick={() => handleSelectColor(c.id)}
                              title={c.name}
                              className={`group relative aspect-square rounded-full overflow-hidden transition-all hover:scale-105 focus:outline-none ring-offset-2 ${
                                color === c.id && !customHex ? 'ring-2 ring-primary' : 'ring-0'
                              }`}
                            >
                              <div className="absolute inset-0" style={{ backgroundColor: c.hex }} />
                              {color === c.id && !customHex && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Check className="text-white w-5 h-5 drop-shadow" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        {activeColorName && (
                          <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeColorHex }} />
                            {activeColorName}
                          </p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-border">
                        <div className="flex items-baseline justify-between mb-1">
                          <Label className="text-sm font-medium text-foreground">Tono exacto</Label>
                          {customHex && (
                            <button onClick={() => setCustomHex(null)} className="py-1.5 text-xs text-primary hover:underline active:underline">
                              Volver al tono original
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <label
                            className="relative shrink-0 w-11 h-11 rounded-xl overflow-hidden border border-border cursor-pointer hover:border-primary/40 transition-colors"
                            title="Elegir un tono exacto"
                          >
                            <span className="absolute inset-0" style={{ backgroundColor: activeColorHex }} />
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Pipette className="w-4 h-4 text-white mix-blend-difference" />
                            </span>
                            <input
                              type="color"
                              value={activeColorHex}
                              onChange={e => setCustomHex(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              aria-label="Selector de color personalizado"
                            />
                          </label>
                          <div className="grid grid-cols-7 gap-2 flex-1">
                            {TONE_STEPS.map(step => {
                              const hex = shadeHex(baseColor.hex, step);
                              const selected = customHex?.toLowerCase() === hex.toLowerCase();
                              return (
                                <button
                                  key={step}
                                  onClick={() => setCustomHex(hex)}
                                  title={hex.toUpperCase()}
                                  className={`relative aspect-square rounded-lg overflow-hidden transition-all hover:scale-105 ring-offset-2 ${
                                    selected ? 'ring-2 ring-primary' : 'ring-0'
                                  }`}
                                >
                                  <span className="absolute inset-0" style={{ backgroundColor: hex }} />
                                  {selected && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                                      <Check className="text-white w-3.5 h-3.5 drop-shadow" />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  )}

                  {/* TEXT TAB */}
                  <TabsContent value="text" className="mt-0 space-y-5">
                    {/* BÁSICO */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-3 block">Texto Personalizado</Label>
                        <EngravingTextField text={text} onText={setText} layout={textPlacement.layout} />
                      </div>
                      <OrientationToggle
                        value={textPlacement.orientation}
                        onChange={(o) => setTextPlacement(p => ({ ...p, orientation: o }))}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground mb-3 block">Elija su tipografía</Label>
                      <FontCarousel fonts={FONTS} value={font} onChange={setFont} sampleText={text} />
                    </div>

                    <div>
                      <TextSizeSlider
                        scale={textPlacement.scale}
                        onScale={(s) => setTextPlacement(p => ({ ...p, scale: s }))}
                      />
                    </div>

                    {/* AVANZADO */}
                    <AdvancedOptions>
                      <TextDispositionToolbar
                        placement={textPlacement}
                        onChange={setTextPlacement}
                        wrapDisabledReason="El texto envolvente 360° solo está disponible en productos cilíndricos (termos, vasos…)"
                      />
                    </AdvancedOptions>
                  </TabsContent>

                  {/* ICONS TAB */}
                  <TabsContent value="icons" className="mt-0 space-y-5">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-1 block">Elija un ícono</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Sume un ícono a su {activeObject.singular.toLowerCase()}. Toque de nuevo para quitarlo.
                      </p>
                      <IconPicker value={iconId} onChange={handlePickIcon} />
                    </div>

                    {selectedIcon && (
                      <div className="pt-4 border-t border-border">
                        <Label className="text-sm font-medium text-foreground mb-1 block">Tamaño y orientación del ícono</Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Arrastrá el ícono sobre la {activeObject.singular.toLowerCase()} para ubicarlo, o usá el control de posición del visor. Acá ajustás su tamaño.
                        </p>
                        <PlacementControls value={artPlacement} onChange={setArtPlacement} withSize flat />
                      </div>
                    )}
                  </TabsContent>

                  {/* LOGO / PHOTO TAB — stainless steel only */}
                  {canUploadImage && (
                  <TabsContent value="media" className="mt-0 space-y-5">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-1 block">Logo o foto</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Suba su logo o su foto. Le quitamos el fondo automáticamente y la grabamos sobre la {activeObject.singular.toLowerCase()}.
                      </p>
                      <ImageUpload imageSize="large" value={customImage} onChange={handleUploadImage} />

                      {customImage && (
                        <div className="pt-4 mt-4 border-t border-border">
                          <Label className="text-sm font-medium text-foreground mb-1 block">Orientación de la imagen</Label>
                          <p className="text-xs text-muted-foreground mb-3">
                            Arrastrá la imagen sobre la {activeObject.singular.toLowerCase()} para ubicarla, o usá el control de posición del visor.
                          </p>
                          <PlacementControls value={artPlacement} onChange={setArtPlacement} flat />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  )}
                </div>

                {/* TECHNIQUE NOTE + ORDER — plotter de corte para plástico,
                    grabado láser para el resto de los blanks. */}
                <div className="px-6 pb-6 pt-4 border-t border-border space-y-4">
                  {materialId === "plastico" ? (
                    <div className="flex items-start gap-2 p-3 border rounded-xl border-border bg-secondary/40">
                      <Scissors className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Plotter de corte</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Vinilo recortado de alta precisión y durabilidad. Además de productos plásticos,
                          lo aplicamos sobre conservadoras y paredes.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 border rounded-xl border-border bg-secondary/40">
                      <Zap className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Grabado láser</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Grabado monocromático permanente. La impresión UV a color solo está disponible en
                          drinkware de acero con pintura electrostática.
                        </p>
                      </div>
                    </div>
                  )}

                  {renderOrderActions()}
                </div>
              </Tabs>
            ) : (
              /* SIMPLIFIED FLOW — non-drinkware materials */
              <div className="p-6 space-y-6">
                <div>
                  <Label className="text-sm font-medium text-foreground mb-1 block">
                    {material.pens ? "Grabado de bolígrafos" : activeMProduct?.name}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {material.pens
                      ? "Contanos qué querés grabar."
                      : `${material.name}. Personalícelo y coordinamos el diseño final con usted por WhatsApp.`}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-foreground mb-3 block">¿Qué querés personalizar?</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {KINDS.map(k => {
                      const Icon = k.icon;
                      const active = simpleKind === k.id;
                      return (
                        <button
                          key={k.id}
                          onClick={() => setSimpleKind(k.id)}
                          className={`p-3 border rounded-xl flex flex-col items-center gap-2 transition-all ${active ? activeCard : idleCard}`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium text-sm">{k.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {simpleKind === "text" && (
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-3 block">Texto a grabar</Label>
                    <Input
                      value={text}
                      onChange={(e) => setText(e.target.value.slice(0, 40))}
                      placeholder="Tu nombre, frase o texto"
                      className="h-12 text-base text-center border-border focus-visible:ring-primary"
                      maxLength={40}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5 text-right">{text.length}/40 caracteres</p>
                  </div>
                )}

                {simpleKind === "icons" && (
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-1 block">Elija un ícono</Label>
                    <p className="text-xs text-muted-foreground mb-3">Toque de nuevo para quitarlo.</p>
                    <IconPicker value={iconId} onChange={handlePickIcon} />
                  </div>
                )}

                {simpleKind === "images" && (
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-1 block">Logo o foto</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Suba su logo o foto y lo adaptamos al producto.
                    </p>
                    <ImageUpload imageSize="large" value={customImage} onChange={handleUploadImage} />
                  </div>
                )}

                <div className="pt-2 border-t border-border space-y-3">
                  {renderOrderActions()}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
        )}

        {/* Mobile Step 4 — Resumen (drinkware only): inferred plan + price + WhatsApp. */}
        {isMobile && isDrinkware && mobileStep === 4 && (
          <motion.div key="wiz-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-4 pb-28">
            <p className="text-sm text-muted-foreground">
              Revisá tu diseño y envialo por WhatsApp. Coordinamos los detalles al instante.
            </p>
            {renderDrinkSummary()}
          </motion.div>
        )}

        {isMobile && (
          <WizardNav
            step={mobileStep}
            total={wizardLabels.length}
            onBack={() => setMobileStep(s => Math.max(1, s - 1))}
            onNext={() => {
              // Leaving the design step: swing the personalized area to face the
              // camera, wait for the repaint, THEN snapshot the live canvas — so
              // the Step 4 image always shows the design completely, no matter
              // how the user left the piece rotated.
              if (mobileStep === designStepIndex) {
                thermosSnapRef.current?.(designFaceU);
                setTimeout(() => {
                  const img = capturePreview();
                  if (img) { setPreviewImg(img); previewImgRef.current = img; }
                  setMobileStep(s => Math.min(wizardLabels.length, s + 1));
                }, 150);
                return;
              }
              setMobileStep(s => Math.min(wizardLabels.length, s + 1));
            }}
            nextLabel={mobileStep === designStepIndex ? "Continuar" : mobileStep === 1 ? "Diseñar" : "Siguiente"}
          />
        )}

      </div>
    </section>
  );
}
