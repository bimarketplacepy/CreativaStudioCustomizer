import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal, flushSync } from "react-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDesignScreen, useVisualViewport } from "@/components/mobile-screen";
import { EditorTour, Hint, HINT_AR_KEY, HINT_DONE_KEY, TOUR_KEY, markSeen, seen, type TourStep } from "@/components/editor-tour";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  Check, Palette, Type, Box, Pipette, ImageIcon, MoveHorizontal, MoveVertical,
  Shapes, Zap, Sparkles, Wallet, TreePine, Square, PenLine, Wine, CupSoda, Snowflake,
  Shield, Scissors,
  Minus, Plus, Move,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Info,
  WrapText, Rows3, CornerDownLeft, Settings2, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, ChevronsLeftRight, Crosshair, CirclePlay, Orbit, Link2, MessageCircle, MapPin, HandCoins,
  Undo2, Trash2, Search, ScanEye, Maximize2, Paintbrush, X, Heart, Repeat,
} from "lucide-react";
import Thermos3D, { type ScreenRect } from "./thermos-3d";
import type { PinchPhase } from "@/lib/pinch";
// El creador de stickers baja recién al elegir el modo "Stickers".
const StickerCreator = React.lazy(() => import("./stickers"));
import Object3D from "./object-3d";
import ImageUpload from "./image-upload";
import { ENGRAVING_PLANS, type EngravingPlanId } from "@/lib/engraving-plans";
import type { ProcessedImage } from "@/lib/image-processing";
import { DEFAULT_PRODUCT_ID, getProduct, getSize, productForSize, type ProductDef } from "@/lib/products";
import { getObject } from "@/lib/objects";
import {
  DEFAULT_ART_PLACEMENT, DEFAULT_TEXT_PLACEMENT, LINE_HEIGHT_PRESETS, DEFAULT_LINE_HEIGHT,
  type FaceId, type Placement, type TextAlign, type TextLayout, type LineHeightPreset,
} from "@/lib/placement";
import {
  markHalfExtents, computeFaceTextLayout, bandMetrics, TEXTURE_W, TEXTURE_H,
  wrap360MaxScale, wrap360Fits, type MarkSpec, type TextMark,
} from "@/lib/engraving-maps";
import {
  padToPlacement, placementToPad, engraveFacesFor, faceCenterU, faceLabel, nearU,
  clampPlacementToFrontArea, type MarkHalfExtents,
} from "@/lib/face-area";
import { clampFree, staticZones, KEEP_OUT_LABEL, type FreeClampResult, type KeepOutZone } from "@/lib/keep-out";
import {
  MATERIALS, DEFAULT_MATERIAL_ID, PEN_OPTIONS, getMaterial, allowsColorPrint, type MaterialId,
} from "@/lib/materials";
import { ENGRAVING_ICONS, iconToDataUrl } from "@/lib/engraving-icons";
import { ADDRESS, whatsappUrl } from "@/lib/contact";
import { clearSharedDesign, designLink, readSharedDesign, type SharedDesign } from "@/lib/design-link";
import { onDesignPreset } from "@/lib/design-preset";
import { CUSTOMIZER_MODE_EVENT, takeCustomizerMode } from "@/lib/section-reveal";
import { machineFor, normalizeTechnique } from "@/lib/machines";
import { fitsDacen, printSpecFor } from "@/lib/print-specs";
import { dacenPrintSize, loadImage, renderDacenPng, renderUnwrappedPreview, type DacenPrintFile } from "@/lib/production-dacen";
import { wrapEffectiveDpi, WRAP_MODES, type WrapDesign } from "@/lib/wrap-design";
import { UnwrappedDialog, WrapDesignPanel } from "@/components/wrap-design-panel";
import { PRICING, quote } from "@/lib/pricing";
import {
  colorOptions, defaultVariant, engravingPrice, findVariant, formatGs, GENERIC_BRAND,
  matchingProducts, odooShopItems, priceFrom, sectionTitles, shopBrands, shopSections, sizeOptions,
  useCatalog, viewSizeId, type CatalogSection, type ShopItem,
} from "@/lib/odoo-catalog";
import { track } from "@/lib/analytics";
import { submitOrder } from "@/lib/submit-order";
import { AiPhraseIdeas } from "./ai-tools";
import type { PhraseIdea } from "@/lib/ai";
import { dataUrlToJpeg, downloadDataUrl } from "@/lib/share";
import type { CreateOrderRequest } from "@workspace/api-client-react";
import { Download, Loader2 } from "lucide-react";

/** Text scale bounds. Capped low so a name never blows out past the band. */
/**
 * Ubicación libre en termos y vasos: el diseño va en cualquier lugar de la
 * banda grabable (entre la tapa y la base), sin el recuadro de una cara. Solo
 * lo frenan el logo y la marca, la manija y los relieves (lib/keep-out.ts).
 * En false vuelve la "edición en una cara" de antes.
 */
const FREE_PLACEMENT = true;

const TEXT_SCALE_MIN = 0.3;
const TEXT_SCALE_MAX = 1.2;
/** "Texto 2" arranca más chico que el principal (suele ser la línea secundaria). */
const TEXT2_DEFAULT_PLACEMENT: Placement = { ...DEFAULT_TEXT_PLACEMENT, scale: 0.32, layout: "auto" };

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

/** El diseñador arranca siempre con el Vaso Sunbeam en negro. */
const START_PRODUCT_ID = "vaso-sunbeam";
const START_COLOR_NAME = "Negro";

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
const FEMININE_PRODUCTS = new Set(["copa", "guampa", "botella", "chopera", "jarra", "hielera"]);
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
  // id "color" (antes eufy): impresión directa sobre la pieza, en la Dacen F5
  // (ver DACEN.md). Los links compartidos viejos se normalizan al leerlos.
  { id: "color", name: "Impresión UV", desc: "Impresión a todo color sobre el producto.", color: true },
] as const;
type TechniqueId = (typeof TECHNIQUES)[number]["id"];
/** Elemento del diseño que se edita sobre el visor: texto, "Texto 2" o arte. */
type DesignKind = "text" | "text2" | "art";

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

/**
 * Fixed bottom nav: Back (all but first step) + Next. En el último paso (el
 * resumen) el botón principal envía el pedido: es el paso que convierte y el
 * CTA no puede quedar abajo, fuera de la vista.
 */
function WizardNav({ step, total, onBack, onNext, nextLabel, design, inline, final }: {
  step: number; total: number; onBack: () => void; onNext: () => void; nextLabel?: string;
  /** El siguiente paso es el de Diseño: botón grande, con pincel, que se note. */
  design?: boolean;
  /** Dentro de la pantalla de Diseño (no fija sobre la página). */
  inline?: boolean;
  final?: { label: React.ReactNode; onClick: () => void; disabled?: boolean };
}) {
  return (
    <div
      className={`md:hidden ${inline ? "shrink-0" : "fixed inset-x-0 bottom-0 z-40"} bg-white/95 backdrop-blur border-t border-border px-4 pt-3 flex items-center gap-3`}
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
      {step < total && (design ? (
        <button
          type="button"
          onClick={onNext}
          className="wiz-design-cta flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-12 rounded-full bg-primary text-primary-foreground text-base font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
        >
          <Paintbrush className="w-5 h-5" /> {nextLabel ?? "Diseñar"} <ChevronRight className="w-5 h-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-3 min-h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm active:scale-[0.98] transition-transform"
        >
          {nextLabel ?? "Siguiente"} <ChevronRight className="w-4 h-4" />
        </button>
      ))}
      {step >= total && final && (
        <button
          type="button"
          onClick={final.onClick}
          disabled={final.disabled}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {final.label}
        </button>
      )}
    </div>
  );
}


// Qué hay dentro de cada material, en palabras del cliente: en las pruebas
// nadie buscaba "Acero con pintura recubierta", buscaba "un termo".
const MATERIAL_SHORT: Record<string, string> = { acero: "Acero" };
const MATERIAL_HINT: Record<string, string> = {
  acero: "Termos, vasos y botellas",
  cuero: "Billeteras y forrados",
  madera: "Tablas y cajas",
  boligrafos: "Grabado láser",
  cristal: "Copas",
  plastico: "Conservadoras",
};

/**
 * Material (celular, Paso 1): todas las opciones a la vista en una grilla de
 * tarjetas con ícono y qué productos trae. Antes era una fila de pastillas con
 * scroll horizontal y la mitad quedaba fuera de pantalla.
 */
