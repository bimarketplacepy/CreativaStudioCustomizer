/**
 * ¿Es un equipo de gama baja? Decide cuánto trabajo hace el 3D: texturas a
 * media resolución, sin antialiasing, píxel 1:1, sombra más chica, sin giro de
 * presentación y un AR más liviano. Los equipos buenos no cambian.
 *
 * Señales (Chrome en Android las expone; Safari no, y los iPhone quedan fuera):
 *  - navigator.deviceMemory ≤ 2 (GB, redondeado: un celular de 3 GB reporta 2);
 *  - navigator.hardwareConcurrency ≤ 4 núcleos;
 *  - el modo «ahorro de datos» del navegador.
 *
 * Para probar: `?calidad=baja` o `?calidad=alta` en la URL fuerza el modo y
 * queda guardado en la sesión.
 */
type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

function detect(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const forced = new URLSearchParams(window.location.search).get("calidad");
    if (forced === "baja" || forced === "alta") sessionStorage.setItem("cs:calidad", forced);
    const saved = sessionStorage.getItem("cs:calidad");
    if (saved === "baja") return true;
    if (saved === "alta") return false;
  } catch { /* sin sessionStorage: se decide por el equipo */ }
  const nav = navigator as Nav;
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) return true;
  return false;
}

export const LOW_END: boolean = detect();
