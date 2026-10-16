/**
 * Zonas donde NO se puede grabar sobre el cuerpo: el logo y la marca del
 * fabricante (HYDRATE), la manija y los relieves de la pieza.
 *
 * Con la ubicación libre (sin el recuadro de una cara) el diseño se mueve por
 * toda la banda grabable, entre la tapa y la base; estas zonas son lo único
 * que lo frena. Salen de dos lados:
 *
 *  - Del modelo 3D (.glb): las piezas con nombre de logo, manija o relieve se
 *    miden sobre el cuerpo al cargar el modelo (ver `zonesFromParts`). Para un
 *    modelo nuevo alcanza con nombrar bien las piezas (GUIA-MODELOS-3D.md).
 *  - Cargadas a mano en el producto (`ProductDef.keepOut`): relieves u otras
 *    zonas que el modelo no trae como pieza aparte. También la manija de los
 *    productos sin .glb, que se deduce de las caras sin grabado.
 *
 * Todo en espacio de placement: u = fracción de la vuelta (0.5 = frente),
 * v = fracción de la banda grabable (0 = arriba, 1 = abajo).
 */
import { nearU, engraveFacesFor, faceCenterU } from "./face-area";
import type { MarkHalfExtents } from "./face-area";
import type { Placement } from "./placement";
import type { ProductDef } from "./products";

export type KeepOutKind = "logo" | "handle" | "relief";

export interface KeepOutZone {
  kind: KeepOutKind;
  /** Centro en u y medio ancho (fracción de la vuelta). */
  u: number;
  halfU: number;
  /** Rango vertical dentro de la banda (0 arriba, 1 abajo). */
  v0: number;
  v1: number;
}

/** Cómo se le explica al cliente por qué el diseño no pasa. */
export const KEEP_OUT_LABEL: Record<KeepOutKind, string> = {
  logo: "el logo de la marca",
  handle: "la manija",
  relief: "un relieve de la pieza",
};

/** Pieza del .glb → tipo de zona (null: no limita el grabado). */
export function keepOutKindOf(partName: string): KeepOutKind | null {
  const n = partName.toLowerCase();
  // "logo_funda" va sobre la funda de silicona (fuera de la banda): si cae
  // afuera, el recorte por v la descarta sola.
  if (n.startsWith("logo")) return "logo";
  if (/^(handle|strap|rivets)/.test(n)) return "handle";
  if (/^(label|reliev|relief)/.test(n)) return "relief";
  return null;
}

/** Margen alrededor de cada zona: el diseño nunca queda pegado al borde. */
const MARGIN_U = 0.012;
const MARGIN_V = 0.03;

/**
 * Zona de una pieza a partir de sus vértices ya ubicados en el marco del cuerpo
 * (eje Y vertical; u = atan2(x, z) / 2π, la misma regla del grabado y de las
 * guías). `vOfY` lleva una altura a v de la banda.
 */
export function zoneFromVertices(
  kind: KeepOutKind,
  positions: ArrayLike<number>,
  vOfY: (y: number) => number,
): KeepOutZone | null {
  const n = Math.floor(positions.length / 3);
  if (!n) return null;
  // Centro angular por media circular (la pieza puede cruzar la costura).
  let sx = 0, sz = 0;
  for (let i = 0; i < n; i++) { sx += positions[i * 3]; sz += positions[i * 3 + 2]; }
  const center = (((Math.atan2(sx, sz) / (2 * Math.PI)) % 1) + 1) % 1;
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    const u = nearU(Math.atan2(x, z) / (2 * Math.PI), center);
    const v = vOfY(y);
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }
  // Fuera de la banda (tapa, base, funda): no limita nada.
  if (vMax < 0 || vMin > 1) return null;
  return {
    kind,
    u: (uMin + uMax) / 2,
    halfU: (uMax - uMin) / 2 + MARGIN_U,
    v0: Math.max(0, vMin - MARGIN_V),
    v1: Math.min(1, vMax + MARGIN_V),
  };
}

/**
 * Zonas que no dependen del modelo: las cargadas a mano y, en productos sin
 * .glb, la manija (la cara sin grabado que la tiene encima).
 */
