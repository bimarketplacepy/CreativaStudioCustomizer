import type { FaceId, Placement } from "./placement";
import type { ProductDef } from "./products";

/**
 * "Edición en una cara" (single-face) mode: the design is confined to one
 * rectangular area on the FRONT face of the drinkware body, instead of the whole
 * 360° band that "Edición libre" allows.
 *
 * Everything about that rectangle lives here as plain configuration so the area
 * is trivial to retune without touching the drawing, clamping or 3D code:
 *
 *   - `uCenter`     — where the front face sits around the body, in texture-u
 *                     (0..1 around the circumference; 0.5 is the seam-opposite
 *                     face the customizer treats as "front"). The 3D preview
 *                     rotates this u to camera when the mode is entered.
 *   - `uHalfWidth`  — half the rectangle's width in u. 0.15 ⇒ the area spans 30%
 *                     of the circumference ≈ 60% of the visible front face.
 *   - `vCenter`     — vertical centre of the rectangle within the engravable
 *                     band (0 = band top, 1 = band bottom).
 *   - `vHeightFrac` — rectangle height as a fraction of the band (≈ half the
 *                     body, never touching cap, base or the handle zone, which
 *                     already sit outside `product.band`).
 *
 * The band itself (`product.band`) already excludes the lid and the rounded
 * base, so keeping the rectangle inside the band keeps art off those forever.
 */
export const FRONT_FACE = {
  uCenter: 0.5,
  // 0.22 ⇒ the area spans 44% of the circumference ≈ 88% of the visible front face.
  uHalfWidth: 0.22,
  vCenter: 0.5,
  // ≈ 84% of the engravable band height — plenty of vertical room to slide the
  // text up and down inside the termo.
  vHeightFrac: 0.84,
  /**
   * Inner padding kept between the text block and the dashed border, as a
   * fraction of the area, so text never kisses the outline.
   */
  textPadFrac: 0.05,
} as const;

/**
 * Effective front-face config for a product: the global FRONT_FACE defaults,
 * overridden per product via `ProductDef.frontFace`. Strongly non-cylindrical
 * bodies (the copa's flared bowl) tune the area so its margins follow the
 * object's real shape instead of wedging into the narrow parts.
 */
export interface FaceZone {
  vMin: number;
  vMax: number;
}

export interface FaceConfig {
  uCenter: number;
  uHalfWidth: number;
  /** Centro y alto del rectángulo que envuelve todas las zonas. */
  vCenter: number;
  vHeightFrac: number;
  textPadFrac: number;
  /** Zonas grabables de arriba hacia abajo (una sola en casi todos los productos). */
  zones: FaceZone[];
}

export function faceConfigFor(product?: Pick<ProductDef, "frontFace">): FaceConfig {
  const { zones: raw, ...rest } = product?.frontFace ?? {};
  const base = { ...FRONT_FACE, ...rest };
  if (raw && raw.length > 0) {
    const zones = raw.map(([vMin, vMax]) => ({ vMin, vMax }));
    const top = zones[0].vMin, bottom = zones[zones.length - 1].vMax;
    return { ...base, vCenter: (top + bottom) / 2, vHeightFrac: bottom - top, zones };
  }
  return { ...base, zones: [{ vMin: base.vCenter - base.vHeightFrac / 2, vMax: base.vCenter + base.vHeightFrac / 2 }] };
}

/**
 * Zona donde va un elemento centrado en `v` con medio alto `halfV`: la más
 * cercana entre las que lo contienen entero; si no entra en ninguna, la más alta
 * (ahí queda centrado, como siempre). Sin `halfV`, solo la más cercana a `v`.
 */
export function pickZone(f: Pick<FaceConfig, "zones">, v: number, halfV = 0): number {
  let best = -1, bestDist = Infinity;
  f.zones.forEach((z, i) => {
    const lo = z.vMin + halfV, hi = z.vMax - halfV;
    if (lo > hi) return;
    const d = v < lo ? lo - v : v > hi ? v - hi : 0;
    if (d < bestDist) { bestDist = d; best = i; }
  });
  if (best >= 0) return best;
  let tallest = 0;
  f.zones.forEach((z, i) => { if (z.vMax - z.vMin > f.zones[tallest].vMax - f.zones[tallest].vMin) tallest = i; });
  return tallest;
}

