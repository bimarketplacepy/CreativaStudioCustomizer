import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Palette, Sparkles, Type, Hexagon, Flame, Skull, Star, Zap, Heart, Mountain, Waves } from "lucide-react";
import ThermosPreview from "./thermos-preview";

const SIZES = [
  { id: "sm", name: "12oz Mug", label: "Mug" },
  { id: "md", name: "20oz Standard", label: "Std" },
  { id: "lg", name: "32oz Large", label: "Lrg" },
  { id: "xl", name: "40oz Jug", label: "Jug" },
];

const COLORS = [
  { id: "c1", hex: "#FF0055", name: "Neon Pink" },
  { id: "c2", hex: "#00FF66", name: "Cyber Green" },
  { id: "c3", hex: "#00CCFF", name: "Electric Blue" },
  { id: "c4", hex: "#7000FF", name: "Deep Purple" },
  { id: "c5", hex: "#FF3300", name: "Crimson" },
  { id: "c6", hex: "#FFCC00", name: "Solar Yellow" },
  { id: "c7", hex: "#111111", name: "Vantablack" },
  { id: "c8", hex: "#EEEEEE", name: "Arctic White" },
  { id: "c9", hex: "#FF8800", name: "Tangerine" },
  { id: "c10", hex: "#00FFAA", name: "Mint" },
  { id: "c11", hex: "#0055FF", name: "Ocean" },
  { id: "c12", hex: "#AA00FF", name: "Violet" },
];

const FINISHES = [
  { id: "matte", name: "Matte" },
  { id: "glossy", name: "Glossy" },
  { id: "metallic", name: "Metallic" },
  { id: "gradient", name: "Holo Gradient" },
];

const FONTS = [
  { id: "font-sans", name: "Bricolage", css: "font-sans font-black uppercase tracking-tighter" },
  { id: "font-mono", name: "Space Mono", css: "font-mono uppercase tracking-widest" },
  { id: "font-script", name: "Brush", css: "font-serif italic" },
];

const ICONS = [
  { id: "none", name: "None", render: null },
  { id: "flames", name: "Flames", render: <Flame className="w-16 h-16" /> },
  { id: "skull", name: "Skull", render: <Skull className="w-16 h-16" /> },
  { id: "star", name: "Star", render: <Star className="w-16 h-16" /> },
  { id: "lightning", name: "Bolt", render: <Zap className="w-16 h-16" /> },
  { id: "heart", name: "Heart", render: <Heart className="w-16 h-16" /> },
  { id: "mountain", name: "Peak", render: <Mountain className="w-16 h-16" /> },
  { id: "waves", name: "Waves", render: <Waves className="w-16 h-16" /> },
];

