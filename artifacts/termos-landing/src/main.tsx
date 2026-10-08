import { createRoot } from "react-dom/client";
import App from "./App";
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
  createRoot(document.getElementById("root")!).render(<App />);
}