export function staticZones(product: ProductDef): KeepOutZone[] {
  const out = [...(product.keepOut ?? [])];
  if (!product.model) {
    const faces = engraveFacesFor(product);
    for (const f of ["left", "right"] as const) {
      if (!faces.includes(f)) out.push({ kind: "handle", u: faceCenterU(product, f), halfU: 0.09, v0: 0, v1: 1 });
    }
  }
  return out;
}

function overlaps(p: Placement, ext: MarkHalfExtents, z: KeepOutZone): boolean {
  const du = Math.abs(nearU(p.u, z.u) - z.u);
  if (du >= ext.halfU + z.halfU) return false;
  return p.v + ext.halfV > z.v0 && p.v - ext.halfV < z.v1;
}

/** Zona que pisa el diseño en esa posición (la primera), o null. */
export function hitZone(p: Placement, ext: MarkHalfExtents, zones: KeepOutZone[]): KeepOutZone | null {
  return zones.find(z => overlaps(p, ext, z)) ?? null;
}

/** u en [0, 1) y v dentro de la banda, con el diseño entero adentro. */
function inBand(p: Placement, ext: MarkHalfExtents): Placement {
  const lo = ext.halfV, hi = 1 - ext.halfV;
  const v = lo > hi ? 0.5 : Math.max(lo, Math.min(hi, p.v));
  return { ...p, u: ((p.u % 1) + 1) % 1, v };
}

/**
 * La salida más corta de una zona: a izquierda/derecha (en la vuelta) o
 * arriba/abajo (si entra en la banda).
 */
function pushOut(p: Placement, ext: MarkHalfExtents, z: KeepOutZone): Placement[] {
  const cu = nearU(p.u, z.u);
  const gapU = ext.halfU + z.halfU + 0.001;
  const opts: Placement[] = [
    { ...p, u: z.u - gapU },
    { ...p, u: z.u + gapU },
  ];
  if (z.v0 - ext.halfV >= ext.halfV) opts.push({ ...p, v: z.v0 - ext.halfV - 0.001 });
  if (z.v1 + ext.halfV <= 1 - ext.halfV) opts.push({ ...p, v: z.v1 + ext.halfV + 0.001 });
  const dist = (q: Placement) => Math.abs(nearU(q.u, cu) - cu) + Math.abs(q.v - p.v);
  return opts.sort((a, b) => dist(a) - dist(b));
}

export interface FreeClampResult {
  placement: Placement;
  /** La zona contra la que chocó (para avisarle al cliente), o null. */
  blockedBy: KeepOutZone | null;
}

/**
 * Ubicación libre: el diseño puede ir en cualquier lugar de la banda menos las
 * zonas prohibidas.
 *
 * Con `from` (un arrastre) el movimiento "resbala" por el borde de la zona: si
 * el paso entero la pisa, se prueba solo el horizontal y solo el vertical, y si
 * nada sirve queda donde estaba. Sin `from` (escribir, agrandar, cambiar de
 * producto) se lo corre a la salida libre más cercana.
 */
export function clampFree(
  next: Placement,
  ext: MarkHalfExtents,
  zones: KeepOutZone[],
  from?: Placement,
): FreeClampResult {
  const p = inBand(next, ext);
  const hit = hitZone(p, ext, zones);
  if (!hit) return { placement: p, blockedBy: null };
  if (from) {
    const a = inBand({ ...p, v: from.v }, ext);
    if (!hitZone(a, ext, zones)) return { placement: a, blockedBy: hit };
    const b = inBand({ ...p, u: from.u }, ext);
    if (!hitZone(b, ext, zones)) return { placement: b, blockedBy: hit };
    const f = inBand(from, ext);
    if (!hitZone(f, ext, zones)) return { placement: f, blockedBy: hit };
  }
  // Salida más cercana (dos rondas: al salir de una zona puede caer en otra).
  let cands = pushOut(p, ext, hit).map(q => inBand(q, ext));
  for (let round = 0; round < 2; round++) {
    const ok = cands.find(q => !hitZone(q, ext, zones));
    if (ok) return { placement: ok, blockedBy: hit };
    cands = cands.flatMap(q => { const h = hitZone(q, ext, zones); return h ? pushOut(q, ext, h).map(r => inBand(r, ext)) : [q]; });
  }
  // El diseño es más grande que todo el espacio libre: se deja (el aviso de
  // tamaño lo explica) antes que esconderlo.
  return { placement: p, blockedBy: hit };
}
