import React from "react";
import { motion } from "framer-motion";

interface ThermosPreviewProps {
  size: string;
  colorHex: string;
  finish: string;
  text: string;
  fontClass: string;
  iconRender: React.ReactNode;
}

export default function ThermosPreview({ size, colorHex, finish, text, fontClass, iconRender }: ThermosPreviewProps) {
  // Determine dimensions based on size
  const height = 
    size === 'sm' ? 280 : 
    size === 'md' ? 340 : 
    size === 'lg' ? 400 : 
    460;
    
  const width = size === 'xl' ? 160 : size === 'lg' ? 140 : 130;

  // Determine finish effects
  const finishOverlay = 
    finish === 'matte' ? 'opacity-20 mix-blend-multiply bg-black' :
    finish === 'glossy' ? 'opacity-40 mix-blend-screen bg-gradient-to-tr from-transparent via-white to-transparent' :
    finish === 'metallic' ? 'opacity-60 mix-blend-overlay bg-gradient-to-b from-white via-transparent to-black' :
    'opacity-80 mix-blend-screen bg-gradient-to-tr from-purple-500 via-transparent to-cyan-500'; // gradient

  return (
    <motion.div 
      className="relative flex flex-col items-center perspective-1000"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      key={size} // force re-render for scale animation
    >
      {/* CAP */}
      <div className="relative z-20 w-[85%] h-14 bg-zinc-900 rounded-t-xl border-b-2 border-zinc-950 flex flex-col items-center">
        <div className="w-[110%] h-4 bg-zinc-800 rounded-t-sm absolute -bottom-1 border-b border-black shadow-sm" />
        {/* Cap ridges */}
        <div className="w-full h-full flex justify-evenly items-center px-2 opacity-30">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-1 h-full bg-black/50" />
          ))}
        </div>
      </div>

      {/* BODY */}
      <div 
        className="relative z-10 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-b-[2rem] rounded-t-md shadow-2xl overflow-hidden"
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          backgroundColor: colorHex,
          boxShadow: `
            inset -15px 0 30px rgba(0,0,0,0.5), 
            inset 10px 0 20px rgba(255,255,255,0.3),
            0 20px 40px rgba(0,0,0,0.4)
          `
        }}
      >
        {/* Finish Effect Layer */}
        <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${finishOverlay}`} />

        {/* 3D Cylinder Lighting */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/40 via-transparent to-black/60 mix-blend-overlay" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-l from-transparent via-white/20 to-transparent w-1/3 left-4 mix-blend-overlay" />

        {/* CUSTOM CONTENT CONTAINER */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          
          {/* Icon/Art */}
          {iconRender && (
            <motion.div 
              className="text-6xl mb-6 mix-blend-overlay opacity-80"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              key={`icon-${iconRender}`}
            >
              {iconRender}
            </motion.div>
          )}

          {/* Text */}
          {text && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
              <motion.div 
                className={`text-white mix-blend-overlay opacity-90 transform -rotate-90 whitespace-nowrap text-5xl sm:text-6xl ${fontClass}`}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                key={text}
              >
                {text}
              </motion.div>
            </div>
          )}

        </div>
      </div>
      
      {/* Drop shadow on floor */}
      <div className="w-[120%] h-6 bg-black/60 blur-md rounded-[100%] absolute -bottom-3 z-0" />
    </motion.div>
  );
}
