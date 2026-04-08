import React from "react";

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border pt-16 pb-8 px-6 text-center md:text-left">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="md:col-span-2">
          <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 text-primary">ThermoArt.</h3>
          <p className="text-muted-foreground font-mono text-sm max-w-sm mx-auto md:mx-0">
            More than just hydration. It's a statement. Design your custom piece of daily carry and let the world know who you are.
          </p>
        </div>
        <div>
          <h4 className="font-bold uppercase tracking-wider mb-4">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground font-mono">
            <li><a href="#" className="hover:text-primary transition-colors">Customizer</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Accessories</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Gift Cards</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold uppercase tracking-wider mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground font-mono">
            <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Shipping</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Returns</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground font-mono">
          &copy; {new Date().getFullYear()} ThermoArt Studio. All rights reserved.
        </p>
        <div className="text-xs text-muted-foreground font-mono flex gap-4">
          <a href="#" className="hover:text-white">Insta</a>
          <a href="#" className="hover:text-white">TikTok</a>
          <a href="#" className="hover:text-white">X</a>
        </div>
      </div>
    </footer>
  );
}