function MaterialChips({ materials, value, onChange }: {
  materials: typeof MATERIALS; value: MaterialId; onChange: (id: MaterialId) => void;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-3 block">¿Qué querés personalizar?</Label>
      <div role="radiogroup" aria-label="Material" className="grid grid-cols-3 gap-2">
        {materials.map(m => {
          const Icon = MATERIAL_ICON[m.icon] ?? Box;
          const on = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(m.id)}
              className={`relative min-h-[96px] px-1.5 py-3 border rounded-xl flex flex-col items-center justify-center gap-1 text-center transition-all ${on ? activeCard : idleCard}`}
            >
              {on && <Check className="absolute top-1.5 right-1.5 w-3.5 h-3.5" aria-hidden />}
              <Icon className="w-6 h-6 shrink-0" />
              <span className={`text-[13px] font-semibold leading-tight ${on ? "" : "text-foreground"}`}>{MATERIAL_SHORT[m.id] ?? m.name}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">{MATERIAL_HINT[m.id] ?? ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Cuántos productos se ven antes de "Ver todos" (dos filas de tres). */
const PRODUCT_PREVIEW = 6;

/**
 * Producto del material elegido (celular, Paso 1): grilla con la silueta de
 * cada pieza. Con muchos productos se ven dos filas (siempre incluye el
 * elegido) y "Ver todos" despliega el resto.
 */
function ProductChips({ material, value, onChange }: {
  material: (typeof MATERIALS)[number]; value: string; onChange: (id: string) => void;
}) {
  const [all, setAll] = useState(false);
  useEffect(() => { setAll(false); }, [material.id]);
  const Glyph = MATERIAL_ICON[material.icon] ?? Box;
  const products = material.products;
  let shown = products;
  if (!all && products.length > PRODUCT_PREVIEW) {
    shown = products.slice(0, PRODUCT_PREVIEW);
    const sel = products.find(p => p.id === value);
    if (sel && !shown.includes(sel)) shown = [...shown.slice(0, PRODUCT_PREVIEW - 1), sel];
  }
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
        <>
          <div role="radiogroup" aria-label="Producto" className="grid grid-cols-3 gap-2">
            {shown.map(p => {
              const on = p.id === value;
              const dp = p.drinkwareProductId ? getProduct(p.drinkwareProductId) : null;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onChange(p.id)}
                  title={p.desc}
                  className={`relative px-1.5 pt-2 pb-2.5 border rounded-xl flex flex-col items-center justify-end gap-1.5 transition-all ${on ? activeCard : idleCard}`}
                >
                  {on && <Check className="absolute top-1.5 right-1.5 w-3.5 h-3.5" aria-hidden />}
                  {dp ? (
                    <ProductGlyph product={dp} className="h-12 w-full" />
                  ) : (
                    <span className="h-12 flex items-center justify-center"><Glyph className="w-7 h-7" /></span>
                  )}
                  <span className={`text-xs font-medium text-center leading-tight ${on ? "" : "text-foreground"}`}>{p.name}</span>
                </button>
              );
            })}
          </div>
          {products.length > PRODUCT_PREVIEW && (
            <button
              type="button"
              onClick={() => setAll(a => !a)}
              className="mt-2 w-full min-h-11 inline-flex items-center justify-center gap-1 rounded-xl text-sm font-medium text-primary hover:bg-secondary/50"
            >
              {all ? <>Ver menos <ChevronUp className="w-4 h-4" /></> : <>Ver todos ({products.length}) <ChevronDown className="w-4 h-4" /></>}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Foto del producto de la tienda, o la silueta de su forma (genéricos o sin foto). */
function ShopThumb({ item, className }: { item: ShopItem; className: string }) {
  return (
    <span className={`rounded-lg bg-white overflow-hidden flex items-center justify-center shrink-0 ${className}`}>
      {item.thumb ? (
        <img src={item.thumb} alt="" loading="lazy" decoding="async" width={256} height={256} className="w-full h-full object-contain" />
      ) : (
        <ProductGlyph product={getProduct(item.type)} className="h-3/4 w-full" />
      )}
    </span>
  );
}

/** "desde Gs. X" para los de la tienda; los genéricos se cotizan aparte. */
function itemPrice(item: ShopItem): string {
  return item.from !== null ? `desde ${formatGs(item.from)}` : "Se cotiza";
}

/** Tarjetas con foto, agrupadas por sección (la grilla de la hoja de celular). */
function CatalogPicker({ sections, value, onPick }: {
  sections: CatalogSection[];
  value: string | null;
  onPick: (item: ShopItem) => void;
}) {
  return (
    <div className="space-y-5">
      {sections.map(sec => (
        <div key={sec.title}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{sec.title}</p>
          <div className="grid grid-cols-3 gap-2">
            {sec.items.map(it => {
              const on = it.key === value;
              return (
                <button
                  key={it.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onPick(it)}
                  className={`p-2 border rounded-xl flex flex-col items-center text-center gap-1 transition-all ${on ? activeCard : idleCard}`}
                >
                  <ShopThumb item={it} className="w-full aspect-square" />
                  <span className={`text-[12px] font-medium leading-tight ${on ? "text-primary" : "text-foreground"}`}>{it.name}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">{itemPrice(it)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Buscador del catálogo de la tienda. */
function ShopSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 h-11 px-3 border border-border rounded-xl bg-white focus-within:ring-2 focus-within:ring-primary/30">
      <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
      <span className="sr-only">Buscar producto</span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Buscar (ej. Hoppie, vaso con manija)"
        className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}

/** Selector de marca (Hydrate · Genéricos · …): solo si hay más de una. */
function BrandTabs({ brands, value, onChange }: { brands: string[]; value: string; onChange: (b: string) => void }) {
  if (brands.length < 2) return null;
  return (
    <div className="grid gap-1 p-1 rounded-xl bg-secondary/50" style={{ gridTemplateColumns: `repeat(${brands.length}, minmax(0, 1fr))` }}>
      {brands.map(b => (
        <button
          key={b}
          type="button"
          aria-pressed={b === value}
          onClick={() => onChange(b)}
          className={`h-9 rounded-lg text-[13px] font-medium transition ${b === value ? "bg-white text-primary shadow-sm" : "text-foreground/70"}`}
        >
          {b}
        </button>
      ))}
    </div>
  );
}

/**
 * Celular: el producto elegido en una tarjeta de una línea con "Cambiar". El
 * catálogo completo vive en una hoja que sube solo cuando se pide, así el 3D y
 * los colores quedan siempre a la vista.
 */
function ShopProductCard({ item, detail, onChange }: { item: ShopItem; detail: string; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 p-2.5 border border-border rounded-2xl bg-white">
      <ShopThumb item={item} className="w-14 h-14" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Tu producto · {item.brand}</p>
        <p className="text-[15px] font-semibold leading-tight truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground truncate">{detail}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="h-10 px-4 rounded-full border border-primary text-primary text-sm font-semibold bg-white active:scale-95 transition shrink-0"
      >
        Cambiar
      </button>
    </div>
  );
}

/** Hoja inferior con el catálogo: marca, buscador, secciones y grilla de 3 columnas. */
function ShopSheet({ open, onOpenChange, items, value, initialBrand, onPick }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ShopItem[];
  value: string | null;
  initialBrand: string;
  onPick: (item: ShopItem) => void;
}) {
  const brands = shopBrands(items);
  const [brand, setBrand] = useState(initialBrand);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<string | null>(null);
  // Cada vez que se abre, arranca en la marca del producto elegido.
  useEffect(() => { if (open) { setBrand(initialBrand); setSection(null); } }, [open, initialBrand]);
  const titles = sectionTitles(items, brand);
  const shown = shopSections(items, { brand, section, query });
  const chip = (on: boolean) =>
    `shrink-0 h-9 px-3.5 rounded-full border text-[13px] font-medium transition ${on ? "border-primary bg-[#f5eaec] text-primary" : "border-border bg-white text-foreground/80"}`;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[82vh] p-0 rounded-t-3xl flex flex-col gap-0">
        <div className="flex justify-center pt-2.5"><span className="w-10 h-1.5 rounded-full bg-border" /></div>
        <div className="px-4 pt-3 pr-12">
          <SheetTitle className="font-serif font-light text-2xl text-[#1A1614]">Elegí tu producto</SheetTitle>
          <SheetDescription className="sr-only">Catálogo de la tienda con stock y formas genéricas</SheetDescription>
        </div>
        <div className="px-4 pt-3 space-y-3">
          <BrandTabs brands={brands} value={brand} onChange={b => { setBrand(b); setSection(null); }} />
          <ShopSearch value={query} onChange={setQuery} />
          {!query && titles.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]">
              <button type="button" aria-pressed={!section} className={chip(!section)} onClick={() => setSection(null)}>Todos</button>
              {titles.map(t => (
                <button key={t} type="button" aria-pressed={section === t} className={chip(section === t)} onClick={() => setSection(t)}>{t}</button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-8">
          {brand === GENERIC_BRAND && !query && (
            <p className="text-xs text-muted-foreground mb-3">Formas sin marca: para personalizar un producto que traés vos o uno genérico. El precio se cotiza por WhatsApp.</p>
          )}
          {shown.length ? (
            <CatalogPicker sections={shown} value={value} onPick={it => { onPick(it); onOpenChange(false); }} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay productos con ese nombre.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Desktop: el catálogo como barra lateral angosta al lado del 3D (marca,
 * miniatura, nombre y precio), con buscador. Nunca empuja el área de diseño.
 */
function ShopRail({ items, value, initialBrand, onPick }: {
  items: ShopItem[]; value: string | null; initialBrand: string; onPick: (item: ShopItem) => void;
}) {
  const brands = shopBrands(items);
  const [brand, setBrand] = useState(initialBrand);
  const [query, setQuery] = useState("");
  useEffect(() => { setBrand(initialBrand); }, [initialBrand]);
  const shown = shopSections(items, { brand, query });
  return (
    <aside className="lg:sticky lg:top-24 bg-white rounded-2xl border border-border p-3 flex flex-col gap-3 lg:max-h-[calc(100vh-7rem)]">
      <div className="flex items-baseline justify-between px-1">
        <span className="text-sm font-semibold">Productos</span>
        <span className="text-xs text-muted-foreground">{items.filter(i => i.brand === brand).length} en {brand}</span>
      </div>
      <BrandTabs brands={brands} value={brand} onChange={setBrand} />
      <ShopSearch value={query} onChange={setQuery} />
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-3">
        {brand === GENERIC_BRAND && !query && (
          <p className="text-[11px] text-muted-foreground px-1">Formas sin marca: para un producto que traés vos o uno genérico. Se cotiza por WhatsApp.</p>
        )}
        {shown.map(sec => (
          <div key={sec.title} className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 pt-1">{sec.title}</p>
            {sec.items.map(it => {
              const on = it.key === value;
              return (
                <button
                  key={it.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onPick(it)}
                  className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl border text-left transition ${on ? "border-primary bg-[#f5eaec]" : "border-transparent hover:bg-secondary/40"}`}
                >
                  <ShopThumb item={it} className="w-11 h-11" />
                  <span className="min-w-0">
                    <span className={`block text-[13px] font-medium leading-tight ${on ? "text-primary" : "text-foreground"}`}>{it.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{query ? `${it.brand} · ` : ""}{itemPrice(it)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
        {!shown.length && <p className="text-sm text-muted-foreground py-6 text-center">No hay productos con ese nombre.</p>}
      </div>
    </aside>
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
function TechniqueSelector({ value, onChange, compact }: {
  value: TechniqueId; onChange: (id: TechniqueId) => void;
  /** Celular: las dos opciones lado a lado. */
  compact?: boolean;
}) {
  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
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
              {t.color && !compact && (
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
 * Barra de edición sobre el visor mientras hay un diseño seleccionado: tamaño,
 * centrar, deshacer, borrar y un "Listo" bien visible para terminar y volver a
 * girar la pieza. Reemplaza a la cruz de flechas: el diseño se mueve
 * arrastrándolo directamente sobre el producto.
 */
function DesignEditBar({ kindLabel, pinch, onSmaller, onBigger, onCenter, onUndo, onDelete, onDone }: {
  kindLabel: string;
  /** Celular: el tamaño se cambia pellizcando el visor, sin botones + / −. */
  pinch?: boolean;
  onSmaller: () => void;
  onBigger: () => void;
  onCenter: () => void;
  onUndo: (() => void) | null;
  onDelete: () => void;
  onDone: () => void;
}) {
  const btn = "w-10 h-10 grid place-items-center rounded-lg text-foreground/80 hover:text-primary hover:bg-white active:scale-90 transition disabled:opacity-35 disabled:pointer-events-none";
  return (
    <div className="relative z-20 flex flex-col items-center gap-1 select-none px-2">
      {pinch ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground text-center">
          <Move className="w-3.5 h-3.5 shrink-0 text-primary" /> Arrastrá para mover
          <span aria-hidden>·</span>
          <Maximize2 className="w-3.5 h-3.5 shrink-0 text-primary" /> Pellizcá para el tamaño
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">
          Editando {kindLabel} · arrastralo sobre el producto
        </span>
      )}
      <div className="flex items-center gap-1 rounded-xl bg-white border border-border shadow-sm p-1">
        {!pinch && <button type="button" aria-label="Achicar" title="Achicar" className={btn} onClick={onSmaller}><Minus className="w-4 h-4" /></button>}
        {!pinch && <button type="button" aria-label="Agrandar" title="Agrandar" className={btn} onClick={onBigger}><Plus className="w-4 h-4" /></button>}
        <button type="button" aria-label="Centrar" title="Centrar" className={btn} onClick={onCenter}><Crosshair className="w-4 h-4" /></button>
        <button type="button" aria-label="Deshacer" title="Deshacer" className={btn} onClick={onUndo ?? undefined} disabled={!onUndo}><Undo2 className="w-4 h-4" /></button>
        <button type="button" aria-label="Borrar" title="Borrar" className={btn} onClick={onDelete}><Trash2 className="w-4 h-4" /></button>
        <button
          type="button"
          onClick={onDone}
          className="ml-1 h-10 px-4 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm active:scale-95 transition"
        >
          <Check className="w-4 h-4" /> Listo
        </button>
      </div>
    </div>
  );
}

/**
 * Pastilla de acciones pegada al elemento seleccionado (celular): achicar,
 * agrandar, centrar y borrar. El elemento es el menú: no hay panel aparte.
 */
function ElementPill({ onSmaller, onBigger, onCenter, onDelete }: {
  onSmaller: () => void; onBigger: () => void; onCenter: () => void; onDelete: () => void;
}) {
  const b = "w-10 h-10 grid place-items-center rounded-full active:bg-secondary transition";
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-white border border-border shadow-md px-1 py-0.5 select-none">
      <button type="button" aria-label="Achicar" title="Achicar" onClick={onSmaller} className={`${b} text-foreground/80`}><Minus className="w-4 h-4" /></button>
      <button type="button" aria-label="Agrandar" title="Agrandar" onClick={onBigger} className={`${b} text-foreground/80`}><Plus className="w-4 h-4" /></button>
      <button type="button" aria-label="Centrar" title="Centrar" onClick={onCenter} className={`${b} text-foreground/80`}><Crosshair className="w-4 h-4" /></button>
      <button type="button" aria-label="Borrar" title="Borrar" onClick={onDelete} className={`${b} text-red-600`}><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}

/**
 * Con un diseño puesto pero sin editar: el visor gira libremente y este botón
 * (o tocar el diseño sobre el producto) entra a editarlo. Tras borrar algo,
 * ofrece deshacerlo unos segundos.
 */
type ArModelGetter = () => import("@/lib/ar-viewer").ArModel | null;

/**
 * "Ver en AR" (ver lib/ar-viewer.ts). Solo aparece si el dispositivo tiene AR:
 * Quick Look en iPhone/iPad, WebXR en Android. En iOS el modelo se prepara
 * primero y el toque sobre el enlace lo abre (Safari exige un toque directo
 * sobre un <a rel="ar">); `designKey` invalida el preparado si cambia el diseño.
 */
function ArViewButton({ getModel, designKey, compact }: {
  getModel: ArModelGetter; designKey: string;
  /** Solo el ícono (cabecera de la pantalla de Diseño del celular). */
  compact?: boolean;
}) {
  const [mode, setMode] = useState<"quicklook" | "webxr" | null>(null);
  const [state, setState] = useState<"idle" | "preparing" | "ready" | "error">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const modRef = useRef<typeof import("@/lib/ar-viewer") | null>(null);

  useEffect(() => {
    let alive = true;
    import("@/lib/ar-viewer")
      .then(async m => { modRef.current = m; const d = await m.detectAR(); if (alive) setMode(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // El USDZ preparado queda viejo apenas cambia el diseño.
  useEffect(() => {
    setState("idle");
    setUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
  }, [designKey]);
  useEffect(() => () => { setUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); }, []);

  if (!mode) return null;

  const btn = compact
    ? "w-11 h-11 grid place-items-center rounded-full text-primary active:bg-secondary disabled:opacity-50"
    : "h-10 px-4 inline-flex items-center gap-1.5 rounded-full bg-white text-foreground text-sm font-medium border border-border shadow-sm active:scale-95 transition";

  if (mode === "quicklook" && state === "ready" && url) {
    return (
      // allowsContentScaling=0: la pieza queda a tamaño real (Quick Look no
      // deja agrandarla ni achicarla con los dedos).
      <a rel="ar" href={`${url}#allowsContentScaling=0`} className={btn} onClick={() => track("ar_open", { mode })}>
        {/* Quick Look exige una imagen como primer hijo del enlace. */}
        <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="" width={1} height={1} />
        <ScanEye className={compact ? "w-5 h-5" : "w-4 h-4 text-primary"} /> {compact ? <span className="sr-only">Abrir en tu espacio, tamaño real</span> : "Abrir en tu espacio · tamaño real"}
      </a>
    );
  }

  const onClick = async () => {
    const m = modRef.current;
    const model = getModel();
    if (!m || !model) { setState("error"); return; }
    track("ar_click", { mode });
    if (mode === "webxr") {
      try { await m.startWebXR(model); } catch { setState("error"); }
      return;
    }
    setState("preparing");
    try {
      const u = await m.buildQuickLookUrl(model);
      setUrl(prev => { if (prev) URL.revokeObjectURL(prev); return u; });
      setState("ready");
    } catch {
      setState("error");
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={state === "preparing"}
        aria-label={state === "error" ? "No pudimos abrir la vista AR" : "Ver en AR"}
        title={state === "error" ? "No pudimos abrir la vista AR en este dispositivo" : "Ver en tu espacio (AR)"}
        className={btn}
      >
        {state === "preparing" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanEye className="w-5 h-5" />}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" onClick={onClick} disabled={state === "preparing"} className={btn}>
        {state === "preparing"
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparando AR…</>
          : <><ScanEye className="w-4 h-4 text-primary" /> Ver en AR</>}
      </button>
      {state === "error" && (
        <p className="text-xs text-muted-foreground">No pudimos abrir la vista AR en este dispositivo.</p>
      )}
    </div>
  );
}

function DesignIdleActions({ onEdit, onUndoDelete }: {
  onEdit: (() => void) | null;
  onUndoDelete: (() => void) | null;
}) {
  if (!onEdit && !onUndoDelete) return null;
  return (
    <div className="relative z-20 flex flex-wrap justify-center gap-2 px-2">
      {onUndoDelete && (
        <button
          type="button"
          onClick={onUndoDelete}
          className="h-10 px-4 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background text-sm font-medium shadow-sm active:scale-95 transition"
        >
          <Undo2 className="w-4 h-4" /> Deshacer borrado
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="h-10 px-4 inline-flex items-center gap-1.5 rounded-full bg-white text-foreground text-sm font-medium border border-border shadow-sm active:scale-95 transition"
        >
          <Move className="w-4 h-4 text-primary" /> Mover o editar diseño
        </button>
      )}
    </div>
  );
}

/** Chip sobre el visor que enseña el gesto de rotación. Bien visible (13px,
 *  fondo black/55 sobre el canvas), desaparece con el primer toque sobre el
 *  visor y no vuelve en la sesión. pointer-events-none: nunca intercepta el
 *  gesto que enseña. */
/**
 * Pista de giro para la vista previa compacta (Pasos 1–2 del celular). Va
 * arriba: abajo tapaba la base de la pieza. Los visores grandes no la usan:
 * ya muestran "Arrastrá para girar" debajo, y salía repetido.
 */
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
    <div ref={ref} className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3.5 py-2 text-[13px] font-medium text-white backdrop-blur-sm">
        <MoveHorizontal className="w-4 h-4" aria-hidden />
        Arrastrá para girar
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
  // only carries size and orientation. See DesignEditBar / onDesignMoveUV.
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
  const stripRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x [scrollbar-width:thin]">
      {fonts.map((f, i) => (
        <FontChip
          key={f.id}
          font={f}
          index={i}
          on={f.id === value}
          onPick={() => onChange(f.id)}
          sampleText={sampleText}
          stripRef={stripRef}
        />
      ))}
    </div>
  );
}

/** Cuántas tipografías se ven en el celular antes de "Ver todas". */
const FONT_PREVIEW = 6;

/**
 * Tipografías en el celular: 6 a la vista en una grilla (siempre incluye la
 * elegida) y "Ver las N tipografías" despliega el resto. Reemplaza al
 * carrusel de 23 con scroll lateral, que en las pruebas resultaba tosco.
 */
function FontQuickGrid({ fonts, value, onChange, sampleText }: {
  fonts: typeof FONTS;
  value: string;
  onChange: (id: string) => void;
  sampleText: string;
}) {
  const [all, setAll] = useState(false);
  let shown: (typeof FONTS)[number][] = [...fonts];
  if (!all) {
    shown = shown.slice(0, FONT_PREVIEW);
    const sel = fonts.find(f => f.id === value);
    if (sel && !shown.includes(sel)) shown = [...shown.slice(0, FONT_PREVIEW - 1), sel];
  }
  const sample = sampleText.split("\n")[0].trim().slice(0, 10) || "Aa";
  return (
    <div>
      <div role="radiogroup" aria-label="Tipografía" className="grid grid-cols-3 gap-2">
        {shown.map(f => {
          const on = f.id === value;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(f.id)}
              title={f.name}
              className={`min-h-14 px-1.5 py-2 border rounded-xl text-center transition-all ${on ? activeCard : idleCard}`}
            >
              <span className={`block text-lg leading-tight truncate ${on ? "text-primary" : "text-foreground"}`} style={f.style}>{sample}</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5 truncate">{f.name}</span>
            </button>
          );
        })}
      </div>
      {fonts.length > FONT_PREVIEW && (
        <button
          type="button"
          onClick={() => setAll(a => !a)}
          className="mt-2 w-full min-h-11 inline-flex items-center justify-center gap-1 rounded-xl text-sm font-medium text-primary hover:bg-secondary/50"
        >
          {all ? <>Ver menos <ChevronUp className="w-4 h-4" /></> : <>Ver las {fonts.length} tipografías <ChevronDown className="w-4 h-4" /></>}
        </button>
      )}
    </div>
  );
}

/**
 * Una tipografía del carrusel. Recién aplica su fuente cuando el chip entra en
 * pantalla (o está elegida): así el navegador baja solo las 3–4 visibles y no
 * las ~20 (≈750 KB) apenas se abre el paso de diseño.
 */
function FontChip({ font: f, index, on, onPick, sampleText, stripRef }: {
  font: (typeof FONTS)[number];
  index: number;
  on: boolean;
  onPick: () => void;
  sampleText: string;
  stripRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setSeen(true); },
      { root: stripRef.current, rootMargin: "0px 120px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, stripRef]);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPick}
      title={f.name}
      className={`snap-start shrink-0 w-[104px] px-3 py-2.5 border rounded-xl text-center transition-all ${on ? activeCard : idleCard}`}
    >
      <span className={`block text-lg leading-tight truncate ${on ? "text-primary" : "text-foreground"}`} style={seen || on ? f.style : undefined}>
        {sampleText || f.name}
      </span>
      <span className="block text-[11px] text-muted-foreground mt-0.5 truncate">{index + 1}. {f.name}</span>
    </button>
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
function EngravingTextField({ text, onText, layout, onFocusChange, limitNotice, placeholder = "Tu nombre o texto", inputRef }: {
  text: string;
  inputRef?: React.Ref<HTMLTextAreaElement>;
  placeholder?: string;
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
        ref={inputRef}
        value={text}
        onChange={(e) => onText(capEngravingText(e.target.value))}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        placeholder={placeholder}
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
/** Largo máximo del texto extra de tapa / base (son superficies chicas). */
const EXTRA_TEXT_MAX = 30;

/**
 * Grabado adicional en tapa y/o base. No se dibuja en el 3D: viaja en el
 * pedido (WhatsApp, resumen y archivo de producción). `null` = no pedido.
 */
function ExtraEngravingFields({ lid, base, onLid, onBase }: {
  lid: string | null;
  base: string | null;
  onLid: (v: string | null) => void;
  onBase: (v: string | null) => void;
}) {
  const row = (label: string, value: string | null, set: (v: string | null) => void, placeholder: string) => (
    <div className="space-y-2">
      <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value !== null}
          onChange={(e) => set(e.target.checked ? "" : null)}
          className="w-4 h-4 accent-[hsl(var(--primary))]"
        />
        {label}
      </label>
      {value !== null && (
        <Input
          value={value}
          maxLength={EXTRA_TEXT_MAX}
          onChange={(e) => set(e.target.value.slice(0, EXTRA_TEXT_MAX))}
          placeholder={placeholder}
          className="text-base"
        />
      )}
    </div>
  );
  return (
    <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">También grabar en…</p>
        <p className="text-xs text-muted-foreground">{formatGs(PRICING.laser.extraText)} más por cada una. No se ve en la vista 3D: lo revisamos con vos por WhatsApp.</p>
      </div>
      {row("Tapa", lid, onLid, "Texto para la tapa (ej. iniciales)")}
      {row("Base", base, onBase, "Texto para la base (ej. una fecha)")}
    </div>
  );
}

/** Cara del cuerpo donde va un elemento (frente, lado del logo, costados): solo las que ofrece el producto. */
function FaceSelector({ faces, value, onChange, product, label = "Ubicación del texto" }: {
  faces: FaceId[];
  value: FaceId;
  onChange: (f: FaceId) => void;
  product: ProductDef;
  label?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-2 block">{label}</Label>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {faces.map(f => (
          <button
            key={f}
            type="button"
            aria-pressed={value === f}
            onClick={() => onChange(f)}
            className={`flex-1 min-w-[5.5rem] p-2.5 border rounded-lg text-sm font-medium transition-all active:scale-[0.97] ${
              value === f
                ? "border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30"
                : "border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50"
            }`}
          >
            {faceLabel(product, f)}
          </button>
        ))}
      </div>
    </div>
  );
}

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

  // Mobile wizard: the flow is split into steps on phones. Drinkware gets three
  // steps (Tu pieza · Diseño · Enviar): material, producto, tamaño, color y
  // técnica se eligen juntos en la primera. Simpler products (flat objects,
  // pens) collapse to two (Tu pieza · Diseño). State is centralised here, so
  // stepping back and forth never loses anything.
  const [mobileStep, setMobileStep] = useState(1);
  // "Stickers" (eufyMake E1) vive acá mismo, como otro modo del personalizador.
  const [mode, setMode] = useState<"products" | "stickers">("products");

  // STEP 1 — material, STEP 2 — product within the material
  const [materialId, setMaterialId] = useState<MaterialId>(DEFAULT_MATERIAL_ID);
  const material = getMaterial(materialId);
  const [materialProductId, setMaterialProductId] = useState<string>(
    material.products.find(p => p.id === START_PRODUCT_ID)?.id ?? material.products[0]?.id ?? "",
  );
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

  // Drinkware base product (drives the 3D preview, sizes, band). `product` is
  // the one for the size on view (a size can bring its own model): see below.
  const productId = activeMProduct?.drinkwareProductId ?? DEFAULT_PRODUCT_ID;
  const baseProduct = getProduct(productId);
  const [size, setSize] = useState(() => {
    const sizes = getProduct(productId).sizes;
    return (sizes[1] ?? sizes[0]).id;
  });

  // ── Catálogo real de Odoo ───────────────────────────────────────────────────
  // Si Odoo tiene productos para este material + producto, los colores, tamaños,
  // precio y stock salen de ahí (variantes reales) y la paleta inventada se
  // oculta. Sin datos de Odoo, todo sigue con el catálogo propio.
  const catalog = useCatalog();
  // Forma genérica elegida a propósito (sin producto de la tienda detrás):
  // vuelve al catálogo propio (paleta, tamaños, "se cotiza aparte").
  const [genericPick, setGenericPick] = useState(false);
  const odooProducts = useMemo(
    () => (isDrinkware && !genericPick ? matchingProducts(catalog, productId, materialId) : []),
    [catalog, isDrinkware, genericPick, productId, materialId],
  );
  const [odooTemplateId, setOdooTemplateId] = useState<number | null>(null);
  const [odooColor, setOdooColor] = useState<string | null>(null);
  const [odooSize, setOdooSize] = useState<string | null>(null);
  const odooProduct = odooProducts.find(p => p.id === odooTemplateId) ?? odooProducts[0] ?? null;
  const odooMode = !!odooProduct;
  // Solo los colores del tamaño elegido: elegir un color nunca cambia el tamaño.
  const odooColors = useMemo(() => (odooProduct ? colorOptions(odooProduct, odooSize) : []), [odooProduct, odooSize]);
  const odooSizes = useMemo(() => (odooProduct ? sizeOptions(odooProduct) : []), [odooProduct]);
  const odooVariant = odooProduct ? findVariant(odooProduct, odooColor, odooSize) : null;
  const odooAllOut = !!odooProduct && odooProduct.variants.every(v => !v.inStock);
  /** ¿Hay stock de este color en el tamaño elegido? (solo se listan los de ese tamaño). */
  const odooColorInStock = (name: string) => {
    if (!odooProduct) return true;
    return findVariant(odooProduct, name, odooSize)?.inStock ?? false;
  };
  // Al cambiar de producto (o al llegar el catálogo), si la combinación elegida
  // no existe en ese producto, arrancar en su primera variante con stock.
  // La primera vez arranca en negro (START_COLOR_NAME) si el producto lo tiene.
  const startColorPending = useRef(true);
  React.useEffect(() => {
    if (!odooProduct || findVariant(odooProduct, odooColor, odooSize)) return;
    const wantStart = startColorPending.current;
    startColorPending.current = false;
    const start = wantStart
      ? odooProduct.variants.find(x => x.colorName === START_COLOR_NAME && x.inStock)
        ?? odooProduct.variants.find(x => x.colorName === START_COLOR_NAME)
      : undefined;
    const v = start ?? defaultVariant(odooProduct);
    if (v) { setOdooColor(v.colorName ?? null); setOdooSize(v.size ?? null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odooProduct]);
  /** Elegir color: siempre en el tamaño elegido (solo se listan los colores de ese tamaño). */
  const selectOdooColor = (name: string) => {
    if (!odooProduct) return;
    setOdooColor(name);
    track("customizer_color_select", { source: "odoo", color: name });
  };
  /** Elegir tamaño: mantiene el color si existe en ese tamaño; si no, el primero con stock. */
  const selectOdooSize = (label: string) => {
    if (!odooProduct) return;
    const same = findVariant(odooProduct, odooColor, label);
    const v = (same?.inStock ? same : null)
      ?? odooProduct.variants.find(x => x.size === label && x.inStock)
      ?? same
      ?? odooProduct.variants.find(x => x.size === label);
    setOdooSize(label);
    setOdooColor(v?.colorName ?? null);
    track("customizer_size_select", { product: productId, size: label, source: "odoo" });
  };
  // Catálogo del personalizador para el material elegido: los productos de la
  // tienda (Odoo, por marca) + las formas genéricas propias. Cuando hay
  // productos de la tienda, el cliente elige de acá en vez del tipo genérico.
  const shopItems = useMemo<ShopItem[]>(() => {
    const knownType = (t: string) => material.products.some(p => p.drinkwareProductId === t);
    const fromOdoo = odooShopItems(catalog, materialId, knownType);
    if (!fromOdoo.length) return [];
    // Genéricos: las formas propias que no son el modelo de un producto
    // puntual de una marca (vaso con manija = Pico y Agarre, botella con asa = Termo Frontier).
    const generic: ShopItem[] = material.products
      .filter(p => p.drinkwareProductId && !getProduct(p.drinkwareProductId).model?.exactFor?.length)
      .map(p => ({
        key: `gen:${p.drinkwareProductId}`,
        name: p.name,
        brand: GENERIC_BRAND,
        type: p.drinkwareProductId!,
        thumb: null, from: null, colors: null, odooId: null,
      }));
    return [...fromOdoo, ...generic];
  }, [catalog, materialId, material]);
  const shopMode = shopItems.length > 0;
  const [shopSheetOpen, setShopSheetOpen] = useState(false);
  const shopKey = !shopMode ? null : genericPick ? `gen:${productId}` : odooProduct ? `odoo:${odooProduct.id}` : null;
  const shopItem = shopItems.find(i => i.key === shopKey) ?? null;
  const pickShopItem = (it: ShopItem) => {
    const mp = material.products.find(x => x.drinkwareProductId === it.type);
    if (!mp) return;
    startColorPending.current = false;
    if (mp.id !== materialProductId) handleSelectMaterialProduct(mp.id);
    setGenericPick(it.odooId === null);
    setOdooTemplateId(it.odooId);
    track("customizer_catalog_select", { key: it.key, product: it.name, brand: it.brand, type: it.type });
  };
  /** Línea de detalle de la tarjeta "Tu producto": tamaño y precio de la variante. */
  const shopDetail = genericPick
    ? "Forma genérica · se cotiza por WhatsApp"
    : odooProduct
      ? [odooSize, odooVariant ? formatGs(odooVariant.price) : (priceFrom(odooProduct) !== null ? `desde ${formatGs(priceFrom(odooProduct)!)}` : null)]
          .filter(Boolean).join(" · ")
      : "";
  /** Sin modelo 3D propio, la vista usa la forma genérica del tipo: avisarlo. */
  const approxNote = shopMode && !genericPick && odooProduct && !baseProduct.model?.exactFor?.includes(odooProduct.name)
    ? `La vista 3D de ${odooProduct.name} es aproximada; el diseño y el grabado son los reales.`
    : null;

  // Tamaño que dibuja el 3D: el de Odoo mapeado al perfil, o el elegido a mano.
  const viewSize = odooMode ? viewSizeId(baseProduct, odooSizes, odooSize) : size;
  const activeSize = getSize(baseProduct, viewSize);
  // El producto en ese tamaño: perfil, banda y modelo del tamaño si tiene propio.
  const product = productForSize(baseProduct, viewSize);

  const [color, setColor] = useState(COLORS.find(c => c.name.startsWith(START_COLOR_NAME))?.id ?? COLORS[0].id);
  const [customHex, setCustomHex] = useState<string | null>(null);
  // Ink colour for UV-printed text (only used when the technique is impresión UV).
  const [textColor, setTextColor] = useState("#161616");
  const [finish, setFinish] = useState(FINISHES[0].id);
  const [text, setText] = useState("");
  const [font, setFont] = useState(FONTS[0].id);
  const activeFont = FONTS.find(f => f.id === font) || FONTS[0];
  const [isOrdered, setIsOrdered] = useState(false);
  // "Traigo el mío": el cliente trae su termo/vaso/bolígrafo y solo paga el
  // grabado (el hero lo promete; antes solo existía para bolígrafos).
  const [ownProduct, setOwnProduct] = useState(false);
  // Grabado extra en tapa / base (null = no lo pidió; "" = sí, texto a definir).
  const [extraLid, setExtraLid] = useState<string | null>(null);
  const [extraBase, setExtraBase] = useState<string | null>(null);
  // Pedido sin texto, ícono ni imagen: primer click muestra el aviso.
  const [emptyWarning, setEmptyWarning] = useState(false);
  // Link del diseño: "copiado" o, si el portapapeles falla, la URL a la vista.
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkFallback, setLinkFallback] = useState<string | null>(null);
  // Número del último pedido creado ("CS-0042") para la confirmación breve del
  // paso; null cuando el POST falló y el mensaje salió por el fallback.
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [orderFallback, setOrderFallback] = useState(false);
  // Subida del preview al tocar "Continuar por WhatsApp": estado de carga del botón.
  const [isPreparing, setIsPreparing] = useState(false);
  // PNG snapshot of the finished 3D piece, shown in the Step 4 summary and sent
  // with the WhatsApp message. Captured from the live canvas while it's mounted.
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const previewImgRef = useRef<string | null>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  // Onboarding de la pantalla de Diseño del celular (ver editor-tour.tsx):
  // tour de 3 pasos la primera vez, avisos de AR y Listo cuando hacen falta.
  const arTipRef = useRef<HTMLSpanElement>(null);
  const addTipRef = useRef<HTMLButtonElement>(null);
  const colorTipRef = useRef<HTMLDivElement>(null);
  const productTipRef = useRef<HTMLDivElement>(null);
  /** Silueta real de la pieza en pantalla (la mide el visor 3D). */
  const thermosBoundsRef = useRef<(() => ScreenRect | null) | null>(null);
  const doneTipRef = useRef<HTMLButtonElement>(null);
  const tourSteps = useMemo<TourStep[]>(() => [
    { target: addTipRef, title: "Agregá tu diseño", body: "Texto, un dibujo o tu logo.", placement: "top", pad: 8, radius: 999 },
    { target: colorTipRef, title: "Elegí el color", body: "Cuatro acabados mate.", placement: "top", pad: 9, radius: 12 },
    { target: productTipRef, title: "Girá el termo", body: "Arrastrá para ver todos los lados.", placement: "bottom", pad: 10, radius: 18, getRect: () => thermosBoundsRef.current?.() ?? null },
  ], []);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourRun, setTourRun] = useState(0);
  const [arHint, setArHint] = useState(false);
  const [doneHint, setDoneHint] = useState(false);
  const [dragTipGone, setDragTipGone] = useState(false);
  const arHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTour = () => { setArHint(false); setTourRun(n => n + 1); setTourOpen(true); };
  const closeTour = React.useCallback(() => {
    setTourOpen(false);
    // Aviso de AR: 350 ms después del tour, una vez por dispositivo y solo si hay AR.
    const r = arTipRef.current?.getBoundingClientRect();
    if (!r || r.width === 0 || seen(HINT_AR_KEY)) return;
    if (arHintTimer.current) clearTimeout(arHintTimer.current);
    arHintTimer.current = setTimeout(() => { markSeen(HINT_AR_KEY); setArHint(true); }, 350);
  }, []);
  React.useEffect(() => () => { if (arHintTimer.current) clearTimeout(arHintTimer.current); }, []);
  const [plan, setPlan] = useState<EngravingPlanId>(ENGRAVING_PLANS[0].id);
  const [customImage, setCustomImage] = useState<ProcessedImage | null>(null);
  const [textPlacement, setTextPlacement] = useState<Placement>(DEFAULT_TEXT_PLACEMENT);
  // "Texto 2": un segundo texto con su propio contenido, fuente, tamaño y
  // ubicación (ej. la empresa arriba y el nombre del empleado abajo). Se cobra
  // como escritura extra. text2Open: la tarjeta está abierta aunque esté vacío.
  const [text2, setText2] = useState("");
  const [text2Font, setText2Font] = useState(FONTS[0].id);
  const [text2Placement, setText2Placement] = useState<Placement>(TEXT2_DEFAULT_PLACEMENT);
  const [text2Open, setText2Open] = useState(false);
  const [artPlacement, setArtPlacement] = useState<Placement>(DEFAULT_ART_PLACEMENT);
  // Placement mode: "edición en una cara" (rectángulo en la cara frontal) por
  // defecto. La disposición "Envolvente 360°" necesita el contorno completo,
  // así que al elegirla cambiamos automáticamente a edición libre (con aviso
  // en el toolbar de disposición) y volvemos a una cara al salir de ella.
  const isWrap360 = (textPlacement.layout ?? "auto") === "wrap360";
  const singleFace = !FREE_PLACEMENT && !isWrap360;
  /** El arte (ícono/imagen) va en una cara salvo con la ubicación libre. */
  const artSingleFace = !FREE_PLACEMENT;

  const [technique, setTechnique] = useState<TechniqueId>("laser");
  // Eufy (colour) is drinkware-with-coating only; everything else is laser-only.
  const canColor = allowsColorPrint(materialId, activeMProduct);
  /** Acero que la Dacen no toma (manija / no cilíndrico): se consulta en el local. */
  const colorConsult = !canColor && (materialId === "acero" || materialId === "inox") && activeMProduct?.drinkwareProductId
    ? printSpecFor(activeMProduct.drinkwareProductId)?.consult ?? null
    : null;
  const effectiveTechnique: TechniqueId = canColor ? technique : "laser";
  const activeTechnique = TECHNIQUES.find(t => t.id === effectiveTechnique) || TECHNIQUES[0];
  const [iconId, setIconId] = useState<string | null>(null);
  const selectedIcon = ENGRAVING_ICONS.find(i => i.id === iconId) ?? null;
  const [simpleKind, setSimpleKind] = useState<KindId>("text");
  // Controlled so we can move off the "Imagen" tab when it's hidden.
  const [drinkTab, setDrinkTab] = useState("color");

  const baseColor = COLORS.find(c => c.id === color) || COLORS[0];
  // El inoxidable natural no se pinta: gris acero fijo, ignora la paleta.
  const odooHex = odooMode && odooColor ? odooColors.find(c => c.name === odooColor)?.hex ?? null : null;
  const activeColorHex = isInox ? INOX_HEX : odooHex ?? customHex ?? baseColor.hex;
  const activeColorName = isInox
    ? "Acero natural"
    : odooMode && odooColor ? odooColor
    : customHex ? `${baseColor.name} · ${customHex.toUpperCase()}` : baseColor.name;
  const activePlan = ENGRAVING_PLANS.find(p => p.id === plan) || ENGRAVING_PLANS[0];
  const MaterialGlyph = MATERIAL_ICON[material.icon] ?? Box;

  // ── Mobile wizard step model (derived from the product kind) ───────────────
  const wizardLabels = isDrinkware
    ? ["Tu pieza", "Diseño", "Enviar"]
    : ["Tu pieza", "Diseño"];
  const designStepIndex = 2;
  const isDesignStep = isMobile && mobileStep === designStepIndex;

  const goToStep = (n: number) => {
    // Al salir de la pantalla de Diseño se vuelve a la página: mostrar el
    // personalizador desde arriba (la página pudo haber quedado en otro lado).
    if (isMobile && mobileStep === designStepIndex && n !== designStepIndex) {
      requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: "start" }));
    }
    setMobileStep(n);
    track("customizer_step", { step: n, step_name: wizardLabels[n - 1] });
    if (n === designStepIndex && !designReachedRef.current) {
      designReachedRef.current = true;
      track("design_reached", { ms: viewStartRef.current === null ? null : Math.round(performance.now() - viewStartRef.current) });
    }
  };
  const designReachedRef = useRef(false);
  const vp = useVisualViewport();
  /** Alto del visor en la pantalla de Diseño del celular: ~40 % de lo visible. */
  const mobileViewerH = Math.round(Math.min(340, Math.max(150, vp.height * (vp.keyboard ? 0.38 : 0.42))));

  // Keep the step in range if the product kind changes the step count.
  React.useEffect(() => {
    setMobileStep(s => Math.min(s, wizardLabels.length));
  }, [wizardLabels.length]);

  // Menú / footer / #stickers: abrir en el modo pedido (ver section-reveal.ts).
  React.useEffect(() => {
    const apply = () => { const m = takeCustomizerMode(); if (m) setMode(m); };
    apply();
    window.addEventListener(CUSTOMIZER_MODE_EVENT, apply);
    return () => window.removeEventListener(CUSTOMIZER_MODE_EVENT, apply);
  }, []);

  // ── "Diseñar uno igual" desde la galería ───────────────────────────────────
  // Arranca con el producto de la foto (material + producto + talla por
  // defecto); en celular salta al paso de Diseño, como un link compartido.
  React.useEffect(() => onDesignPreset(({ materialId: mid, materialProductId: pid }) => {
    const m = MATERIALS.find(x => x.id === mid);
    const mp = m?.products.find(p => p.id === pid);
    if (!m || !mp) return;
    startColorPending.current = false;
    setMode("products");
    handleSelectMaterial(m.id);
    setMaterialProductId(mp.id);
    if (mp.drinkwareProductId) {
      const dp = getProduct(mp.drinkwareProductId);
      setSize(dp.sizes[1]?.id ?? dp.sizes[0].id);
    }
    setMobileStep(2); // Diseño
    track("customizer_preset", { material: m.id, product: mp.id });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // ── Link de diseño compartido (#diseno=…) ──────────────────────────────────
  // Al montar, si la URL trae un diseño, se aplica tal cual (validando cada id
  // contra el catálogo: un link viejo o editado a mano nunca rompe nada) y se
  // limpia el hash. En móvil se salta directo al paso de Diseño.
  React.useEffect(() => {
    const d = readSharedDesign();
    if (!d) return;
    startColorPending.current = false;
    const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
    const m = MATERIALS.find(x => x.id === d.materialId);
    if (m) {
      setMaterialId(m.id);
      const mp = m.products.find(p => p.id === d.materialProductId) ?? m.products[0];
      setMaterialProductId(mp?.id ?? "");
      if (mp?.drinkwareProductId) {
        const dp = getProduct(mp.drinkwareProductId);
        setSize(dp.sizes.some(x => x.id === d.sizeId) ? d.sizeId : (dp.sizes[1]?.id ?? dp.sizes[0].id));
      }
      setMobileStep(2); // Diseño
    }
    if (COLORS.some(c => c.id === d.colorId)) setColor(d.colorId);
    setCustomHex(isHex(d.customHex) ? d.customHex : null);
    if (FINISHES.some(f => f.id === d.finish)) setFinish(d.finish);
    setTechnique(normalizeTechnique(d.technique));
    setText(capEngravingText(typeof d.text === "string" ? d.text : ""));
    if (FONTS.some(f => f.id === d.fontId)) setFont(d.fontId);
    if (isHex(d.textColor)) setTextColor(d.textColor);
    setIconId(ENGRAVING_ICONS.some(i => i.id === d.iconId) ? d.iconId : null);
    setOwnProduct(d.ownProduct === true);
    // Variante de Odoo: si el link es viejo o el producto ya no existe, el
    // efecto de selección vuelve sola a la primera variante con stock.
    if (typeof d.odooTemplateId === "number") setOdooTemplateId(d.odooTemplateId);
    if (typeof d.odooColor === "string") setOdooColor(d.odooColor);
    if (typeof d.odooSize === "string") setOdooSize(d.odooSize);
    if (d.textPlacement && typeof d.textPlacement === "object") setTextPlacement({ ...DEFAULT_TEXT_PLACEMENT, ...d.textPlacement });
    if (d.artPlacement && typeof d.artPlacement === "object") setArtPlacement({ ...DEFAULT_ART_PLACEMENT, ...d.artPlacement });
    setExtraLid(typeof d.extraLid === "string" ? d.extraLid.slice(0, EXTRA_TEXT_MAX) : null);
    setExtraBase(typeof d.extraBase === "string" ? d.extraBase.slice(0, EXTRA_TEXT_MAX) : null);
    const t2 = capEngravingText(typeof d.text2 === "string" ? d.text2 : "");
    setText2(t2);
    setText2Open(!!t2);
    if (FONTS.some(f => f.id === d.text2FontId)) setText2Font(d.text2FontId!);
    if (d.text2Placement && typeof d.text2Placement === "object") setText2Placement({ ...TEXT2_DEFAULT_PLACEMENT, ...d.text2Placement });
    setDrinkTab("text");
    clearSharedDesign();
    track("design_link_open");
  }, []);

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
  // Embudo: el personalizador se vio (una vez por carga de página).
  const viewTrackedRef = useRef(false);
  const viewStartRef = useRef<number | null>(null);
  React.useEffect(() => {
    if (customizerInView && !viewTrackedRef.current) {
      viewTrackedRef.current = true;
      viewStartRef.current = performance.now();
      track("customizer_view");
    }
  }, [customizerInView]);
  // Embudo del celular: tiempo hasta tocar "Diseñar" y hasta el primer texto,
  // y en qué paso se va la gente (pagehide sin haber enviado el pedido).
  const msSinceView = () => (viewStartRef.current === null ? null : Math.round(performance.now() - viewStartRef.current));
  const firstTextTracked = useRef(false);
  React.useEffect(() => {
    if (!text || firstTextTracked.current) return;
    firstTextTracked.current = true;
    track("design_first_text", { ms: msSinceView(), mobile: isMobile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  const leaveRef = useRef({ step: mobileStep, name: "", ordered: false, mobile: isMobile });
  leaveRef.current = { step: mobileStep, name: wizardLabels[mobileStep - 1] ?? "", ordered: isOrdered, mobile: isMobile };
  React.useEffect(() => {
    const onHide = () => {
      const l = leaveRef.current;
      if (!viewTrackedRef.current || l.ordered || !l.mobile) return;
      track("customizer_leave", { step: l.step, step_name: l.name, ms: msSinceView() });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // text only ⇒ names). Siempre en sync: el plan ya no se elige a mano.
  const inferredPlanId: EngravingPlanId = customImage ? "logo" : iconId ? "drawing" : "names";
  React.useEffect(() => {
    if (isDrinkware && plan !== inferredPlanId) setPlan(inferredPlanId);
  }, [inferredPlanId, isDrinkware, plan]);

  // Image upload is stainless-steel drinkware only. (Ya no lo condiciona el plan:
  // los planes/precios se quitaron del personalizador.)
  const allowsImage = canUploadImage;
  // Custom art shown on the 3D — a selected icon takes priority over an upload.
  const iconDataUrl = useMemo(() => (selectedIcon ? iconToDataUrl(selectedIcon) : null), [selectedIcon]);
  const artUrl = iconDataUrl ?? (allowsImage ? customImage?.svgDataUrl ?? null : null);
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
  const isColorPrint = effectiveTechnique === "color";

  // ── Todo el vaso (360°): fondo de la vuelta completa (Dacen F5, DACEN.md §12)
  // Solo impresión a color en piezas cilíndricas que entran en la Dacen. Si el
  // cliente cambia a láser o a una pieza que no entra, el fondo queda guardado
  // pero no se muestra ni viaja en el pedido.
  const [wrapDesign, setWrapDesignRaw] = useState<WrapDesign | null>(null);
  const wrapUrlRef = useRef<string | null>(null);
  const setWrapDesign = React.useCallback((next: WrapDesign | null) => {
    const old = wrapUrlRef.current;
    if (old && old !== next?.url && old.startsWith("blob:")) URL.revokeObjectURL(old);
    wrapUrlRef.current = next?.url ?? null;
    setWrapDesignRaw(next);
  }, []);
  const wrapSpec = isDrinkware ? printSpecFor(productId, viewSize) : null;
  const canWrap = isDrinkware && !isGlass && isColorPrint && !!wrapSpec && fitsDacen(wrapSpec);
  const activeWrap = canWrap ? wrapDesign : null;
  const wrapPrintSize = React.useMemo(
    () => (isDrinkware ? dacenPrintSize(productId, viewSize) : null),
    [isDrinkware, productId, viewSize],
  );
  const wrapDpi = activeWrap && wrapPrintSize
    ? wrapEffectiveDpi(activeWrap, wrapPrintSize.circumferenceMm, wrapPrintSize.heightMm / wrapPrintSize.circumferenceMm)
    : null;
  const [unwrappedOpen, setUnwrappedOpen] = useState(false);
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
    () => markHalfExtents(product, artSpec, artPlacement, artSingleFace),
    [product, artSpec, artPlacement, artSingleFace],
  );

  // ── Texto 2 ── mismo tratamiento que el principal, con su fuente propia.
  const activeFont2 = FONTS.find(f => f.id === text2Font) || FONTS[0];
  const text2FontFamily = activeFont2.style.fontFamily as string | undefined;
  React.useEffect(() => {
    const fam = text2FontFamily?.split(",")[0]?.trim().replace(/['"]/g, "");
    if (!fam || typeof document === "undefined" || !document.fonts?.load) return;
    let alive = true;
    document.fonts.load(`900 32px "${fam}"`).then(() => { if (alive) setFontTick(t => t + 1); }).catch(() => {});
    return () => { alive = false; };
  }, [text2FontFamily]);
  const text2Spec = React.useMemo<MarkSpec>(
    () => ({ kind: "text", text: text2, fontFamily: text2FontFamily, colorPrint: isColorPrint }),
    [text2, text2FontFamily, isColorPrint],
  );
  const text2Extents = React.useMemo<MarkHalfExtents>(
    () => markHalfExtents(product, text2Spec, text2Placement, singleFace),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, text2Spec, text2Placement, singleFace, fontTick],
  );
  /** Lo que recibe el 3D (y el PNG de la Dacen) además del texto principal. */
  const extraTextMarks = React.useMemo<TextMark[]>(
    () => (text2.trim() ? [{ text: text2, placement: text2Placement, fontFamily: text2FontFamily }] : []),
    [text2, text2Placement, text2FontFamily],
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
  // del input vuelve el "Arrastrá para girar" normal.
  const [textFieldFocused, setTextFieldFocused] = useState(false);
  const wrapSpin = isWrap360 && textFieldFocused && isDrinkware;

  // Shape of the editable rectangle (w/h), so the drag pad mirrors it.
  const faceAreaAspect = React.useMemo(() => {
    const m = bandMetrics(product, TEXTURE_W, TEXTURE_H);
    const AW = 2 * m.face.uHalfWidth * TEXTURE_W;
    const AH = m.face.vHeightFrac * (m.botPx - m.topPx);
    return AH > 0 ? AW / AH : 1;
  }, [product]);

  // ── Zonas sin grabado (ubicación libre) ────────────────────────────────────
  // Las del producto (cargadas a mano / manija de los modelos sin .glb) más las
  // que mide el visor sobre las piezas del modelo: logo y marca, manija,
  // etiqueta y relieves.
  const [modelZones, setModelZones] = useState<{ id: string; zones: KeepOutZone[] }>({ id: "", zones: [] });
  const onModelKeepOut = React.useCallback((id: string, zones: KeepOutZone[]) => {
    setModelZones(prev => (prev.id === id && JSON.stringify(prev.zones) === JSON.stringify(zones) ? prev : { id, zones }));
  }, []);
  const keepOutZones = React.useMemo<KeepOutZone[]>(
    () => {
      if (!isDrinkware || !FREE_PLACEMENT) return [];
      const zones = [...staticZones(product), ...(modelZones.id === product.id ? modelZones.zones : [])];
      // Con el fondo "Todo el vaso (360°)" la impresión tapa el logo de la marca
      // y los relieves (el 3D oculta el logo): se escribe en cualquier lado.
      // Solo una manija seguiría frenando (las piezas de la Dacen no tienen).
      return activeWrap ? zones.filter(z => z.kind === "handle") : zones;
    },
    [isDrinkware, product, modelZones, activeWrap],
  );
  // El Envolvente 360° da la vuelta entera: no se lo frena con zonas.
  const zonesFor = React.useCallback(
    (p: Placement) => ((p.layout ?? "auto") === "wrap360" ? [] : keepOutZones),
    [keepOutZones],
  );

  // Nearest valid placement for a given mark: inside the front-face rectangle
  // (una cara) or anywhere on the band outside the keep-out zones (libre).
  // `from`: the previous placement while dragging (slides along a zone edge).
  const clampTextR = React.useCallback(
    (p: Placement, from?: Placement): FreeClampResult => singleFace
      ? { placement: clampPlacementToFrontArea(p, markHalfExtents(product, textSpec, p, true), product), blockedBy: null }
      : clampFree(p, markHalfExtents(product, textSpec, p, false), zonesFor(p), from),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, textSpec, singleFace, zonesFor, fontTick],
  );
  const clampArtR = React.useCallback(
    (p: Placement, from?: Placement): FreeClampResult => artSingleFace
      ? { placement: clampPlacementToFrontArea(p, markHalfExtents(product, artSpec, p, true), product), blockedBy: null }
      : clampFree(p, markHalfExtents(product, artSpec, p, false), keepOutZones, from),
    [product, artSpec, artSingleFace, keepOutZones],
  );
  const clampText2R = React.useCallback(
    (p: Placement, from?: Placement): FreeClampResult => singleFace
      ? { placement: clampPlacementToFrontArea(p, markHalfExtents(product, text2Spec, p, true), product), blockedBy: null }
      : clampFree(p, markHalfExtents(product, text2Spec, p, false), keepOutZones, from),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, text2Spec, singleFace, keepOutZones, fontTick],
  );
  const clampTextP = React.useCallback((p: Placement) => clampTextR(p).placement, [clampTextR]);
  const clampArtP = React.useCallback((p: Placement) => clampArtR(p).placement, [clampArtR]);
  const clampText2P = React.useCallback((p: Placement) => clampText2R(p).placement, [clampText2R]);

  // Setters that keep placements valid (rectangle or keep-out zones). Flat
  // blanks skip it: their face renderer clamps against the real face edges.
  const applyTextPlacement = (next: Placement) => setTextPlacement(!is3DObject && (singleFace || FREE_PLACEMENT) ? clampTextP(next) : next);
  const applyArtPlacement = (next: Placement) => setArtPlacement(!is3DObject ? clampArtP(next) : next);
  const applyText2Placement = (next: Placement) => setText2Placement(singleFace || FREE_PLACEMENT ? clampText2P(next) : next);

  // Re-clamp when growing the mark or the product changes could push the box out
  // of bounds (typing a longer name, a bigger plan image, switching size, the
  // model's zones arriving, …).
  React.useEffect(() => {
    if ((singleFace || FREE_PLACEMENT) && !is3DObject) setTextPlacement(p => clampTextP(p));
  }, [singleFace, is3DObject, clampTextP]);
  React.useEffect(() => {
    if (!is3DObject) setArtPlacement(p => clampArtP(p));
  }, [is3DObject, clampArtP]);
  React.useEffect(() => {
    if (singleFace || FREE_PLACEMENT) setText2Placement(p => clampText2P(p));
  }, [singleFace, clampText2P]);

  // Choque contra una zona sin grabado: se resalta su contorno, vibra una vez
  // y se explica debajo del visor ("Ahí está el logo de la marca…").
  const [keepOutHit, setKeepOutHit] = useState<KeepOutZone | null>(null);
  const keepOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepOutLast = useRef<KeepOutZone | null>(null);
  const bumpKeepOut = React.useCallback((z: KeepOutZone) => {
    if (keepOutLast.current !== z) {
      keepOutLast.current = z;
      try { navigator.vibrate?.(12); } catch { /* sin vibración */ }
      track("keep_out_hit", { kind: z.kind });
    }
    setKeepOutHit(z);
    if (keepOutTimer.current) clearTimeout(keepOutTimer.current);
    keepOutTimer.current = setTimeout(() => { setKeepOutHit(null); keepOutLast.current = null; }, 1400);
  }, []);

  // ── Design drag / nudge (posicionamiento sobre el 3D) ───────────────────────
  // Which mark a drag-on-3D gesture or the floating d-pad moves: follow the open
  // editor tab, then fall back to whatever design actually exists.
  // Dos modos bien separados: MIRAR (arrastrar gira la pieza) y EDITAR un
  // elemento seleccionado (arrastrar lo mueve, con "Listo" para terminar). Se
  // entra a editar al crear algo, al tocarlo sobre el producto o con el botón
  // "Mover o editar diseño".
  const hasText = !!text;
  const hasText2 = !!text2.trim();
  const hasArt = !!artUrl && artImageSize !== "none";
  const [selected, setSelected] = useState<DesignKind | null>(null);
  const activeDesignKind: DesignKind | null =
    selected === "text" && hasText ? "text"
    : selected === "text2" && hasText2 ? "text2"
    : selected === "art" && hasArt ? "art"
    : null;
  const designActive = activeDesignKind !== null;

  // Modo de edición vigente sobre el visor 3D. La "edición libre" del
  // Envolvente 360° es exclusiva del texto: al pasar a Íconos o Imagen (arte
  // activo) volvemos al rectángulo de una cara para poder arrastrar el ícono o
  // la foto, aunque el texto siga envolviendo el producto.
  const editSingleFace = activeDesignKind === "art" ? artSingleFace : singleFace;

  // Cara del texto. Si el producto nuevo no la ofrece (ej. el dorso de un termo
  // con logo atrás), vuelve al frente.
  const textFaces = engraveFacesFor(product);
  const faceOf = (p: Placement): FaceId => (textFaces.includes(p.face ?? "front") ? p.face ?? "front" : "front");
  const textFace = faceOf(textPlacement);
  // El texto 2 y el arte (ícono/imagen) también eligen su cara: así se puede
  // diseñar el lado del logo de la marca, no solo el frente.
  const text2Face = faceOf(text2Placement);
  const artFace = is3DObject ? "front" : faceOf(artPlacement);
  React.useEffect(() => {
    if ((textPlacement.face ?? "front") !== textFace) setTextPlacement(p => clampTextP({ ...p, face: textFace }));
  }, [textPlacement.face, textFace, clampTextP]);
  React.useEffect(() => {
    if ((text2Placement.face ?? "front") !== text2Face) setText2Placement(p => clampText2P({ ...p, face: text2Face }));
  }, [text2Placement.face, text2Face, clampText2P]);
  React.useEffect(() => {
    if (!is3DObject && (artPlacement.face ?? "front") !== artFace) setArtPlacement(p => clampArtP({ ...p, face: artFace }));
  }, [is3DObject, artPlacement.face, artFace, clampArtP]);
  /** Cara más cercana a un punto de la vuelta (resumen con ubicación libre). */
  const faceAtU = (u: number): FaceId => {
    const d = (f: FaceId) => { const c = faceCenterU(product, f); return Math.abs(nearU(u, c) - c); };
    return (["front", "left", "back", "right"] as FaceId[]).reduce((a, b) => (d(b) < d(a) ? b : a));
  };
  /** Lleva un elemento a otra cara, en el mismo lugar dentro del rectángulo. */
  const moveToFace = (p: Placement, from: FaceId, face: FaceId): Placement =>
    ({ ...p, face, u: p.u + faceCenterU(product, face) - faceCenterU(product, from) });
  const selectTextFace = (face: FaceId) => {
    if (face === textFace) return;
    pushHistory();
    applyTextPlacement(moveToFace(textPlacement, textFace, face));
    flashGuides();
    track("text_face_select", { product: productId, face });
  };
  const selectText2Face = (face: FaceId) => {
    if (face === text2Face) return;
    pushHistory();
    applyText2Placement(moveToFace(text2Placement, text2Face, face));
    thermosSnapRef.current?.(faceCenterU(product, face));
    flashGuides();
    track("text2_face_select", { product: productId, face });
  };
  const selectArtFace = (face: FaceId) => {
    if (face === artFace) return;
    pushHistory();
    applyArtPlacement(moveToFace(artPlacement, artFace, face));
    thermosSnapRef.current?.(faceCenterU(product, face));
    flashGuides();
    track("art_face_select", { product: productId, face });
  };
  // Con un diseño en el lado del logo, el 3D oculta el logo de la marca: el
  // diseño va en su lugar.
  // (Con la ubicación libre el logo es zona sin grabado: nunca queda tapado.)
  const designOnLogoSide = !FREE_PLACEMENT && !!product.logoBack && !is3DObject && (
    (hasText && (!singleFace || textFace === "back"))
    || (hasText2 && (!singleFace || text2Face === "back"))
    || (hasArt && artFace === "back"));

  // Dashed front-face guides appear ONLY while the design is being moved — a drag
  // holds them on; a nudge/center tap flashes them briefly.
  const [guidesActive, setGuidesActive] = useState(false);
  const guidesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashGuides = React.useCallback(() => {
    setGuidesActive(true);
    if (guidesTimer.current) clearTimeout(guidesTimer.current);
    guidesTimer.current = setTimeout(() => setGuidesActive(false), 1100);
  }, []);
  // Arrastrando (ubicación libre): la pieza gira para seguir al diseño.
  const [designDragging, setDesignDragging] = useState(false);
  const beginDesignDrag = React.useCallback(() => {
    if (guidesTimer.current) { clearTimeout(guidesTimer.current); guidesTimer.current = null; }
    setGuidesActive(true);
    setDesignDragging(true);
    setHistory(h => [...h.slice(-29), snapshotRef.current]);
  }, []);
  const endDesignDrag = React.useCallback(() => { setDesignDragging(false); flashGuides(); }, [flashGuides]);

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
        const pad = placementToPad(p.u, p.v, product, p.face);
        const np = padToPlacement(
          Math.max(0, Math.min(1, pad.padX + dPadX)),
          Math.max(0, Math.min(1, pad.padY + dPadY)),
          product,
          p.face,
        );
        return clampFn({ ...p, u: np.u, v: np.v });
      }
      let u = p.u + dPadX; u -= Math.floor(u);
      const v = Math.max(0, Math.min(1, p.v + dPadY));
      return { ...p, u, v };
    };
    if (activeDesignKind === "text") setTextPlacement(p => apply(p, clampTextP, singleFace));
    else if (activeDesignKind === "text2") setText2Placement(p => apply(p, clampText2P, singleFace));
    else if (activeDesignKind === "art") setArtPlacement(p => apply(p, clampArtP, true));
  }, [singleFace, is3DObject, product, activeDesignKind, clampTextP, clampText2P, clampArtP]);

  const centerActivePlacement = React.useCallback(() => {
    if (FREE_PLACEMENT && !is3DObject) {
      // Libre: al centro de la cara donde está (frente, costado o dorso), a
      // media altura; si ahí hay una zona sin grabado, a la salida más cercana.
      const toFace = (p: Placement): Placement => {
        const f0 = faceCenterU(product, "front");
        const k = Math.round((nearU(p.u, f0) - f0) * 4);
        return { ...p, u: f0 + k / 4, v: 0.5 };
      };
      const cur = activeDesignKind === "text" ? textPlacement : activeDesignKind === "text2" ? text2Placement : artPlacement;
      if (activeDesignKind === "text") setTextPlacement(clampTextP(toFace(cur)));
      else if (activeDesignKind === "text2") setText2Placement(clampText2P({ ...cur, u: toFace(cur).u }));
      else if (activeDesignKind === "art") setArtPlacement(clampArtP(toFace(cur)));
      thermosSnapRef.current?.(toFace(cur).u);
      flashGuides();
      return;
    }
    // Face centre for flat blanks; centre of the front-face rectangle (same
    // u, product-tuned v centre, run through the clamp) for drinkware.
    const c = is3DObject ? { u: 0.5, v: 0.5 } : padToPlacement(0.5, 0.5, product);
    const clampT = is3DObject ? (p: Placement) => p : clampTextP;
    const clampA = is3DObject ? (p: Placement) => p : clampArtP;
    // El texto se centra en su propia cara (frente, dorso o costado).
    const ct = is3DObject ? c : padToPlacement(0.5, 0.5, product, textPlacement.face);
    const c2 = is3DObject ? c : padToPlacement(0.5, 0.5, product, text2Placement.face);
    const ca = is3DObject ? c : padToPlacement(0.5, 0.5, product, artPlacement.face);
    if (activeDesignKind === "text") setTextPlacement(p => clampT({ ...p, u: ct.u, v: ct.v }));
    // Texto 2: centrado solo en horizontal (arriba/abajo lo elige el cliente).
    else if (activeDesignKind === "text2") setText2Placement(p => (is3DObject ? p : singleFace ? clampText2P({ ...p, u: c2.u }) : { ...p, u: c2.u }));
    else if (activeDesignKind === "art") setArtPlacement(p => clampA({ ...p, u: ca.u, v: ca.v }));
    flashGuides();
  }, [is3DObject, product, activeDesignKind, clampTextP, clampText2P, clampArtP, flashGuides, textPlacement, text2Placement, artPlacement, singleFace]);

  // Objetos planos (billetera, tabla…): delta del arrastre como fracción del
  // canvas → delta del pad. La cara ocupa más o menos la mitad del visor.
  const onDesignMove = React.useCallback((dxFrac: number, dyFrac: number) => {
    moveActivePlacement(dxFrac * 1.7, dyFrac * 1.5);
  }, [moveActivePlacement]);

  // Drinkware: el visor ya convierte el arrastre 1:1 a u (vuelta) y v (banda),
  // así el diseño queda pegado al dedo. En una cara se re-encuadra en el área.
  const onDesignMoveUV = React.useCallback((du: number, dv: number) => {
    if (FREE_PLACEMENT) {
      // Libre: el paso se "resbala" por el borde de las zonas sin grabado.
      const step = (p: Placement, clampR: (q: Placement, from?: Placement) => FreeClampResult) => {
        const r = clampR({ ...p, u: p.u + du, v: p.v + dv }, p);
        if (r.blockedBy) bumpKeepOut(r.blockedBy);
        return r.placement;
      };
      if (activeDesignKind === "text") setTextPlacement(step(textPlacement, clampTextR));
      else if (activeDesignKind === "text2") setText2Placement(step(text2Placement, clampText2R));
      else if (activeDesignKind === "art") setArtPlacement(step(artPlacement, clampArtR));
      return;
    }
    const apply = (p: Placement, clampFn: (q: Placement) => Placement, sf: boolean): Placement => {
      if (sf) return clampFn({ ...p, u: p.u + du, v: p.v + dv });
      let u = p.u + du; u -= Math.floor(u);
      return { ...p, u, v: Math.max(0, Math.min(1, p.v + dv)) };
    };
    if (activeDesignKind === "text") setTextPlacement(p => apply(p, clampTextP, singleFace));
    else if (activeDesignKind === "text2") setText2Placement(p => apply(p, clampText2P, singleFace));
    else if (activeDesignKind === "art") setArtPlacement(p => apply(p, clampArtP, true));
  }, [activeDesignKind, clampTextP, clampText2P, clampArtP, singleFace, textPlacement, text2Placement, artPlacement, clampTextR, clampText2R, clampArtR, bumpKeepOut]);

  // ── Deshacer ────────────────────────────────────────────────────────────────
  // Una foto del diseño antes de cada acción (arrastre, tamaño, centrar,
  // borrar). "Deshacer" vuelve a la anterior.
  type DesignSnapshot = {
    text: string; textPlacement: Placement; artPlacement: Placement;
    iconId: string | null; customImage: ProcessedImage | null;
    text2: string; text2Placement: Placement;
  };
  const [history, setHistory] = useState<DesignSnapshot[]>([]);
  const historyRef = useRef(history);
  historyRef.current = history;
  const snapshotRef = useRef<DesignSnapshot>({ text, textPlacement, artPlacement, iconId, customImage, text2, text2Placement });
  snapshotRef.current = { text, textPlacement, artPlacement, iconId, customImage, text2, text2Placement };
  const pushHistory = React.useCallback(() => {
    setHistory(h => [...h.slice(-29), snapshotRef.current]);
  }, []);
  const undo = React.useCallback(() => {
    const h = historyRef.current;
    const last = h[h.length - 1];
    if (!last) return;
    setText(last.text);
    setTextPlacement(last.textPlacement);
    setArtPlacement(last.artPlacement);
    setIconId(last.iconId);
    setCustomImage(last.customImage);
    setText2(last.text2);
    setText2Placement(last.text2Placement);
    if (last.text2) setText2Open(true);
    setHistory(h.slice(0, -1));
    track("design_undo");
  }, []);
  // Tras borrar, el elemento (y su barra) desaparece: ofrecemos deshacer unos segundos.
  const [undoDeleteUntil, setUndoDeleteUntil] = useState(0);
  React.useEffect(() => {
    if (!undoDeleteUntil) return;
    const t = setTimeout(() => setUndoDeleteUntil(0), Math.max(0, undoDeleteUntil - Date.now()));
    return () => clearTimeout(t);
  }, [undoDeleteUntil]);

  // ── Snap-to-design para la captura ──────────────────────────────────────────
  // El visor grande registra acá una función que gira la pieza para que un u de
  // textura quede mirando a cámara. Antes de capturar la imagen del resumen la
  // usamos para que el área personalizada salga completa en la foto.
  const thermosSnapRef = useRef<((u: number) => void) | null>(null);
  // Dibuja un cuadro en el momento (el visor solo dibuja cuando algo cambia).
  const thermosRenderRef = useRef<(() => void) | null>(null);
  // "Ver en AR": copia de la pieza del visor grande (ver ArViewButton).
  const thermosArRef = useRef<(() => { object: import("three").Object3D; metersPerUnit: number } | null) | null>(null);
  // Sube cuando el visor terminó de montar la pieza (re-dispara la captura).
  const [viewerReady, setViewerReady] = useState(0);

  // u que debe quedar de frente: el centro de la cara frontal en "una cara", o
  // la posición real del texto cuando el modo de edición vigente es libre (el
  // arte se edita siempre en la cara frontal).
  // El texto puede ir en otra cara (dorso, costado): sin nada seleccionado
  // manda la cara del texto, así el visor y la captura muestran lo grabado.
  const frontU = faceCenterU(product, "front");
  const textFaceU = faceCenterU(product, textFace);
  const text2FaceU = faceCenterU(product, text2Face);
  const artFaceU = faceCenterU(product, artFace);
  const designFaceU = FREE_PLACEMENT && !is3DObject
    ? (activeDesignKind === "text" ? textPlacement.u
      : activeDesignKind === "text2" ? text2Placement.u
      : activeDesignKind === "art" ? artPlacement.u
      : hasText ? textPlacement.u : hasText2 ? text2Placement.u : hasArt ? artPlacement.u : frontU)
    : activeDesignKind === "art"
    ? artFaceU
    : !singleFace
      ? (activeDesignKind === "text" ? textPlacement.u : activeDesignKind === "text2" ? text2Placement.u : frontU)
    : activeDesignKind === "text2" ? text2FaceU
    : hasText ? textFaceU : hasText2 ? text2FaceU : hasArt ? artFaceU : frontU;

  // ── Seleccionar / terminar ──────────────────────────────────────────────────
  const selectDesign = React.useCallback((kind: DesignKind, source: string) => {
    setSelected(kind);
    setUndoDeleteUntil(0);
    // La pieza gira para mostrar de frente lo que se va a editar.
    thermosSnapRef.current?.(
      kind === "text" ? (singleFace ? textFaceU : textPlacement.u)
      : kind === "text2" ? (singleFace ? text2FaceU : text2Placement.u)
      : artSingleFace ? artFaceU : artPlacement.u,
    );
    flashGuides();
    track("design_select", { kind, source });
  }, [singleFace, artSingleFace, textPlacement.u, text2Placement.u, artPlacement.u, textFaceU, text2FaceU, artFaceU, flashGuides]);

  const finishEditing = React.useCallback(() => {
    setSelected(null);
    if (guidesTimer.current) { clearTimeout(guidesTimer.current); guidesTimer.current = null; }
    setGuidesActive(false);
    track("design_done");
  }, []);

  // Recién creado (primer letra, ícono elegido, imagen subida): ya queda
  // seleccionado para acomodarlo, con "Listo" a mano.
  const prevHasText = useRef(hasText);
  React.useEffect(() => {
    if (hasText && !prevHasText.current) selectDesign("text", "create");
    prevHasText.current = hasText;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasText]);
  const prevHasText2 = useRef(hasText2);
  React.useEffect(() => {
    if (hasText2 && !prevHasText2.current) selectDesign("text2", "create");
    prevHasText2.current = hasText2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasText2]);
  const prevArtUrl = useRef(artUrl);
  React.useEffect(() => {
    if (artUrl && artUrl !== prevArtUrl.current && hasArt) selectDesign("art", "create");
    prevArtUrl.current = artUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artUrl]);

  // Toque sobre el visor: sobre un diseño lo selecciona; en cualquier otro
  // lado, si se estaba editando, termina (igual que "Listo").
  const tapSelectedRef = useRef<((kind: DesignKind) => void) | null>(null);
  const handleViewerTap = React.useCallback((hit: { u: number; v: number } | null) => {
    const over = (p: Placement, ext: MarkHalfExtents) => {
      if (!hit) return false;
      const du = hit.u - p.u - Math.round(hit.u - p.u); // distancia en la vuelta, con costura
      // Margen generoso (≈ un dedo): tocar cerca del diseño también lo toma.
      return Math.abs(du) <= ext.halfU + 0.05 && Math.abs(hit.v - p.v) <= ext.halfV + 0.1;
    };
    // El que se está editando gana si dos se tocan (ej. empresa y nombre juntos).
    const kinds: DesignKind[] = ["text", "text2", "art"];
    if (activeDesignKind) kinds.sort((a, b) => (a === activeDesignKind ? -1 : b === activeDesignKind ? 1 : 0));
    for (const k of kinds) {
      const has = k === "text" ? hasText : k === "text2" ? hasText2 : hasArt;
      const p = k === "text" ? textPlacement : k === "text2" ? text2Placement : artPlacement;
      const ext = k === "text" ? textExtents : k === "text2" ? text2Extents : artExtents;
      if (has && over(p, ext)) {
        if (activeDesignKind !== k) selectDesign(k, "tap");
        else tapSelectedRef.current?.(k); // celular: segundo toque = editarlo
        return;
      }
    }
    if (activeDesignKind) finishEditing();
  }, [hasText, hasText2, hasArt, textPlacement, text2Placement, artPlacement, textExtents, text2Extents, artExtents, activeDesignKind, selectDesign, finishEditing]);

  /** ¿El dedo se apoyó sobre el diseño en edición? (mismo margen que el toque). */
  const isOverActiveDesign = React.useCallback((hit: { u: number; v: number }) => {
    const p = activeDesignKind === "text" ? textPlacement : activeDesignKind === "text2" ? text2Placement : activeDesignKind === "art" ? artPlacement : null;
    const ext = activeDesignKind === "text" ? textExtents : activeDesignKind === "text2" ? text2Extents : artExtents;
    if (!p) return false;
    const du = hit.u - p.u - Math.round(hit.u - p.u);
    return Math.abs(du) <= ext.halfU + 0.05 && Math.abs(hit.v - p.v) <= ext.halfV + 0.1;
  }, [activeDesignKind, textPlacement, text2Placement, artPlacement, textExtents, text2Extents, artExtents]);

  // Acciones de la barra de edición.
  const scaleOf = (kind: DesignKind | null) => kind === "text" ? textPlacement.scale
    : kind === "text2" ? text2Placement.scale
    : artPlacement.scale;
  const activeScale = scaleOf(activeDesignKind);
  /**
   * Lleva el elemento a ese tamaño (dentro de sus límites). Devuelve si quedó
   * en el mínimo o el máximo (el pellizco vibra al llegar).
   */
  const scaleActiveTo = (target: number, kind: DesignKind | null = activeDesignKind): "min" | "max" | null => {
    const r = Math.round(target * 100) / 100;
    const [lo, hi] = kind === "text" ? [TEXT_SCALE_MIN, Math.min(TEXT_SCALE_MAX, wrapMaxScale)]
      : kind === "text2" ? [TEXT_SCALE_MIN, TEXT_SCALE_MAX]
      : [0.3, 1.5];
    const s = Math.max(lo, Math.min(hi, r));
    if (kind === "text") applyTextPlacement({ ...textPlacement, scale: s });
    else if (kind === "text2") applyText2Placement({ ...text2Placement, scale: s });
    else if (kind === "art") applyArtPlacement({ ...artPlacement, scale: s });
    else return null;
    return r <= lo ? "min" : r >= hi ? "max" : null;
  };
  const resizeActive = (delta: number) => {
    pushHistory();
    scaleActiveTo(activeScale + delta);
    flashGuides();
  };
  // Pellizco sobre el visor (celular): el tamaño sigue a los dedos desde el
  // que tenía al apoyarlos. Un solo paso de "Deshacer" por pellizco.
  const pinchBaseRef = useRef(1);
  // Diseño que tomó el pellizco al apoyar los dedos (puede haberse
  // seleccionado en ese mismo gesto, antes de que React lo refleje).
  const pinchKindRef = useRef<DesignKind | null>(null);
  const pinchLimitRef = useRef<"min" | "max" | null>(null);
  const pinchPreselectedRef = useRef(true);
  const onDesignPinch = (phase: PinchPhase, factor: number) => {
    const kind = phase === "start" ? (pinchKindRef.current ?? activeDesignKind) : pinchKindRef.current;
    if (!kind) return;
    if (phase === "start") {
      pinchPreselectedRef.current = !pinchKindRef.current;
      pinchKindRef.current = kind;
      pinchLimitRef.current = null;
      pushHistory();
      pinchBaseRef.current = scaleOf(kind);
      if (guidesTimer.current) { clearTimeout(guidesTimer.current); guidesTimer.current = null; }
      setGuidesActive(true);
      dismissPinchHint();
      return;
    }
    const limit = scaleActiveTo(pinchBaseRef.current * factor, kind);
    // Vibración corta al llegar al tamaño mínimo o máximo (una vez por tope).
    if (limit && limit !== pinchLimitRef.current) {
      try { navigator.vibrate?.(10); } catch { /* sin vibración */ }
    }
    pinchLimitRef.current = limit;
    if (phase === "end") {
      pinchKindRef.current = null;
      flashGuides();
      track("design_pinch", { kind, preselected: pinchPreselectedRef.current });
    }
  };
  /**
   * Dos dedos sin nada seleccionado: si caen sobre un diseño (o uno a cada
   * lado), se selecciona y el mismo gesto lo escala. En billeteras y tablas
   * (una sola cara, sin puntos) toma el de la pestaña abierta.
   */
  const onPinchSelect = (hits: ({ u: number; v: number } | null)[]): boolean => {
    let kind: DesignKind | null = null;
    if (is3DObject) {
      kind = idleEditKind;
    } else {
      const pts = hits.filter((h): h is { u: number; v: number } => !!h);
      // También el punto medio: los dedos suelen quedar a los costados del diseño.
      if (pts.length === 2) pts.push({ u: pts[0].u + (pts[1].u - pts[0].u - Math.round(pts[1].u - pts[0].u)) / 2, v: (pts[0].v + pts[1].v) / 2 });
      const order: DesignKind[] = ["text", "text2", "art"];
      for (const k of order) {
        const has = k === "text" ? hasText : k === "text2" ? hasText2 : hasArt;
        const p = k === "text" ? textPlacement : k === "text2" ? text2Placement : artPlacement;
        const ext = k === "text" ? textExtents : k === "text2" ? text2Extents : artExtents;
        if (!has) continue;
        const over = pts.some(h => {
          const du = h.u - p.u - Math.round(h.u - p.u);
          return Math.abs(du) <= ext.halfU + 0.05 && Math.abs(h.v - p.v) <= ext.halfV + 0.1;
        });
        if (over) { kind = k; break; }
      }
    }
    if (!kind) return false;
    pinchKindRef.current = kind;
    setSelected(kind);
    setUndoDeleteUntil(0);
    track("design_select", { kind, source: "pinch" });
    return true;
  };

  // Pista de primer uso: la primera vez que se edita un diseño en el celular,
  // 3 segundos sobre la pieza "Pellizcá para cambiar el tamaño" (en lugar de
  // explicarlo antes). No vuelve a aparecer.
  const [pinchHint, setPinchHint] = useState(false);
  const pinchHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissPinchHint = () => {
    if (pinchHintTimer.current) { clearTimeout(pinchHintTimer.current); pinchHintTimer.current = null; }
    setPinchHint(false);
  };
  React.useEffect(() => {
    if (!isMobile || !designActive) return;
    try {
      if (localStorage.getItem("cs-pinch-hint") === "1") return;
      localStorage.setItem("cs-pinch-hint", "1");
    } catch { /* sin storage: se muestra igual, una vez por carga */ }
    setPinchHint(true);
    pinchHintTimer.current = setTimeout(() => setPinchHint(false), 3000);
  }, [isMobile, designActive]);
  React.useEffect(() => () => { if (pinchHintTimer.current) clearTimeout(pinchHintTimer.current); }, []);
  const deleteActive = () => {
    pushHistory();
    if (activeDesignKind === "text") setText("");
    else if (activeDesignKind === "text2") { setText2(""); setText2Open(false); }
    else if (activeDesignKind === "art") { if (iconId) setIconId(null); else setCustomImage(null); }
    setSelected(null);
    setUndoDeleteUntil(Date.now() + 6000);
    track("design_delete", { kind: activeDesignKind ?? "" });
  };
  const centerWithHistory = () => { pushHistory(); centerActivePlacement(); };

  // "Agregar otro texto": el Texto 2 va DEBAJO del principal (ej. empresa
  // arriba, empleado abajo); si abajo no entra, arriba. Si el principal sigue
  // en su lugar de inicio, sube un poco para que los dos queden centrados.
  // Después cada uno se arrastra libre.
  const openText2 = () => {
    pushHistory();
    // Va en la misma cara que el texto 1 (frente, lado del logo o costado).
    const face = hasText && singleFace ? textFace : "front";
    const c = padToPlacement(0.5, 0.5, product, face);
    const nextToText1 = hasText && (singleFace || FREE_PLACEMENT);
    const gap = textExtents.halfV + 0.07;
    let main = textPlacement;
    let v2 = c.v;
    if (nextToText1) {
      // "Sin mover": donde lo deja el inicio (v por defecto, ya encuadrado en el
      // área de este producto) o en el centro del área.
      const startV = clampTextP({ ...textPlacement, v: DEFAULT_TEXT_PLACEMENT.v }).v;
      const untouched = Math.abs(textPlacement.v - startV) < 0.01 || Math.abs(textPlacement.v - c.v) < 0.04;
      if (singleFace && untouched) {
        main = clampTextP({ ...textPlacement, v: c.v - gap / 2 });
        setTextPlacement(main);
      }
      const below = main.v + gap + 0.04;
      const fitsBelow = clampText2P({ ...TEXT2_DEFAULT_PLACEMENT, face, u: main.u, v: below }).v >= below - 0.01;
      v2 = fitsBelow ? below : main.v - gap - 0.04;
    }
    const u2 = nextToText1 ? main.u : c.u;
    setText2Placement(clampText2P({ ...TEXT2_DEFAULT_PLACEMENT, face, u: u2, v: v2 }));
    setText2Open(true);
    track("text2_open", { product: productId });
  };
  // Idea de la IA: la primera línea va al texto 1; la segunda abre el texto 2
  // (después del render, para que openText2 ya vea el texto 1 y lo acomode).
  const [pendingText2, setPendingText2] = useState<string | null>(null);
  const pickPhraseIdea = (idea: PhraseIdea) => {
    pushHistory();
    if (idea.text2 && isWrap360) { handleEngravingText(`${idea.text} ${idea.text2}`); return; }
    handleEngravingText(idea.text);
    if (idea.text2) setPendingText2(idea.text2);
  };
  React.useEffect(() => {
    if (pendingText2 === null) return;
    if (!text2Open) openText2();
    setText2(pendingText2);
    setPendingText2(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingText2]);
  const removeText2 = () => {
    if (text2) pushHistory();
    setText2("");
    setText2Open(false);
    if (selected === "text2") setSelected(null);
    if (text2) setUndoDeleteUntil(Date.now() + 6000);
    track("text2_remove");
  };
  const editLabel = activeDesignKind === "text" ? (hasText2 ? "el texto 1" : "el texto")
    : activeDesignKind === "text2" ? "el texto 2"
    : iconId ? "el ícono" : "la imagen";
  // Sin editar: el botón entra al elemento de la pestaña abierta (o al que haya).
  const idleEditKind: DesignKind | null =
    (drinkTab === "icons" || drinkTab === "media") ? (hasArt ? "art" : hasText ? "text" : hasText2 ? "text2" : null)
    : hasText ? "text" : hasText2 ? "text2" : hasArt ? "art" : null;

  // ── Pantalla de Diseño del celular ──────────────────────────────────────────
  // Una sola pantalla fija: el termo ocupa casi todo y nunca se mueve. El botón
  // "+" abre la hoja "Agregar al termo" (texto, ícono, logo o foto, plantilla),
  // que se cierra sola al colocar el elemento. Tocar un elemento muestra sus
  // acciones en una pastilla pegada a él; tocarlo otra vez abre la hoja para
  // editarlo (texto, letra y más opciones). No hay pestañas ni panel aparte.
  type SheetMode = "text" | "icon" | "image" | "template" | "wrap";
  const [sheet, setSheet] = useState<null | { mode: SheetMode; edit: DesignKind | null }>(null);
  const [draft, setDraft] = useState("");
  const [sheetMore, setSheetMore] = useState(false);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  /** Hay lugar para otro texto (el modelo admite el texto 1 y el texto 2). */
  const canAddText = !hasText || (!hasText2 && !isWrap360);
  const openAddSheet = () => {
    setDraft("");
    setSheetMore(false);
    const mode: SheetMode = canAddText ? "text" : "icon";
    // flushSync + foco en el mismo toque: iOS solo abre el teclado así.
    flushSync(() => setSheet({ mode, edit: null }));
    if (mode === "text") textInputRef.current?.focus();
    track("design_add_open", { elements: [hasText, hasText2, hasArt].filter(Boolean).length });
  };
  const openEditSheet = (kind: DesignKind) => {
    setSheetMore(false);
    setSheet({ mode: kind === "art" ? (iconId ? "icon" : "image") : "text", edit: kind });
    track("design_edit_open", { kind });
  };
  tapSelectedRef.current = isMobile && isDrinkware ? openEditSheet : null;
  const closeSheet = () => setSheet(null);
  const placeDraftText = () => {
    const t = capEngravingText(draft.trim());
    if (!t) return;
    pushHistory();
    // Sin texto 1 va ahí; si ya hay, abre el texto 2 debajo y lo selecciona.
    if (!hasText) handleEngravingText(t);
    else setPendingText2(t);
    track("design_add", { kind: hasText ? "text2" : "text" });
    setSheet(null);
  };

  // Plantillas: un toque y la pieza ya tiene un ejemplo para editar (en las
  // pruebas nadie quería arrancar con la pieza vacía). Después se arrastra
  // libre por toda la pieza, como cualquier diseño.
  const QUICK_STARTS = [
    { id: "name", title: "Nombre", sample: "“Sofía”" },
    { id: "date", title: "Nombre + fecha", sample: `“Sofía · ${new Date().getFullYear()}”` },
    { id: "phrase", title: "Frase + ícono", sample: "“Mate y amigos” + mate" },
  ] as const;
  const applyQuickStart = (id: (typeof QUICK_STARTS)[number]["id"]) => {
    track("design_quickstart", { id, product: productId });
    pushHistory();
    if (id === "date") {
      handleEngravingText("Sofía");
      setPendingText2(String(new Date().getFullYear()));
    } else {
      handleEngravingText(id === "phrase" ? "Mate y amigos" : "Sofía");
    }
    if (id === "phrase") {
      handlePickIcon("mate");
      applyArtPlacement({ ...DEFAULT_ART_PLACEMENT, u: textPlacement.u });
    }
    setSheet(null);
  };

  // Pastilla de acciones: pegada debajo del elemento seleccionado (el visor la
  // proyecta cada cuadro). Se oculta mientras se arrastra o con la hoja abierta.
  const pillAnchor = React.useMemo(() => {
    if (!activeDesignKind || designDragging || sheet) return null;
    const p = activeDesignKind === "text" ? textPlacement : activeDesignKind === "text2" ? text2Placement : artPlacement;
    const ext = activeDesignKind === "text" ? textExtents : activeDesignKind === "text2" ? text2Extents : artExtents;
    return { u: p.u, v: p.v + ext.halfV };
  }, [activeDesignKind, designDragging, sheet, textPlacement, text2Placement, artPlacement, textExtents, text2Extents, artExtents]);
  const designElementCount = [hasText, hasText2, hasArt, !!activeWrap].filter(Boolean).length;

  // Tour: al montar la pantalla de Diseño, una vez que el visor tiene la pieza
  // (los targets ya tienen medidas). Solo la primera visita.
  const onDesignScreen = isMobile && isDrinkware && mobileStep === designStepIndex;
  React.useEffect(() => {
    if (!onDesignScreen || viewerReady === 0 || seen(TOUR_KEY)) return;
    markSeen(TOUR_KEY);
    setTourOpen(true);
  }, [onDesignScreen, viewerReady]);
  // Aviso de Listo: con el PRIMER elemento de diseño, una vez por dispositivo.
  const hadDesign = useRef(designElementCount > 0);
  React.useEffect(() => {
    if (designElementCount === 0) return;
    if (hadDesign.current) return;
    hadDesign.current = true;
    if (!onDesignScreen || seen(HINT_DONE_KEY)) return;
    markSeen(HINT_DONE_KEY);
    setDoneHint(true);
  }, [designElementCount, onDesignScreen]);

  // ── Preview capture ─────────────────────────────────────────────────────────
  // Grab a PNG of the live 3D canvas (the termo draws a fresh frame right before
  // reading it). Returns null if the canvas isn't mounted (e.g. mobile Step 4).
  const capturePreview = React.useCallback((): string | null => {
    const canvas = previewPanelRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return null;
    try {
      thermosRenderRef.current?.();
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

  // Sin captura en segundo plano: codificar el PNG del visor bloqueaba el hilo
  // principal cientos de ms (segundos en celulares) en cada pausa mientras se
  // diseñaba. Se captura solo cuando hace falta: al pasar al resumen (móvil),
  // al enviar el pedido y al descargar la imagen.
  const handleDownloadPreview = () => {
    const img = capturePreview() ?? previewImgRef.current;
    if (!img) return;
    setPreviewImg(img);
    previewImgRef.current = img;
    downloadDataUrl(img, "mi-diseno.png");
  };

  // Miniatura del resumen en escritorio (en móvil el resumen es otro paso y se
  // captura al entrar). Barata a propósito: copia a resolución nativa y PNG
  // codificado con toBlob, que el navegador hace fuera del hilo principal.
  const [liveThumb, setLiveThumb] = useState<string | null>(null);
  React.useEffect(() => {
    if (isMobile) return;
    let cancelled = false;
    let idle: number | null = null;
    const t = setTimeout(() => {
      const run = () => {
        const canvas = previewPanelRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
        if (!canvas || !canvas.width || !canvas.height) return;
        try {
          thermosRenderRef.current?.();
          const off = document.createElement("canvas");
          off.width = canvas.width; off.height = canvas.height;
          off.getContext("2d")?.drawImage(canvas, 0, 0);
          off.toBlob(blob => {
            if (cancelled || !blob) return;
            const url = URL.createObjectURL(blob);
            setLiveThumb(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
          }, "image/png");
        } catch { /* sin miniatura; el resumen se arma igual */ }
      };
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(run, { timeout: 2000 });
      else run();
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (idle !== null && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
    };
  }, [
    isDrinkware, is3DObject, productId, viewSize, activeColorHex,
    finish, text, font, iconId, artUrl, textColor, effectiveTechnique, isGlass,
    singleFace, textPlacement, artPlacement, isMobile, viewerReady,
  ]);
  React.useEffect(() => () => { setLiveThumb(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); }, []);
  // En escritorio la miniatura en vivo sigue al diseño; la captura puntual
  // (descarga, pedido) puede haber quedado vieja si se siguió editando.
  const summaryThumb = isMobile ? previewImg : liveThumb ?? previewImg;
  const clearPreviews = () => {
    setPreviewImg(null);
    previewImgRef.current = null;
    setLiveThumb(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
  };

  const handleSelectColor = (id: string) => {
    setColor(id);
    setCustomHex(null);
  };

  const handleSelectMaterial = (id: MaterialId) => {
    setMaterialId(id);
    setOdooTemplateId(null);
    setGenericPick(false);
    track("customizer_material_select", { material: id });
    // La captura anterior pertenece a otro producto: nunca ofrecer descargarla.
    clearPreviews();
    const m = getMaterial(id);
    // Mismo arranque que al abrir la página: si la tienda tiene productos de
    // este material, se empieza por uno de ellos (Vaso Sunbeam en acero), no
    // por la primera forma genérica.
    const inShop = (p: (typeof m.products)[number]) =>
      !!p.drinkwareProductId && matchingProducts(catalog, p.drinkwareProductId, id).length > 0;
    const first = m.products.find(p => p.id === START_PRODUCT_ID && inShop(p))
      ?? m.products.find(inShop)
      ?? m.products[0];
    setMaterialProductId(first?.id ?? "");
    // Variante de la tienda: de nuevo en negro (si el producto lo tiene).
    startColorPending.current = true;
    setOdooColor(null);
    setOdooSize(null);
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
      // El color del material anterior (café del cuero, perla del cristal) no
      // sigue: vuelve al color de arranque.
      handleSelectColor(COLORS.find(c => c.name.startsWith(START_COLOR_NAME))?.id ?? COLORS[0].id);
    }
  };

  const handleSelectMaterialProduct = (id: string) => {
    setMaterialProductId(id);
    setOdooTemplateId(null);
    startColorPending.current = false;
    track("customizer_product_select", { material: materialId, product: id });
    // Ídem: la captura del producto anterior deja de ser válida.
    clearPreviews();
    const mp = material.products.find(p => p.id === id);
    if (mp?.drinkwareProductId) {
      const dp = getProduct(mp.drinkwareProductId);
      setSize(dp.sizes[1]?.id ?? dp.sizes[0].id);
    }
  };

  // Icon and uploaded image are mutually exclusive engraved art.
  const handlePickIcon = (id: string | null) => {
    setIconId(id);
    if (id) setCustomImage(null);
  };
  const handleUploadImage = (img: ProcessedImage | null) => {
    // Cambiar entre con fondo / sin fondo (o rehacer el recorte con IA) es la
    // misma imagen: conserva el tamaño y el lugar que eligió el cliente.
    const sameImage = (a?: ProcessedImage | null) => !!a && !!img && (a.svgDataUrl === img.svgDataUrl || a.svgDataUrl === img.other?.svgDataUrl);
    const isNew = !!img && !sameImage(customImage) && !sameImage(customImage?.other);
    setCustomImage(img);
    if (img) {
      setIconId(null);
      // Images size by plan (no size slider), so drop any leftover icon scale.
      // Swapping cut-out/original keeps the placement the customer already set.
      if (isNew) setArtPlacement(p => ({ ...p, scale: 1 }));
      // Toda imagen subida (archivo o URL, chica o grande) se muestra a todo
      // color: la técnica pasa a impresión UV por defecto. El cliente puede
      // volver a láser a mano si lo prefiere.
      if (canColor) setTechnique("color");
    }
  };

  // Solo el TIPO de producto (Termo, Chopera, Copa…), sin tamaño ni material.
  // Compartidos por el resumen visual, el mensaje de WhatsApp y el POST del
  // pedido — una única fuente, cero lógica duplicada.
  const orderProductName = isDrinkware
    ? (odooProduct?.name ?? product.singular)
    : material.pens ? "Bolígrafo" : (activeMProduct?.name ?? activeObject?.singular ?? material.name);
  // Nombre en los textos ("¿Ya tenés tu Growler?", "Tamaño del Growler"): el de
  // la tienda tal cual figura en el e-commerce; sin producto de la tienda (forma
  // genérica), el de la forma en minúscula.
  const productNoun = isDrinkware && odooProduct ? odooProduct.name : orderProductName.toLowerCase();
  const productTheNoun = `${FEMININE_PRODUCTS.has(productNoun.toLowerCase()) ? "la" : "el"} ${productNoun}`;
  const orderTechniqueName = isDrinkware
    ? activeTechnique.name
    : materialId === "plastico" ? "Plotter de corte" : "Grabado láser";

  // Tamaño legible ("32oz (Grande)", "Mediana (500ml)"). Solo drinkware con más
  // de un tamaño: con uno solo (chopera) no hay nada que elegir ni que informar.
  const orderSizeName = odooMode
    ? odooSize ?? undefined
    : isDrinkware && product.sizes.length > 1
      ? `${activeSize.name} (${activeSize.label})`
      : undefined;
  // Nombre comercial real (Odoo) para el resumen y el pedido; si no, el tipo.
  const orderProductLabel = odooProduct?.name ?? orderProductName;
  // Color con su hex: el taller necesita el tono exacto, no solo la familia.
  const orderColorName = isGlass
    ? "Cristal transparente"
    : (isDrinkware || activeObject?.colorable)
      ? `${activeColorName} (${activeColorHex})`
      : undefined;

  // "Traigo el mío" aplica a drinkware y bolígrafos (lo que el hero promete).
  const canBringOwn = isDrinkware || !!material.pens;
  const isOwnProduct = canBringOwn && ownProduct;
  /** La pieza elegida de la tienda está agotada: no se puede pedir (sí con "Traigo el mío"). */
  const isSoldOut = odooMode && !isOwnProduct && (odooVariant ? !odooVariant.inStock : odooAllOut);

  /** Máquina que produce el pedido (DACEN.md): el cliente elige la técnica, no
   *  la máquina. Solo viaja en el pedido y al panel /admin. */
  const productionMachine = isDrinkware
    ? machineFor({ technique: effectiveTechnique, kind: "drinkware", spec: printSpecFor(productId, viewSize) })
    : machineFor({ technique: "laser", kind: "object" });

  // Tapa / base: solo drinkware (el cristal no lleva). null = no pedido.
  const extraEngraving = isDrinkware && !isGlass;
  const extraLidText = extraEngraving && extraLid !== null ? extraLid.trim() : null;
  const extraBaseText = extraEngraving && extraBase !== null ? extraBase.trim() : null;
  /** Escrituras extra (tapa / base): + Gs. 5.000 cada una (pricing.ts). */
  const extraTextCount = (extraLidText !== null ? 1 : 0) + (extraBaseText !== null ? 1 : 0) + (hasText2 ? 1 : 0);

  /** Precio estimado según lo diseñado. Solo montos que la landing ya publica
   *  (Tarifas y bolígrafos); lo que no tiene precio fijo se dice explícito. */
  // `total`: el monto ya suma pieza + grabado (se rotula "Total estimado").
  const estimate: { price: string | null; note: string; total?: boolean } = (() => {
    if (material.pens) {
      const opt = PEN_OPTIONS.find(o => o.id === (isOwnProduct ? "own" : "shop")) ?? PEN_OPTIONS[0];
      return { price: opt.priceLabel, note: opt.label };
    }
    // Pieza: precio real de la variante de Odoo (si el cliente no trae la suya).
    const piece = !isOwnProduct && odooVariant ? odooVariant.price : null;
    // Drinkware: precio único de pricing.ts (láser con los planes de Tarifas;
    // color con los escalones de la Dacen, "se cotiza" mientras sean null).
    if (isDrinkware) {
      const q = effectiveTechnique === "laser"
        ? quote({ technique: "laser", plan: activePlan.id, catalog, piecePrice: piece, pieceLabel: orderProductLabel, ownProduct: isOwnProduct, extraTexts: extraTextCount })
        : quote({ technique: "color", machine: productionMachine, piecePrice: piece, pieceLabel: orderProductLabel, coverage: activeWrap ? "wrap" : undefined });
      if (q.total !== null) {
        return { price: formatGs(q.total), note: q.note, total: q.breakdown.length > 1 };
      }
      // Sin precio de impresión: se muestra el de la pieza, si lo hay.
      return { price: piece !== null ? formatGs(piece) : null, note: q.note };
    }
    return { price: null, note: "Te pasamos el precio por WhatsApp" };
  })();
  const estimateText = estimate.price ? `${estimate.price} — ${estimate.note}` : estimate.note;

  /** Campos del pedido — ÚNICA fuente de datos del "Resumen de tu
   *  personalización" (Paso 4) y del mensaje de WhatsApp. Campos sin dato se
   *  omiten por completo (nunca "Texto: —"). */
  const orderFields = (): [string, string][] => {
    const rows: [string, string][] = [["Producto", isOwnProduct ? orderProductName : orderProductLabel]];
    if (isOwnProduct) rows.push(["Origen", "Lo trae el cliente"]);
    else if (odooVariant?.sku) rows.push(["Código", odooVariant.sku]);
    if (orderSizeName) rows.push(["Tamaño", orderSizeName]);
    // En bolígrafos el material repite el producto; en el resto distingue
    // (ej. termo de acero pintado vs. inoxidable vs. forrado en cuero).
    if (!material.pens) rows.push(["Material", material.name]);
    if (orderColorName) rows.push(["Color", orderColorName]);
    rows.push(["Técnica", orderTechniqueName]);
    const trimmedText = text.trim();
    const trimmedText2 = text2.trim();
    if (trimmedText) rows.push([trimmedText2 ? "Texto 1" : "Texto", `${trimmedText} (${activeFont.name})`]);
    // Libre: la cara más cercana a donde quedó cada elemento (para el taller).
    const where = (p: Placement, face: FaceId) => faceLabel(product, FREE_PLACEMENT ? faceAtU(p.u) : face);
    if (trimmedText && isDrinkware && !isWrap360 && textFaces.length > 1) rows.push(["Ubicación del texto", where(textPlacement, textFace)]);
    if (trimmedText2) rows.push(["Texto 2", `${trimmedText2} (${activeFont2.name})`]);
    if (trimmedText2 && isDrinkware && where(text2Placement, text2Face) !== where(textPlacement, textFace)) rows.push(["Ubicación del texto 2", where(text2Placement, text2Face)]);
    if (selectedIcon) rows.push(["Ícono", selectedIcon.name]);
    else if (customImage) rows.push(["Logo/foto adjunta", "Sí"]);
    if (hasArt && isDrinkware && (FREE_PLACEMENT ? faceAtU(artPlacement.u) : artFace) !== "front") rows.push([selectedIcon ? "Ubicación del ícono" : "Ubicación de la imagen", where(artPlacement, artFace)]);
    if (activeWrap) rows.push(["Diseño", `Todo el vaso (360°) · ${WRAP_MODES.find(m => m.id === activeWrap.mode)?.label ?? activeWrap.mode}`]);
    if (activeWrap?.logos?.length) rows.push(["Logos sobre el fondo", String(activeWrap.logos.length)]);
    if (extraLidText !== null) rows.push(["Grabado en tapa", extraLidText || "Sí (texto a definir)"]);
    if (extraBaseText !== null) rows.push(["Grabado en base", extraBaseText || "Sí (texto a definir)"]);
    return rows;
  };

  /** Cuerpo del POST /api/orders: los mismos datos del resumen más el snapshot
   *  completo del diseño (suficiente para reabrirlo/reproducirlo después). */
  const orderPayload = (previewImage: string | null, dacenFile: DacenPrintFile | null = null): CreateOrderRequest => {
    const trimmedText = text.trim();
    const trimmedText2 = text2.trim();
    return {
      product: (isOwnProduct ? orderProductName : orderProductLabel).slice(0, 120),
      material: material.name,
      color: orderColorName,
      technique: orderTechniqueName,
      // Con "Texto 2" el panel muestra los dos (el detalle va en designState).
      customText: [trimmedText, trimmedText2].filter(Boolean).join(" / ") || undefined,
      font: trimmedText || trimmedText2
        ? [trimmedText && activeFont.name, trimmedText2 && activeFont2.name].filter(Boolean).join(" / ")
        : undefined,
      // El color de texto solo aplica en impresión UV (láser es monocromático).
      textColor: (trimmedText || trimmedText2) && effectiveTechnique === "color" ? textColor : undefined,
      iconName: selectedIcon?.name,
      hasUploadedImage: !!customImage || !!activeWrap,
      designState: {
        materialId,
        materialProductId,
        productId,
        sizeId: viewSize,
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
        // Ubicación libre: u/v son de toda la vuelta (archivo de producción de
        // 360°) y las zonas sin grabado van como referencia para el taller.
        ...(FREE_PLACEMENT && isDrinkware ? { placementMode: "free", keepOut: keepOutZones } : {}),
        // Texto 2 (empresa / nombre, etc.): también va al archivo de producción.
        ...(trimmedText2 ? { text2: trimmedText2, text2FontId: text2Font, text2Placement } : {}),
        // Grabado extra (no está en el 3D): también va al archivo de producción.
        extraEngraving: extraLidText !== null || extraBaseText !== null
          ? { lid: extraLidText, base: extraBaseText }
          : undefined,
        // Legibles para el panel /admin (designState admite campos extra).
        sizeLabel: orderSizeName,
        ownProduct: isOwnProduct,
        engravingEstimate: estimateText,
        // Máquina de producción (laser | dacen | eufy): cola de trabajo en /admin.
        machine: productionMachine,
        // Vínculo con Odoo (para el futuro pedido de venta / pago online).
        odooTemplateId: odooProduct?.id ?? null,
        odooVariantId: isOwnProduct ? null : odooVariant?.id ?? null,
        sku: isOwnProduct ? null : odooVariant?.sku ?? null,
        piecePrice: isOwnProduct ? null : odooVariant?.price ?? null,
        // Todo el vaso (360°): el fondo ya va dibujado en el archivo de la Dacen;
        // acá quedan el modo y la resolución para el panel (sin la imagen).
        ...(activeWrap ? {
          coverage: "wrap",
          wrap: {
            mode: activeWrap.mode, scale: activeWrap.scale, offsetU: activeWrap.offsetU, offsetV: activeWrap.offsetV,
            imageWidth: activeWrap.width, imageHeight: activeWrap.height, effectiveDpi: wrapDpi,
            logos: (activeWrap.logos ?? []).map(l => ({ u: l.u, v: l.v, widthFrac: l.widthFrac, vector: !!l.svg, width: l.width, height: l.height })),
          },
        } : {}),
        // Dacen F5: medidas y dpi del PNG desenrollado (nombre del archivo y
        // dpi grabados por el server). printSizeApprox: medidas del modelo 3D.
        ...(dacenFile ? {
          productionDpi: dacenFile.dpi,
          productionFormat: dacenFile.format,
          printWidthMm: dacenFile.widthMm,
          printHeightMm: dacenFile.heightMm,
          printSizeApprox: dacenFile.approxSize,
        } : {}),
      },
      previewImage: previewImage ?? undefined,
      // Logo/foto original en la máxima resolución que tiene el cliente: el
      // server lo embebe en el archivo vectorial de producción (uso interno).
      customImage: customImage?.svgDataUrl ?? undefined,
      // Dacen F5: el diseño desenrollado en PNG (lo raster) y los textos y
      // logos en vector, que el server pasa a curvas (DACEN.md §12.10).
      productionImage: dacenFile?.dataUrl,
      productionVectors: dacenFile?.vectors.length
        ? dacenFile.vectors.map(v => v.kind === "text" ? { ...v, fontId: FONTS.find(f => f.style.fontFamily === v.family)?.id ?? null } : v)
        : undefined,
    };
  };

  /** PNG 360° para la Dacen (solo impresión a color en pieza cilíndrica). Un
   *  fallo no frena el pedido: queda el SVG de referencia en el panel. */
  const buildDacenFile = async (): Promise<DacenPrintFile | null> => {
    if (productionMachine !== "dacen" || effectiveTechnique !== "color") return null;
    try {
      return await renderDacenPng(productId, viewSize, await colorLayerInput());
    } catch {
      return null;
    }
  };

  /** Lo que se imprime a color, con las imágenes ya cargadas (archivo y desplegado). */
  const colorLayerInput = async () => {
    const [artImage, wrapImage, ...logoImages] = await Promise.all([
      artUrl && artImageSize !== "none" ? loadImage(artUrl) : null,
      activeWrap ? loadImage(activeWrap.url) : null,
      ...(activeWrap?.logos ?? []).map(l => loadImage(l.url).catch(() => null)),
    ]);
    const logos = (activeWrap?.logos ?? []).flatMap((l, i) => {
      const image = logoImages[i];
      return image ? [{ image, svg: l.svg ?? null, u: l.u, v: l.v, widthFrac: l.widthFrac }] : [];
    });
    return {
      text,
      textPlacement,
      fontFamily: (activeFont.style?.fontFamily as string | undefined) ?? "Inter, system-ui, sans-serif",
      textColor,
      artImage,
      imageSize: artImageSize,
      artPlacement,
      singleFace,
      extraTexts: extraTextMarks,
      artIconId: selectedIcon ? iconId : null,
      wrap: activeWrap && wrapImage ? {
        image: wrapImage, mode: activeWrap.mode, scale: activeWrap.scale, offsetU: activeWrap.offsetU, offsetV: activeWrap.offsetV, logos,
      } : null,
    };
  };

  /** "Ver desplegado": la vuelta plana, el mismo dibujo que el archivo. */
  const renderUnwrapped = async (): Promise<string | null> => {
    const r = renderUnwrappedPreview(productId, viewSize, await colorLayerInput(), 1600);
    if (!r) return null;
    const url = r.canvas.toDataURL("image/jpeg", 0.88);
    r.canvas.width = r.canvas.height = 0;
    return url;
  };
  const closeUnwrapped = React.useCallback(() => setUnwrappedOpen(false), []);

  /** Panel "Todo el vaso (360°)" + su vista desplegada (hoja del celular y escritorio). */
  const renderWrapPanel = () => wrapPrintSize && (
    <>
      <WrapDesignPanel
        value={wrapDesign}
        onChange={(next) => {
          if (next && !wrapDesign) track("wrap_add", { product: productId, mode: next.mode });
          if (!next && wrapDesign) track("wrap_remove", { product: productId });
          setWrapDesign(next);
        }}
        size={wrapPrintSize}
        productName={`${product.singular} ${orderSizeName ?? ""}`.trim()}
        onShowUnwrapped={() => { setUnwrappedOpen(true); track("wrap_unwrapped_open", { product: productId }); }}
      />
      <UnwrappedDialog open={unwrappedOpen} onClose={closeUnwrapped} render={renderUnwrapped} size={wrapPrintSize} />
    </>
  );

  /** Mensaje de WhatsApp — sale de orderFields(), la misma fuente que el
   *  resumen visual. Con pedido creado suma el número y la URL del diseño. */
  const buildOrderMessage = (orderNumber: string | null, imageUrl: string | null): string => {
    const parts = ["¡Hola! Acabo de armar mi pedido personalizado y quiero coordinarlo con ustedes."];
    if (orderNumber) parts.push(`Pedido: ${orderNumber}`);
    parts.push(...orderFields().map(([k, v]) => `${k}: ${v}`));
    parts.push(`Precio estimado: ${estimateText}`);
    if (imageUrl) parts.push(`Así quedó mi diseño:\n${imageUrl}`);
    // Renglón en blanco entre datos para que WhatsApp lo muestre ordenado.
    return parts.join("\n\n");
  };

  /** Captura el diseño de frente, crea el pedido (POST /api/orders con specs +
   *  imagen) y abre WhatsApp con el número de pedido y la URL permanente del
   *  preview. Si el POST falla o tarda de más, fallback: mensaje solo con las
   *  especificaciones, más un aviso sutil y el botón "Descargar imagen". */
  const isEmptyDesign = !text.trim() && !hasText2 && !selectedIcon && !customImage && !extraLidText && !extraBaseText && !activeWrap;
  // Lo que mira a cámara en la foto del resumen: el área personalizada, o sin
  // diseño el frente de la marca (u = 0, el logo del modelo) y no el dorso.
  const captureFaceU = isEmptyDesign ? 0 : designFaceU;

  // El aviso vive junto al botón de la página; en celular se envía desde la
  // barra fija, así que hay que traerlo a la vista.
  React.useEffect(() => {
    if (!emptyWarning) return;
    document.querySelector("[data-empty-warning]")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [emptyWarning]);

  const handleOrder = async (force = false) => {
    if (isOrdered || isPreparing || isSoldOut) return;
    // Sin nada para grabar: avisar antes (puede ser a propósito, ej. "quiero
    // asesoramiento"), así que "Enviar igual" sigue disponible.
    if (isEmptyDesign && !force) {
      setEmptyWarning(true);
      track("order_empty_warning");
      return;
    }
    setEmptyWarning(false);
    setIsPreparing(true);
    setOrderFallback(false);
    setLastOrderNumber(null);
    track("order_submit", {
      product: orderProductName,
      material: materialId,
      technique: orderTechniqueName,
      has_text: !!text.trim(),
      has_text2: hasText2,
      has_icon: !!selectedIcon,
      has_image: !!customImage,
      own_product: isOwnProduct,
    });

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
      if (activeDesignKind) finishEditing();
      thermosSnapRef.current?.(captureFaceU);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Captura nítida para el resumen/descarga; al server viaja re-encodeada
      // a JPEG ~1080px (mucho más liviana que el PNG: sube rápido y queda
      // holgada bajo el límite de 3MB del endpoint).
      const full = capturePreview() ?? previewImgRef.current;
      if (full) { setPreviewImg(full); previewImgRef.current = full; }
      const jpeg = full ? await dataUrlToJpeg(full, 1080) : null;
      const dacenFile = await buildDacenFile();

      let orderNumber: string | null = null;
      let imageUrl: string | null = null;
      try {
        // submitOrder espera hasta 30 s y reintenta sin imágenes; si todo
        // falla, el mensaje sale igual por WhatsApp sin número: el cliente
        // SIEMPRE llega a WhatsApp aunque el backend esté caído.
        const created = await submitOrder(orderPayload(jpeg, dacenFile));
        orderNumber = created.orderNumber;
        imageUrl = created.previewImageUrl ?? null;
        track("order_created", { order_number: orderNumber, product: orderProductName });
      } catch (err) {
        // Backend caído o lento: aviso sutil y el mensaje sale solo con specs.
        setOrderFallback(true);
        track("order_fallback", { product: orderProductName, reason: err instanceof Error ? err.message.slice(0, 80) : "unknown" });
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
  // Tamaño del drinkware. Se oculta cuando el producto viene en un solo tamaño.
  // Cambiarlo reescala el 3D en vivo (Thermos3D recibe sizeId).
  const handleSelectSize = (id: string) => {
    setSize(id);
    track("customizer_size_select", { product: productId, size: id });
  };
  /** Tamaños reales de Odoo; deshabilitado el que no tiene ninguna variante con stock. */
  const renderOdooSize = () => odooSizes.length > 1 && odooProduct && (
    <div>
      <Label className="text-sm font-medium text-foreground mb-3 block">Tamaño</Label>
      <div className="grid grid-cols-3 gap-3">
        {odooSizes.map(label => {
          const active = odooSize === label;
          const sellable = odooProduct.variants.some(v => v.size === label && v.inStock);
          return (
            <button
              key={label}
              type="button"
              onClick={() => selectOdooSize(label)}
              disabled={!sellable}
              aria-pressed={active}
              className={`min-h-12 px-2 py-2.5 border rounded-xl flex flex-col items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${active ? activeCard : idleCard}`}
            >
              <span className="font-semibold text-sm leading-tight">{label}</span>
              {!sellable && <span className="text-xs font-semibold text-red-700 leading-tight">Agotado</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderDrinkSize = () => odooMode ? renderOdooSize() : product.sizes.length > 1 && (
    <div>
      <Label className="text-sm font-medium text-foreground mb-3 block">
        Tamaño {productArticle(productNoun)} {productNoun}
      </Label>
      <div className="grid grid-cols-3 gap-3">
        {product.sizes.map(s => {
          const active = activeSize.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelectSize(s.id)}
              aria-pressed={active}
              className={`min-h-12 px-2 py-2.5 border rounded-xl flex flex-col items-center justify-center transition-all ${active ? activeCard : idleCard}`}
            >
              <span className="font-semibold text-sm leading-tight">{s.name}</span>
              <span className="text-xs text-muted-foreground leading-tight">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

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
  ) : odooMode && odooColors.length > 0 && !isInox ? (
    // Colores reales de la tienda (variantes de Odoo). Sin "tono exacto": solo
    // se puede elegir lo que existe; sin stock queda visible pero deshabilitado.
    <div>
      <Label className="text-sm font-medium text-foreground mb-1 block">Color</Label>
      <p className="text-xs text-muted-foreground mb-3">Colores disponibles de {odooProduct!.name}.</p>
      {/* Tamaño fijo: la cantidad de colores la define Odoo (pueden ser 2 o 15). */}
      <div className={`flex flex-wrap gap-x-3 ${odooColors.some(c => !odooColorInStock(c.name)) ? "gap-y-6" : "gap-y-3"}`}>
        {odooColors.map(c => {
          const active = odooColor === c.name;
          const inStock = odooColorInStock(c.name);
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => selectOdooColor(c.name)}
              disabled={!inStock}
              title={inStock ? c.name : `${c.name} — agotado`}
              aria-label={inStock ? c.name : `${c.name}, agotado`}
              aria-pressed={active}
              className={`relative w-11 h-11 shrink-0 rounded-full border border-black/10 transition-all hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed ring-offset-2 ${active ? "ring-2 ring-primary" : ""}`}
            >
              <span className="absolute inset-0 rounded-full overflow-hidden">
              <span className={`absolute inset-0 ${inStock ? "" : "opacity-35"}`} style={{ backgroundColor: c.hex }} />
              {!inStock && (
                // Diagonal de "agotado".
                <span className="absolute inset-0" style={{ background: "linear-gradient(to top right, transparent 46%, #6b6f74 46%, #6b6f74 54%, transparent 54%)" }} />
              )}
              {active && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check className="text-white w-5 h-5 drop-shadow" />
                </span>
              )}
              </span>
              {!inStock && (
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 text-[10px] font-semibold leading-none text-red-700 whitespace-nowrap">
                  Agotado
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: activeColorHex }} />
        {activeColorName}
        {isSoldOut && <span className="text-xs font-semibold text-red-700">· Agotado</span>}
        {odooVariant && odooVariant.inStock && odooVariant.available !== null && odooVariant.available <= 3 && (
          <span className="text-xs text-primary">· {odooVariant.available === 1 ? "¡Queda 1!" : `Quedan ${odooVariant.available}`}</span>
        )}
      </p>
      {odooAllOut && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
          Este producto está agotado en este momento: no se puede pedir. Podés elegir otro producto o
          "Traigo el mío" si ya lo tenés.
        </p>
      )}
    </div>
  ) : isInox ? (
    // El inoxidable natural no se pinta: en lugar de la paleta y el "Tono
    // exacto" se muestra el único acabado disponible, ya seleccionado.
    <div>
      <Label className="text-sm font-medium text-foreground mb-3 block">
        Acabado {productArticle(productNoun)} {productNoun}
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
          Color base {productArticle(productNoun)} {productNoun}
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

      {/* Fine-tune the exact tone within the selected colour family. En el
          celular no: confundía y la paleta del producto alcanza. */}
      {!isMobile && (
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
          Cada color tiene variantes. Elegí la que más te guste de la paleta, o marcá el tono exacto con el selector.
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
      )}
    </>
  );

  const renderDrinkTechnique = () => (
    <div>
      <Label className="text-sm font-medium mb-2 block">Técnica de grabado</Label>
      {canColor ? (
        <>
          <TechniqueSelector value={effectiveTechnique} onChange={setTechnique} compact={isMobile} />
          {effectiveTechnique === "color" && (
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
              {colorConsult
                ? <>La impresión UV a color se hace solo en piezas cilíndricas{colorConsult === "handle" ? " sin manija" : ""}. Para color en esta pieza, consultá en el local o por WhatsApp.</>
                : <>Este producto solo admite grabado láser monocromático. La impresión UV a color
                  está reservada al drinkware de acero con pintura electrostática.</>}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  /** Estado mínimo para el link del diseño (sin el logo subido: no entra en una URL). */
  const sharedDesignState = (): SharedDesign => ({
    v: 1, materialId, materialProductId, sizeId: size, colorId: color, customHex, finish,
    odooTemplateId: odooProduct?.id ?? null, odooColor, odooSize,
    technique: effectiveTechnique, text, fontId: font, textColor, iconId, ownProduct,
    textPlacement, artPlacement,
    extraLid: extraEngraving ? extraLid : null, extraBase: extraEngraving ? extraBase : null,
    ...(hasText2 ? { text2, text2FontId: text2Font, text2Placement } : {}),
  });

  const handleCopyLink = async () => {
    const url = designLink(sharedDesignState());
    track("design_link_copy", { has_image: !!customImage });
    // En el celular, la hoja de compartir nativa (WhatsApp, etc.) es lo natural.
    if (isMobile && typeof navigator.share === "function") {
      try { await navigator.share({ title: "Mi diseño · Creativa Studio", url }); } catch { /* canceló */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkFallback(null);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // Sin permiso de portapapeles: mostrar la URL para copiarla a mano.
      setLinkFallback(url);
    }
  };

  /** Modelo de la tienda: solo cuando Odoo tiene más de un producto para este tipo. */
  const renderOdooModel = () => odooProducts.length > 1 && (
    <div>
      <Label className="text-sm font-medium text-foreground mb-3 block">Modelo</Label>
      <div className="flex flex-wrap gap-2">
        {odooProducts.map(p => {
          const active = odooProduct?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={active}
              onClick={() => { setOdooTemplateId(p.id); track("customizer_model_select", { odoo_id: p.id }); }}
              className={`min-h-11 px-3 py-2 border rounded-xl text-sm font-medium transition-all ${active ? activeCard : idleCard}`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  /** "¿De dónde sale el producto?" — drinkware y bolígrafos. */
  const renderOwnProduct = () => canBringOwn && (
    <div>
      <Label className="text-sm font-medium text-foreground mb-3 block">
        {material.pens ? "¿Los bolígrafos?" : `¿Ya tenés tu ${productNoun}?`}
      </Label>
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            own: false,
            title: material.pens ? "De la tienda" : "Lo compro acá",
            sub: material.pens ? "Incluye el bolígrafo"
              // Con Odoo, el precio real de la variante elegida.
              : odooVariant ? `Pieza ${formatGs(odooVariant.price)}` : "Te cotizamos la pieza",
          },
          { own: true, title: material.pens ? "Traigo los míos" : "Traigo el mío", sub: "Solo el grabado" },
        ].map(o => {
          const active = ownProduct === o.own;
          return (
            <button
              key={String(o.own)}
              type="button"
              aria-pressed={active}
              onClick={() => { setOwnProduct(o.own); track("customizer_own_product", { own: o.own }); }}
              className={`min-h-12 px-3 py-2.5 border rounded-xl flex flex-col items-center justify-center text-center transition-all ${active ? activeCard : idleCard}`}
            >
              <span className="font-semibold text-sm leading-tight">{o.title}</span>
              <span className="text-xs text-muted-foreground leading-tight mt-0.5">{o.sub}</span>
            </button>
          );
        })}
      </div>
      {ownProduct && !material.pens && (
        <p className="text-xs text-muted-foreground mt-2">
          Trabajamos también sobre productos que no compraste en nuestra tienda. Elegí abajo el
          modelo y el color más parecidos al tuyo para ver cómo queda.
        </p>
      )}
    </div>
  );

  // Bloque de acciones compartido por TODOS los productos: precio estimado,
  // CTA de WhatsApp, señales de confianza y acciones secundarias.
  const renderOrderActions = () => (
    <>
      {/* Precio estimado — antes el cliente llegaba al final sin ningún monto. */}
      <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">{estimate.total ? "Total estimado" : "Precio estimado"}</span>
          {estimate.price && (
            <span className="font-serif text-lg text-foreground tabular-nums">{estimate.price}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{estimate.note}.</p>
      </div>

      {emptyWarning && isEmptyDesign && (
        <div data-empty-warning className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2 scroll-mb-28" role="alert">
          <p>Todavía no agregaste texto, ícono ni imagen para grabar. ¿Querés enviarlo igual y lo definimos por WhatsApp?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEmptyWarning(false)}
              className="min-h-10 px-3 rounded-lg border border-amber-300 bg-white text-xs font-semibold"
            >
              Seguir diseñando
            </button>
            <button
              type="button"
              onClick={() => handleOrder(true)}
              className="min-h-10 px-3 rounded-lg bg-amber-900 text-white text-xs font-semibold"
            >
              Enviar igual
            </button>
          </div>
        </div>
      )}

      <Button
        onClick={() => handleOrder()}
        disabled={isOrdered || isPreparing || isSoldOut}
        size="lg"
        className="w-full h-auto min-h-12 py-2.5 text-sm sm:text-base font-semibold leading-tight whitespace-normal bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
      >
        {isPreparing ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Creando tu pedido...</>
        ) : isOrdered ? (
          lastOrderNumber ? `Pedido ${lastOrderNumber} creado ✓` : "Abriendo WhatsApp..."
        ) : isSoldOut ? "Agotado" : ctaLabel}
      </Button>

      {isSoldOut && (
        <p className="text-xs text-red-700 text-center leading-relaxed" role="status">
          {odooAllOut
            ? "Este producto está agotado y no se puede pedir por ahora."
            : `${activeColorName}${odooSize ? ` en ${odooSize}` : ""} está agotado. Elegí otro color o tamaño para hacer el pedido.`}
        </p>
      )}

      {/* Aviso sutil cuando el backend no respondió: el pedido salió igual por
          WhatsApp, solo que sin número ni imagen. */}
      {orderFallback && (
        <p className="text-xs text-amber-700 text-center leading-relaxed">
          No pudimos registrar tu pedido online, pero tus especificaciones salen
          igual por WhatsApp. Si querés, descargá la imagen y sumala al chat.
        </p>
      )}

      {/* Señales de confianza: solo lo que el proceso real garantiza (sin plazos). */}
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-start gap-2">
          <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
          Revisamos el diseño final con vos por WhatsApp antes de producir.
        </li>
        <li className="flex items-start gap-2">
          <HandCoins className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
          Pagás recién cuando confirmás el diseño.
        </li>
        <li className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
          Retirás en nuestro local: {ADDRESS}.
        </li>
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-2 min-h-10 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <Link2 className="w-4 h-4" /> {linkCopied ? "¡Link copiado!" : "Compartir diseño"}
        </button>
        {(previewImg || isDrinkware || (is3DObject && activeObject)) && (
          <button
            type="button"
            onClick={handleDownloadPreview}
            className="inline-flex items-center gap-2 min-h-10 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <Download className="w-4 h-4" /> Descargar imagen
          </button>
        )}
      </div>
      {linkFallback && (
        <input
          readOnly
          value={linkFallback}
          onFocus={e => e.currentTarget.select()}
          aria-label="Link de tu diseño"
          className="w-full rounded-lg border border-border px-3 py-2 text-base"
        />
      )}
      {customImage && (
        <p className="text-xs text-muted-foreground text-center">
          El link guarda todo menos tu logo o foto: al abrirlo hay que volver a subirla.
        </p>
      )}
    </>
  );

  // Mini-preview 3D del wizard móvil (Paso 1 "Tu pieza"): una vista compacta
  // del producto elegido que se actualiza en vivo. Los pasos del wizard son
  // mutuamente excluyentes, así que nunca hay dos canvas WebGL montados a la
  // vez (este o el grande del paso de Diseño, jamás ambos).
  // `sticky`: queda fija debajo del header mientras las opciones scrollean,
  // así cada color se ve al instante. Es chica (≈ un cuarto de la pantalla)
  // para no tapar las opciones, que era el problema del visor grande pegado.
  const renderMiniPreview = (sticky = false) => (
    <div className={sticky ? "sticky top-16 z-30 bg-white pt-1 pb-1 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-border/60" : "relative bg-white pt-1 pb-0.5"}>
      <div className="relative isolate [transform:translateZ(0)] bg-secondary/30 rounded-2xl border border-border overflow-hidden shadow-lg shadow-black/5">
        {isGlass ? (
          <div className="absolute inset-0 rounded-2xl" style={{ background: "radial-gradient(circle at 50% 38%, #eef2f6 0%, #d3dae2 55%, #aeb8c4 100%)" }} />
        ) : (
          <div className="absolute inset-0 opacity-[0.07] transition-colors duration-500 rounded-2xl" style={{ backgroundColor: isDrinkware ? activeColorHex : "#C1121F" }} />
        )}
        <div className="relative z-10" style={sticky ? { height: "24vh", minHeight: 150, maxHeight: 210 } : { height: "32vh", minHeight: 210, maxHeight: 320 }}>
          {isDrinkware ? (
            <Thermos3D
              colorHex={activeColorHex}
              finish={finish}
              text={text}
              fontClass=""
              fontStyle={activeFont.style}
              productId={productId}
              sizeId={viewSize}
              customImageUrl={artUrl}
              imageSize={artImageSize}
              textPlacement={textPlacement}
              extraTexts={extraTextMarks}
              artPlacement={artPlacement}
              colorPrint={effectiveTechnique === "color"}
              textColor={textColor}
              wrap={activeWrap}
              engraveStyle={drinkwareEngraveStyle}
              singleFace={singleFace}
              showGuides={false}
              frontFaceU={designFaceU}
              hideLogo={designOnLogoSide || !!activeWrap}
              glass={isGlass}
              onModelKeepOut={onModelKeepOut}
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
      {!sticky && (
        <p className="text-center text-xs text-muted-foreground mt-1">
          {isDrinkware || is3DObject ? "Vista en vivo · arrastre para girar" : "Vista previa referencial"}
        </p>
      )}
    </div>
  );

  const renderPinchHint = () => (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
      <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-2 text-[13px] font-medium text-white backdrop-blur-sm">
        <Maximize2 className="w-4 h-4" aria-hidden /> Pellizcá para cambiar el tamaño
      </span>
    </div>
  );

  // Visor 3D grande del paso de Diseño (escritorio y pantalla del celular).
  const renderThermosViewer = () => (
    <Thermos3D
      colorHex={activeColorHex}
      finish={finish}
      text={text}
      fontClass=""
      fontStyle={activeFont.style}
      productId={productId}
      sizeId={viewSize}
      customImageUrl={artUrl}
      imageSize={artImageSize}
      textPlacement={textPlacement}
      extraTexts={extraTextMarks}
      artPlacement={artPlacement}
      colorPrint={effectiveTechnique === "color"}
      textColor={textColor}
      wrap={activeWrap}
      engraveStyle={drinkwareEngraveStyle}
      singleFace={singleFace}
      editSingleFace={editSingleFace}
      showGuides={guidesActive}
      frontFaceU={designFaceU}
      guideFace={activeDesignKind === "art" ? artFace : activeDesignKind === "text2" ? text2Face : textFace}
      hideLogo={designOnLogoSide || !!activeWrap}
      glass={isGlass}
      designActive={designActive}
      onDesignMove={onDesignMoveUV}
      onDesignPinch={isMobile ? onDesignPinch : undefined}
      onPinchSelect={isMobile ? onPinchSelect : undefined}
      freePlacement={FREE_PLACEMENT}
      keepOutZones={keepOutZones}
      keepOutHit={keepOutHit}
      onModelKeepOut={onModelKeepOut}
      followU={designDragging && activeDesignKind ? designFaceU : null}
      onDesignDragStart={beginDesignDrag}
      onDesignDragEnd={endDesignDrag}
      onTap={handleViewerTap}
      isOverDesign={isOverActiveDesign}
      snapToURef={thermosSnapRef}
      renderNowRef={thermosRenderRef}
      arModelRef={thermosArRef}
      screenBoundsRef={thermosBoundsRef}
      onReady={() => setViewerReady(n => n + 1)}
      autoSpin={wrapSpin}
      rotationLocked={wrapSpin}
      anchor={isMobile ? pillAnchor : null}
      anchorElRef={pillRef}
    />
  );

  // "Traigo el mío" en el celular: una línea al final de "Tu pieza" (antes
  // eran dos tarjetas arriba de todo, y casi nadie lo usa).
  const renderOwnProductLine = () => canBringOwn && (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={ownProduct}
        onClick={() => { setOwnProduct(o => !o); track("customizer_own_product", { own: !ownProduct }); }}
        className="w-full min-h-12 flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-2.5 text-left active:bg-secondary/50"
      >
        <span className="text-sm text-foreground leading-tight">
          ¿Ya tenés tu {productNoun}? <span className="text-muted-foreground">Traelo y lo grabamos</span>
        </span>
        <span aria-hidden className={`shrink-0 w-10 h-6 rounded-full p-0.5 transition-colors ${ownProduct ? "bg-primary" : "bg-border"}`}>
          <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${ownProduct ? "translate-x-4" : ""}`} />
        </span>
      </button>
      {ownProduct && (
        <p className="text-xs text-muted-foreground mt-2">
          Pagás solo el grabado. Elegí arriba el modelo y el color más parecidos al tuyo para ver cómo queda.
        </p>
      )}
    </div>
  );

  // Resumen de la pieza con el precio, antes de diseñar.
  const renderPieceSummaryLine = () => {
    const sizeName = odooMode ? odooSize : product.sizes.length > 1 ? activeSize.name : null;
    const parts = [odooProduct?.name ?? activeMProduct?.name ?? product.singular, sizeName, isGlass ? "Cristal" : activeColorName.split(" · ")[0], activeTechnique.name];
    return (
      <div className="flex items-baseline justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3">
        <span className="text-xs text-muted-foreground leading-snug">{parts.filter(Boolean).join(" · ")}</span>
        {estimate.price && <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">{estimate.price}</span>}
      </div>
    );
  };

  // Paso 4 — Resumen: imagen del diseño + detalle legible + envío por WhatsApp.
  // (Sin planes ni precios: eso vive en la sección "Tarifas".) Los campos salen
  // de orderFields(), la misma fuente que arma el mensaje de WhatsApp.
  const renderDrinkSummary = () => (
    <div className="space-y-4">
      {/* Imagen de vista previa del diseño final, capturada del 3D. */}
      {summaryThumb && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Vista de tu diseño</Label>
          <div className="rounded-xl border border-border bg-secondary/30 p-2 flex justify-center">
            <img src={summaryThumb} alt="Vista del diseño final" className="max-h-64 w-auto object-contain" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Vista de referencia. Antes de producir te enviamos el diseño final por WhatsApp para confirmarlo.
          </p>
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

  // Salir del paso de Diseño: la pieza gira para mostrar el diseño de frente,
  // se espera el repintado y RECIÉN ahí se captura el canvas, así la imagen del
  // resumen siempre muestra el diseño completo.
  const leaveDesignStep = () => {
    // Terminar la edición: sin guías ni selección en la foto.
    if (activeDesignKind) finishEditing();
    setSheet(null);
    thermosSnapRef.current?.(captureFaceU);
    setTimeout(() => {
      const img = capturePreview();
      if (img) { setPreviewImg(img); previewImgRef.current = img; }
      goToStep(Math.min(wizardLabels.length, designStepIndex + 1));
    }, 150);
  };

  /** Colores del producto en una tira (pantalla de Diseño del celular). */
  const renderColorDots = () => {
    if (isGlass || isInox) return null;
    const items = odooMode && odooColors.length
      ? odooColors.map(c => ({ key: c.name, hex: c.hex, name: c.name, on: odooColor === c.name, disabled: !odooColorInStock(c.name), pick: () => selectOdooColor(c.name) }))
      : COLORS.map(c => ({ key: c.id, hex: c.hex, name: c.name, on: color === c.id && !customHex, disabled: false, pick: () => handleSelectColor(c.id) }));
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground shrink-0">Color</span>
        <div role="radiogroup" aria-label="Color" className="flex-1 min-w-0 flex gap-2 overflow-x-auto p-1 [scrollbar-width:none]">
          {items.map(c => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={c.on}
              aria-label={c.disabled ? `${c.name}, agotado` : c.name}
              title={c.name}
              disabled={c.disabled}
              onClick={c.pick}
              className={`shrink-0 w-8 h-8 rounded-full border border-black/10 ring-offset-2 transition disabled:opacity-30 ${c.on ? "ring-2 ring-primary" : ""}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>
    );
  };

  /** Hoja "Agregar al termo" / edición del elemento tocado, dentro de la pantalla. */
  const renderDesignSheet = () => {
    if (!sheet) return null;
    const { mode, edit } = sheet;
    const t2 = edit === "text2";
    const modes: { id: SheetMode; label: string; Icon: React.ComponentType<{ className?: string }>; off?: boolean }[] = [
      { id: "text", label: "Texto", Icon: Type, off: !canAddText },
      { id: "icon", label: "Ícono", Icon: Heart },
      ...(canUploadImage ? [{ id: "image" as const, label: "Logo o foto", Icon: ImageIcon }] : []),
      { id: "template", label: "Plantilla", Icon: Sparkles },
      ...(canWrap ? [{ id: "wrap" as const, label: "Todo el vaso (360°)", Icon: Repeat }] : []),
    ];
    const title = edit === "text" || edit === "text2" ? (hasText2 ? (t2 ? "Editar texto 2" : "Editar texto 1") : "Editar texto")
      : edit === "art" ? (iconId ? "Cambiar ícono" : "Logo o foto")
      : "Agregar al termo";
    const primary = (label: string, onClick: () => void, disabled = false) => (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full min-h-12 rounded-full bg-primary text-primary-foreground text-base font-semibold disabled:opacity-40 active:scale-[0.99] transition"
      >
        {label}
      </button>
    );
    return (
      <div className="absolute inset-0 z-40 flex flex-col justify-end">
        <button type="button" aria-label="Cerrar" onClick={closeSheet} className="absolute inset-0 bg-black/30" />
        <div
          role="dialog"
          aria-label={title}
          className="relative bg-white rounded-t-3xl max-h-[82%] overflow-y-auto overscroll-contain px-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="sticky top-0 z-10 bg-white pt-2 pb-3">
            <span aria-hidden className="block mx-auto w-10 h-1 rounded-full bg-border" />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-base font-semibold text-foreground">{title}</p>
              <button type="button" onClick={closeSheet} aria-label="Cerrar" className="w-10 h-10 -mr-2 grid place-items-center rounded-full text-muted-foreground active:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {edit === null && (
              <div className="grid grid-cols-2 gap-2">
                {modes.map(({ id, label, Icon, off }) => {
                  const on = mode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      disabled={off}
                      onClick={() => setSheet({ mode: id, edit: null })}
                      className={`min-h-12 px-3 py-2.5 border rounded-xl flex items-center gap-2.5 text-sm font-medium transition-all disabled:opacity-40 ${id === "wrap" ? "col-span-2" : ""} ${on ? activeCard : idleCard}`}
                    >
                      <Icon className="w-5 h-5 text-primary shrink-0" />
                      <span className={on ? "" : "text-foreground"}>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Nuevo texto: se escribe y se pone en el termo. */}
            {edit === null && mode === "text" && (
              <div className="space-y-3">
                <EngravingTextField
                  inputRef={textInputRef}
                  text={draft}
                  onText={setDraft}
                  layout="auto"
                  placeholder={hasText ? "Otro texto (ej. una fecha)" : "Tu nombre o texto"}
                />
                {hasText && effectiveTechnique === "laser" && (
                  <p className="text-xs text-muted-foreground -mt-1">El segundo texto suma {formatGs(PRICING.laser.extraText)}.</p>
                )}
                {primary("Ponerlo en el termo", placeDraftText, !draft.trim())}
              </div>
            )}

            {/* Editar un texto: contenido, letra y más opciones. */}
            {(edit === "text" || edit === "text2") && (
              <div className="space-y-4">
                <EngravingTextField
                  key={edit}
                  text={t2 ? text2 : text}
                  onText={t2 ? setText2 : handleEngravingText}
                  layout={t2 ? "auto" : textPlacement.layout}
                  onFocusChange={t2 ? undefined : setTextFieldFocused}
                  limitNotice={!t2 && wrapLimitHit ? "El texto alcanzó el máximo para envolver el producto." : null}
                />
                {!t2 && <AiPhraseIdeas product={product.singular} twoLines={text2Open} onPick={pickPhraseIdea} />}
                {isColorPrint && <TextColorPicker value={textColor} onChange={setTextColor} />}
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">Letra</Label>
                  <FontQuickGrid fonts={FONTS} value={t2 ? text2Font : font} onChange={t2 ? setText2Font : setFont} sampleText={t2 ? text2 : text} />
                </div>
                {!t2 && textLayout.shrunk && (
                  <p className="text-xs text-primary/90 flex items-center gap-1.5 rounded-lg bg-[#f5eaec] border border-primary/20 px-3 py-2">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    Tamaño ajustado automáticamente para que entre en el área.
                  </p>
                )}
                <div className="border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setSheetMore(m => !m)}
                    aria-expanded={sheetMore}
                    className="w-full min-h-11 flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    <Settings2 className="w-4 h-4" /> Más opciones
                    <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${sheetMore ? "rotate-180" : ""}`} />
                  </button>
                  {sheetMore && (
                    <div className="mt-2 space-y-5">
                      <TextSizeSlider
                        scale={(t2 ? text2Placement : textPlacement).scale}
                        onScale={(sc) => t2 ? applyText2Placement({ ...text2Placement, scale: sc }) : applyTextPlacement({ ...textPlacement, scale: sc })}
                        maxScale={!t2 && isWrap360 ? wrapMaxScale : undefined}
                      />
                      {!t2 && (
                        <OrientationToggle
                          value={textPlacement.orientation}
                          onChange={(o) => applyTextPlacement({ ...textPlacement, orientation: o })}
                          verticalDisabledReason={isWrap360 ? "El texto envolvente 360° va en horizontal alrededor del cuerpo" : undefined}
                        />
                      )}
                      {!t2 && <TextDispositionToolbar placement={textPlacement} onChange={applyTextPlacement} />}
                      {extraEngraving && (
                        <ExtraEngravingFields lid={extraLid} base={extraBase} onLid={setExtraLid} onBase={setExtraBase} />
                      )}
                    </div>
                  )}
                </div>
                {primary("Listo", closeSheet)}
              </div>
            )}

            {mode === "icon" && (edit === null || edit === "art") && (
              <IconPicker
                value={iconId}
                onChange={(id) => {
                  pushHistory();
                  handlePickIcon(id);
                  if (id) { track("design_add", { kind: "icon" }); setSheet(null); }
                }}
              />
            )}

            {mode === "image" && (edit === null || edit === "art") && canUploadImage && (
              <div className="space-y-3">
                <ImageUpload
                  imageSize="large"
                  value={customImage}
                  onChange={handleUploadImage}
                  aiStyle={effectiveTechnique === "color" ? "color" : "laser"}
                />
                {primary(edit ? "Listo" : "Ponerlo en el termo", () => { if (!edit) track("design_add", { kind: "image" }); setSheet(null); }, !customImage)}
              </div>
            )}

            {edit === null && mode === "wrap" && canWrap && (
              <div className="space-y-4">
                {renderWrapPanel()}
                {primary(wrapDesign ? "Listo" : "Ponerlo en el vaso", () => setSheet(null), !wrapDesign)}
              </div>
            )}

            {edit === null && mode === "template" && (
              <div className="grid grid-cols-1 gap-2">
                {QUICK_STARTS.map(q => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => applyQuickStart(q.id)}
                    className={`min-h-14 px-4 py-2.5 border rounded-xl text-left transition-all ${idleCard}`}
                  >
                    <span className="block text-sm font-semibold text-foreground leading-tight">{q.title}</span>
                    <span className="block text-xs text-muted-foreground leading-tight mt-0.5">{q.sample}</span>
                  </button>
                ))}
                <p className="text-xs text-muted-foreground">Después tocás el texto para cambiarlo y lo arrastrás a cualquier lugar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Paso de Diseño del celular para termos y vasos: una sola pantalla fija.
   * El visor ocupa casi todo (~70 %); abajo, siempre a la vista, el color, el
   * precio y "Listo". El único botón que llama es el "+".
   */
  const renderMobileDrinkDesign = () => {
    const sizeName = odooMode ? odooSize : product.sizes.length > 1 ? activeSize.name : null;
    const priceNote = isOwnProduct ? "solo el grabado" : estimate.total ? "grabado incluido" : null;
    return (
      <MobileDesignScreen
        title={odooProduct?.name ?? activeMProduct?.name ?? product.singular}
        subtitle={designElementCount
          ? `${designElementCount} ${designElementCount === 1 ? "elemento" : "elementos"} · tocá para editar`
          : undefined}
        right={
          <span className="inline-flex items-center">
          <button
            type="button"
            onClick={restartTour}
            aria-label="Cómo funciona"
            className="w-11 h-11 grid place-items-center rounded-full text-muted-foreground active:bg-secondary text-base font-semibold"
          >
            ?
          </button>
          <span ref={arTipRef} className="inline-flex">
            <ArViewButton
              compact
              getModel={() => thermosArRef.current?.() ?? null}
              designKey={[productId, viewSize, activeColorHex, finish, text, font, text2, text2Font, JSON.stringify(text2Placement), iconId, artUrl?.length ?? 0, textColor, effectiveTechnique, JSON.stringify(textPlacement), JSON.stringify(artPlacement)].join("|")}
            />
          </span>
          </span>
        }
        top={vp.top}
        height={vp.height}
        onBack={() => goToStep(designStepIndex - 1)}
        nav={null}
      >
        <div ref={previewPanelRef} onPointerDownCapture={() => setDragTipGone(true)} className="relative flex-1 min-h-0 isolate [transform:translateZ(0)] bg-secondary/30 overflow-hidden">
          {/* Visor del paso "Girá el termo": el spotlight usa la silueta real de la
              pieza (thermosBoundsRef); este recuadro queda de respaldo. */}
          <div ref={productTipRef} aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[7%] h-[80%] w-[52%]" />
          {isGlass ? (
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 38%, #eef2f6 0%, #d3dae2 55%, #aeb8c4 100%)" }} />
          ) : (
            <div className="absolute inset-0 opacity-[0.07] transition-colors duration-500" style={{ backgroundColor: activeColorHex }} />
          )}
          <div className="absolute inset-0 z-10">{renderThermosViewer()}</div>

          {pinchHint && renderPinchHint()}
          {keepOutHit && (
            <p role="status" className="pointer-events-none absolute inset-x-4 top-3 z-30 text-center">
              <span className="inline-block rounded-full bg-white/95 border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary shadow-sm">
                Ahí está {KEEP_OUT_LABEL[keepOutHit.kind]}: no se puede grabar encima.
              </span>
            </p>
          )}

          {/* Pastilla del elemento: la mueve el visor (ver anchor en Thermos3D). */}
          <div ref={pillRef} className="absolute left-0 top-0 z-30" style={{ visibility: "hidden" }}>
            {pillAnchor && (
              <ElementPill
                onSmaller={() => resizeActive(-0.1)}
                onBigger={() => resizeActive(0.1)}
                onCenter={centerWithHistory}
                onDelete={deleteActive}
              />
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-2 flex flex-col items-center gap-2">
            {undoDeleteUntil > 0 && (
              <button
                type="button"
                onClick={() => { setUndoDeleteUntil(0); undo(); }}
                className="pointer-events-auto h-9 px-4 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background text-sm font-medium shadow-sm active:scale-95 transition"
              >
                <Undo2 className="w-4 h-4" /> Deshacer borrado
              </button>
            )}
            {wrapSpin || designActive ? (
              <p className="text-xs text-muted-foreground text-center px-4">
                {wrapSpin ? "Girando para mostrar el texto envolvente…" : "Arrastrá para mover · Pellizcá para el tamaño"}
              </p>
            ) : (
              // Estado del lienzo: siempre a la vista hasta el primer toque, y no vuelve.
              <p className={`flex items-center justify-center gap-[5px] text-[11px] text-[#7B726B] transition-opacity duration-[250ms] ${dragTipGone ? "opacity-0" : ""}`}>
                <ChevronsLeftRight className="w-[13px] h-[13px]" aria-hidden /> Arrastrá para girar
              </p>
            )}
          </div>

          <button
            ref={addTipRef}
            type="button"
            onClick={openAddSheet}
            aria-label="Agregar al termo"
            className="absolute right-4 bottom-10 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-lg shadow-primary/30 active:scale-95 transition"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>

        {!vp.keyboard && (
          <div className="shrink-0 bg-white border-t border-border px-4 pt-2.5 space-y-2.5" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
            <div ref={colorTipRef}>{renderColorDots()}</div>
            <div className={`flex items-center justify-between gap-3 ${isGlass || isInox ? "" : "pt-2.5 border-t border-border"}`}>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {[sizeName, priceNote].filter(Boolean).join(" · ") || estimate.note}
                </p>
                <p className="text-base font-semibold text-foreground tabular-nums leading-tight">
                  {isSoldOut ? "Agotado" : estimate.price ?? "Se cotiza por WhatsApp"}
                </p>
              </div>
              <button
                ref={doneTipRef}
                type="button"
                onClick={leaveDesignStep}
                // Apagado hasta el primer diseño; al encenderse por primera vez, 2 pulsos.
                className={`shrink-0 h-12 px-6 inline-flex items-center gap-1 rounded-full text-base font-semibold shadow-sm active:scale-[0.98] transition-colors ${designElementCount ? "bg-primary text-primary-foreground" : "bg-[#E6E0D6] text-[#9A9188]"} ${doneHint ? "motion-safe:animate-[listo-pulse_1.5s_ease-out_2]" : ""}`}
              >
                Listo <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {renderDesignSheet()}
        <Hint target={arTipRef} text="Vélo en tu espacio" show={arHint} ms={4000} align="below" dismissOnTap onDone={() => setArHint(false)} />
        <Hint target={doneTipRef} text="Ya podés continuar" show={doneHint} ms={3200} align="above" onDone={() => setDoneHint(false)} />
        <EditorTour key={tourRun} steps={tourSteps} open={tourOpen} onClose={closeTour} />
      </MobileDesignScreen>
    );
  };

  // Barra inferior del asistente del celular (fija sobre la página, o dentro
  // de la pantalla de Diseño con `inline`).
  const renderWizardNav = (inline: boolean) => (
    <WizardNav
      step={mobileStep}
      total={wizardLabels.length}
      onBack={() => goToStep(Math.max(1, mobileStep - 1))}
      onNext={() => {
        // Leaving the design step: swing the personalized area to face the
        // camera, wait for the repaint, THEN snapshot the live canvas — so
        // the Step 4 image always shows the design completely, no matter
        // how the user left the piece rotated.
        if (mobileStep === designStepIndex) { leaveDesignStep(); return; }
        goToStep(Math.min(wizardLabels.length, mobileStep + 1));
      }}
      nextLabel={mobileStep === designStepIndex ? "Continuar"
        : mobileStep === designStepIndex - 1 ? "Diseñar" : "Siguiente"}
      design={mobileStep === designStepIndex - 1}
      inline={inline}
      final={{
        label: isPreparing
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando tu pedido...</>
          : isOrdered
            ? (lastOrderNumber ? `Pedido ${lastOrderNumber} ✓` : "Abriendo WhatsApp...")
            : isSoldOut ? "Agotado" : <><MessageCircle className="w-4 h-4" /> Enviar por WhatsApp</>,
        onClick: () => handleOrder(),
        disabled: isOrdered || isPreparing || isSoldOut,
      }}
    />
  );
  // Celular: el paso de Diseño es una pantalla fija aparte (MobileDesignScreen).
  const wrapDesignStep = (content: React.ReactNode) => !isMobile ? content : (
    <MobileDesignScreen
      title={`Diseñá tu ${productNoun}`}
      subtitle={`Paso ${mobileStep} de ${wizardLabels.length}`}
      top={vp.top}
      height={vp.height}
      onBack={() => goToStep(Math.max(1, designStepIndex - 1))}
      nav={vp.keyboard ? null : renderWizardNav(true)}
    >
      {content}
    </MobileDesignScreen>
  );

  return (
    // reducedMotion="user": con prefers-reduced-motion los pasos del asistente
    // aparecen sin deslizar (igual que Galería y Tarifas).
    <MotionConfig reducedMotion="user">
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
            Creá tu pieza
          </h2>
          <p className={`hidden ${mode === "products" ? "md:block" : ""} text-[#5f574d] font-light text-lg max-w-xl leading-relaxed`}>
            Elegí el material, luego el producto, y refinalo a tu gusto. El diseño final lo coordinamos
            con vos por WhatsApp.
          </p>
        </div>

        <div role="tablist" aria-label="Qué querés crear" className="mb-6 md:mb-8 inline-flex w-full sm:w-auto rounded-xl border border-border bg-secondary/40 p-1">
          {([
            { id: "products", label: <><span className="sm:hidden">Termos y más</span><span className="hidden sm:inline">Termos, vasos y más</span></> },
            { id: "stickers", label: "Stickers" },
          ] as const).map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => {
                if (mode === t.id) return;
                setMode(t.id);
                track("customizer_mode", { mode: t.id });
              }}
              className={`flex-1 sm:flex-none min-h-11 px-5 rounded-lg text-sm font-medium transition-colors ${mode === t.id ? "bg-white text-[#8B1A2F] shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === "stickers" ? (
          <div>
            <p className="text-[#5f574d] font-light text-sm md:text-base max-w-2xl leading-relaxed mb-6 md:mb-8">
              Stickers impresos a todo color, con acabado brillante o con relieve que se siente al tacto.
              Se pegan en termos, botellas, notebooks, celulares o packaging, y resisten agua y roce.
            </p>
            <React.Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Cargando stickers…</div>}>
              <StickerCreator />
            </React.Suspense>
          </div>
        ) : (
        <>
        {isMobile && <WizardProgress step={mobileStep} labels={wizardLabels} />}

        {/* Desktop: material + product as the original card grids. On mobile these
            are replaced by the Step 1 chip pickers below. */}
        {!isMobile && (
        <>
        {/* STEP 1 — MATERIAL */}
        <div className="mb-8">
          <Label className="text-sm font-medium text-foreground mb-3 block">1 · Tipo de material</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

          {shopMode ? (
            <p className="text-sm text-muted-foreground">
              Elegí el producto en la lista de la izquierda, junto a la vista 3D.
            </p>
          ) : material.pens ? (
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
          {!material.pens && !shopMode && activeMProduct?.desc && (
            <p className="text-xs text-muted-foreground mt-3">{activeMProduct.desc}</p>
          )}
          {approxNote && <p className="text-xs text-muted-foreground mt-3">{approxNote}</p>}
          {!shopMode && odooProducts.length > 1 && <div className="mt-6">{renderOdooModel()}</div>}
          {canBringOwn && <div className="mt-6 max-w-md">{renderOwnProduct()}</div>}
        </div>
        </>
        )}

        {/* Mobile Step 1 — "Tu pieza": material, producto, tamaño y técnica
            en una sola pantalla (el color va en Diseño), con la pieza chica fija arriba para
            ver cada cambio en el momento (antes eran dos pasos). */}
        {isMobile && mobileStep === 1 && (
          <motion.div key="wiz-1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="pb-28">
            {renderMiniPreview(true)}
            <div className="space-y-7 pt-4">
              <MaterialChips materials={MATERIALS} value={materialId} onChange={handleSelectMaterial} />
              {shopMode && shopItem ? (
                <div>
                  <ShopProductCard item={shopItem} detail={shopDetail} onChange={() => setShopSheetOpen(true)} />
                  {approxNote && <p className="text-xs text-muted-foreground mt-3">{approxNote}</p>}
                  <ShopSheet
                    open={shopSheetOpen}
                    onOpenChange={setShopSheetOpen}
                    items={shopItems}
                    value={shopKey}
                    initialBrand={shopItem.brand}
                    onPick={pickShopItem}
                  />
                </div>
              ) : (
                <>
                  <ProductChips material={material} value={materialProductId} onChange={handleSelectMaterialProduct} />
                  {material.desc && <p className="text-xs text-muted-foreground -mt-4">{material.desc}</p>}
                  {renderOdooModel()}
                </>
              )}
              {isDrinkware ? (
                <>
                  {/* El color se elige en Diseño, sobre la pieza grande. */}
                  {renderDrinkSize()}
                  {renderDrinkTechnique()}
                  {renderOwnProductLine()}
                  {renderPieceSummaryLine()}
                </>
              ) : renderOwnProduct()}
            </div>
          </motion.div>
        )}

        {/* Design step — 3D preview + editor. Step 3 on drinkware, Step 2 otherwise. */}
        {isMobile && isDrinkware && mobileStep === designStepIndex && renderMobileDrinkDesign()}
        {(!isMobile || (mobileStep === designStepIndex && !isDrinkware)) && wrapDesignStep(
        <div className={isMobile ? "flex-1 min-h-0 flex flex-col" : undefined}>
        {/* STEP 3 — CUSTOMIZE */}
        <div className={isMobile ? "flex-1 min-h-0 flex flex-col" : "flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 lg:items-start"}>

          {/* PREVIEW AREA */}
          {/* En celular el visor NO es sticky: scrollea con la página (pegado
              arriba seguía al scroll y tapaba el editor). Sticky solo en desktop. */}
          {/* Desktop con catálogo de la tienda: barra lateral a la izquierda del 3D. */}
          {shopMode && !isMobile && (
            <div className="w-full min-w-0 lg:col-span-3 lg:self-start">
              <ShopRail items={shopItems} value={shopKey} initialBrand={shopItem?.brand ?? shopBrands(shopItems)[0]} onPick={pickShopItem} />
            </div>
          )}
          <div className={isMobile ? "w-full shrink-0 relative" : "w-full min-w-0 lg:col-span-4 relative max-lg:bg-white max-lg:pt-1 lg:self-start"}>
            <div ref={previewPanelRef} className={isMobile
              ? "relative z-20 isolate [transform:translateZ(0)] bg-secondary/30 border-b border-border flex flex-col items-center overflow-hidden"
              : "lg:sticky lg:top-24 z-20 isolate [transform:translateZ(0)] bg-secondary/30 rounded-2xl border border-border flex flex-col items-center gap-4 overflow-hidden min-h-[280px] md:min-h-[520px] max-lg:shadow-lg max-lg:shadow-black/5"}>
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
                  <div className="relative w-full" style={{ height: isMobile ? mobileViewerH : 480 + Math.round((activeSize.scale - 0.84) * 200) }}>
                    {renderThermosViewer()}
                    {pinchHint && renderPinchHint()}
                  </div>

                  {/* Debajo del visor (no encima): la barra nunca tapa la pieza.
                      Con el teclado abierto se oculta: el lugar es del texto. */}
                  <div className={`-mt-1 mb-2 min-h-6 flex-col items-center gap-1.5 ${isMobile && vp.keyboard ? "hidden" : "flex"}`}>
                    {keepOutHit && (
                      <p role="status" className="text-xs font-medium text-primary text-center px-3">
                        Ahí está {KEEP_OUT_LABEL[keepOutHit.kind]}: no se puede grabar encima.
                      </p>
                    )}
                    {wrapSpin ? (
                      <p className="text-xs text-muted-foreground">Girando para mostrar el texto envolvente…</p>
                    ) : designActive ? (
                      <DesignEditBar
                        kindLabel={editLabel}
                        pinch={isMobile}
                        onSmaller={() => resizeActive(-0.1)}
                        onBigger={() => resizeActive(0.1)}
                        onCenter={centerWithHistory}
                        onUndo={history.length ? undo : null}
                        onDelete={deleteActive}
                        onDone={finishEditing}
                      />
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {idleEditKind ? "Arrastrá para girar · tocá tu diseño para moverlo" : "Arrastrá para girar"}
                        </p>
                        <div className="flex flex-wrap items-start justify-center gap-2">
                          <DesignIdleActions
                            onEdit={idleEditKind ? () => selectDesign(idleEditKind, "button") : null}
                            onUndoDelete={undoDeleteUntil ? () => { setUndoDeleteUntil(0); undo(); } : null}
                          />
                          <ArViewButton
                            getModel={() => thermosArRef.current?.() ?? null}
                            designKey={[productId, viewSize, activeColorHex, finish, text, font, text2, text2Font, JSON.stringify(text2Placement), iconId, artUrl?.length ?? 0, textColor, effectiveTechnique, singleFace, JSON.stringify(textPlacement), JSON.stringify(artPlacement)].join("|")}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Summary badges — hidden on mobile to keep the sticky preview compact. */}
                  <div className="hidden md:flex flex-wrap gap-2 justify-center px-4 pb-4">
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                      {odooProduct?.name ?? product.singular}
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
                  <div className="relative w-full" style={{ height: isMobile ? mobileViewerH : 460 }}>
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
                      onDesignPinch={isMobile ? onDesignPinch : undefined}
                      onPinchSelect={isMobile ? onPinchSelect : undefined}
                      onDesignDragStart={beginDesignDrag}
                      onDesignDragEnd={endDesignDrag}
                    />
                    {pinchHint && renderPinchHint()}
                  </div>

                  <div className="-mt-1 mb-2 min-h-6 flex flex-col items-center gap-1.5">
                    {designActive ? (
                      <DesignEditBar
                        kindLabel={editLabel}
                        pinch={isMobile}
                        onSmaller={() => resizeActive(-0.1)}
                        onBigger={() => resizeActive(0.1)}
                        onCenter={centerWithHistory}
                        onUndo={history.length ? undo : null}
                        onDelete={deleteActive}
                        onDone={finishEditing}
                      />
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">Arrastrá para girar</p>
                        <DesignIdleActions
                          onEdit={idleEditKind ? () => selectDesign(idleEditKind, "button") : null}
                          onUndoDelete={undoDeleteUntil ? () => { setUndoDeleteUntil(0); undo(); } : null}
                        />
                      </>
                    )}
                  </div>

                  <div className="hidden md:flex flex-wrap gap-2 justify-center px-4 pb-4">
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
                    Vista de referencia. Antes de producir te enviamos el diseño final por WhatsApp para confirmarlo.
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
                      Tu pieza está lista.
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="text-sm text-white/60 font-light max-w-xs leading-relaxed"
                    >
                      Te abrimos WhatsApp para continuar con tu pedido. Enviá el mensaje y coordinamos los detalles.
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* CONTROLS AREA */}
          <div className={isMobile
            ? "w-full flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white"
            : `w-full min-w-0 ${shopMode ? "lg:col-span-5" : "lg:col-span-8"} bg-white rounded-2xl border border-border`}>
            {isDrinkware ? (
              <Tabs value={drinkTab} onValueChange={setDrinkTab} className="w-full">
                <div className={isMobile ? "sticky top-0 z-10 bg-white px-3 pt-2 pb-1" : "px-4 sm:px-6 pt-4 pb-1"}>
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
                    {renderDrinkSize()}
                    {renderDrinkColor()}
                  </TabsContent>
                  )}

                  {/* TEXT TAB */}
                  {!isMobile && (
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
                        <AiPhraseIdeas product={product.singular} twoLines={text2Open} onPick={pickPhraseIdea} />
                      </div>

                      {/* Técnica de grabado — global (afecta texto, ícono e imagen).
                          En impresión UV aparece el color del texto/diseño; en láser
                          el diseño queda monocromático. */}
                      {/* En el celular la técnica se elige en "Tu pieza". */}
                      {!isMobile && renderDrinkTechnique()}
                      {isColorPrint && (
                        <TextColorPicker value={textColor} onChange={setTextColor} />
                      )}

                      {/* Orientación del texto (al final de los controles de Texto). */}
                      <OrientationToggle
                        value={textPlacement.orientation}
                        onChange={(o) => applyTextPlacement({ ...textPlacement, orientation: o })}
                        verticalDisabledReason={isWrap360 ? "El texto envolvente 360° va en horizontal alrededor del cuerpo" : undefined}
                      />
                      {/* Dónde va el texto: frente, dorso o costado (el Envolvente 360°
                          ya rodea todo el cuerpo). */}
                      {!FREE_PLACEMENT && !isWrap360 && textFaces.length > 1 && (
                        <FaceSelector faces={textFaces} value={textFace} onChange={selectTextFace} product={product} />
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground mb-3 block">Elegí tu tipografía</Label>
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

                    {/* Texto 2: otro texto con su propia fuente, tamaño y lugar. */}
                    {(text2Open || !isWrap360) && (text2Open ? (
                      <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">Texto 2</p>
                            <p className="text-xs text-muted-foreground">
                              Ej.: la empresa arriba y el nombre del empleado abajo. Tocalo sobre {productTheNoun} para moverlo.
                              {effectiveTechnique === "laser" && <> {formatGs(PRICING.laser.extraText)} más.</>}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={removeText2}
                            aria-label="Quitar el texto 2"
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <EngravingTextField
                            text={text2}
                            onText={setText2}
                            layout="auto"
                            placeholder="Segundo texto (ej. nombre del empleado)"
                          />
                        </div>
                        {singleFace && textFaces.length > 1 && (
                          <FaceSelector faces={textFaces} value={text2Face} onChange={selectText2Face} product={product} label="Ubicación del texto 2" />
                        )}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">Tipografía del texto 2</Label>
                          <FontCarousel fonts={FONTS} value={text2Font} onChange={setText2Font} sampleText={text2 || "Texto 2"} />
                        </div>
                        <TextSizeSlider
                          scale={text2Placement.scale}
                          onScale={(sc) => applyText2Placement({ ...text2Placement, scale: sc })}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={openText2}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-secondary/50 active:scale-[0.99] transition-all"
                      >
                        <Plus className="w-4 h-4 text-primary" />
                        Agregar otro texto
                        {effectiveTechnique === "laser" && (
                          <span className="text-xs font-normal text-muted-foreground">+ {formatGs(PRICING.laser.extraText)}</span>
                        )}
                      </button>
                    ))}

                    {extraEngraving && (
                      <ExtraEngravingFields lid={extraLid} base={extraBase} onLid={setExtraLid} onBase={setExtraBase} />
                    )}
                  </TabsContent>
                  )}

                  {/* ICONS TAB */}
                  <TabsContent value="icons" className="mt-0 space-y-5">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-1 block">Elegí un ícono</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Sumá un ícono a tu {productNoun}. Tocá de nuevo para quitarlo.
                      </p>
                      <IconPicker value={iconId} onChange={handlePickIcon} />
                    </div>

                    {!FREE_PLACEMENT && selectedIcon && textFaces.length > 1 && (
                      <FaceSelector faces={textFaces} value={artFace} onChange={selectArtFace} product={product} label="Ubicación del ícono" />
                    )}

                    {/* Tamaño/orientación del ícono, sólo cuando hay uno elegido. */}
                    {selectedIcon && (
                    <AdvancedOptions>
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-1 block">Tamaño y orientación del ícono</Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Arrastrá el ícono sobre {productTheNoun} para ubicarlo, o usá el control de posición del visor. Acá ajustás su tamaño.
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
                        Subí tu logo o tu foto: se imprime a todo color (impresión UV) sobre {productTheNoun}. Podés dejarla con fondo o quitárselo.
                      </p>

                      {/* Antes se exigía un plan "con imagen", pero el plan se deduce
                          de lo diseñado (sin imagen = "solo nombres"): era circular y
                          bloqueaba la subida. Ahora se sube directo y el plan pasa a
                          "logo" solo; el tamaño sale de ese plan. */}
                      <ImageUpload
                        imageSize="large"
                        value={customImage}
                        onChange={handleUploadImage}
                        aiStyle={effectiveTechnique === "color" ? "color" : "laser"}
                      />

                      {!FREE_PLACEMENT && customImage && textFaces.length > 1 && (
                        <div className="pt-4 mt-4 border-t border-border">
                          <FaceSelector faces={textFaces} value={artFace} onChange={selectArtFace} product={product} label="Ubicación de la imagen" />
                        </div>
                      )}

                      {customImage && (
                        <div className="pt-4 mt-4 border-t border-border">
                          <Label className="text-sm font-medium text-foreground mb-1 block">Orientación de la imagen</Label>
                          <p className="text-xs text-muted-foreground mb-3">
                            Arrastrá la imagen sobre {productTheNoun} para ubicarla, o usá el control de posición del visor.
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
                    </div>
                    {canWrap && (
                      <div className="pt-4 border-t border-border">
                        <Label className="text-sm font-medium text-foreground mb-1 block">Todo el vaso (360°)</Label>
                        {renderWrapPanel()}
                      </div>
                    )}
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
                    {activeObject.desc} Mirá cómo se vería con tu texto, un ícono o tu logo.
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
                        <AiPhraseIdeas
                          product={activeObject.singular}
                          twoLines={false}
                          onPick={(idea) => setText(idea.text2 ? `${idea.text}\n${idea.text2}` : idea.text)}
                        />
                      </div>
                      <OrientationToggle
                        value={textPlacement.orientation}
                        onChange={(o) => setTextPlacement(p => ({ ...p, orientation: o }))}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground mb-3 block">Elegí tu tipografía</Label>
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
                      <Label className="text-sm font-medium text-foreground mb-1 block">Elegí un ícono</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Sumá un ícono a tu {activeObject.singular.toLowerCase()}. Tocá de nuevo para quitarlo.
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
                        Subí tu logo o tu foto y la grabamos sobre la {activeObject.singular.toLowerCase()}. Podés dejarla con fondo o quitárselo.
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
                      : `${material.name}. Personalizalo y coordinamos el diseño final con vos por WhatsApp.`}
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
                    <Label className="text-sm font-medium text-foreground mb-1 block">Elegí un ícono</Label>
                    <p className="text-xs text-muted-foreground mb-3">Tocá de nuevo para quitarlo.</p>
                    <IconPicker value={iconId} onChange={handlePickIcon} />
                  </div>
                )}

                {simpleKind === "images" && (
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-1 block">Logo o foto</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Subí tu logo o foto y lo adaptamos al producto.
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
        {isMobile && isDrinkware && mobileStep === 3 && (
          <motion.div key="wiz-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-4 pb-28">
            <p className="text-sm text-muted-foreground">
              Revisá tu diseño y envialo por WhatsApp. Coordinamos los detalles al instante.
            </p>
            {renderDrinkSummary()}
          </motion.div>
        )}

        {/* Solo con el personalizador en pantalla: si no, la barra fija quedaba
            flotando sobre el hero, Tarifas, la Galería y el footer. En el paso
            de Diseño la barra va dentro de su pantalla (ver wrapDesignStep). */}
        {isMobile && customizerInView && mobileStep !== designStepIndex && renderWizardNav(false)}

        </>
        )}
      </div>
    </section>
    </MotionConfig>
  );
}
