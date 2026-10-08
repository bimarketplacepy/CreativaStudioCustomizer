import type { Placement } from "@/lib/placement";

/**
 * Link para compartir / retomar un diseño: el estado del personalizador viaja
 * en el hash (`#diseno=<base64url JSON>`), así no pasa por el server ni queda
 * en logs. El logo/foto subido NO viaja (pesa demasiado para una URL): al
 * abrir el link hay que volver a subirlo.
 */
export interface SharedDesign {
  v: 1;
  materialId: string;
  materialProductId: string;
  sizeId: string;
  colorId: string;
  customHex: string | null;
  finish: string;
  technique: string;
  text: string;
  fontId: string;
  textColor: string;
  iconId: string | null;
  ownProduct: boolean;
  textPlacement: Placement;
  artPlacement: Placement;
}

const PREFIX = "#diseno=";

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

export function designLink(d: SharedDesign): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${PREFIX}${toBase64Url(JSON.stringify(d))}`;
}

export function hasSharedDesign(): boolean {
  return typeof window !== "undefined" && window.location.hash.startsWith(PREFIX);
}

/** Lee el diseño del hash. Devuelve null si no hay o si está corrupto. */
export function readSharedDesign(): SharedDesign | null {
  if (!hasSharedDesign()) return null;
  try {
    const d = JSON.parse(fromBase64Url(window.location.hash.slice(PREFIX.length)));
    return d && d.v === 1 && typeof d.materialId === "string" ? (d as SharedDesign) : null;
  } catch {
    return null;
  }
}

/** Saca el diseño del hash (sin recargar ni agregar historial) una vez aplicado. */
export function clearSharedDesign(): void {
  try {
    history.replaceState(null, "", window.location.pathname + window.location.search + "#customizer");
  } catch { /* nada */ }
}
