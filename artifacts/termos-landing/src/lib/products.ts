export type ProductId = "vaso" | "termo" | "hoppie" | "jug" | "guampa";

export type CapStyle = "screw" | "lid" | "none";
export type HandleStyle = "cap-d" | "body" | "none";

export interface ProductSize {
  id: string;
  /** Short label shown on the size button, e.g. "20oz". */
  name: string;
  /** Secondary line, e.g. "Estandar". */
  label: string;
  /** Uniform scale applied to the product profile. */
  scale: number;
}

export interface ProductDef {
  id: ProductId;
  /** Plural name used for the product tab, e.g. "Termos". */
  name: string;
  singular: string;
  desc: string;
  cap: CapStyle;
  handle: HandleStyle;
  /** Silhouette as [radius, y] pairs, bottom → top, at scale 1. */
  profile: [number, number][];
  /**
   * Engravable band as [bottomY, topY] at scale 1 — the outer faces only.
   * Excludes the cap/lid and the rounded base, which we never engrave.
   */
  band: [number, number];
  sizes: ProductSize[];
}

export const PRODUCTS: ProductDef[] = [
  {
    id: "vaso",
    name: "Vasos",
    singular: "Vaso",
    desc: "Tumbler conico con tapa deslizable.",
    cap: "lid",
    handle: "none",
    profile: [
      [0.00, -1.30], [0.10, -1.30], [0.30, -1.28], [0.42, -1.22],
      [0.46, -1.12], [0.48, -0.90], [0.52,  0.00], [0.58,  0.90],
      [0.62,  1.28], [0.62,  1.36],
    ],
    band: [-1.05, 1.15],
    sizes: [
      { id: "vaso-12", name: "12oz", label: "Chico",   scale: 0.84 },
      { id: "vaso-20", name: "20oz", label: "Clasico", scale: 1.00 },
      { id: "vaso-30", name: "30oz", label: "Grande",  scale: 1.16 },
    ],
  },
  {
    id: "termo",
    name: "Termos",
    singular: "Termo",
    desc: "Botella termica de boca ancha con tapa a rosca.",
    cap: "screw",
    handle: "cap-d",
    profile: [
      [0.00, -1.90], [0.08, -1.89], [0.22, -1.86], [0.42, -1.78],
      [0.58, -1.62], [0.64, -1.40], [0.64,  0.75], [0.63,  0.95],
      [0.60,  1.12], [0.54,  1.32], [0.48,  1.50], [0.47,  1.60],
      [0.46,  1.70], [0.44,  1.78],
    ],
    band: [-1.35, 1.05],
    sizes: [
      { id: "termo-20", name: "20oz", label: "Estandar", scale: 0.88 },
      { id: "termo-32", name: "32oz", label: "Grande",   scale: 1.00 },
      { id: "termo-40", name: "40oz", label: "XL",       scale: 1.14 },
    ],
  },
  {
    id: "hoppie",
    name: "Hoppies",
    singular: "Hoppie",
    desc: "Jarro termico de boca ancha con asa lateral.",
    cap: "lid",
    handle: "body",
    profile: [
      [0.00, -1.05], [0.12, -1.05], [0.34, -1.02], [0.48, -0.94],
      [0.54, -0.82], [0.56, -0.60], [0.60,  0.20], [0.64,  0.95],
      [0.66,  1.12], [0.66,  1.20],
    ],
    band: [-0.72, 1.02],
    sizes: [
      { id: "hoppie-12", name: "12oz", label: "Cafe",    scale: 0.86 },
      { id: "hoppie-16", name: "16oz", label: "Clasico", scale: 1.00 },
      { id: "hoppie-20", name: "20oz", label: "Grande",  scale: 1.14 },
    ],
  },
  {
    id: "jug",
    name: "Jugs",
    singular: "Jug",
    desc: "Bidon termico de gran capacidad con manija.",
    cap: "screw",
    handle: "cap-d",
    profile: [
      [0.00, -2.10], [0.12, -2.09], [0.34, -2.05], [0.60, -1.95],
      [0.78, -1.78], [0.84, -1.55], [0.84,  1.05], [0.82,  1.32],
      [0.74,  1.58], [0.62,  1.78], [0.52,  1.92], [0.50,  2.00],
    ],
    band: [-1.50, 0.95],
    sizes: [
      { id: "jug-64",  name: "64oz",  label: "Medio galon", scale: 0.90 },
      { id: "jug-96",  name: "96oz",  label: "Grande",      scale: 1.00 },
      { id: "jug-128", name: "1 gal", label: "Galon",       scale: 1.12 },
    ],
  },
  {
    id: "guampa",
    name: "Guampas",
    singular: "Guampa",
    desc: "Guampa conica para terere, sin tapa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.00, -1.20], [0.16, -1.20], [0.26, -1.15], [0.30, -1.05],
      [0.26, -0.95], [0.30, -0.70], [0.40,  0.00], [0.52,  0.90],
      [0.58,  1.25], [0.58,  1.32],
    ],
    band: [-0.60, 1.15],
    sizes: [
      { id: "guampa-sm", name: "Chica",   label: "300ml", scale: 0.84 },
      { id: "guampa-md", name: "Mediana", label: "500ml", scale: 1.00 },
      { id: "guampa-lg", name: "Grande",  label: "750ml", scale: 1.16 },
    ],
  },
];

export const DEFAULT_PRODUCT_ID: ProductId = "termo";

export function getProduct(id: string): ProductDef {
  return PRODUCTS.find(p => p.id === id) ?? PRODUCTS[1];
}

export function getSize(product: ProductDef, sizeId: string): ProductSize {
  return product.sizes.find(s => s.id === sizeId) ?? product.sizes[1] ?? product.sizes[0];
}

const RESAMPLE_POINTS = 64;
const resampleCache = new Map<ProductId, [number, number][]>();

/**
 * The same silhouette, resampled at even arc-length steps.
 *
 * LatheGeometry parametrises `v` by point index, so a profile whose long
 * straight body spans only two points squeezes most of the surface into a
 * sliver of the texture. Even spacing keeps the engraved area sharp and its
 * proportions close to the real product.
 */
export function resampledProfile(product: ProductDef): [number, number][] {
  const cached = resampleCache.get(product.id);
  if (cached) return cached;

  const pts = product.profile;
  const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = seg[seg.length - 1];

  const out: [number, number][] = [];
  let i = 0;
  for (let k = 0; k < RESAMPLE_POINTS; k++) {
    const d = (k / (RESAMPLE_POINTS - 1)) * total;
    while (i < pts.length - 2 && seg[i + 1] < d) i++;
    const span = seg[i + 1] - seg[i];
    const t = span === 0 ? 0 : (d - seg[i]) / span;
    out.push([
      pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
      pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
    ]);
  }

  resampleCache.set(product.id, out);
  return out;
}
