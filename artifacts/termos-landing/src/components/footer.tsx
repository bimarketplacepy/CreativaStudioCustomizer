import React from "react";
import { Phone, Mail, MapPin, Instagram, Facebook } from "lucide-react";
import { ADDRESS, EMAIL, FACEBOOK_URL, INSTAGRAM_URL, WHATSAPP_PHONE_DISPLAY, whatsappUrl } from "@/lib/contact";
import { WhatsAppGlyph } from "./whatsapp-button";

/** Every support topic opens WhatsApp with the question already framed. */
const SUPPORT_LINKS = [
  { label: "Preguntas frecuentes", message: "Hola! Tengo una consulta sobre los grabados." },
  { label: "Retiro en el local", message: "Hola! Queria consultar por el retiro en el local." },
  { label: "Cambios y devoluciones", message: "Hola! Queria consultar por cambios y devoluciones." },
  { label: "Contacto", message: "Hola! Queria hacerles una consulta." },
];

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
            La tienda online de personalizacion de Creativa Studio.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-primary transition-colors w-fit"
            >
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <span>{WHATSAPP_PHONE_DISPLAY}</span>
            </a>
            <a
              href={`mailto:${EMAIL}`}
              className="flex items-center gap-2 hover:text-primary transition-colors w-fit"
            >
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <span>{EMAIL}</span>
            </a>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>{ADDRESS}</span>
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
            {SUPPORT_LINKS.map(item => (
              <li key={item.label}>
                <a
                  href={whatsappUrl(item.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-3">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} MarketPlace Paraguay. Todos los derechos reservados.
        </p>
        <div className="flex gap-3">
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-105"
          >
            <WhatsAppGlyph className="w-4 h-4" />
            WhatsApp
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-105"
            style={{ background: "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)" }}
          >
            <Instagram className="w-4 h-4" />
            Instagram
          </a>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#1877F2] px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-105"
          >
            <Facebook className="w-4 h-4" />
            Facebook
          </a>
        </div>
      </div>
    </footer>
  );
}