/**
 * Ensanche horizontal para dibujar en una zona. La textura reparte la vuelta
 * según el radio máximo; en una parte más angosta del cuerpo (la de abajo del
 * vaso con pico) el mismo ancho de textura se ve más chico, así que se dibuja
 * más ancho para que el diseño conserve sus proporciones reales. Solo en
 * productos con varias zonas: los demás quedan exactamente como estaban.
 */
export function zoneWidthScale(product: Pick<ProductDef, "frontFace" | "profile" | "band"> | undefined, zone: number): number {
  const f = faceConfigFor(product);
  const z = f.zones[zone];
  if (!product || f.zones.length < 2 || !z) return 1;
  const pts = product.profile;
  const maxR = Math.max(...pts.map(p => p[0]));
  const [yBot, yTop] = product.band;
  const radiusAt = (y: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [r0, y0] = pts[i], [r1, y1] = pts[i + 1];
      if (y >= y0 && y <= y1) return y1 === y0 ? r0 : r0 + (r1 - r0) * (y - y0) / (y1 - y0);
    }
    return y < pts[0][1] ? pts[0][0] : pts[pts.length - 1][0];
  };
  const N = 12;
  let sum = 0;
  for (let i = 0; i <= N; i++) {
    const v = z.vMin + (z.vMax - z.vMin) * (i / N);
    sum += radiusAt(yTop - (yTop - yBot) * v);
  }
  const avg = sum / (N + 1);
  return avg > 0 ? maxR / avg : 1;
}

/** Centro de la cara para "centrar" y para los elementos nuevos: el de la zona principal (la de arriba). */
export function faceAreaCenter(product?: Pick<ProductDef, "frontFace">, face: FaceId = "front"): { u: number; v: number } {
  const z = faceConfigFor(product).zones[0];
  return { u: faceCenterU(product, face), v: (z.vMin + z.vMax) / 2 };
}

/**
 * Caras grabables alrededor del cuerpo. Todas usan el mismo rectángulo que la
 * frontal (ancho, alto y centro vertical), girado `offset` de vuelta en u.
 * Con el frente mirando a cámara, u crece hacia la izquierda de la pantalla:
 * u 0.75 se ve a la izquierda de la pantalla y u 0.25 a la derecha.
 */
export const FACES: Record<FaceId, { label: string; offset: number }> = {
  front: { label: "Frente",       offset: 0 },
  left:  { label: "Costado izq.", offset: 0.25 },
  back:  { label: "Dorso",        offset: 0.5 },
  right: { label: "Costado der.", offset: -0.25 },
};

const ALL_FACES: FaceId[] = ["front", "left", "back", "right"];

/** Nombre de la cara en pantalla: el dorso de un modelo con logo es "Lado del logo". */
export function faceLabel(product: Pick<ProductDef, "logoBack"> | undefined, face: FaceId): string {
  return face === "back" && product?.logoBack ? "Lado del logo" : FACES[face].label;
}

/** Caras que ofrece el producto (sin manija encima), en orden de la vuelta. */
export function engraveFacesFor(product?: Pick<ProductDef, "engraveFaces">): FaceId[] {
  return product?.engraveFaces ?? ALL_FACES;
}

/** u del centro de una cara. El dorso queda en 1.0 (no en 0) para no partir su área en la costura. */
export function faceCenterU(product?: Pick<ProductDef, "frontFace">, face: FaceId = "front"): number {
  return faceConfigFor(product).uCenter + FACES[face].offset;
}

/** El mismo punto de la vuelta (u ± vueltas enteras), llevado lo más cerca posible de `center`. */
export function nearU(u: number, center: number): number {
  return u - Math.round(u - center);
}

