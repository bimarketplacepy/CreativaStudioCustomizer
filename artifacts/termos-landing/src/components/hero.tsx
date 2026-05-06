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
            src="/navbar-logo.png"
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

          {/* Right — Logo showcase */}
          <motion.div
            className="flex-1 flex items-center justify-center relative"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative w-80 h-80 flex items-center justify-center">
              {/* Subtle glow circle behind logo */}
              <div className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-red-50 via-white to-red-50 border border-red-100 shadow-inner" />

              {/* Logo */}
              <motion.img
                src="/la-creativa-logo.png"
                alt="La Creativa"
                className="relative z-10 w-72 object-contain drop-shadow-md"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Floating badges */}
              <motion.div
                className="absolute top-2 -left-6 bg-white border border-border rounded-xl px-3 py-2 shadow-md text-xs font-semibold text-foreground"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5, ease: "easeInOut" }}
              >
                12 colores disponibles
              </motion.div>
              <motion.div
                className="absolute bottom-6 -right-6 bg-primary text-primary-foreground rounded-xl px-3 py-2 shadow-md text-xs font-semibold"
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
