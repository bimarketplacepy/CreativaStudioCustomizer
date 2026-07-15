export type ProductId = "vaso" | "termo" | "hoppie" | "jug" | "guampa" | "copa" | "botella";

export type CapStyle = "screw" | "lid" | "flip" | "none";
export type HandleStyle = "cap-d" | "cap-arch" | "body" | "none";

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
    // Stanley Classic Pint Tumbler — short conical tumbler, wider at top, sliding lid
    desc: "Vaso termico conico con tapa deslizable.",
    cap: "lid",
    handle: "none",
    profile: [
      [0.00, -1.10], [0.08, -1.10],
      [0.34, -1.07], [0.46, -0.96],
      [0.52, -0.80], [0.56, -0.45],
      [0.62,  0.15], [0.68,  0.72],
      [0.72,  1.05], [0.72,  1.12],
    ],
    band: [-0.90, 0.92],
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
    // Stanley Classic Vacuum Bottle — tall cylinder, pronounced neck, large fold handle
    desc: "Termo clasico de vacio con cuello y asa plegable lateral.",
    cap: "screw",
    handle: "cap-d",
    profile: [
      [0.00, -1.92], [0.08, -1.92],
      [0.48, -1.88], [0.64, -1.76],
      [0.68, -1.58], [0.68,  0.82],
      [0.66,  1.00], [0.58,  1.20],
      [0.44,  1.38], [0.38,  1.52],
      [0.36,  1.62], [0.34,  1.70],
    ],
    band: [-1.40, 0.78],
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
    // Stanley IceFlow Flip Straw — straight cylindrical body, subtle lower waist, chrome band, carry handle on lid
    desc: "Hoppie IceFlow con cuerpo cilindrico, cintura suave en la base y asa en la tapa.",
    cap: "flip",
    handle: "cap-arch",
    profile: [
      [0.00, -1.35], [0.08, -1.35],
      [0.30, -1.28], [0.46, -1.14],
      [0.50, -0.90], [0.48, -0.50],
      [0.50, -0.10], [0.54,  0.30],
      [0.54,  0.80], [0.54,  1.10],
      [0.54,  1.25],
    ],
    band: [-0.54, 1.08],
    sizes: [
      { id: "hoppie-20", name: "20oz", label: "Chico",   scale: 0.86 },
      { id: "hoppie-30", name: "30oz", label: "Clasico", scale: 1.00 },
      { id: "hoppie-40", name: "40oz", label: "Grande",  scale: 1.14 },
    ],
  },
  {
    id: "jug",
    name: "Jugs",
    singular: "Jug",
    // Stanley IceMonster / Adventure — wide squat water jug, carabiner handle on cap
    desc: "Bidon termico ancho de gran capacidad con asa.",
    cap: "screw",
    handle: "cap-d",
    profile: [
      [0.00, -1.50], [0.10, -1.50],
      [0.54, -1.46], [0.72, -1.34],
      [0.80, -1.16], [0.82,  0.72],
      [0.80,  0.94], [0.72,  1.16],
      [0.58,  1.34], [0.48,  1.46],
      [0.44,  1.54], [0.42,  1.60],
    ],
    band: [-1.06, 0.68],
    sizes: [
      { id: "jug-48",  name: "48oz",  label: "Medio",   scale: 0.88 },
      { id: "jug-64",  name: "64oz",  label: "Grande",  scale: 1.00 },
      { id: "jug-96",  name: "96oz",  label: "XL",      scale: 1.14 },
    ],
  },
  {
    id: "guampa",
    name: "Guampas",
    singular: "Guampa",
    // Stanley Mate Cup — short wide barrel, concave waist mid-body, slight rim flare, stepped lid
    desc: "Guampa termica ancha con cintura cóncava y borde levemente acampanado.",
    cap: "lid",
    handle: "none",
    profile: [
      [0.00, -0.85], [0.08, -0.85],
      [0.32, -0.78], [0.46, -0.60],
      [0.54, -0.30], [0.52,  0.00],
      [0.54,  0.30], [0.58,  0.58],
      [0.62,  0.75], [0.64,  0.85],
    ],
    band: [-0.58, 0.62],
    sizes: [
      { id: "guampa-sm", name: "Chica",   label: "300ml", scale: 0.84 },
      { id: "guampa-md", name: "Mediana", label: "500ml", scale: 1.00 },
      { id: "guampa-lg", name: "Grande",  label: "750ml", scale: 1.16 },
    ],
  },
  {
    id: "copa",
    name: "Copas",
    singular: "Copa",
    // Copa de cristal tipo pilsner — pie ancho, tallo fino y bombé acampanado (ref. copas.jpeg)
    desc: "Copa de cristal con pie, tallo fino y bombé acampanado.",
    cap: "none",
    handle: "none",
    profile: [
      [0.00, -1.30], [0.52, -1.30],
      [0.52, -1.26], [0.30, -1.22],
      [0.09, -1.14], [0.07, -0.95],
      [0.07, -0.66], [0.14, -0.55],
      [0.28, -0.34], [0.40, -0.06],
      [0.47,  0.24], [0.48,  0.50],
      [0.46,  0.80], [0.43,  1.05],
      [0.41,  1.20],
    ],
    band: [-0.20, 1.02],
    sizes: [
      { id: "copa-sm", name: "Chica",   label: "300ml", scale: 0.88 },
      { id: "copa-md", name: "Mediana", label: "450ml", scale: 1.00 },
      { id: "copa-lg", name: "Grande",  label: "600ml", scale: 1.12 },
    ],
  },
  {
    id: "botella",
    name: "Botellas",
    singular: "Botella",
    // Botella de whisky tipo decanter (aprox. redonda del Johnnie Walker Swing, ref. botella.jpeg)
    desc: "Botella de whisky de cristal, cuerpo bombé con cuello corto y tapa.",
    cap: "screw",
    handle: "none",
    profile: [
      [0.00, -1.25], [0.34, -1.23],
      [0.56, -1.10], [0.66, -0.84],
      [0.68, -0.52], [0.66, -0.22],
      [0.58,  0.06], [0.45,  0.30],
      [0.30,  0.48], [0.19,  0.60],
      [0.16,  0.82], [0.18,  0.90],
    ],
    band: [-0.80, 0.16],
    sizes: [
      { id: "botella-sm", name: "Chica",   label: "500ml", scale: 0.90 },
      { id: "botella-md", name: "Clásica", label: "750ml", scale: 1.00 },
      { id: "botella-lg", name: "Grande",  label: "1L",    scale: 1.12 },
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
