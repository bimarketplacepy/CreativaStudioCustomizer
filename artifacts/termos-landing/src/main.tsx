import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initWhatsAppLinkTracking } from "./lib/analytics";

initWhatsAppLinkTracking();

createRoot(document.getElementById("root")!).render(<App />);
