import React from "react";
import { whatsappUrl } from "@/lib/contact";

/** Official WhatsApp glyph — lucide-react ships no brand icons. */
export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 20.464 3.488" />
    </svg>
  );
}

/** Persistent chat CTA, pinned bottom-right on every screen. */
export default function WhatsAppButton() {
  return (
    <a
      href={whatsappUrl("¡Hola! ¿Cómo están? Me gustaría personalizar un producto y quería hacerles una consulta 😊")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbanos por WhatsApp"
      // bottom con safe-area: en iPhone con home indicator no queda pegado al
      // borde. p-4 + glifo 24px ≈ 56px de target táctil (mínimo recomendado).
      className="wa-fab group fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-50 flex items-center gap-2.5 rounded-full bg-[#1A1614] p-4 text-white ring-1 ring-white/10 shadow-lg shadow-black/25 transition-all hover:bg-[#8B1A2F] hover:scale-[1.03] active:bg-[#8B1A2F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8B1A2F]"
    >
      <WhatsAppGlyph className="w-6 h-6 shrink-0" />
      <span className="hidden sm:block max-w-0 overflow-hidden whitespace-nowrap text-[13px] font-medium tracking-wide transition-[max-width] duration-300 group-hover:max-w-[10rem]">
        Escríbanos
      </span>
    </a>
  );
}
