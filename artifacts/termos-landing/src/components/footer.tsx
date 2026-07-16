import React from "react";
import { Phone, Mail, MapPin, Instagram, Facebook } from "lucide-react";
import { ADDRESS, EMAIL, FACEBOOK_URL, INSTAGRAM_URL, WHATSAPP_PHONE_DISPLAY, whatsappUrl } from "@/lib/contact";
import { WhatsAppGlyph } from "./whatsapp-button";

/** Every support topic opens WhatsApp with the question already framed. */
const SUPPORT_LINKS = [
  { label: "Preguntas frecuentes", message: "¡Hola! ¿Cómo están? Tengo una duda sobre los grabados y me encantaría que me orienten 😊" },
  { label: "Retiro en el local", message: "¡Hola! ¿Qué tal? Quería consultarles cómo es el retiro en el local. ¡Gracias!" },
  { label: "Cambios y devoluciones", message: "¡Hola! ¿Cómo va? Tengo una consulta sobre cambios y devoluciones, ¿me ayudan?" },
  { label: "Contacto", message: "¡Hola! ¿Cómo están? Me gustaría hacerles una consulta cuando puedan 😊" },
];

export default function Footer() {
  return (
    <footer id="contacto" className="bg-white border-t border-border pt-12 pb-6 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
        <div className="md:col-span-2">
          <img
            src="/marketplace-logo.webp"
            alt="MarketPlace"
            width={160}
            height={32}
            loading="lazy"
            decoding="async"
            className="h-8 object-contain mb-4 w-auto"
          />
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-5">
            El personalizador online de Creativa Studio. Diseñá y personalizá tu producto a tu gusto, tal como lo imaginás.
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
          <h4 className="font-semibold text-foreground mb-4 text-sm">Explorar</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><a href="#personalizaciones" className="hover:text-primary transition-colors">Qué personalizamos</a></li>
            <li><a href="#customizer" className="hover:text-primary transition-colors">Personalizador</a></li>
            <li><a href="#precios" className="hover:text-primary transition-colors">Precios de grabado</a></li>
            <li>
              <a
                href={whatsappUrl("¡Hola! ¿Qué tal? Me interesan los regalos corporativos personalizados y me encantaría que me cuenten un poco más.")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Regalos corporativos
              </a>
            </li>
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
        <div className="flex gap-2.5">
          {[
            { href: whatsappUrl(), label: "WhatsApp", Icon: WhatsAppGlyph },
            { href: INSTAGRAM_URL, label: "Instagram", Icon: Instagram },
            { href: FACEBOOK_URL, label: "Facebook", Icon: Facebook },
          ].map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-[#8B1A2F] hover:text-[#8B1A2F]"
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
