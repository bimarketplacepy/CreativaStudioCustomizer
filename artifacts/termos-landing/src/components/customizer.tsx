import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Check, Palette, Type, Box, Pipette, ImageIcon, MoveHorizontal, MoveVertical,
  Shapes, Zap, Sparkles, Wallet, TreePine, Square, PenLine, Wine, CupSoda, Snowflake,
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
import { whatsappUrl } from "@/lib/contact";

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
  { id: "f1",  name: "Cronos Pro",        style: { fontFamily: "'Cronos Pro', serif", fontWeight: 600 } },
  { id: "f2",  name: "Renogare",          style: { fontFamily: "'Renogare', sans-serif" } },
  { id: "f3",  name: "TT Rounds Neue",    style: { fontFamily: "'TT Rounds Neue', sans-serif", fontWeight: 600 } },
  { id: "f4",  name: "Impacted",          style: { fontFamily: "'Impacted', sans-serif" } },
  { id: "f5",  name: "Heavitas",          style: { fontFamily: "'Heavitas', sans-serif" } },
  { id: "f6",  name: "KG Dark Side",      style: { fontFamily: "'KG Dark Side', cursive" } },
  { id: "f7",  name: "Square 721",        style: { fontFamily: "'Square 721', sans-serif" } },
  { id: "f8",  name: "Libre Baskerville", style: { fontFamily: "'Libre Baskerville', serif" } },
  { id: "f9",  name: "Bree Serif",        style: { fontFamily: "'Bree Serif', serif" } },
  { id: "f10", name: "Rimouski Sb",       style: { fontFamily: "'Rimouski Sb', serif" } },
  { id: "f11", name: "Party Confetti",    style: { fontFamily: "'Party Confetti', cursive" } },
  { id: "f12", name: "Freestyle Script",  style: { fontFamily: "'Freestyle Script', cursive", fontWeight: 400 } },
  { id: "f13", name: "Kissing Season",    style: { fontFamily: "'Kissing Season', cursive" } },
  { id: "f14", name: "Quimil",            style: { fontFamily: "'Quimil', serif" } },
  { id: "f15", name: "Ellisha",           style: { fontFamily: "'Ellisha', cursive", fontStyle: "italic" } },
  { id: "f16", name: "Abril Fatface",     style: { fontFamily: "'Abril Fatface', serif", letterSpacing: "0.05em" } },
  { id: "f17", name: "Anthony Hunter",    style: { fontFamily: "'Anthony Hunter', cursive", fontStyle: "italic" } },
  { id: "f18", name: "Versalita",         style: { fontFamily: "'Arial', sans-serif", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const } },
  { id: "f19", name: "Billion Dreams",    style: { fontFamily: "'Billion Dreams', cursive" } },
  { id: "f20", name: "Yellowtail",        style: { fontFamily: "'Yellowtail', cursive" } },
  { id: "f21", name: "Pacifico",          style: { fontFamily: "'Pacifico', cursive" } },
  { id: "f22", name: "Milkshake",         style: { fontFamily: "'Milkshake', cursive" } },
  { id: "f23", name: "Blendaria",         style: { fontFamily: "'Blendaria', sans-serif" } },
];

