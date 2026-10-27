import React from "react";
import { Phone, Mail, MapPin, Instagram, Facebook } from "lucide-react";
import { ADDRESS, EMAIL, FACEBOOK_URL, INSTAGRAM_URL, WHATSAPP_PHONE_DISPLAY, whatsappUrl } from "@/lib/contact";
import { WhatsAppGlyph } from "./whatsapp-button";
import { scrollToSection, startCustomizer } from "@/lib/section-reveal";
import { track } from "@/lib/analytics";

/** Every support topic opens WhatsApp with the question already framed. */
const SUPPORT_LINKS = [
  { label: "Retiro en el local", message: "¡Hola! ¿Qué tal? Quería consultarles cómo es el retiro en el local. ¡Gracias!" },
  { label: "Cambios y devoluciones", message: "¡Hola! ¿Cómo va? Tengo una consulta sobre cambios y devoluciones, ¿me ayudan?" },
  { label: "Regalos corporativos", message: "¡Hola! ¿Qué tal? Me interesan los regalos corporativos personalizados y me encantaría que me cuenten un poco más." },
];

/** Navegación interna: todas por scrollToSection (monta lo diferido, y
 *  #customizer / #stickers eligen el modo del personalizador). */
const EXPLORE = [
  { label: "Personalizador", id: "customizer" },
  { label: "Impresión 360°", id: "impresion-360" },
  { label: "Stickers", id: "stickers" },
  { label: "Trabajos realizados", id: "galeria" },
  { label: "Precios", id: "precios" },
  { label: "Preguntas frecuentes", id: "preguntas" },
];

const LINK = "inline-block py-1.5 hover:text-white transition-colors";

export default function Footer() {
  return (
    // pb con reserva para el FAB de WhatsApp (no tapa los íconos sociales al
    // llegar al final) + safe-area inferior.
    <footer id="contacto" className="scroll-mt-16 bg-[var(--cs-ink)] text-[var(--cs-mark-dim)] pt-14 md:pt-20 px-5 sm:px-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr] gap-10 md:gap-12">
        <div>
          <div className="flex items-center gap-3">
            <img src="/navbar-logo-v2.webp" alt="Marketplace" width={200} height={40} loading="lazy" decoding="async" className="h-6 md:h-7 w-auto object-contain brightness-0 invert" />
            <span aria-hidden className="w-px h-6 bg-white/25" />
            <img src="/la-creativa-logo-96.webp" alt="" width={32} height={32} loading="lazy" decoding="async" className="h-6 md:h-7 w-auto object-contain brightness-0 invert" />
            <span className="text-[var(--cs-mark)] font-semibold">Creativa Studio</span>
          </div>
          <p className="mt-6 font-serif font-light text-white text-[clamp(1.9rem,3.5vw,2.4rem)] leading-[1.1] max-w-[12em]">¿La tuya, cuál sería?</p>
          <button
            type="button"
            onClick={() => { track("cta_click", { location: "footer" }); startCustomizer({}); }}
            className="cs-btn cs-btn-primary mt-6"
          >
            Personalizar mi pieza
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>

        <div>
          <h2 className="text-[var(--cs-mark)] font-semibold text-[15px] mb-4">Visitanos</h2>
          <ul className="grid gap-3 text-[15px]">
            <li className="flex gap-2.5"><MapPin className="w-4 h-4 mt-1 shrink-0 text-[var(--cs-laser)]" /> {ADDRESS}</li>
            <li>
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="flex gap-2.5 hover:text-white transition-colors w-fit">
                <Phone className="w-4 h-4 mt-1 shrink-0 text-[var(--cs-laser)]" /> {WHATSAPP_PHONE_DISPLAY}
              </a>
            </li>
            <li>
              <a href={`mailto:${EMAIL}`} className="flex gap-2.5 hover:text-white transition-colors w-fit break-all">
                <Mail className="w-4 h-4 mt-1 shrink-0 text-[var(--cs-laser)]" /> {EMAIL}
              </a>
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-[var(--cs-mark)] font-semibold text-[15px] mb-3">Explorar</h2>
            <ul className="text-[15px]">
              {EXPLORE.map(l => (
                <li key={l.id}>
                  <a href={`#${l.id}`} onClick={e => { e.preventDefault(); scrollToSection(l.id); }} className={LINK}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-[var(--cs-mark)] font-semibold text-[15px] mb-3">Ayuda</h2>
            <ul className="text-[15px]">
              {SUPPORT_LINKS.map(item => (
                <li key={item.label}>
                  <a href={whatsappUrl(item.message)} target="_blank" rel="noopener noreferrer" className={LINK}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[13px]">&copy; {new Date().getFullYear()} Creativa Studio · Marketplace Paraguay</p>
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
              className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-[var(--cs-mark)] transition-colors hover:border-[var(--cs-laser)] hover:text-white"
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
