/**
 * Ejemplos de trabajos ya realizados, alojados en la carpeta
 * "Creativa Studio Fotos" del App Storage y copiados a /public/galeria.
 * Se usan en la sección «Trabajos realizados» (gallery.tsx), filtrables por
 * `kind`. Cada archivo tiene su variante -700.webp.
 */
export type GalleryKind = "color" | "acero" | "cuero" | "madera" | "cristal" | "otros";

export interface GalleryImage {
  /** Archivo dentro de /public/galeria. */
  src: string;
  /** Rótulo corto que describe el trabajo. */
  caption: string;
  /** Producto del personalizador más parecido ("Diseñar uno igual"). */
  preset?: { materialId: string; materialProductId: string };
  /** Filtro de la galería: material, o "color" para impresión UV / 360°. */
  kind: GalleryKind;
  /** Entra en la vista «Todo»: una selección variada, sin marcas de terceros. */
  featured?: boolean;
}

const BASE = "/galeria";

export const GALLERY_IMAGES: GalleryImage[] = [
  { src: `${BASE}/vaso-360.webp`,         caption: "Vaso impreso en 360° a todo color", kind: "color", featured: true },
  { src: `${BASE}/termomate.webp`,        caption: "Termo con mate grabado", preset: { materialId: "acero", materialProductId: "termo-mate" }, kind: "acero", featured: true },
  { src: `${BASE}/termoguampa.webp`,      caption: "Set termo + guampa", preset: { materialId: "acero", materialProductId: "termo" }, kind: "acero" },
  { src: `${BASE}/termoguampa2.webp`,     caption: "Set termo + guampa", preset: { materialId: "acero", materialProductId: "termo" }, kind: "acero" },
  { src: `${BASE}/termoforrado.webp`,     caption: "Termo forrado en cuero", preset: { materialId: "cuero", materialProductId: "termo-cuero" }, kind: "cuero", featured: true },
  { src: `${BASE}/guampaforrada.webp`,    caption: "Guampa forrada en cuero", preset: { materialId: "cuero", materialProductId: "guampa-cuero" }, kind: "cuero", featured: true },
  { src: `${BASE}/hoppie.webp`,           caption: "Hoppie personalizado", preset: { materialId: "acero", materialProductId: "hoppie-hydrate" }, kind: "acero", featured: true },
  { src: `${BASE}/hoppiedisenouv.webp`,   caption: "Hoppie con diseño UV", preset: { materialId: "acero", materialProductId: "hoppie-hydrate" }, kind: "color", featured: true },
  { src: `${BASE}/minihoppie.webp`,       caption: "Mini hoppie", kind: "acero" },
  { src: `${BASE}/jugs.webp`,             caption: "Jug térmico grabado", kind: "acero" },
  { src: `${BASE}/botella.webp`,          caption: "Botella grabada", preset: { materialId: "acero", materialProductId: "botella-ancha" }, kind: "acero" },
  { src: `${BASE}/copas.webp`,            caption: "Copas de cristal grabadas", preset: { materialId: "cristal", materialProductId: "copa" }, kind: "cristal" },
  { src: `${BASE}/vasos.webp`,            caption: "Vasos personalizados", preset: { materialId: "acero", materialProductId: "vaso" }, kind: "acero" },
  { src: `${BASE}/vasos2.webp`,           caption: "Vasos personalizados", preset: { materialId: "acero", materialProductId: "vaso" }, kind: "acero" },
  { src: `${BASE}/vasos3.webp`,           caption: "Vasos personalizados", preset: { materialId: "acero", materialProductId: "vaso" }, kind: "acero", featured: true },
  { src: `${BASE}/vasosrojos.webp`,       caption: "Vasos rojos grabados", preset: { materialId: "acero", materialProductId: "vaso" }, kind: "acero" },
  { src: `${BASE}/vasoverde.webp`,        caption: "Vaso verde grabado", preset: { materialId: "acero", materialProductId: "vaso" }, kind: "acero" },
  { src: `${BASE}/vasorosa.webp`,         caption: "Vaso rosa grabado", preset: { materialId: "acero", materialProductId: "vaso" }, kind: "acero", featured: true },
  { src: `${BASE}/vasostarwars.webp`,     caption: "Vasos temáticos", preset: { materialId: "acero", materialProductId: "vaso" }, kind: "acero" },
  { src: `${BASE}/vasoconmango.webp`,     caption: "Vaso con mango", kind: "acero" },
  { src: `${BASE}/vaso+abridor.webp`,     caption: "Vaso + abridor", kind: "otros" },
  { src: `${BASE}/vasitos.webp`,          caption: "Vasitos grabados", kind: "acero" },
  { src: `${BASE}/abridor.webp`,          caption: "Abridor de botellas", kind: "otros" },
  { src: `${BASE}/petaca.webp`,           caption: "Petaca grabada", kind: "acero" },
  { src: `${BASE}/billeteras.webp`,       caption: "Billeteras de cuero", preset: { materialId: "cuero", materialProductId: "billetera" }, kind: "cuero", featured: true },
  { src: `${BASE}/tablamadera.webp`,      caption: "Tabla de madera grabada", preset: { materialId: "madera", materialProductId: "tabla" }, kind: "madera", featured: true },
  { src: `${BASE}/cajitamadera.webp`,     caption: "Caja de madera", preset: { materialId: "madera", materialProductId: "cajita" }, kind: "madera", featured: true },
  { src: `${BASE}/tronco.webp`,           caption: "Pieza de madera", kind: "madera" },
  { src: `${BASE}/tronco2.webp`,          caption: "Pieza de madera", kind: "madera" },
  { src: `${BASE}/acriclico.webp`,        caption: "Pieza de acrílico", kind: "otros", featured: true },
  { src: `${BASE}/conservadora.webp`,     caption: "Conservadora personalizada", preset: { materialId: "plastico", materialProductId: "conservadora" }, kind: "otros" },
  { src: `${BASE}/recipentemascota.webp`, caption: "Recipiente para mascota", kind: "otros" },
];