/** Engraving techniques offered on drinkware. */
const TECHNIQUES = [
  { id: "laser", name: "Grabado láser", desc: "Monocromático, permanente sobre el acero.", color: false },
  { id: "eufy",  name: "Eufy Make (UV DTF)", desc: "Impresión a todo color sobre el producto.", color: true },
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

const activeCard = "border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30";
const idleCard = "border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50";

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
                <span className="ml-auto text-[10px] font-semibold rounded-full px-2 py-0.5 bg-gradient-to-r from-fuchsia-500 via-orange-400 to-cyan-400 text-white">
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

/** Position + orientation controls for one engraved element (text or art). */
function PlacementControls({
  value,
  onChange,
  withSize,
  flat,
}: {
  value: Placement;
  onChange: (next: Placement) => void;
  withSize?: boolean;
  /** Flat objects have a single face: relabel the axes and drop the wrap note. */
  flat?: boolean;
}) {
  const set = (patch: Partial<Placement>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Orientación</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["horizontal", "vertical"] as const).map(o => (
            <button
              key={o}
              onClick={() => set({ orientation: o })}
              className={`flex items-center justify-center gap-2 p-2.5 border rounded-lg text-sm font-medium transition-all ${
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

      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">
          {flat ? "Posición horizontal" : "Girar alrededor del producto"}
        </Label>
        <Slider
          value={[value.u * 100]}
          onValueChange={([v]) => set({ u: v / 100 })}
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">
          {flat ? "Posición vertical" : "Altura sobre la cara"}
        </Label>
        <Slider
          value={[value.v * 100]}
          onValueChange={([v]) => set({ v: v / 100 })}
          min={0}
          max={100}
          step={1}
        />
      </div>

      {withSize && (
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Tamaño</Label>
          <Slider
            value={[value.scale * 100]}
            onValueChange={([v]) => set({ scale: v / 100 })}
            min={50}
            max={150}
            step={5}
          />
        </div>
      )}

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
  // Uploading a custom image is a stainless-steel-only option.
  const canUploadImage = materialId === "acero";

  // Drinkware base product (drives the 3D preview, sizes, band)
  const productId = activeMProduct?.drinkwareProductId ?? DEFAULT_PRODUCT_ID;
  const product = getProduct(productId);
  const [size, setSize] = useState(getProduct(DEFAULT_PRODUCT_ID).sizes[1].id);
  const activeSize = getSize(product, size);

  const [color, setColor] = useState(COLORS[0].id);
  const [customHex, setCustomHex] = useState<string | null>(null);
  const [finish, setFinish] = useState(FINISHES[0].id);
  const [text, setText] = useState("");
  const [font, setFont] = useState(FONTS[0].id);
  const activeFont = FONTS.find(f => f.id === font) || FONTS[0];
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
  const [drinkTab, setDrinkTab] = useState("shape");

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
      setDrinkTab(t => (t === "media" ? "shape" : t));
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
    if (img) setIconId(null);
  };

  /** Send the whole configuration to WhatsApp so the shop can quote it directly. */
  const handleOrder = () => {
    const lines: string[] = [
      "Hola! Quiero pedir un producto personalizado:",
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
      lines.push(`• Producto: ${product.singular} ${activeSize.name} (${activeSize.label})`);
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
    <section id="customizer" className="py-16 px-6 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Personalizador de Productos
          </h2>
          <p className="text-muted-foreground">Elegí el material, después el producto y personalizalo a tu gusto. Lo recibís en la puerta de tu casa.</p>
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
            2 · {material.pens ? "Elegí quién pone el bolígrafo" : `Producto en ${material.name.toLowerCase()}`}
          </Label>

          {material.pens ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              {PEN_OPTIONS.map(o => {
                const active = penSource === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setPenSource(o.id)}
                    className={`p-4 border rounded-xl text-left transition-all ${active ? activeCard : idleCard}`}
                  >
                    <span className="flex items-center gap-2">
                      <PenLine className="w-4 h-4" />
                      <span className="font-semibold text-sm">{o.label}</span>
                    </span>
                    <span className="block text-lg font-bold mt-1">{o.priceLabel}</span>
                  </button>
                );
              })}
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
                    />
                  </div>

                  <p className="text-xs text-muted-foreground -mt-1 mb-1">Arrastra para girar</p>

                  {/* Summary badges */}
                  <div className="flex flex-wrap gap-2 justify-center px-4 pb-4">
                    <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                      {product.singular} {activeSize.name}
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
                      text={text}
                      fontStyle={activeFont.style}
                      customImageUrl={artUrl}
                      imageSize={artImageSize}
                      textPlacement={textPlacement}
                      artPlacement={artPlacement}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground -mt-1 mb-1">Arrastra para girar</p>

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
                    Vista previa referencial. Coordinamos el diseño final por WhatsApp antes de producir.
                  </p>
                </div>
              )}

              <AnimatePresence>
                {isOrdered && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center rounded-2xl"
                  >
                    <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4 shadow-sm">
                      <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-1">Te llevamos a WhatsApp</h3>
                    <p className="text-sm text-muted-foreground">Te abrimos el chat con tu diseño ya cargado. Enviá el mensaje y coordinamos tu pedido.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* CONTROLS AREA */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-border">
            {isDrinkware ? (
              <Tabs value={drinkTab} onValueChange={setDrinkTab} className="w-full">
                <div className="border-b border-border px-6 pt-2">
                  <TabsList className={`w-full grid ${canUploadImage ? "grid-cols-5" : "grid-cols-4"} bg-transparent h-12 p-0 gap-0`}>
                    <TabsTrigger value="shape" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <Box className="w-4 h-4 mr-1.5 hidden sm:inline" /> Forma
                    </TabsTrigger>
                    <TabsTrigger value="color" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <Palette className="w-4 h-4 mr-1.5 hidden sm:inline" /> Color
                    </TabsTrigger>
                    <TabsTrigger value="text" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <Type className="w-4 h-4 mr-1.5 hidden sm:inline" /> Texto
                    </TabsTrigger>
                    <TabsTrigger value="icons" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <Shapes className="w-4 h-4 mr-1.5 hidden sm:inline" /> Íconos
                    </TabsTrigger>
                    {canUploadImage && (
                      <TabsTrigger value="media" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        <ImageIcon className="w-4 h-4 mr-1.5 hidden sm:inline" /> Imagen
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <div className="p-6 min-h-[320px]">
                  {/* SHAPE TAB */}
                  <TabsContent value="shape" className="mt-0 space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-3 block">Tipo de Producto</Label>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        {material.products.filter(mp => mp.drinkwareProductId).map(mp => {
                          const dp = getProduct(mp.drinkwareProductId!);
                          return (
                            <button
                              key={mp.id}
                              onClick={() => handleSelectMaterialProduct(mp.id)}
                              title={mp.desc}
                              className={`p-3 border rounded-xl flex flex-col items-center justify-end gap-2 transition-all ${
                                materialProductId === mp.id ? activeCard : idleCard
                              }`}
                            >
                              <ProductGlyph product={dp} className="h-16 w-full" />
                              <span className="font-medium text-sm">{mp.name}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">{product.desc}</p>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Label className="text-sm font-medium text-foreground mb-3 block">
                        Tamano del {product.singular}
                      </Label>
                      <div className="grid grid-cols-3 gap-3">
                        {product.sizes.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setSize(s.id)}
                            className={`p-4 border rounded-xl flex flex-col items-center justify-end gap-2 transition-all ${
                              size === s.id ? activeCard : idleCard
                            }`}
                          >
                            <div className="h-14 flex items-end justify-center">
                              <ProductGlyph
                                product={product}
                                className="w-full"
                                style={{ height: `${Math.round(28 + s.scale * 26)}px` }}
                              />
                            </div>
                            <span className="font-medium text-sm leading-none">{s.name}</span>
                            <span className="text-[11px] text-muted-foreground leading-none">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

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
                        Cada color tiene variantes. Elegí la que mas te guste de la paleta, o marca el tono exacto con el selector.
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
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Label className="text-sm font-medium text-foreground mb-1 block">Ubicacion del Texto</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Colocá el texto donde quieras alrededor del {product.singular.toLowerCase()}.
                      </p>
                      <PlacementControls value={textPlacement} onChange={setTextPlacement} withSize />
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Label className="text-sm font-medium text-foreground mb-3 block">Elegí tu Tipografía</Label>
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
                      <Label className="text-sm font-medium text-foreground mb-1 block">Elegí un ícono</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Sumá un ícono a tu {product.singular.toLowerCase()}. Tocá de nuevo para quitarlo.
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
                        Subí tu logo o tu foto. Le sacamos el fondo automaticamente y la grabamos sobre el {product.singular.toLowerCase()}.
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
                              <Label className="text-sm font-medium text-foreground mb-1 block">Ubicacion de la Imagen</Label>
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
                            El plan de solo nombres no incluye imagen. Elegí un plan con dibujo o logo para subir tu foto.
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
                            La impresión a todo color Eufy Make se cotiza por WhatsApp según el diseño.
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-start gap-2 p-3 border rounded-xl border-border bg-secondary/40">
                        <Zap className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">Grabado láser</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Este producto solo admite grabado láser monocromático. La impresión a color Eufy Make
                            está reservada al drinkware de acero con pintura electrostática.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {effectiveTechnique === "laser" && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Plan de grabado</Label>
                      <div className={`grid gap-2 ${canUploadImage ? "grid-cols-3" : "grid-cols-1"}`}>
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
                    className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  >
                    {isOrdered ? "Abriendo WhatsApp..." : ctaLabel}
                  </Button>
                </div>
              </Tabs>
            ) : is3DObject && activeObject ? (
              /* MODELLED BLANK — laser-only personalization (wood, leather, acrylic, plastic, bare steel, pens) */
              <Tabs key={activeObject.id} defaultValue="text" className="w-full">
                <div className="border-b border-border px-6 pt-2">
                  <TabsList
                    className="w-full grid bg-transparent h-12 p-0 gap-0"
                    style={{ gridTemplateColumns: `repeat(${objectTabs.length}, minmax(0, 1fr))` }}
                  >
                    {objectTabs.map(({ key, label, Icon }) => (
                      <TabsTrigger key={key} value={key} className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        <Icon className="w-4 h-4 mr-1.5 hidden sm:inline" /> {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="p-6 min-h-[320px]">
                  <p className="text-xs text-muted-foreground mb-5">
                    {activeObject.desc} Probá cómo se vería con tu texto, un ícono o tu logo.
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
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Label className="text-sm font-medium text-foreground mb-1 block">Ubicación del Texto</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Colocá el texto donde quieras sobre la {activeObject.singular.toLowerCase()}.
                      </p>
                      <PlacementControls value={textPlacement} onChange={setTextPlacement} withSize flat />
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Label className="text-sm font-medium text-foreground mb-3 block">Elegí tu Tipografía</Label>
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
                      <Label className="text-sm font-medium text-foreground mb-1 block">Elegí un ícono</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Sumá un ícono a tu {activeObject.singular.toLowerCase()}. Tocá de nuevo para quitarlo.
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
                        Subí tu logo o tu foto. Le sacamos el fondo automáticamente y la grabamos sobre la {activeObject.singular.toLowerCase()}.
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
                  <div className="flex items-start gap-2 p-3 border rounded-xl border-border bg-secondary/40">
                    <Zap className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Grabado láser</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Grabado monocromático permanente. La impresión a color Eufy Make solo está disponible en
                        drinkware de acero con pintura electrostática.
                      </p>
                    </div>
                  </div>

                  {priceLabel === "A consultar" && (
                    <p className="text-xs text-muted-foreground">
                      Este producto se cotiza según el diseño. Te pasamos el precio por WhatsApp al instante.
                    </p>
                  )}

                  <Button
                    onClick={handleOrder}
                    disabled={isOrdered}
                    size="lg"
                    className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
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
                      : `${material.name}. Personalizalo y coordinamos el diseño final por WhatsApp.`}
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Precio</span>
                    <span className="text-lg font-bold text-foreground">{priceLabel}</span>
                  </div>
                  {priceLabel === "A consultar" && (
                    <p className="text-xs text-muted-foreground">
                      Este producto se cotiza según el diseño. Te pasamos el precio por WhatsApp al instante.
                    </p>
                  )}
                  <Button
                    onClick={handleOrder}
                    disabled={isOrdered}
                    size="lg"
                    className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  >
                    {isOrdered ? "Abriendo WhatsApp..." : ctaLabel}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