export default function Customizer() {
  const [size, setSize] = useState(SIZES[1].id);
  const [color, setColor] = useState(COLORS[0].id);
  const [finish, setFinish] = useState(FINISHES[0].id);
  const [text, setText] = useState("VIBE");
  const [font, setFont] = useState(FONTS[0].id);
  const [icon, setIcon] = useState(ICONS[4].id);
  const [isOrdered, setIsOrdered] = useState(false);

  const activeColorHex = COLORS.find(c => c.id === color)?.hex || COLORS[0].hex;

  const handleOrder = () => {
    setIsOrdered(true);
    setTimeout(() => setIsOrdered(false), 5000);
  };

  return (
    <section id="customizer" className="py-24 px-6 relative bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">
            Create Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Masterpiece</span>
          </h2>
          <p className="font-mono text-muted-foreground uppercase">Zero limits. Infinite possibilities.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          
          {/* PREVIEW AREA */}
          <div className="lg:col-span-5 relative h-[600px] flex items-center justify-center bg-card rounded-2xl border border-border p-8 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pattern-grid opacity-20" />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 blur-[100px] opacity-30 transition-colors duration-500 rounded-full"
              style={{ backgroundColor: activeColorHex }}
            />
            
            <ThermosPreview 
              size={size}
              colorHex={activeColorHex}
              finish={finish}
              text={text}
              fontClass={FONTS.find(f => f.id === font)?.css || FONTS[0].css}
              iconRender={ICONS.find(i => i.id === icon)?.render}
            />

            <AnimatePresence>
              {isOrdered && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-6">
                    <Check className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black uppercase mb-2">Order Secured!</h3>
                  <p className="font-mono text-muted-foreground">Your custom piece is entering production.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CONTROLS AREA */}
          <div className="lg:col-span-7 bg-card border border-border p-8 rounded-2xl">
            <Tabs defaultValue="shape" className="w-full">
              <TabsList className="w-full grid grid-cols-4 mb-8 bg-muted rounded-none h-14 p-1">
                <TabsTrigger value="shape" className="font-mono text-xs uppercase data-[state=active]:bg-background rounded-none"><Hexagon className="w-4 h-4 mr-2 hidden sm:block"/> Shape</TabsTrigger>
                <TabsTrigger value="color" className="font-mono text-xs uppercase data-[state=active]:bg-background rounded-none"><Palette className="w-4 h-4 mr-2 hidden sm:block"/> Color</TabsTrigger>
                <TabsTrigger value="text" className="font-mono text-xs uppercase data-[state=active]:bg-background rounded-none"><Type className="w-4 h-4 mr-2 hidden sm:block"/> Text</TabsTrigger>
                <TabsTrigger value="art" className="font-mono text-xs uppercase data-[state=active]:bg-background rounded-none"><Sparkles className="w-4 h-4 mr-2 hidden sm:block"/> Art</TabsTrigger>
              </TabsList>

              <div className="min-h-[300px]">
                {/* SHAPE TAB */}
                <TabsContent value="shape" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <Label className="text-sm font-mono uppercase text-muted-foreground mb-4 block">Select Size / Silhouette</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {SIZES.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSize(s.id)}
                          className={`p-4 border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                            size === s.id 
                              ? 'border-primary bg-primary/10 text-primary' 
                              : 'border-border hover:border-primary/50 text-muted-foreground'
                          }`}
                        >
                          <div className="h-16 flex items-end justify-center">
                            {/* Simple abstract rep of size */}
                            <div className={`w-8 bg-current opacity-80 ${
                              s.id === 'sm' ? 'h-8 rounded-b-md' :
                              s.id === 'md' ? 'h-12 rounded-b-md' :
                              s.id === 'lg' ? 'h-16 rounded-b-md w-10' :
                              'h-16 rounded-b-md w-12'
                            }`} />
                          </div>
                          <span className="font-bold text-sm">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* COLOR TAB */}
                <TabsContent value="color" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <Label className="text-sm font-mono uppercase text-muted-foreground mb-4 block">Base Color</Label>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                      {COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setColor(c.id)}
                          className="group relative aspect-square rounded-full overflow-hidden transition-transform hover:scale-110 focus:outline-none"
                        >
                          <div className="absolute inset-0" style={{ backgroundColor: c.hex }} />
                          {color === c.id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Check className="text-white w-6 h-6 drop-shadow-md" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <Label className="text-sm font-mono uppercase text-muted-foreground mb-4 block">Finish</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {FINISHES.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setFinish(f.id)}
                          className={`p-3 text-center border font-bold uppercase text-sm transition-all ${
                            finish === f.id
                              ? 'border-primary text-primary bg-primary/10'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* TEXT TAB */}
                <TabsContent value="text" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <Label className="text-sm font-mono uppercase text-muted-foreground mb-4 block">Custom Text</Label>
                    <Input 
                      value={text}
                      onChange={(e) => setText(e.target.value.slice(0, 10))}
                      placeholder="ENTER TEXT"
                      className="h-16 text-2xl font-black uppercase text-center bg-background border-2 border-border focus-visible:ring-primary focus-visible:border-primary rounded-none"
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-right font-mono">{text.length}/10</p>
                  </div>

                  <div className="pt-4">
                    <Label className="text-sm font-mono uppercase text-muted-foreground mb-4 block">Typography Style</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {FONTS.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setFont(f.id)}
                          className={`p-4 text-center border text-xl transition-all ${f.css} ${
                            font === f.id
                              ? 'border-primary text-primary bg-primary/10'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {text || f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* ART TAB */}
                <TabsContent value="art" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <Label className="text-sm font-mono uppercase text-muted-foreground mb-4 block">Icon / Symbol</Label>
                    <div className="grid grid-cols-4 gap-4">
                      {ICONS.map(i => (
                        <button
                          key={i.id}
                          onClick={() => setIcon(i.id)}
                          className={`aspect-square flex items-center justify-center text-4xl border-2 transition-all ${
                            icon === i.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50 grayscale opacity-50 hover:grayscale-0 hover:opacity-100'
                          }`}
                        >
                          {i.render || <span className="text-sm font-mono text-muted-foreground">NONE</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </div>

              {/* ACTION BUTTON */}
              <div className="mt-12 pt-8 border-t border-border">
                <Button 
                  onClick={handleOrder}
                  disabled={isOrdered}
                  className="w-full h-16 text-xl font-black uppercase tracking-wider bg-foreground text-background hover:bg-primary hover:text-primary-foreground rounded-none skew-x-[-5deg] transition-all"
                >
                  <div className="skew-x-[5deg] flex items-center">
                    {isOrdered ? "Processing..." : "Pedir Mi Termo - $45"}
                  </div>
                </Button>
              </div>

            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}
