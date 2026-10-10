export type ProductId = "vaso" | "termo" | "hoppie" | "jug" | "guampa" | "copa" | "botella" | "chopera" | "vaso-manija" | "botella-ancha" | "vaso-hydrate" | "vaso-sunbeam";

export type CapStyle = "screw" | "lid" | "flip" | "none";
export type HandleStyle = "cap-d" | "cap-arch" | "body" | "body-d" | "body-square" | "none";

export interface ProductSize {
  id: string;
  /** Short label shown on the size button, e.g. "20oz". */
  name: string;
  /** Secondary line, e.g. "Estándar". */
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
  /**
   * Per-product override of the single-face editable area (defaults live in
   * face-area.ts FRONT_FACE). Use it when the body is far from cylindrical and
   * the default rectangle would wedge its margins into a narrowing part of the
   * silhouette (e.g. the copa's bowl curving down into the stem).
   */
  frontFace?: { uHalfWidth?: number; vCenter?: number; vHeightFrac?: number };
  sizes: ProductSize[];
  /**
   * Modelo 3D real (.glb, ver GUIA-MODELOS-3D.md) en lugar del lathe generado.
   * El `profile` describe solo el cuerpo pintable, medido sobre el propio .glb:
   * así el grabado, las guías y el fallback 2D siguen usando el mismo sistema.
   */
  model?: ProductModel;
}

export interface ProductModel {
  url: string;
  /** Unidades de perfil por metro del .glb (el .glb viene en metros). */
  unitsPerMeter: number;
  /** Altura (m, en el .glb) que queda en y = 0 del perfil. */
  centerYm: number;
  /** Alto total del .glb con tapa (m). */
  heightM: number;
  /** Distancia máxima al eje, manija incluida (m): encuadre por ancho. */
  reachM: number;
  /**
   * Productos de la tienda que ESTE modelo representa tal cual (por nombre). Los
   * demás que usan la misma forma la ven como aproximación (y se avisa).
   */
  exactFor?: string[];
  /**
   * Giro extra (grados, eje Y) para que el FRENTE del personalizador (donde se
   * graba) no caiga sobre el logo que el modelo trae en su +Z: con 180 el logo
   * queda atrás y la cara libre adelante.
   */
  yawDeg?: number;
  /** Piezas del .glb que se pintan con el color elegido (funda, boquilla…). */
  paint?: string[];
  /** Piezas pintadas con el color elegido, un poco más claro (texto en relieve). */
  paintLight?: string[];
}

