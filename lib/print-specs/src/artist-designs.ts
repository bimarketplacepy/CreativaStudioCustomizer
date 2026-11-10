/**
 * Diseños de artistas: piezas ya diseñadas por artistas contratados por La
 * Creativa, que el cliente copia tal cual desde «Recomendados» y lleva al
 * personalizador (puede sumarle su nombre o un texto encima).
 *
 * Cada diseño es un fondo "Todo el vaso (360°)" (wrap-design.ts) atado a UNA
 * pieza: solo se ofrece sobre el producto para el que el taller lo probó, así
 * el cliente nunca paga por un diseño que no se puede producir. Si cambia de
 * producto, de técnica o toca el fondo, el diseño deja de aplicarse (y de
 * cobrarse).
 *
 * Para sumar un artista o un diseño: una entrada en ARTISTS / ARTIST_DESIGNS,
 * la foto de muestra y el arte plano en /public/disenos.
 */
/** Cómo llena el arte la vuelta (wrap-design.ts de la landing). */
export type WrapMode = "cover" | "tile" | "mirror" | "artwork";

/** Precio al cliente por copiar un diseño de artista (Gs.), sobre pieza e impresión. */
export const ARTIST_DESIGN_PRICE = 12_500;

/**
 * Apagado hasta que el circuito esté completo (arte plano definitivo, archivo
 * de producción para la eufyMake, medidas reales de la pieza). Con false no se
 * muestra «Recomendados» ni se aplica un diseño de artista desde un link o un
 * preset. Para volver a activarlo, poner true.
 */
export const ARTIST_DESIGNS_ENABLED = false;
/** Lo que cobra el artista por cada copia vendida (Gs.). El resto queda para La Creativa. */
export const ARTIST_DESIGN_FEE = 10_000;

export interface Artist {
  id: string;
  /** Nombre artístico, tal como firma. */
  name: string;
  /** Línea corta de presentación. */
  bio?: string;
  /** Usuario de Instagram (sin @). */
  instagram?: string;
}

export interface ArtistDesign {
  id: string;
  artistId: string;
  title: string;
  /** Colección o temporada ("Edición Navideña"). */
  collection?: string;
  /** Foto de muestra que entregó el artista (tarjeta de Recomendados). */
  image: string;
  /** Variante chica de la foto (700 px), para la grilla. */
  imageSmall?: string;
  /** Pieza sobre la que el taller lo probó (ids de materials.ts). */
  materialId: string;
  materialProductId: string;
  /** Color de la pieza (id de la paleta del personalizador). */
  colorId?: string;
  /** Acabado de la pieza ("glossy" en el enlozado). */
  finish?: string;
  /** El arte plano que va alrededor de la pieza y cómo llena la vuelta. */
  artwork: { url: string; width: number; height: number; mode: WrapMode };
  /**
   * El arte es provisorio (sacado de la foto de muestra, no del archivo del
   * artista): sirve para la vista 3D, no para producción.
   */
  provisional?: boolean;
  /** Precio al cliente y lo que se lleva el artista (Gs.); por defecto los generales. */
  price?: number;
  artistFee?: number;
}

export const ARTISTS: Artist[] = [
  { id: "aopy", name: "AOPY", bio: "Ilustración paraguaya" },
];

export const ARTIST_DESIGNS: ArtistDesign[] = [
  {
    id: "aopy-navidad-taza",
    artistId: "aopy",
    title: "Navidad paraguaya",
    collection: "Edición Navideña",
    image: "/disenos/aopy-navidad.webp",
    imageSmall: "/disenos/aopy-navidad-700.webp",
    materialId: "acero",
    materialProductId: "taza-enlozada",
    colorId: "c8",
    finish: "glossy",
    // PROVISORIO: el frente de la taza desenrollado de la foto de muestra
    // (diseño/AOPY.jpeg), repetido alrededor. Reemplazar por el archivo plano
    // de AOPY (desarrollo de la taza en PNG a 300 dpi) con mode "artwork".
    artwork: { url: "/disenos/aopy-navidad-arte.webp?v=1", width: 620, height: 385, mode: "tile" },
    provisional: true,
  },
];

export function getArtist(id: string): Artist | null {
  return ARTISTS.find(a => a.id === id) ?? null;
}

export function getArtistDesign(id: string | null | undefined): ArtistDesign | null {
  if (!ARTIST_DESIGNS_ENABLED || !id) return null;
  return ARTIST_DESIGNS.find(d => d.id === id) ?? null;
}

export const designPrice = (d: ArtistDesign) => d.price ?? ARTIST_DESIGN_PRICE;
export const designArtistFee = (d: ArtistDesign) => d.artistFee ?? ARTIST_DESIGN_FEE;

/**
 * El diseño por id, esté o no encendido el circuito (para el servidor: arma la
 * línea; el veredicto decide si se puede vender).
 */
export function getArtistDesignById(id: string | null | undefined): ArtistDesign | null {
  return id ? ARTIST_DESIGNS.find(d => d.id === id.toLowerCase()) ?? null : null;
}
