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
export interface FaceConfig {
  uCenter: number;
  uHalfWidth: number;
  vCenter: number;
  vHeightFrac: number;
  textPadFrac: number;
}

export function faceConfigFor(product?: Pick<ProductDef, "frontFace">): FaceConfig {
  return { ...FRONT_FACE, ...product?.frontFace };
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
  return {
    ...p,
    u: collapseClamp(nearU(p.u, faceCenterU(product, face)), b.uMin + half.halfU, b.uMax - half.halfU),
    v: collapseClamp(p.v, b.vMin + half.halfV, b.vMax - half.halfV),
  };
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
