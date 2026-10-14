import { createRoot, hydrateRoot } from "react-dom/client";
import Hero from "@/components/hero";
import "./index.css";
import { initWhatsAppLinkTracking } from "./lib/analytics";

// /admin → /api/admin. Con hosting estático (deployment de Replit) el edge
// manda toda ruta que no sea /api/* a esta SPA, así que /admin nunca llega al
// panel del api-server. Redirigir acá hace que /admin funcione en cualquier
// hosting; con server.mjs ni siquiera se llega a este punto (lo proxya antes).
if (/^\/admin\/?$/.test(window.location.pathname)) {
  window.location.replace("/api/admin");
} else {
  initWhatsAppLinkTracking();

  // El hero vive en su propia raíz: el build lo pre-renderiza dentro de
  // #hero-root (scripts/prerender.mjs), así el texto LCP y la foto del carrusel
  // pintan con el HTML + CSS, sin esperar a que baje y corra el JS. Acá solo se
  // hidrata. En dev (o si el pre-render faltara) la raíz llega vacía y se
  // renderiza normal. Fuera de la home (404) el hero no va.
  const heroRoot = document.getElementById("hero-root")!;
  if (window.location.pathname !== import.meta.env.BASE_URL) {
    heroRoot.remove();
  } else if (heroRoot.hasChildNodes()) {
    hydrateRoot(heroRoot, <Hero />);
  } else {
    createRoot(heroRoot).render(<Hero />);
  }

  // Router, providers y secciones bajo el fold van en un chunk aparte: no
  // compiten con el primer render ni con la hidratación del hero.
  import("./App").then(({ default: App }) => {
    createRoot(document.getElementById("root")!).render(<App />);
  });
}
