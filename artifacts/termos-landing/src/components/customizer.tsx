import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Check, Palette, Type, Box, Pipette, ImageIcon, MoveHorizontal, MoveVertical,
  Shapes, Zap, Sparkles, Wallet, TreePine, Square, PenLine, Wine, CupSoda, Snowflake, MessageCircle,
  Minus, Plus, Move, WrapText,
} from "lucide-react";
import Thermos3D from "./thermos-3d";
import Object3D from "./object-3d";
import ImageUpload from "./image-upload";
import { ENGRAVING_PLANS, type EngravingPlanId } from "@/lib/engraving-plans";
import type { ProcessedImage } from "@/lib/image-processing";
import { DEFAULT_PRODUCT_ID, getProduct, getSize, type ProductDef } from "@/lib/products";
import { getObject } from "@/lib/objects";
import { DEFAULT_ART_PLACEMENT, DEFAULT_TEXT_PLACEMENT, type Placement } from "@/lib/placement";
import {
  MATERIALS, DEFAULT_MATERIAL_ID, getMaterial, allowsColorPrint, PEN_OPTIONS, type MaterialId,
} from "@/lib/materials";
import { ENGRAVING_ICONS, iconToDataUrl } from "@/lib/engraving-icons";
import { wrapEngraveText } from "@/lib/engraving-text";
import { whatsappUrl } from "@/lib/contact";

/**
 * Past this many characters a single engraved line starts to look cramped, so
 * we offer the "varias líneas" toggle and wrap words at this same width.
 */
const LINE_MAX = 14;

