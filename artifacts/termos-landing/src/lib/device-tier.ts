/**
 * ¿Es un equipo de gama baja? Decide cuánto trabajo hace el 3D: texturas a
 * media resolución, sin antialiasing, hasta 1,5× de píxel, sombra más chica, sin giro de
 * presentación y un AR más liviano. Los equipos buenos no cambian.
 *
 * Señales:
 *  - navigator.deviceMemory ≤ 2 (GB, redondeado: un celular de 3 GB reporta 2);
 *  - navigator.hardwareConcurrency ≤ 4 núcleos, SOLO si el navegador también
 *    expone deviceMemory (Chrome en Android). WebKit —todos los navegadores de
 *    iPhone y iPad, Chrome incluido— no expone la memoria y recorta los núcleos
 *    a 4 o menos por privacidad: ahí el número no dice nada del equipo, y con
 *    él todos los iPhone caían en gama baja (3D pixelado). Quedan fuera;
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
  // Sin deviceMemory (WebKit, Firefox) los núcleos vienen recortados: no se usan.
  if (typeof nav.deviceMemory !== "number") return false;
  if (nav.deviceMemory <= 2) return true;
  return typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
}

export const LOW_END: boolean = detect();
