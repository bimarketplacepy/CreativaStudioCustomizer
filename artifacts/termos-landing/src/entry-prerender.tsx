import { renderToString } from "react-dom/server";
import Hero from "@/components/hero";

/**
 * Entrada SSR usada solo en el build (scripts/prerender.mjs): genera el HTML
 * estático del hero que se inyecta en #hero-root y que main.tsx hidrata.
 */
export function render(): string {
  return renderToString(<Hero />);
}
