import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star, Truck } from "lucide-react";

export default function Hero() {
  const scrollToCustomizer = () => {
    document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Navbar */}
      <header className="w-full border-b border-border bg-white sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <img
            src="/marketplace-logo.png"
            alt="MarketPlace"
            className="h-8 object-contain"
          />
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Inicio</a>
            <a href="#customizer" onClick={e => { e.preventDefault(); scrollToCustomizer(); }} className="hover:text-foreground transition-colors">Personalizar</a>
            <a href="#gallery" className="hover:text-foreground transition-colors">Galeria</a>
            <a href="#" className="hover:text-foreground transition-colors">Contacto</a>
          </nav>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <ShoppingCart className="w-4 h-4" />
            Pedir Ahora
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-bg.png"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-white/75" />
        </div>

        {/* Subtle top banner */}
        <div className="relative z-10 bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
          Envios a todo el pais — Personalizacion 100% a tu gusto
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12">
          {/* Left content */}
          <motion.div
            className="flex-1 text-left"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 bg-red-50 text-primary border border-red-200 rounded-full px-3 py-1 text-sm font-medium mb-6">
              <Star className="w-3.5 h-3.5 fill-current" />
              Termos Personalizados Premium
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
              Diseña tu proprio<br />
              <span className="text-primary">Termo Unico</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              Elige el color, el texto, el acabado y los detalles. Tu termo, tu estilo, 100% personalizado. Entrega a todo el pais.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 h-12 font-semibold shadow-sm"
                onClick={scrollToCustomizer}
              >
                Personalizar Ahora
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 h-12 font-semibold border-border"
              >
                Ver Catalogo
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-primary" />
                </div>
                <span>Envio gratis +100k</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                  <Star className="w-4 h-4 text-primary fill-current" />
                </div>
                <span>+500 clientes felices</span>
              </div>
            </div>
          </motion.div>

          {/* Right — Thermos showcase */}
          <motion.div
            className="flex-1 flex items-center justify-center relative"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative w-72 h-96">
              {/* Background circle decoration */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 rounded-full bg-red-50 border-2 border-red-100" />
              </div>

              {/* Floating thermos display */}
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Cap */}
                <div className="w-24 h-10 bg-zinc-800 rounded-t-xl border-b-2 border-zinc-900 shadow-md z-20" />
                {/* Body */}
                <div
                  className="relative w-32 h-64 rounded-b-3xl shadow-xl overflow-hidden z-10"
                  style={{
                    background: "linear-gradient(135deg, #e63946 0%, #c1121f 50%, #9d0208 100%)",
                    boxShadow: "inset -12px 0 24px rgba(0,0,0,0.35), inset 8px 0 16px rgba(255,255,255,0.25), 0 20px 40px rgba(0,0,0,0.2)"
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/15 to-transparent w-1/2 ml-4" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center text-white/80 -rotate-90 whitespace-nowrap">
                      <span className="text-xs font-medium tracking-[0.3em] uppercase opacity-60">Marketplace</span>
                      <span className="text-2xl font-bold tracking-wider">MI TERMO</span>
                    </div>
                  </div>
                </div>
                {/* Shadow */}
                <div className="w-28 h-4 bg-black/15 blur-md rounded-full mt-2" />
              </motion.div>

              {/* Floating badges */}
              <motion.div
                className="absolute top-4 -left-4 bg-white border border-border rounded-xl px-3 py-2 shadow-md text-xs font-semibold text-foreground"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5, ease: "easeInOut" }}
              >
                12 colores disponibles
              </motion.div>
              <motion.div
                className="absolute bottom-8 -right-4 bg-primary text-primary-foreground rounded-xl px-3 py-2 shadow-md text-xs font-semibold"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1, ease: "easeInOut" }}
              >
                Personalizado al 100%
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
