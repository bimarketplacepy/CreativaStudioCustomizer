import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Palette, Sparkles, Type, Box, Flame, Star, Zap, Heart, Mountain, Waves, Leaf } from "lucide-react";
import Thermos3D from "./thermos-3d";

const SIZES = [
  { id: "sm", name: "12oz Mug", label: "Mug" },
  { id: "md", name: "20oz Estandar", label: "Std" },
  { id: "lg", name: "32oz Grande", label: "Lrg" },
  { id: "xl", name: "40oz Jug", label: "Jug" },
];

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

const ICONS = [
  { id: "none", name: "Ninguno", render: null },
  { id: "flames", name: "Llamas", render: <Flame className="w-14 h-14" /> },
  { id: "star", name: "Estrella", render: <Star className="w-14 h-14" /> },
  { id: "lightning", name: "Rayo", render: <Zap className="w-14 h-14" /> },
  { id: "heart", name: "Corazon", render: <Heart className="w-14 h-14" /> },
  { id: "mountain", name: "Montana", render: <Mountain className="w-14 h-14" /> },
  { id: "waves", name: "Olas", render: <Waves className="w-14 h-14" /> },
  { id: "leaf", name: "Hoja", render: <Leaf className="w-14 h-14" /> },
];

const ICON_IDS: Record<string, string | null> = {
  none: null,
  flames: "flames",
  star: "star",
  lightning: "lightning",
  heart: "heart",
  mountain: "mountain",
  waves: "waves",
  leaf: "leaf",
};

export default function Customizer() {
  const [size, setSize] = useState(SIZES[1].id);
  const [color, setColor] = useState(COLORS[0].id);
  const [finish, setFinish] = useState(FINISHES[0].id);
  const [text, setText] = useState("");
  const [font, setFont] = useState(FONTS[0].id);
  const activeFont = FONTS.find(f => f.id === font) || FONTS[0];
  const [icon, setIcon] = useState(ICONS[0].id);
  const [isOrdered, setIsOrdered] = useState(false);

  const activeColorHex = COLORS.find(c => c.id === color)?.hex || COLORS[0].hex;
  const activeColorName = COLORS.find(c => c.id === color)?.name || "";

  const handleOrder = () => {
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
                {/* 3D Thermos Canvas — taller for bigger sizes */}
                <div className="w-full" style={{ height: size === "xl" ? 560 : size === "lg" ? 520 : size === "sm" ? 480 : 500 }}>
                  <Thermos3D
                    colorHex={activeColorHex}
                    finish={finish}
                    text={text}
                    fontClass=""
                    fontStyle={activeFont.style}
                    iconName={ICON_IDS[icon] ?? null}
                    size={size}
                  />
                </div>

                <p className="text-xs text-muted-foreground -mt-1 mb-1">Arrastra para girar</p>

                {/* Summary badges */}
                <div className="flex flex-wrap gap-2 justify-center px-4 pb-4">
                  <span className="text-xs bg-white border border-border rounded-full px-3 py-1 text-muted-foreground">
                    {SIZES.find(s => s.id === size)?.name}
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
                    <h3 className="text-xl font-bold text-foreground mb-1">Pedido Recibido</h3>
                    <p className="text-sm text-muted-foreground">Nos pondremos en contacto contigo pronto para confirmar tu orden.</p>
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
                    value="art"
                    className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5 hidden sm:inline" /> Arte
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 min-h-[320px]">
                {/* SHAPE TAB */}
                <TabsContent value="shape" className="mt-0 space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-3 block">Tamano y Silueta</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {SIZES.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSize(s.id)}
                          className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-3 transition-all ${
                            size === s.id
                              ? 'border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30'
                              : 'border-border hover:border-primary/40 text-muted-foreground hover:bg-secondary/50'
                          }`}
                        >
                          <div className="h-14 flex items-end justify-center">
                            <div className={`bg-current opacity-70 rounded-b-md ${
                              s.id === 'sm' ? 'w-6 h-8' :
                              s.id === 'md' ? 'w-7 h-11' :
                              s.id === 'lg' ? 'w-8 h-14' :
                              'w-9 h-14'
                            }`} />
                          </div>
                          <span className="font-medium text-sm">{s.name}</span>
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
                          onClick={() => setColor(c.id)}
                          title={c.name}
                          className={`group relative aspect-square rounded-full overflow-hidden transition-all hover:scale-105 focus:outline-none ring-offset-2 ${
                            color === c.id ? 'ring-2 ring-primary' : 'ring-0'
                          }`}
                        >
                          <div className="absolute inset-0" style={{ backgroundColor: c.hex }} />
                          {color === c.id && (
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
                      onChange={(e) => setText(e.target.value.slice(0, 12))}
                      placeholder="Tu nombre o texto"
                      className="h-12 text-base text-center border-border focus-visible:ring-primary"
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5 text-right">{text.length}/12 caracteres</p>
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

                {/* ART TAB */}
                <TabsContent value="art" className="mt-0 space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-3 block">Icono / Decoracion</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {ICONS.map(i => (
                        <button
                          key={i.id}
                          onClick={() => setIcon(i.id)}
                          className={`aspect-square flex flex-col items-center justify-center gap-1 border rounded-xl text-sm transition-all ${
                            icon === i.id
                              ? 'border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30'
                              : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/50'
                          }`}
                        >
                          <div className="scale-75">{i.render || <span className="text-xs font-medium">Sin icono</span>}</div>
                          <span className="text-xs font-medium">{i.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </div>

              {/* ORDER BUTTON */}
              <div className="px-6 pb-6 pt-2 border-t border-border">
                <Button
                  onClick={handleOrder}
                  disabled={isOrdered}
                  size="lg"
                  className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  {isOrdered ? "Pedido enviado..." : "Pedir Mi Termo — desde Gs. 250.000"}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">Envio incluido en compras sobre Gs. 500.000</p>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}
