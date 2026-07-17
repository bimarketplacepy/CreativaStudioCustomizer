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
   * Multiplier on the engraved mark's base size for this blank (text and art),
   * default 1. Small round faces like the pen barrel need a bigger mark so it
   * stays legible and hugs the centre of the face instead of looking like it
   * floats above the curved surface.
   */
  markScale?: number;
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
    desc: "Conservadora rígida de plástico, rectangular con tapa y manijas.",
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

  // Bellroy Hide & Seek bifold: slim landscape leather billfold, rounded corners,
  // visible perimeter stitching. Closed: 86 × 117 × 13 mm (H × W × D) → modelled
  // landscape, width 117 : height 86 : depth 13.
  billetera: {
    id: "billetera",
    singular: "Billetera",
    desc: "Billetera de cuero tipo bifold, delgada y de esquinas redondeadas.",
    size: [0.94, 0.69, 0.104],
    baseColor: "#4a3423",
    accentColor: "#d9c4a0",
    roughness: 0.82,
    metalness: 0.0,
    clearcoat: 0.08,
    engrave: "leather",
    face: { normal: "z", w: 1.5, h: 1.02, center: [0, 0, 0.125] },
    restPitch: 0.06,
    fit: 1.08,
    colorable: true,
  },

  // Wide, flat walnut-tone cutting board with an inset border on the top face.
  tabla: {
    id: "tabla",
    singular: "Tabla",
    desc: "Tabla de cortar de madera, plana y ancha.",
    size: [1.5, 0.14, 0.8],
    baseColor: "#8a5a30",
    accentColor: "#6f461f",
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
    singular: "Caja",
    desc: "Caja de madera rectangular con tapa.",
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

  // Matte black anodized metal pen: barrel, metal grip cone, tip, cap + clip.
  boligrafo: {
    id: "boligrafo",
    singular: "Bolígrafo",
    desc: "Bolígrafo de metal, con cuerpo cilíndrico.",
    size: [1.3, 0.09, 0.09],
    baseColor: "#1b1c1f",
    accentColor: "#c7ccd2",
    roughness: 0.62,
    metalness: 0.55,
    clearcoat: 0.15,
    engrave: "steel",
    face: { normal: "z", w: 0.9, h: 0.17, center: [0, 0, 0.092] },
    restPitch: 0.0,
    fit: 1.0,
    colorable: true,
    // The barrel face is tiny; scale the mark up so a name/icon reads clearly.
    markScale: 2.2,
  },

  // Flat stainless-steel bottle opener: landscape 1.54:1 ratio, left-side cutout (~42% width), right-side engravable face.
  abridor: {
    id: "abridor",
    singular: "Abridor",
    desc: "Abridor de botellas de metal, plano y alargado.",
    size: [0.80, 0.52, 0.052],
    baseColor: "#c2c8ce",
    accentColor: "#9aa0a8",
    roughness: 0.30,
    metalness: 0.96,
    clearcoat: 0.25,
    engrave: "steel",
    face: { normal: "z", w: 0.74, h: 0.66, center: [0.34, 0, 0.053] },
    restPitch: 0.0,
    fit: 1.0,
  },
};

export function getObject(id: string): ObjectDef {
  return OBJECTS[id as ObjectId] ?? OBJECTS.conservadora;
}
