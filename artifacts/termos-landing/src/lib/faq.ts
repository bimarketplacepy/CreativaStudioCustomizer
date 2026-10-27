import { ADDRESS } from "./contact";
import { MACHINES } from "./machines";

/**
 * Preguntas frecuentes: única fuente de la sección (faq.tsx) y del JSON-LD
 * FAQPage que el build inyecta en index.html (scripts/prerender.mjs).
 *
 * Solo respuestas que el sitio o el taller ya confirman. Plazos de producción,
 * formas de pago, seña, horario y envíos quedan afuera hasta tener el dato del
 * dueño: no se completan por suposición.
 */
const LIMITS = MACHINES.dacen.limits!;
const cm = (mm: number) => (mm / 10).toLocaleString("es-PY", { maximumFractionDigits: 1 });

export const FAQ: { q: string; a: string }[] = [
  {
    q: "¿Puedo traer un termo o un vaso que no compré acá?",
    a: "Sí. Lo personalizamos igual y pagás solo la personalización. En el personalizador elegí «Traigo el mío».",
  },
  {
    q: "¿Cuándo pago?",
    a: "Recién cuando confirmás el diseño final que te mandamos por WhatsApp. Antes de producir, lo revisamos con vos.",
  },
  {
    q: "¿Dónde lo retiro?",
    a: `En nuestro local: ${ADDRESS}.`,
  },
  {
    q: "¿Qué piezas se pueden imprimir en 360°?",
    a: `Vasos, termos y botellas cilíndricas de acero pintado, de ${cm(LIMITS.minDiameterMm)} a ${cm(LIMITS.maxDiameterMm)} cm de diámetro y hasta ${cm(LIMITS.maxLengthMm)} cm de alto. Las piezas con manija o muy cónicas las vemos por WhatsApp.`,
  },
  {
    q: "¿Puedo mandar el diseño de mi diseñador?",
    a: "Sí. En el personalizador, en «Todo el vaso (360°)», bajás la plantilla a tamaño real de tu vaso y subís el arte terminado en JPG o PNG.",
  },
  {
    q: "¿El grabado láser se borra?",
    a: "No: el láser marca la superficie de la pieza y el grabado queda permanente.",
  },
  {
    q: "¿Hacen pedidos para empresas?",
    a: "Sí, con descuento por volumen. Contanos producto y cantidad por WhatsApp y te armamos la propuesta.",
  },
];

/** JSON-LD FAQPage para el <head> (lo inyecta el build). */
export function faqJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  });
}