export const PRODUCTS: ProductDef[] = [
  {
    id: "vaso",
    name: "Vasos",
    singular: "Vaso",
    // Vaso GENÉRICO (artifacts/3D/forma-vaso.glb): vaso térmico cónico tipo
    // pinta, sin tapa, con aros de acero arriba y abajo. Perfil = radio del
    // cuerpo medido sobre el .glb (m × 14, centrado en 0,0775 m).
    desc: "Vaso térmico cónico, más ancho arriba.",
    cap: "none",
    handle: "none",
    profile: [
      [0.456, -0.822], [0.508, -0.175], [0.595, 0.904],
    ],
    band: [-0.70, 0.80],
    model: {
      url: "/models/forma-vaso.glb?v=1",
      unitsPerMeter: 14,
      centerYm: 0.0775,
      heightM: 0.155,
      reachM: 0.0435,
    },
    sizes: [
      { id: "vaso-12", name: "12oz", label: "Chico",   scale: 0.84 },
      { id: "vaso-20", name: "20oz", label: "Clásico", scale: 1.00 },
      { id: "vaso-30", name: "30oz", label: "Grande",  scale: 1.16 },
    ],
  },
  {
    id: "termo",
    name: "Termos",
    singular: "Termo",
    // Stanley Mate System 1.2 L — tall slim vacuum bottle for mate: ~10.2 cm
    // diameter × 30 cm tall (height:diameter ≈ 2.9:1), long straight body, screw
    // cap and a rigid side D-handle proportioned to the slim body.
    desc: "Termo alto y esbelto, con cuello, tapa a rosca y mango lateral.",
    cap: "screw",
    handle: "body-d",
    profile: [
      [0.00, -1.45], [0.11, -1.45],
      [0.43, -1.41], [0.51, -1.31],
      [0.51, -1.15], [0.51,  0.80],
      [0.50,  0.95], [0.45,  1.05],
      [0.38,  1.12], [0.35,  1.15],
    ],
    band: [-1.10, 0.72],
    sizes: [
      { id: "termo-20", name: "20oz", label: "Estándar", scale: 0.88 },
      { id: "termo-32", name: "32oz", label: "Grande",   scale: 1.00 },
      { id: "termo-40", name: "40oz", label: "XL",       scale: 1.14 },
    ],
  },
  {
    id: "hoppie",
    name: "Hoppies V2 Pro",
    singular: "Hoppie V2 Pro",
    // Hydrate Hoppie V2 Pro Series con tapa de asa (artifacts/3D/forma-botella.glb).
    // El Hoppie común tiene otra tapa: usa la botella de boca ancha genérica.
    // Perfil = radio del cuerpo medido sobre el .glb (m × 10, centrado en
    // 0,13 m): cilindro recto con hombro corto bajo el aro de acero.
    desc: "Botella térmica de boca ancha con tapa con asa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.423, -1.163], [0.425, -1.050], [0.425, 0.384],
      [0.423, 0.494], [0.400, 0.550], [0.375, 0.605],
    ],
    band: [-1.0, 0.40],
    frontFace: { uHalfWidth: 0.15 },
    model: {
      url: "/models/forma-botella.glb?v=1",
      exactFor: ["Hoppie V2 Pro Series"],
      unitsPerMeter: 10,
      centerYm: 0.13,
      heightM: 0.26,
      reachM: 0.047,
    },
    sizes: [
      { id: "hoppie-770",  name: "770ml", label: "Clásico", scale: 1.00 },
      { id: "hoppie-1000", name: "1L",    label: "Grande",  scale: 1.09 },
    ],
  },
  {
    id: "botella-ancha",
    name: "Botellas",
    singular: "Botella",
    // Botella de boca ancha GENÉRICA (lathe): Hoppie, Termo, Hoppie Kids y
    // Termo Kids de Odoo, sin modelo 3D propio (el .glb es del Hoppie V2 Pro).
    // Botella de boca ancha (h:d ≈ 2.6:1): fondo plano con fillet suave, cuerpo
    // cilíndrico perfecto con una junta horizontal muy sutil a ~12% de la altura
    // (unión del fondo aislante), hombro convexo tipo domo y cuello ANCHO
    // (~63% del diámetro del cuerpo). La pintura termina donde arranca el
    // cuello roscado de acero pulido, que se modela aparte (HoppieNeck).
    desc: "Botella de boca ancha: cuerpo cilíndrico recto, hombro tipo domo y cuello roscado de acero, sin tapa.",
    cap: "screw",
    handle: "none",
    profile: [
      [0.00, -1.35], [0.46, -1.35],
      [0.52, -1.29],
      [0.52, -1.08], [0.513, -1.03], [0.52, -0.98],
      [0.52,  0.59],
      [0.518,  0.66], [0.510,  0.72], [0.495,  0.78],
      [0.470,  0.83], [0.435,  0.875], [0.390,  0.915],
      [0.350,  0.940], [0.330,  0.950],
    ],
    band: [-0.94, 0.40],
    // El área editable queda solo en la zona cilíndrica (15–65% de la altura) y
    // abarca ~55% del arco visible, así el decal nunca se distorsiona en el domo.
    frontFace: { uHalfWidth: 0.14 },
    sizes: [
      { id: "botella-ancha-20", name: "20oz", label: "Chico",   scale: 0.86 },
      { id: "botella-ancha-30", name: "30oz", label: "Clásico", scale: 1.00 },
      { id: "botella-ancha-40", name: "40oz", label: "Grande",  scale: 1.14 },
    ],
  },
  {
    id: "jug",
    name: "Jugs",
    singular: "Jug",
    // Stanley IceMonster / Adventure — wide squat water jug, carabiner handle on cap
    desc: "Bidón térmico ancho de gran capacidad con asa.",
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
    desc: "Guampa térmica ancha con cintura cóncava y borde levemente acampanado.",
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
    // El bombé no es cilíndrico: el radio pasa de 0.28 (abajo, camino al tallo)
    // a 0.48 (panza) y 0.41 (borde). Con el área default, el margen inferior
    // caía en la zona cónica que se estrecha → esquinas "pellizcadas". Se centra
    // el área en la parte alta del bombé (radio casi constante 0.43-0.48) y se
    // acorta el arco horizontal para que los bordes laterales se vean rectos
    // de frente en la superficie curva.
    frontFace: { uHalfWidth: 0.18, vCenter: 0.43, vHeightFrac: 0.72 },
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
    // Botella de vidrio tipo decanter (aprox. redonda del Johnnie Walker Swing, ref. botella.jpeg)
    desc: "Botella de vidrio, cuerpo bombé con cuello corto y tapa.",
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
  {
    id: "chopera",
    name: "Choperas",
    singular: "Chopera",
    // Chopera térmica 710 ml (h:d ≈ 1.75:1): vaso cilíndrico PERFECTAMENTE
    // recto, bajo y ancho tipo jarro cervecero. El lathe cubre solo la zona
    // pintada (0–86% de la altura); la banda de acero cepillado (86–96%), la
    // tapa transparente y la manija cuadrada se modelan aparte (ChoperaTop y
    // el handle "body-square" en thermos-3d).
    desc: "Chopera térmica de 710 ml: cilindro recto con banda de acero, tapa transparente y manija angular.",
    cap: "flip",
    handle: "body-square",
    profile: [
      [0.00, -1.05], [0.54, -1.05],
      [0.60, -0.99],
      [0.60,  0.756],
    ],
    band: [-0.80, 0.52],
    // Cara frontal a 90° de la manija; ~55% del arco visible (12–75% de altura).
    frontFace: { uHalfWidth: 0.14 },
    sizes: [
      { id: "chopera-710", name: "710ml", label: "Clásica", scale: 1.00 },
    ],
  },
  {
    id: "vaso-manija",
    name: "Vasos con manija",
    singular: "Vaso con manija",
    // Hydrate "Vaso con Pico y Agarre" 887 ml — primera forma con modelo real
    // (artifacts/3D/forma-vaso-manijaV4.glb). Perfil = radio del cuerpo medido
    // sobre el .glb (m × 12, centrado en 0,1015 m). Cuerpo cónico abajo, escalón
    // a ~45% de la altura y parte superior casi recta, donde va la manija. La V4
    // suma el logo Hydrate, que en el .glb ya está atrás (−Z): sin giro extra.
    desc: "Vaso térmico de 887 ml con manija lateral y tapa transparente.",
    cap: "none",
    handle: "none",
    profile: [
      [0.438, -0.994], [0.446, -0.871], [0.452, -0.748], [0.458, -0.625],
      [0.466, -0.502], [0.473, -0.379], [0.481, -0.256], [0.532, -0.133],
      [0.572, -0.010], [0.576,  0.113], [0.578,  0.236], [0.582,  0.359],
      [0.586,  0.482], [0.588,  0.605], [0.590,  0.727], [0.594,  0.850],
      [0.596,  0.973],
    ],
    band: [-0.92, 0.90],
    // Cara frontal a 90° de la manija (u 0.75), en la parte superior recta:
    // el área no baja al escalón del cuerpo ni toca la manija.
    frontFace: { uHalfWidth: 0.16, vCenter: 0.27, vHeightFrac: 0.46 },
    model: {
      url: "/models/forma-vaso-manija.glb?v=4",
      exactFor: ["Vaso con Pico y Agarre"],
      unitsPerMeter: 12,
      centerYm: 0.1015,
      heightM: 0.203,
      reachM: 0.0842,
    },
    sizes: [
      { id: "vaso-manija-887",  name: "887ml",  label: "Clásico", scale: 1.00 },
      { id: "vaso-manija-1183", name: "1183ml", label: "Grande",  scale: 1.10 },
    ],
  },
  {
    id: "vaso-hydrate",
    name: "Vasos Hydrate",
    singular: "Vaso",
    // Hydrate "Vaso" con tapa transparente deslizable (artifacts/3D/
    // vaso-hydrate-verde-landing.glb). Mismo cuerpo que el vaso con manija,
    // sin manija. El logo del modelo queda atrás (yawDeg 180): adelante, la cara libre.
    desc: "Vaso térmico con tapa transparente deslizable.",
    cap: "none",
    handle: "none",
    profile: [
      [0.438, -0.994], [0.446, -0.871], [0.452, -0.748], [0.458, -0.625],
      [0.466, -0.502], [0.473, -0.379], [0.481, -0.256], [0.532, -0.133],
      [0.572, -0.010], [0.576,  0.113], [0.578,  0.236], [0.582,  0.359],
      [0.586,  0.482], [0.588,  0.605], [0.590,  0.727], [0.594,  0.850],
      [0.596,  0.973],
    ],
    band: [-0.92, 0.90],
    frontFace: { uHalfWidth: 0.2, vCenter: 0.27, vHeightFrac: 0.46 },
    model: {
      url: "/models/vaso-hydrate.glb?v=1",
      unitsPerMeter: 12,
      centerYm: 0.1015,
      heightM: 0.203,
      reachM: 0.0582,
      exactFor: ["Vaso"],
      yawDeg: 180,
    },
    sizes: [
      { id: "vaso-hydrate-470", name: "470ml", label: "Chico",   scale: 0.84 },
      { id: "vaso-hydrate-600", name: "600ml", label: "Mediano", scale: 0.91 },
      { id: "vaso-hydrate-900", name: "900ml", label: "Grande",  scale: 1.00 },
    ],
  },
  {
    id: "vaso-sunbeam",
    name: "Vasos Sunbeam",
    singular: "Vaso Sunbeam",
    // Hydrate Sunbeam con funda de silicona, tapa gris, pajita y manija
    // (artifacts/3D/vaso-hydrate-petroleo-manija.glb). Funda, boquilla y manija
    // van del color elegido. Logo atrás (yawDeg 180); con ese giro la manija
    // (−X en el .glb) queda en u 0.75, como la del vaso con pico.
    desc: "Vaso térmico con funda de silicona, tapa y pajita.",
    cap: "none",
    handle: "none",
    profile: [
      [0.444, -1.258], [0.455, -1.020], [0.468, -0.781], [0.474, -0.661],
      [0.493, -0.542], [0.550, -0.424], [0.574, -0.304], [0.580, -0.066],
      [0.586, 0.173], [0.592, 0.412], [0.596, 0.650],
    ],
    band: [-1.10, 0.55],
    // Cara frontal a 90° de la manija: mismo ancho que el vaso con pico, para
    // que el diseño no llegue hasta la manija.
    frontFace: { uHalfWidth: 0.16, vCenter: 0.26, vHeightFrac: 0.48 },
    model: {
      url: "/models/vaso-sunbeam.glb?v=2",
      unitsPerMeter: 12,
      centerYm: 0.13,
      heightM: 0.2605,
      reachM: 0.0842,
      exactFor: ["Vaso Sunbeam"],
      yawDeg: 180,
      paint: ["boot", "straw_tip"],
      paintLight: ["logo_funda"],
    },
    sizes: [
      { id: "vaso-sunbeam-887",  name: "887ml",  label: "Clásico", scale: 1.00 },
      { id: "vaso-sunbeam-1183", name: "1183ml", label: "Grande",  scale: 1.10 },
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
