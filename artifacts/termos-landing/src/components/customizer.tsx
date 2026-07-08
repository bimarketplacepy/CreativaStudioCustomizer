import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Check, Palette, Type, Box, Pipette, ImageIcon, MoveHorizontal, MoveVertical } from "lucide-react";
import Thermos3D from "./thermos-3d";
import ImageUpload from "./image-upload";
import { ENGRAVING_PLANS, type EngravingPlanId } from "@/lib/engraving-plans";
import type { ProcessedImage } from "@/lib/image-processing";
import { PRODUCTS, DEFAULT_PRODUCT_ID, getProduct, getSize, type ProductDef } from "@/lib/products";
import { DEFAULT_ART_PLACEMENT, DEFAULT_TEXT_PLACEMENT, type Placement } from "@/lib/placement";
import { whatsappUrl } from "@/lib/contact";

const COLORS = [
  { id: "c1", hex: "#C1121F", name: "Rojo Marketplace" },
  { id: "c2", hex: "#1E3A5F", name: "Azul Marino" },
  { id: "c3", hex: "#2D6A4F", name: "Verde Bosque" },
  { id: "c4", hex: "#F4A261", name: "Naranja Suave" },
  { id: "c5", hex: "#023E8A", name: "Azul Real" },
  { id: "c6", hex: "#6D4C41", name: "Cafe Chocolate" },
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

const FINISHES = [
  { id: "matte", name: "Mate" },
  { id: "glossy", name: "Brillante" },
  { id: "metallic", name: "Metalico" },
  { id: "gradient", name: "Degradado" },
];

const FONTS = [
  { id: "f1",  name: "Cronos Pro",        style: { fontFamily: "'Cronos Pro', serif", fontWeight: 600 } },
  { id: "f2",  name: "Renogare",          style: { fontFamily: "'Renogare', sans-serif" } },
  { id: "f3",  name: "TT Rounds Neue",    style: { fontFamily: "'TT Rounds Neue', sans-serif", fontWeight: 600 } },
  { id: "f4",  name: "Impac",             style: { fontFamily: "'Impacted', sans-serif" } },
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
  { id: "f15", name: "Eisha",             style: { fontFamily: "'Ellisha', cursive", fontStyle: "italic" } },
  { id: "f16", name: "Bulgati",           style: { fontFamily: "'Abril Fatface', serif", letterSpacing: "0.05em" } },
  { id: "f17", name: "Ahony Huer",        style: { fontFamily: "'Anthony Hunter', cursive", fontStyle: "italic" } },
  { id: "f18", name: "Era",               style: { fontFamily: "'Arial', sans-serif", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const } },
  { id: "f19", name: "Bii Dreams",        style: { fontFamily: "'Billion Dreams', cursive" } },
  { id: "f20", name: "Yellowtail",        style: { fontFamily: "'Yellowtail', cursive" } },
  { id: "f21", name: "Pacifico",          style: { fontFamily: "'Pacifico', cursive" } },
  { id: "f22", name: "Milkshake",         style: { fontFamily: "'Milkshake', cursive" } },
  { id: "f23", name: "Blenda",            style: { fontFamily: "'Blendaria', sans-serif" } },
];

/** Position + orientation controls for one engraved element (text or art). */
function PlacementControls({
  value,
  onChange,
  withSize,
}: {
  value: Placement;
  onChange: (next: Placement) => void;
  withSize?: boolean;
}) {
  const set = (patch: Partial<Placement>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Orientacion</Label>
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
        <Label className="text-xs text-muted-foreground mb-2 block">Girar alrededor del producto</Label>
        <Slider
          value={[value.u * 100]}
          onValueChange={([v]) => set({ u: v / 100 })}
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Altura sobre la cara</Label>
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
          <Label className="text-xs text-muted-foreground mb-2 block">Tamano</Label>
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
        Solo grabamos las caras externas: la tapa y la base quedan siempre libres.
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
  const [productId, setProductId] = useState<string>(DEFAULT_PRODUCT_ID);
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

  const baseColor = COLORS.find(c => c.id === color) || COLORS[0];
  const activeColorHex = customHex ?? baseColor.hex;
  const activeColorName = customHex ? `${baseColor.name} · ${customHex.toUpperCase()}` : baseColor.name;

  const handleSelectColor = (id: string) => {
    setColor(id);
    setCustomHex(null);
  };
  const activePlan = ENGRAVING_PLANS.find(p => p.id === plan) || ENGRAVING_PLANS[0];

  const handleSelectProduct = (id: string) => {
    const next = getProduct(id);
    setProductId(id);
    setSize(next.sizes[1]?.id ?? next.sizes[0].id);
  };

  const handleSelectPlan = (id: EngravingPlanId) => {
    setPlan(id);
    const nextPlan = ENGRAVING_PLANS.find(p => p.id === id);
    if (!nextPlan?.allowsImage) setCustomImage(null);
  };

  /** Send the whole configuration to WhatsApp so the shop can quote it directly. */
  const handleOrder = () => {
    const lines = [
      "Hola! Quiero pedir un producto personalizado:",
      `• Producto: ${product.singular} ${activeSize.name} (${activeSize.label})`,
      `• Color: ${activeColorName}`,
      `• Acabado: ${FINISHES.find(f => f.id === finish)?.name}`,
      text ? `• Texto: "${text}" en ${activeFont.name}, ${textPlacement.orientation}` : "• Sin texto",
      activePlan.allowsImage
        ? `• Imagen: ${activePlan.imageSize === "large" ? "logo" : "dibujo"} ${customImage ? "(la envio en este chat)" : "(la envio en breve)"}`
        : "• Sin imagen",
      `• Plan: ${activePlan.shortLabel} — ${activePlan.priceLabel}`,
    ];

    window.open(whatsappUrl(lines.join("\n")), "_blank", "noopener,noreferrer");
    setIsOrdered(true);
    setTimeout(() => setIsOrdered(false), 5000);
  };

  return (
    <section id="customizer" className="py-16 px-6 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Personalizador de Termos
          </h2>
          <p className="text-muted-foreground">Configura tu termo a tu gusto y recibilo en la puerta de tu casa.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* PREVIEW AREA */}
          <div className="lg:col-span-4 relative">
            <div className="sticky top-24 bg-secondary/30 rounded-2xl border border-border flex flex-col items-center gap-4 overflow-hidden min-h-[520px]">
              <div
                className="absolute inset-0 opacity-[0.07] transition-colors duration-500 rounded-2xl"
                style={{ backgroundColor: activeColorHex }}
              />

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
                    customImageUrl={activePlan.allowsImage ? customImage?.svgDataUrl ?? null : null}
                    imageSize={activePlan.imageSize}
                    textPlacement={textPlacement}
                    artPlacement={artPlacement}
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
                    {FINISHES.find(f => f.id === finish)?.name}
                  </span>
                </div>
              </div>

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
            <Tabs defaultValue="shape" className="w-full">
              <div className="border-b border-border px-6 pt-2">
                <TabsList className="w-full grid grid-cols-4 bg-transparent h-12 p-0 gap-0">
                  <TabsTrigger
                    value="shape"
                    className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Box className="w-4 h-4 mr-1.5 hidden sm:inline" /> Forma
                  </TabsTrigger>
                  <TabsTrigger
                    value="color"
                    className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Palette className="w-4 h-4 mr-1.5 hidden sm:inline" /> Color
                  </TabsTrigger>
                  <TabsTrigger
                    value="text"
                    className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Type className="w-4 h-4 mr-1.5 hidden sm:inline" /> Texto
                  </TabsTrigger>
                  <TabsTrigger
                    value="media"
                    className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 mr-1.5 hidden sm:inline" /> Logo o foto
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 min-h-[320px]">
                {/* SHAPE TAB */}
                <TabsContent value="shape" className="mt-0 space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-3 block">Tipo de Producto</Label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {PRODUCTS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectProduct(p.id)}
                          title={p.desc}
                          className={`p-3 border rounded-xl flex flex-col items-center justify-end gap-2 transition-all ${
                            productId === p.id
                              ? 'border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30'
                              : 'border-border hover:border-primary/40 text-muted-foreground hover:bg-secondary/50'
                          }`}
                        >
                          <ProductGlyph product={p} className="h-16 w-full" />
                          <span className="font-medium text-sm">{p.name}</span>
                        </button>
                      ))}
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
                            size === s.id
                              ? 'border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30'
                              : 'border-border hover:border-primary/40 text-muted-foreground hover:bg-secondary/50'
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
                      {FINISHES.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setFinish(f.id)}
                          className={`p-3 text-center border rounded-lg font-medium text-sm transition-all ${
                            finish === f.id
                              ? 'border-primary text-primary bg-[#f5eaec] ring-1 ring-primary/30'
                              : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50'
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

                {/* LOGO / PHOTO TAB */}
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
                          onChange={setCustomImage}
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
              </div>

              {/* PLAN + UPLOAD + ORDER */}
              <div className="px-6 pb-6 pt-4 border-t border-border space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Plan de grabado</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ENGRAVING_PLANS.map((p) => (
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

                <Button
                  onClick={handleOrder}
                  disabled={isOrdered}
                  size="lg"
                  className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  {isOrdered ? "Abriendo WhatsApp..." : `Personalizar mi ${product.singular} — ${activePlan.priceLabel}`}
                </Button>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}
