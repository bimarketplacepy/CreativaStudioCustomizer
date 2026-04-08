import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Hero() {
  const scrollToCustomizer = () => {
    document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32 px-6 overflow-hidden border-b border-border/50">
      {/* Background with image and overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10" />
        <img 
          src="/hero-bg.png" 
          alt="Abstract street art background" 
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 pattern-grid z-10 opacity-30" />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-12">
        <motion.div 
          className="flex-1 text-left"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-block px-4 py-1.5 mb-6 rounded-full bg-accent/20 text-accent font-mono text-sm font-bold tracking-wider uppercase border border-accent/30"
          >
            ThermoArt Studio
          </motion.div>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] mb-6">
            YOUR <br/>
            <span className="text-stroke-2 text-foreground">VIBE.</span> <br/>
            <span className="text-primary drop-shadow-[0_0_30px_rgba(204,255,0,0.5)]">YOUR</span> <br/>
            TERMO.
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-lg mb-10 font-mono">
            Unapologetically bold. 100% you. Design a custom thermos that speaks louder than words.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-14 px-8 rounded-none font-bold uppercase tracking-wider skew-x-[-10deg] transition-transform hover:scale-105 active:scale-95"
              onClick={scrollToCustomizer}
            >
              <div className="skew-x-[10deg]">Start Creating</div>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg h-14 px-8 rounded-none font-bold uppercase tracking-wider skew-x-[10deg] border-2 transition-transform hover:scale-105 active:scale-95"
            >
              <div className="skew-x-[-10deg]">View Gallery</div>
            </Button>
          </div>
        </motion.div>

        <motion.div 
          className="flex-1 relative hidden md:block"
          initial={{ opacity: 0, x: 100, rotate: 10 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Abstract graphic elements behind the hero thermos */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-accent/30 via-secondary/20 to-primary/30 blur-3xl rounded-full z-0" />
          
          <div className="relative z-10 w-full aspect-[3/4] flex items-center justify-center">
            {/* We'll use a CSS-drawn expressive thermos for the hero to avoid needing an external image */}
            <div className="w-48 h-96 relative group perspective-1000">
              <motion.div 
                className="w-full h-full relative preserve-3d"
                animate={{ 
                  rotateY: [0, 10, -10, 0],
                  rotateX: [0, 5, -5, 0],
                  y: [0, -15, 0]
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
              >
                {/* Cap */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-16 bg-zinc-900 rounded-t-xl border-t-4 border-l-4 border-r-4 border-zinc-700 z-20 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.8)]" />
                
                {/* Body */}
                <div className="absolute inset-0 bg-accent rounded-3xl overflow-hidden border-2 border-accent-foreground/20 shadow-[inset_-20px_0_40px_rgba(0,0,0,0.5),inset_10px_0_20px_rgba(255,255,255,0.4),0_20px_50px_rgba(0,0,0,0.5)]">
                  {/* Pattern on the thermos */}
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[size:20px_20px]" />
                  <div className="absolute bottom-10 -left-10 w-40 h-40 bg-primary rounded-full mix-blend-overlay blur-xl" />
                  <div className="absolute top-20 -right-10 w-32 h-32 bg-secondary rounded-full mix-blend-overlay blur-xl" />
                  
                  {/* Text on thermos */}
                  <div className="absolute inset-0 flex items-center justify-center -rotate-90">
                    <span className="text-white/90 font-black text-6xl tracking-tighter mix-blend-overlay">WILD.</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
