import React from "react";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-border pt-12 pb-6 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
        <div className="md:col-span-2">
          <img
            src="/marketplace-logo.png"
            alt="MarketPlace"
            className="h-8 object-contain mb-4"
          />
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-5">
            La tienda online de termos personalizados de Paraguay. Diseña tu propio estilo y recibilo en la puerta de tu casa.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <span>+595 21 000 0000</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <span>termos@marketplace.com.py</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>Asuncion, Paraguay</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-4 text-sm">Tienda</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><a href="#customizer" className="hover:text-primary transition-colors">Personalizador</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Catalogo</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Accesorios</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Regalos corporativos</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-4 text-sm">Soporte</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary transition-colors">Preguntas frecuentes</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Envios y plazos</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Cambios y devoluciones</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Contacto</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-3">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} MarketPlace Paraguay. Todos los derechos reservados.
        </p>
        <div className="text-xs text-muted-foreground flex gap-4">
          <a href="#" className="hover:text-primary transition-colors">Instagram</a>
          <a href="#" className="hover:text-primary transition-colors">Facebook</a>
          <a href="#" className="hover:text-primary transition-colors">WhatsApp</a>
        </div>
      </div>
    </footer>
  );
}
