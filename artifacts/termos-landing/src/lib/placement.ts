import { resampledProfile, type ProductDef } from "./products";

export type Orientation = "horizontal" | "vertical";

/** Where a piece of art or text sits on the engravable band of a product. */
export interface Placement {
  /** 0–1 around the body. 0.5 is the front face. */
  u: number;
  /** 0–1 down the engravable band. 0 = top of the band, 1 = bottom. */
  v: number;
  orientation: Orientation;
  /** Relative size multiplier. Only text is resizable; art size is fixed by the plan. */
  scale: number;
}

export const DEFAULT_TEXT_PLACEMENT: Placement = { u: 0.5, v: 0.5, orientation: "horizontal", scale: 1 };
export const DEFAULT_ART_PLACEMENT: Placement = { u: 0.5, v: 0.28, orientation: "horizontal", scale: 1 };

/**
 * Texture-space `v` of a profile height. LatheGeometry assigns `v` by point
 * index, not by arc length, so we interpolate on the same index axis.
 */
export function vForY(product: ProductDef, y: number): number {
  const pts = resampledProfile(product);
  const n = pts.length - 1;
  if (y <= pts[0][1]) return 0;
  if (y >= pts[n][1]) return 1;
  for (let i = 0; i < n; i++) {
    const [, y0] = pts[i];
    const [, y1] = pts[i + 1];
    if (y >= y0 && y <= y1) {
      const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
      return (i + t) / n;
    }
  }
  return 1;
}

/** Texture-space v range of the engravable band: [vBottom, vTop], vBottom < vTop. */
export function bandRange(product: ProductDef): [number, number] {
  return [vForY(product, product.band[0]), vForY(product, product.band[1])];
}
