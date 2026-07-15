/**
 * Non-drinkware "blanks": flat and box-shaped products ready for laser
 * engraving. Unlike the lathe drinkware in `products.ts`, these are not
 * rotationally symmetric — each is modelled from box/cylinder primitives and
 * engraved on a single flat face. See `object-3d.tsx` for the geometry and
 * `engraving-face.ts` for how a mark is burned onto the face.
 */

export type ObjectId =
  | "conservadora"
  | "billetera"
  | "tabla"
  | "cajita"
  | "acrilico"
  | "boligrafo"
  | "abridor";

/**
 * How the laser reads on each material. Coated steel drinkware reveals bright
 * bare steel; these blanks instead darken (wood/leather/plastic burn), frost
 * (acrylic) or anneal dark (bare steel opener).
 */
export type EngraveStyle = "steel" | "wood" | "leather" | "acrylic" | "plastic";

export interface ObjectFace {
  /** Which face carries the engraving: front (+Z) or top (+Y). */
  normal: "z" | "y";
  /** Engravable rectangle in world units [width, height]. */
  w: number;
  h: number;
  /** World-space centre of that rectangle. */
  center: [number, number, number];
}

export interface ObjectDef {
  id: ObjectId;
  singular: string;
  desc: string;
  /** Half-extents [x, y, z] of the main body, in world units. */
  size: [number, number, number];
  /** Albedo of the blank surface. */
  baseColor: string;
  /** Secondary colour: lid, edge, clip, stand — depends on the shape. */
  accentColor: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  engrave: EngraveStyle;
  face: ObjectFace;
  /** Resting tilt (radians around X) so a top-engraved face reads to camera. */
  restPitch: number;
  /** Fraction of the default framing distance — >1 pulls the camera back. */
  fit?: number;
  /**
   * Whether the customer can recolour the blank. Bare steel (opener) and
   * natural wood keep their fixed material colour; everything else is tintable.
   */
  colorable?: boolean;
}

export const OBJECTS: Record<ObjectId, ObjectDef> = {
  // Rotomolded cooler, YETI-style: wide tan box, black arch handle + latches.
  conservadora: {
    id: "conservadora",
    singular: "Conservadora",
    desc: "Conservadora de plástico rotomoldeado, lista para grabado láser en el frente.",
    size: [1.18, 0.82, 0.74],
    baseColor: "#c3a878",
    accentColor: "#20232a",
    roughness: 0.5,
    metalness: 0.0,
    clearcoat: 0.35,
    engrave: "plastic",
    face: { normal: "z", w: 1.7, h: 0.78, center: [0, -0.14, 0.741] },
    restPitch: 0.12,
    fit: 1.12,
    colorable: true,
  },

  // Bellroy-style slim card wallet: landscape, caramel leather, spine fold on left, open card pocket on right.
  billetera: {
    id: "billetera",
    singular: "Billetera",
    desc: "Billetera slim de cuero caramelo, grabada a láser en la tapa frontal.",
    size: [0.96, 0.66, 0.08],
    baseColor: "#b06030",
    accentColor: "#7c3e18",
    roughness: 0.80,
    metalness: 0.0,
    clearcoat: 0.10,
    engrave: "leather",
    face: { normal: "z", w: 1.60, h: 1.06, center: [0, 0, 0.081] },
    restPitch: 0.04,
    fit: 1.0,
    colorable: true,
  },

  // Wide, flat bamboo cutting board with an inset border groove on the top face.
  tabla: {
    id: "tabla",
    singular: "Tabla",
    desc: "Tabla de cortar de bambú claro, plana y ancha, grabada en la cara superior.",
    size: [1.5, 0.14, 0.8],
    baseColor: "#c99a57",
    accentColor: "#a9803f",
    roughness: 0.7,
    metalness: 0.0,
    clearcoat: 0.12,
    engrave: "wood",
    face: { normal: "y", w: 2.5, h: 1.3, center: [0, 0.141, 0] },
    restPitch: 0.62,
    fit: 1.08,
  },

  // Closed pine box (~21×14×8 cm): wide, shallow, lid seam + gold clasp.
  cajita: {
    id: "cajita",
    singular: "Cajita",
    desc: "Cajita de madera de pino rectangular y cerrada (21×8×14 cm), grabada en la tapa.",
    size: [1.05, 0.42, 0.7],
    baseColor: "#6e3c22",
    accentColor: "#c9a24b",
    roughness: 0.55,
    metalness: 0.0,
    clearcoat: 0.22,
    engrave: "wood",
    face: { normal: "y", w: 1.86, h: 1.22, center: [0, 0.421, 0] },
    restPitch: 0.55,
    fit: 1.05,
  },

  // Thick polished clear acrylic disc on a small stand — edges catch the light.
  acrilico: {
    id: "acrilico",
    singular: "Acrílico",
    desc: "Pieza de acrílico transparente grueso y pulido, con grabado esmerilado.",
    size: [1.15, 1.15, 0.09],
    baseColor: "#dfe7ee",
    accentColor: "#1c1e22",
    roughness: 0.05,
    metalness: 0.0,
    clearcoat: 1.0,
    engrave: "acrylic",
    face: { normal: "z", w: 1.7, h: 1.7, center: [0, 0, 0.091] },
    restPitch: 0.0,
    fit: 1.12,
    colorable: true,
  },

  // Matte black anodized metal pen with silver clip and tip.
  boligrafo: {
    id: "boligrafo",
    singular: "Bolígrafo",
    desc: "Bolígrafo de metal anodizado negro mate con detalles plateados, grabado en el barril.",
    size: [1.3, 0.085, 0.085],
    baseColor: "#1b1c1f",
    accentColor: "#c7ccd2",
    roughness: 0.62,
    metalness: 0.55,
    clearcoat: 0.15,
    engrave: "steel",
    face: { normal: "z", w: 1.35, h: 0.17, center: [0.05, 0, 0.086] },
    restPitch: 0.0,
    fit: 1.0,
    colorable: true,
  },

  // Flat stainless-steel bottle opener: landscape 1.54:1 ratio, left-side cutout (~42% width), right-side engravable face.
  abridor: {
    id: "abridor",
    singular: "Abridor",
    desc: "Abridor de botellas de acero inoxidable, grabado a láser en la cara derecha.",
    size: [0.80, 0.52, 0.052],
    baseColor: "#c2c8ce",
    accentColor: "#9aa0a8",
    roughness: 0.30,
    metalness: 0.96,
    clearcoat: 0.25,
    engrave: "steel",
    face: { normal: "z", w: 0.90, h: 0.72, center: [0.28, 0, 0.053] },
    restPitch: 0.0,
    fit: 1.0,
  },
};

export function getObject(id: string): ObjectDef {
  return OBJECTS[id as ObjectId] ?? OBJECTS.conservadora;
}