/** Rectangle bounds in placement space: u fraction of circumference, v fraction of the band. */
export interface FrontAreaBounds {
  uMin: number;
  uMax: number;
  /** v as a band fraction, 0 = band top, 1 = band bottom. */
  vMin: number;
  vMax: number;
}

export function frontAreaBounds(product?: Pick<ProductDef, "frontFace">, face: FaceId = "front"): FrontAreaBounds {
  const f = faceConfigFor(product);
  const c = faceCenterU(product, face);
  return {
    uMin: c - f.uHalfWidth,
    uMax: c + f.uHalfWidth,
    vMin: f.vCenter - f.vHeightFrac / 2,
    vMax: f.vCenter + f.vHeightFrac / 2,
  };
}

/**
 * Clamp `x` to [lo, hi]. When the usable span has collapsed (the mark is wider
 * than the area once its own half-extent is subtracted) we centre it instead,
 * so an oversized element sits dead-centre rather than snapping to an edge.
 */
export function collapseClamp(x: number, lo: number, hi: number): number {
  return lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, x));
}

/** Half-extent of a placed mark, expressed in placement space. */
export interface MarkHalfExtents {
  /** Half width as a fraction of the full circumference (matches Placement.u). */
  halfU: number;
  /** Half height as a fraction of the band (matches Placement.v). */
  halfV: number;
}

/**
 * Move a placement so its whole bounding box stays inside the front-face
 * rectangle. `half` is the mark's half-size in placement space, so a bigger
 * text/logo is pushed further from the borders — the box never crosses the
 * margin, not even partially. Used both for the drag pad (nearest valid point)
 * and when switching from "libre" into "una cara".
 */
export function clampPlacementToFrontArea(
  p: Placement,
  half: MarkHalfExtents,
  product?: Pick<ProductDef, "frontFace">,
): Placement {
  const face = p.face ?? "front";
  const b = frontAreaBounds(product, face);
  // Con varias zonas (cuerpo con escalón) el elemento entra entero en una sola.
  const f = faceConfigFor(product);
  const zi = pickZone(f, p.v, half.halfV);
  const z = f.zones[zi];
  const { zone: _prevZone, ...rest } = p;
  return {
    ...rest,
    u: collapseClamp(nearU(p.u, faceCenterU(product, face)), b.uMin + half.halfU, b.uMax - half.halfU),
    v: collapseClamp(p.v, z.vMin + half.halfV, z.vMax - half.halfV),
    ...(f.zones.length > 1 ? { zone: zi } : {}),
  };
}

/**
 * Lleva el elemento a la zona vecina (arriba `dir` = -1, abajo +1), pegado al
 * borde más cercano. Para las flechas de mover: el clamp solo nunca cruza el
 * hueco entre zonas. null si no hay zona en esa dirección.
 */
export function vInNextZone(product: Pick<ProductDef, "frontFace"> | undefined, v: number, halfV: number, dir: 1 | -1): number | null {
  const f = faceConfigFor(product);
  const next = f.zones[pickZone(f, v, halfV) + dir];
  if (!next) return null;
  return dir > 0 ? next.vMin + halfV : next.vMax - halfV;
}

/** Pad coordinates (0..1 within the rectangle) → placement u/v. */
export function padToPlacement(
  padX: number,
  padY: number,
  product?: Pick<ProductDef, "frontFace">,
  face: FaceId = "front",
): { u: number; v: number } {
  const b = frontAreaBounds(product, face);
  return {
    u: b.uMin + padX * (b.uMax - b.uMin),
    v: b.vMin + padY * (b.vMax - b.vMin),
  };
}

/** Placement u/v → pad coordinates (0..1 within the rectangle). */
export function placementToPad(
  u: number,
  v: number,
  product?: Pick<ProductDef, "frontFace">,
  face: FaceId = "front",
): { padX: number; padY: number } {
  const b = frontAreaBounds(product, face);
  return {
    padX: (nearU(u, faceCenterU(product, face)) - b.uMin) / (b.uMax - b.uMin),
    padY: (v - b.vMin) / (b.vMax - b.vMin),
  };
}