/** Toggle that appears once the text is long enough to benefit from wrapping. */
function LineWrapToggle({ show, on, onToggle }: { show: boolean; on: boolean; onToggle: () => void }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`mt-3 w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-all active:scale-[0.99] ${on ? activeCard : idleCard}`}
    >
      <span className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${on ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <WrapText className="w-3.5 h-3.5" /> Dividir en varias líneas
        </span>
        <span className="block text-xs text-muted-foreground mt-0.5">
          Tu texto es largo. Repartilo en varios renglones para que se grabe más grande y se lea mejor.
        </span>
      </span>
    </button>
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

const FINISHES: { id: string; name: string; material?: MaterialId }[] = [
  { id: "matte", name: "Mate" },
  { id: "glossy", name: "Brillante" },
  { id: "metallic", name: "Metálico" },
  { id: "gradient", name: "Degradado" },
  // Solo se ofrece en material Cuero: aspecto mate tipo cuero forrado.
  { id: "cuero", name: "Cuero", material: "cuero" },
];

const FONTS = [
  { id: "f1",  name: "Abril Fatface",     style: { fontFamily: "'Abril Fatface', serif", letterSpacing: "0.05em" } },
  { id: "f2",  name: "Anthony Hunter",    style: { fontFamily: "'Anthony Hunter', cursive", fontStyle: "italic" } },
  { id: "f3",  name: "Billion Dreams",    style: { fontFamily: "'Billion Dreams', cursive" } },
  { id: "f4",  name: "Blendaria",         style: { fontFamily: "'Blendaria', sans-serif" } },
  { id: "f5",  name: "Bree Serif",        style: { fontFamily: "'Bree Serif', serif" } },
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
                <span className="ml-auto text-[10px] font-medium uppercase tracking-wide rounded-full px-2.5 py-0.5 bg-[#1A1614] text-white/90">
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

function PlacementControls({
  value,
  onChange,
  withSize,
  flat,
}: {
  value: Placement;
  onChange: (next: Placement) => void;
  withSize?: boolean;
  /** Flat objects have a single face: relabel the note. */
  flat?: boolean;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const mode = useRef<null | "move" | "scale">(null);

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const clampScale = (n: number) => Math.max(0.5, Math.min(1.5, n));
  const set = (patch: Partial<Placement>) => onChange({ ...value, ...patch });

  const applyPointer = (e: React.PointerEvent) => {
    const el = padRef.current;
    if (!el || !mode.current) return;
    const rect = el.getBoundingClientRect();
    const px = clamp01((e.clientX - rect.left) / rect.width);
    const py = clamp01((e.clientY - rect.top) / rect.height);
    if (mode.current === "move") {
      set({ u: px, v: py });
    } else {
      // Scale from the element centre out to the pointer (square feel).
      const half = Math.max(Math.abs(px - value.u), Math.abs(py - value.v));
      set({ scale: clampScale(half / PAD_BASE) });
    }
  };

  const onPadDown = (e: React.PointerEvent) => {
    const isCorner = (e.target as HTMLElement).dataset?.role === "scale";
    mode.current = isCorner ? "scale" : "move";
    padRef.current?.setPointerCapture(e.pointerId);
    if (!isCorner) applyPointer(e); // move: jump straight to the tapped point
  };
  const onPadMove = (e: React.PointerEvent) => { if (mode.current) applyPointer(e); };
  const onPadUp = () => { mode.current = null; };

  const cx = value.u * 100;
  const cy = value.v * 100;
  const sizePct = PAD_BASE * value.scale * 2 * 100;

  return (
    <div className="space-y-4">
      {/* Drag pad — move + scale by direct manipulation */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs text-muted-foreground">Posición{withSize ? " y tamaño" : ""}</Label>
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80">
            <Move className="w-3 h-3" /> Arrastre para mover{withSize ? " · esquina para escalar" : ""}
          </span>
        </div>
        <div
          ref={padRef}
          onPointerDown={onPadDown}
          onPointerMove={onPadMove}
          onPointerUp={onPadUp}
          onPointerCancel={onPadUp}
          className="relative w-full aspect-square max-w-[240px] mx-auto rounded-xl border border-border bg-secondary/40 overflow-hidden select-none touch-none cursor-move"
        >
          {/* Centre guides */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/70" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />

          {/* The element proxy */}
          <div
            className="absolute rounded-md border-2 border-primary bg-primary/15 flex items-center justify-center transition-[width,height] duration-75"
            style={{
              left: `${cx}%`,
              top: `${cy}%`,
              width: `${sizePct}%`,
              height: `${sizePct}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <span className="pointer-events-none text-[10px] font-bold text-primary">
              {flat ? "◈" : "Aa"}
            </span>
            {withSize && (
              <span
                data-role="scale"
                className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-full bg-primary border-2 border-white shadow-sm cursor-nwse-resize"
              />
            )}
          </div>
        </div>
      </div>

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
              className="w-7 h-7 shrink-0 grid place-items-center rounded-md border border-border text-muted-foreground hover:border-primary/50 hover:text-primary active:scale-95 transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <Slider
              value={[value.scale * 100]}
              onValueChange={([v]) => set({ scale: v / 100 })}
              min={50}
              max={150}
              step={5}
              className="flex-1"
            />
            <button
              type="button"
              aria-label="Agrandar"
              onClick={() => set({ scale: clampScale(Math.round((value.scale + 0.1) * 10) / 10) })}
              className="w-7 h-7 shrink-0 grid place-items-center rounded-md border border-border text-muted-foreground hover:border-primary/50 hover:text-primary active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Orientation */}
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

      <p className="text-xs text-muted-foreground">
        {flat
          ? "Grabamos sobre la cara principal del producto."
          : "Solo grabamos las caras externas: la tapa y la base quedan siempre libres."}
      </p>
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

      {/* cap-d or body side handle (non-arch products) */}
      {!isArch && product.handle !== "none" && (
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
  // STEP 1 — material, STEP 2 — product within the material
  const [materialId, setMaterialId] = useState<MaterialId>(DEFAULT_MATERIAL_ID);
  const material = getMaterial(materialId);
  const [materialProductId, setMaterialProductId] = useState<string>(material.products[0]?.id ?? "");
  const activeMProduct = material.products.find(p => p.id === materialProductId) ?? material.products[0];
  const isDrinkware = !!activeMProduct?.drinkwareProductId;
  // Non-lathe modelled blanks (box/flat shapes). Pens reuse the pen object.
  const activeObjectId = activeMProduct?.objectId ?? (material.pens ? "boligrafo" : undefined);
  const is3DObject = !isDrinkware && !!activeObjectId;
  const activeObject = activeObjectId ? getObject(activeObjectId) : null;
  // Uploading a custom image is limited to stainless-steel drinkware; the steel
  // opener and every other material only allow text or a preset icon.
  const canUploadImage = isDrinkware && materialId === "acero";
  // A leather-wrapped (forrado) drinkware chars like leather, not steel.
  const drinkwareEngraveStyle = materialId === "cuero" ? "leather" : "steel";

  // Drinkware base product (drives the 3D preview, sizes, band)
  const productId = activeMProduct?.drinkwareProductId ?? DEFAULT_PRODUCT_ID;
  const product = getProduct(productId);
  const [size, setSize] = useState(getProduct(DEFAULT_PRODUCT_ID).sizes[1].id);
  const activeSize = getSize(product, size);

  const [color, setColor] = useState(COLORS[0].id);
  const [customHex, setCustomHex] = useState<string | null>(null);
  const [finish, setFinish] = useState(FINISHES[0].id);
  const [text, setText] = useState("");
  // When on, a long name is word-wrapped into several engraved rows.
  const [multiline, setMultiline] = useState(false);
  const [font, setFont] = useState(FONTS[0].id);
  const activeFont = FONTS.find(f => f.id === font) || FONTS[0];
  // Text is long enough to offer wrapping; only then does the toggle take effect.
  const showLineWrap = text.trim().length > LINE_MAX;
  const engraveText = multiline && showLineWrap ? wrapEngraveText(text, LINE_MAX) : text;
  const [isOrdered, setIsOrdered] = useState(false);
  const [plan, setPlan] = useState<EngravingPlanId>(ENGRAVING_PLANS[0].id);
  const [customImage, setCustomImage] = useState<ProcessedImage | null>(null);
  const [textPlacement, setTextPlacement] = useState<Placement>(DEFAULT_TEXT_PLACEMENT);
  const [artPlacement, setArtPlacement] = useState<Placement>(DEFAULT_ART_PLACEMENT);

  const [technique, setTechnique] = useState<TechniqueId>("laser");
  // Eufy (colour) is drinkware-with-coating only; everything else is laser-only.
  const canEufy = allowsColorPrint(materialId, activeMProduct);
  const effectiveTechnique: TechniqueId = canEufy ? technique : "laser";
  const activeTechnique = TECHNIQUES.find(t => t.id === effectiveTechnique) || TECHNIQUES[0];
  const [penSource, setPenSource] = useState<"own" | "shop">("shop");
  const activePen = PEN_OPTIONS.find(p => p.id === penSource) || PEN_OPTIONS[0];
  const [iconId, setIconId] = useState<string | null>(null);
  const selectedIcon = ENGRAVING_ICONS.find(i => i.id === iconId) ?? null;
  const [simpleKind, setSimpleKind] = useState<KindId>("text");
  // Controlled so we can move off the "Imagen" tab when it's hidden.
  const [drinkTab, setDrinkTab] = useState("color");

  const baseColor = COLORS.find(c => c.id === color) || COLORS[0];
  const activeColorHex = customHex ?? baseColor.hex;
  const activeColorName = customHex ? `${baseColor.name} · ${customHex.toUpperCase()}` : baseColor.name;
  const activePlan = ENGRAVING_PLANS.find(p => p.id === plan) || ENGRAVING_PLANS[0];
  const MaterialGlyph = MATERIAL_ICON[material.icon] ?? Box;

  // Image upload is stainless-steel only; within drinkware it's gated by the plan.
  const allowsImage = canUploadImage && (isDrinkware ? activePlan.allowsImage : true);
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

  // Price shown on the CTA. Eufy Make and every non-drinkware product quote by chat.
  const priceLabel = material.pens
    ? activePen.priceLabel
    : !isDrinkware
      ? "A consultar"
      : effectiveTechnique === "eufy"
        ? "A consultar"
        : activePlan.priceLabel;

  const handleSelectColor = (id: string) => {
    setColor(id);
    setCustomHex(null);
  };

  const handleSelectMaterial = (id: MaterialId) => {
    setMaterialId(id);
    const m = getMaterial(id);
    const first = m.products[0];
    setMaterialProductId(first?.id ?? "");
    if (first?.drinkwareProductId) {
      const dp = getProduct(first.drinkwareProductId);
      setSize(dp.sizes[1]?.id ?? dp.sizes[0].id);
    }
    // Subir imagen es exclusivo de acero: al salir limpiamos la carga, el plan
    // y salimos de la pestaña Imagen si estaba activa.
    if (id !== "acero") {
      setCustomImage(null);
      setPlan(ENGRAVING_PLANS[0].id);
      setDrinkTab(t => (t === "media" ? "color" : t));
    }
    // Acabado/color coherentes con el material.
    if (id === "cuero") {
      setFinish("cuero");
      handleSelectColor("c6"); // Café Chocolate
    } else if (id === "cristal") {
      setFinish("glossy");
      handleSelectColor("c8"); // Blanco Perla
    } else if (finish === "cuero") {
      // "Cuero" solo existe en material cuero; al salir volvemos a Mate.
      setFinish("matte");
    }
  };

  const handleSelectMaterialProduct = (id: string) => {
    setMaterialProductId(id);
    const mp = material.products.find(p => p.id === id);
    if (mp?.drinkwareProductId) {
      const dp = getProduct(mp.drinkwareProductId);
      setSize(dp.sizes[1]?.id ?? dp.sizes[0].id);
    }
  };

  const handleSelectPlan = (id: EngravingPlanId) => {
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
    setCustomImage(img);
    // Images size by plan (no size slider), so drop any leftover icon scale.
    if (img) { setIconId(null); setArtPlacement(p => ({ ...p, scale: 1 })); }
  };

  /** Send the whole configuration to WhatsApp so the shop can quote it directly. */
  const handleOrder = () => {
    const lines: string[] = [
      "¡Hola! ¿Cómo están? 😊 Estuve armando esto en el personalizador y me encantaría concretarlo:",
      "",
      `• Material: ${material.name}`,
    ];

    if (material.pens) {
      lines.push(`• Grabado de bolígrafos: ${activePen.label} — ${activePen.priceLabel}`);
      lines.push("• Técnica: Grabado láser");
      if (text) lines.push(`• Texto: "${text}" en ${activeFont.name}`);
      if (selectedIcon) lines.push(`• Ícono: ${selectedIcon.name}`);
      if (customImage) lines.push("• Imagen: (la envío en este chat)");
    } else if (is3DObject) {
      lines.push(`• Producto: ${activeMProduct?.name ?? activeObject?.singular ?? "producto"}`);
      lines.push("• Técnica: Grabado láser");
      lines.push(text ? `• Texto: "${text}" en ${activeFont.name}, ${textPlacement.orientation}` : "• Sin texto");
      if (selectedIcon) lines.push(`• Ícono: ${selectedIcon.name}`);
      if (customImage) lines.push("• Imagen: (la envío en este chat)");
      lines.push(`• Precio: ${priceLabel}`);
    } else if (isDrinkware) {
      lines.push(`• Producto: ${product.singular}`);
      lines.push(`• Color: ${activeColorName}`);
      lines.push(`• Acabado: ${FINISHES.find(f => f.id === finish)?.name}`);
      lines.push(`• Técnica: ${activeTechnique.name}`);
      lines.push(text ? `• Texto: "${text}" en ${activeFont.name}, ${textPlacement.orientation}` : "• Sin texto");
      if (selectedIcon) lines.push(`• Ícono: ${selectedIcon.name}`);
      lines.push(
        activePlan.allowsImage
          ? `• Imagen: ${activePlan.imageSize === "large" ? "logo" : "dibujo"} ${customImage ? "(la envío en este chat)" : "(la envío en breve)"}`
          : "• Sin imagen"
      );
      lines.push(`• Plan: ${activePlan.shortLabel} — ${priceLabel}`);
    } else {
      lines.push(`• Producto: ${activeMProduct?.name ?? "producto"}`);
      lines.push(`• Personalización: ${KINDS.find(k => k.id === simpleKind)?.name}`);
      if (text) lines.push(`• Texto: "${text}"`);
      if (selectedIcon) lines.push(`• Ícono: ${selectedIcon.name}`);
      if (customImage) lines.push("• Imagen: (la envío en este chat)");
      lines.push(`• Precio: ${priceLabel}`);
    }

    lines.push("", "¿Me confirman si está todo bien y cómo seguimos? ¡Muchas gracias!");

    window.open(whatsappUrl(lines.join("\n")), "_blank", "noopener,noreferrer");
    setIsOrdered(true);
    setTimeout(() => setIsOrdered(false), 5000);
  };

  const ctaLabel = material.pens
    ? `Pedir grabado — ${priceLabel}`
    : isDrinkware
      ? `Personalizar mi ${product.singular} — ${priceLabel}`
      : `Pedir ${activeMProduct?.name ?? "producto"} — ${priceLabel}`;

  // Tabs shown in the modelled-blank panel: Color only if tintable, Imagen only
  // on stainless steel.
  const objectTabs: { key: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "text", label: "Texto", Icon: Type },
    ...(activeObject?.colorable ? [{ key: "color", label: "Color", Icon: Palette }] : []),
    { key: "icons", label: "Íconos", Icon: Shapes },
    ...(canUploadImage ? [{ key: "media", label: "Imagen", Icon: ImageIcon }] : []),
  ];

  return (
    <section id="customizer" className="py-20 md:py-28 px-6 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[#8B1A2F] text-[11px] font-semibold uppercase tracking-[0.3em] mb-4">
            El personalizador
          </p>
          <h2 className="font-serif font-light text-3xl md:text-5xl text-[#1A1614] mb-4 leading-[1.1]">
            Cree su pieza
          </h2>
          <p className="text-[#5f574d] font-light text-lg max-w-xl leading-relaxed">
            Elija el material, luego el producto, y refínelo a su gusto. El diseño final lo coordinamos
            con usted por WhatsApp.
          </p>
        </div>

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

        {/* STEP 3 — CUSTOMIZE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* PREVIEW AREA */}
          <div className="lg:col-span-4 relative">
            <div className="sticky top-24 bg-secondary/30 rounded-2xl border border-border flex flex-col items-center gap-4 overflow-hidden min-h-[520px]">
              <div
                className="absolute inset-0 opacity-[0.07] transition-colors duration-500 rounded-2xl"
                style={{ backgroundColor: isDrinkware ? activeColorHex : "#C1121F" }}
              />

              {isDrinkware ? (
                <div className="relative z-10 flex flex-col items-center gap-2 w-full h-full">
                  {/* 3D Canvas — taller for bigger sizes */}
                  <div className="w-full" style={{ height: 480 + Math.round((activeSize.scale - 0.84) * 200) }}>
                    <Thermos3D
                      colorHex={activeColorHex}
                      finish={finish}
                      text={engraveText}
                      fontClass=""
                      fontStyle={activeFont.style}
                      productId={productId}
                      sizeId={size}
                      customImageUrl={artUrl}
                      imageSize={artImageSize}
                      textPlacement={textPlacement}
                      artPlacement={artPlacement}
                      colorPrint={effectiveTechnique === "eufy"}
                      engraveStyle={drinkwareEngraveStyle}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground -mt-1 mb-1">Arrastre para girar</p>

                  {/* Summary badges */}
                  <div className="flex flex-wrap gap-2 justify-center px-4 pb-4">
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                      {product.singular}
                    </span>
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: activeColorHex }} />
                      {activeColorName}
                    </span>
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                      {activeTechnique.name}
                    </span>
                  </div>
                </div>
              ) : is3DObject && activeObject ? (
                <div className="relative z-10 flex flex-col items-center gap-2 w-full h-full">
                  <div className="w-full" style={{ height: 460 }}>
                    <Object3D
                      objectId={activeObject.id}
                      colorHex={activeObject.colorable ? activeColorHex : undefined}
                      text={engraveText}
                      fontStyle={activeFont.style}
                      customImageUrl={artUrl}
                      imageSize={artImageSize}
                      textPlacement={textPlacement}
                      artPlacement={artPlacement}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground -mt-1 mb-1">Arrastre para girar</p>

                  <div className="flex flex-wrap gap-2 justify-center px-4 pb-4">
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                      {material.pens ? "Bolígrafo" : activeMProduct?.name ?? activeObject.singular}
                    </span>
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Grabado láser
                    </span>
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                      {priceLabel}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center justify-center gap-4 w-full h-full min-h-[520px] p-8 text-center">
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
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                      {priceLabel}
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
                      Le abrimos WhatsApp con su diseño ya cargado. Envíe el mensaje y coordinamos los detalles.
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* CONTROLS AREA */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-border">
            {isDrinkware ? (
              <Tabs value={drinkTab} onValueChange={setDrinkTab} className="w-full">
                <div className="border-b border-border px-4 sm:px-6 pt-2">
                  <TabsList className="w-full flex bg-transparent h-12 p-0 gap-0 overflow-x-auto">
                    <TabsTrigger value="color" className="flex-1 min-w-[76px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <Palette className="w-4 h-4 mr-1.5 hidden sm:inline" /> Color
                    </TabsTrigger>
                    <TabsTrigger value="text" className="flex-1 min-w-[76px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <Type className="w-4 h-4 mr-1.5 hidden sm:inline" /> Texto
                    </TabsTrigger>
                    <TabsTrigger value="icons" className="flex-1 min-w-[76px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <Shapes className="w-4 h-4 mr-1.5 hidden sm:inline" /> Íconos
                    </TabsTrigger>
                    {canUploadImage && (
                      <TabsTrigger value="media" className="flex-1 min-w-[76px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        <ImageIcon className="w-4 h-4 mr-1.5 hidden sm:inline" /> Imagen
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <div className="p-6 min-h-[320px]">
                  {/* COLOR TAB */}
                  <TabsContent value="color" className="mt-0 space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-3 block">Color Base</Label>
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
                            className="text-xs text-primary hover:underline"
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

                    <div className="pt-4 border-t border-border">
                      <Label className="text-sm font-medium text-foreground mb-3 block">Tipo de Acabado</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {FINISHES.filter(f => !f.material || f.material === materialId).map(f => (
                          <button
                            key={f.id}
                            onClick={() => setFinish(f.id)}
                            className={`p-3 text-center border rounded-lg font-medium text-sm transition-all ${
                              finish === f.id ? activeCard : idleCard
                            }`}
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* TEXT TAB */}
                  <TabsContent value="text" className="mt-0 space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-3 block">Texto Personalizado</Label>
                      <Input
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, 30))}
                        placeholder="Tu nombre o texto"
                        className="h-12 text-base text-center border-border focus-visible:ring-primary"
                        maxLength={30}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5 text-right">{text.length}/30 caracteres</p>
                      <LineWrapToggle show={showLineWrap} on={multiline} onToggle={() => setMultiline(v => !v)} />
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Label className="text-sm font-medium text-foreground mb-1 block">Ubicación del Texto</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Colocá el texto donde quieras alrededor del {product.singular.toLowerCase()}.
                      </p>
                      <PlacementControls value={textPlacement} onChange={setTextPlacement} withSize />
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Label className="text-sm font-medium text-foreground mb-3 block">Elija su tipografía</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                        {FONTS.map((f, i) => (
                          <button
                            key={f.id}
                            onClick={() => setFont(f.id)}
                            className={`p-3 text-center border rounded-lg transition-all ${
                              font === f.id
                                ? 'border-primary bg-[#f5eaec] ring-1 ring-primary/30'
                                : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50'
                            }`}
                          >
                            <span
                              className={`block text-base mb-0.5 ${font === f.id ? 'text-primary' : 'text-foreground'}`}
                              style={f.style}
                            >
                              {text || f.name}
                            </span>
                            <span className="block text-[10px] text-muted-foreground">{i + 1}. {f.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ICONS TAB */}
                  <TabsContent value="icons" className="mt-0 space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-1 block">Elija un ícono</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Sume un ícono a su {product.singular.toLowerCase()}. Toque de nuevo para quitarlo.
                      </p>
                      <IconPicker value={iconId} onChange={handlePickIcon} />
                    </div>

                    {selectedIcon && (
                      <div className="pt-4 border-t border-border">
                        <Label className="text-sm font-medium text-foreground mb-1 block">Ubicación del Ícono</Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Movelo y giralo libremente sobre las caras del {product.singular.toLowerCase()}.
                        </p>
                        <PlacementControls value={artPlacement} onChange={setArtPlacement} withSize />
                      </div>
                    )}
                  </TabsContent>

                  {/* LOGO / PHOTO TAB — stainless steel only */}
                  {canUploadImage && (
                  <TabsContent value="media" className="mt-0 space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-1 block">Logo o foto</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Suba su logo o su foto. Le quitamos el fondo automáticamente y la grabamos sobre el {product.singular.toLowerCase()}.
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
                            imagen se graba en tamano {activePlan.imageSize === "large" ? "grande (logo)" : "chico (dibujo)"}, ya definido por el plan.
                          </p>

                          {customImage && (
                            <div className="pt-4 mt-4 border-t border-border">
                              <Label className="text-sm font-medium text-foreground mb-1 block">Ubicación de la Imagen</Label>
                              <p className="text-xs text-muted-foreground mb-3">
                                Movela y girala libremente sobre las caras del {product.singular.toLowerCase()}.
                              </p>
                              <PlacementControls value={artPlacement} onChange={setArtPlacement} />
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
                                {p.shortLabel} — {p.priceLabel}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  )}
                </div>

                {/* TECHNIQUE + PLAN + ORDER */}
                <div className="px-6 pb-6 pt-4 border-t border-border space-y-4">
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

                  {effectiveTechnique === "laser" && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Plan de grabado</Label>
                      <div className={`grid gap-2 ${canUploadImage ? "grid-cols-1 min-[480px]:grid-cols-3" : "grid-cols-1"}`}>
                        {ENGRAVING_PLANS.filter(p => canUploadImage || !p.allowsImage).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPlan(p.id)}
                            className={`flex flex-col items-center gap-0.5 rounded-lg border-2 px-2 py-2.5 text-center transition-colors ${
                              plan === p.id
                                ? "border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30"
                                : "border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50"
                            }`}
                          >
                            <span className="text-xs font-semibold leading-tight">{p.shortLabel}</span>
                            <span className="text-[11px] font-medium">{p.priceLabel}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {activePlan.title}
                        {activePlan.subtitle ? ` ${activePlan.subtitle}` : ""}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleOrder}
                    disabled={isOrdered}
                    size="lg"
                    className="w-full h-auto min-h-12 py-2.5 text-sm sm:text-base font-semibold leading-tight whitespace-normal bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  >
                    {isOrdered ? "Abriendo WhatsApp..." : ctaLabel}
                  </Button>
                </div>
              </Tabs>
            ) : is3DObject && activeObject ? (
              /* MODELLED BLANK — laser-only personalization (wood, leather, acrylic, plastic, bare steel, pens) */
              <Tabs key={activeObject.id} defaultValue="text" className="w-full">
                <div className="border-b border-border px-4 sm:px-6 pt-2">
                  <TabsList className="w-full flex bg-transparent h-12 p-0 gap-0 overflow-x-auto">
                    {objectTabs.map(({ key, label, Icon }) => (
                      <TabsTrigger key={key} value={key} className="flex-1 min-w-[76px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        <Icon className="w-4 h-4 mr-1.5 hidden sm:inline" /> {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="p-6 min-h-[320px]">
                  <p className="text-xs text-muted-foreground mb-5">
                    {activeObject.desc} Vea cómo se vería con su texto, un ícono o su logo.
                  </p>

                  {/* COLOR TAB — colourable blanks only */}
                  {activeObject.colorable && (
                    <TabsContent value="color" className="mt-0 space-y-6">
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
                            <button onClick={() => setCustomHex(null)} className="text-xs text-primary hover:underline">
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
                  <TabsContent value="text" className="mt-0 space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-3 block">Texto Personalizado</Label>
                      <Input
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, 30))}
                        placeholder="Tu nombre o texto"
                        className="h-12 text-base text-center border-border focus-visible:ring-primary"
                        maxLength={30}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5 text-right">{text.length}/30 caracteres</p>
                      <LineWrapToggle show={showLineWrap} on={multiline} onToggle={() => setMultiline(v => !v)} />
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Label className="text-sm font-medium text-foreground mb-1 block">Ubicación del Texto</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Colocá el texto donde quieras sobre la {activeObject.singular.toLowerCase()}.
                      </p>
                      <PlacementControls value={textPlacement} onChange={setTextPlacement} withSize flat />
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Label className="text-sm font-medium text-foreground mb-3 block">Elija su tipografía</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                        {FONTS.map((f, i) => (
                          <button
                            key={f.id}
                            onClick={() => setFont(f.id)}
                            className={`p-3 text-center border rounded-lg transition-all ${
                              font === f.id
                                ? 'border-primary bg-[#f5eaec] ring-1 ring-primary/30'
                                : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50'
                            }`}
                          >
                            <span
                              className={`block text-base mb-0.5 ${font === f.id ? 'text-primary' : 'text-foreground'}`}
                              style={f.style}
                            >
                              {text || f.name}
                            </span>
                            <span className="block text-[10px] text-muted-foreground">{i + 1}. {f.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ICONS TAB */}
                  <TabsContent value="icons" className="mt-0 space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-1 block">Elija un ícono</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Sume un ícono a su {activeObject.singular.toLowerCase()}. Toque de nuevo para quitarlo.
                      </p>
                      <IconPicker value={iconId} onChange={handlePickIcon} />
                    </div>

                    {selectedIcon && (
                      <div className="pt-4 border-t border-border">
                        <Label className="text-sm font-medium text-foreground mb-1 block">Ubicación del Ícono</Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Movelo y giralo libremente sobre la cara de la {activeObject.singular.toLowerCase()}.
                        </p>
                        <PlacementControls value={artPlacement} onChange={setArtPlacement} withSize flat />
                      </div>
                    )}
                  </TabsContent>

                  {/* LOGO / PHOTO TAB — stainless steel only */}
                  {canUploadImage && (
                  <TabsContent value="media" className="mt-0 space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-1 block">Logo o foto</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Suba su logo o su foto. Le quitamos el fondo automáticamente y la grabamos sobre la {activeObject.singular.toLowerCase()}.
                      </p>
                      <ImageUpload imageSize="large" value={customImage} onChange={handleUploadImage} />

                      {customImage && (
                        <div className="pt-4 mt-4 border-t border-border">
                          <Label className="text-sm font-medium text-foreground mb-1 block">Ubicación de la Imagen</Label>
                          <p className="text-xs text-muted-foreground mb-3">
                            Movela y girala libremente sobre la cara de la {activeObject.singular.toLowerCase()}.
                          </p>
                          <PlacementControls value={artPlacement} onChange={setArtPlacement} flat />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  )}
                </div>

                {/* LASER-ONLY NOTE + ORDER */}
                <div className="px-6 pb-6 pt-4 border-t border-border space-y-4">
                  {/* Pen-source selection lives here (below), only for pens. */}
                  {material.pens && (
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">¿Quién pone el bolígrafo?</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PEN_OPTIONS.map(o => {
                          const active = penSource === o.id;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => setPenSource(o.id)}
                              className={`flex items-center justify-between gap-2 p-3 border rounded-xl text-left transition-all active:scale-[0.98] ${active ? activeCard : idleCard}`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <PenLine className="w-4 h-4 shrink-0" />
                                <span className="font-medium text-sm truncate">{o.label}</span>
                              </span>
                              <span className="text-sm font-bold shrink-0">{o.priceLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

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

                  {priceLabel === "A consultar" && (
                    <p className="text-xs text-muted-foreground">
                      Este producto se cotiza según el diseño. Le pasamos el precio por WhatsApp al instante.
                    </p>
                  )}

                  <Button
                    onClick={handleOrder}
                    disabled={isOrdered}
                    size="lg"
                    className="w-full h-auto min-h-12 py-2.5 text-sm sm:text-base font-semibold leading-tight whitespace-normal bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  >
                    {isOrdered ? "Abriendo WhatsApp..." : ctaLabel}
                  </Button>
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
                      ? `${activePen.label} — ${activePen.priceLabel}. Contanos qué querés grabar.`
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Precio</span>
                    <span className="text-lg font-bold text-foreground">{priceLabel}</span>
                  </div>
                  {priceLabel === "A consultar" && (
                    <p className="text-xs text-muted-foreground">
                      Este producto se cotiza según el diseño. Le pasamos el precio por WhatsApp al instante.
                    </p>
                  )}
                  <Button
                    onClick={handleOrder}
                    disabled={isOrdered}
                    size="lg"
                    className="w-full h-auto min-h-12 py-2.5 text-sm sm:text-base font-semibold leading-tight whitespace-normal bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  >
                    {isOrdered ? "Abriendo WhatsApp..." : ctaLabel}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Personalizar algo más — emphasized invite below the customizer */}
        <div className="mt-16 md:mt-24">
          <div className="relative overflow-hidden rounded-3xl bg-[#1A1614] px-8 py-14 md:px-14 md:py-16 text-center flex flex-col items-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-24 bg-[#8B1A2F]" />
            <p className="text-[#d9a3ae] text-[11px] font-semibold uppercase tracking-[0.3em] mb-5">
              A su medida
            </p>
            <h3 className="font-serif font-light text-3xl md:text-5xl text-white leading-[1.12] max-w-2xl mb-5">
              ¿Busca algo que no aparece aquí?
            </h3>
            <p className="text-white/60 font-light text-base md:text-lg max-w-xl leading-relaxed mb-9">
              Lo que ve en la página es apenas una parte de lo posible. Si imagina una pieza distinta —otro
              material, otro formato, un pedido especial— la creamos con usted. Cuéntenos su idea y la
              resolvemos juntos.
            </p>
            <a
              href={whatsappUrl("¡Hola! ¿Qué tal? Quisiera personalizar algo que no vi en la página. ¿Me ayudan a resolverlo?")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#8B1A2F] hover:bg-[#721527] text-white px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors"
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.75} />
              Escríbanos
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
