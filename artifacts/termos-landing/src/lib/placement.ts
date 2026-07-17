import { resampledProfile, type ProductDef } from "./products";

export type Orientation = "horizontal" | "vertical";

/** How multi-line text distributes its rows within the text block. */
export type TextAlign = "left" | "center" | "right" | "justify";

/**
 * How the engraving text is split into lines:
 *  - "auto"   — flow the text and wrap only when a row no longer fits the area.
 *  - "stack"  — one word per line, always, regardless of whether they'd fit
 *               together (e.g. "MATEO MEDINA" → "MATEO" / "MEDINA").
 *  - "manual" — respect exactly the line breaks the user typed (Enter), no
 *               automatic wrapping.
 */
export type TextLayout = "auto" | "stack" | "manual";

/** Line-spacing presets (multiple of the font size), for the interlineado control. */
export const LINE_HEIGHT_PRESETS = { compacto: 0.92, normal: 1.12, amplio: 1.5 } as const;
export type LineHeightPreset = keyof typeof LINE_HEIGHT_PRESETS;
/** Default row spacing — matches engraving-text's LINE_HEIGHT for continuity. */
export const DEFAULT_LINE_HEIGHT = LINE_HEIGHT_PRESETS.normal;

/** Where a piece of art or text sits on the engravable band of a product. */
export interface Placement {
  /** 0–1 around the body. 0.5 is the front face. */
  u: number;
  /** 0–1 down the engravable band. 0 = top of the band, 1 = bottom. */
  v: number;
  orientation: Orientation;
  /**
   * Relative size multiplier. Applies to text and to art (icons): the size
   * slider scales the rendered mark. For uploaded images the base size is set by
   * the plan (small/dibujo vs large/logo) and scale stays at its default 1.
   */
  scale: number;
  /** Multi-line text alignment. Ignored for art. Defaults to centre. */
  align?: TextAlign;
  /** How the text splits into lines. Ignored for art. Defaults to "auto". */
  layout?: TextLayout;
  /** Row spacing as a multiple of the font size. Ignored for art. Defaults to DEFAULT_LINE_HEIGHT. */
  lineHeight?: number;
}

// Text starts small (~45%): a full-size name overflows the little mobile preview,
// and it's easier to scale up from here than to hunt the slider down.
export const DEFAULT_TEXT_PLACEMENT: Placement = { u: 0.5, v: 0.5, orientation: "horizontal", scale: 0.45, align: "center", layout: "auto", lineHeight: DEFAULT_LINE_HEIGHT };
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
