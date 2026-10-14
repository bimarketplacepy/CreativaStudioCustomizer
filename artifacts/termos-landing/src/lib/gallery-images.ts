/**
 * Ejemplos de trabajos ya realizados, alojados en la carpeta
 * "Creativa Studio Fotos" del App Storage y copiados a /public/galeria.
 * Se usan en el carrusel del hero ("Personalice su propia pieza exclusiva").
 */
export interface GalleryImage {
  /** Archivo dentro de /public/galeria. */
  src: string;
  /** Rótulo corto que describe el trabajo. */
  caption: string;
  /** Producto del personalizador más parecido ("Diseñar uno igual"). */
  preset?: { materialId: string; materialProductId: string };
}

const BASE = "/galeria";

export const GALLERY_IMAGES: GalleryImage[] = [
  { src: `${BASE}/termomate.webp`,        caption: "Termo con mate grabado", preset: { materialId: "acero", materialProductId: "termo-mate" } },
  { src: `${BASE}/termoguampa.webp`,      caption: "Set termo + guampa", preset: { materialId: "acero", materialProductId: "termo" } },
  { src: `${BASE}/termoguampa2.webp`,     caption: "Set termo + guampa", preset: { materialId: "acero", materialProductId: "termo" } },
  { src: `${BASE}/termoforrado.webp`,     caption: "Termo forrado en cuero", preset: { materialId: "cuero", materialProductId: "termo-cuero" } },
  { src: `${BASE}/guampaforrada.webp`,    caption: "Guampa forrada en cuero", preset: { materialId: "cuero", materialProductId: "guampa-cuero" } },
  { src: `${BASE}/hoppie.webp`,           caption: "Hoppie personalizado", preset: { materialId: "acero", materialProductId: "hoppie-hydrate" } },
  { src: `${BASE}/hoppiedisenouv.webp`,   caption: "Hoppie con diseño UV", preset: { materialId: "acero", materialProductId: "hoppie-hydrate" } },
  { src: `${BASE}/minihoppie.webp`,       caption: "Mini hoppie" },
  { src: `${BASE}/jugs.webp`,             caption: "Jug térmico grabado" },
  { src: `${BASE}/botella.webp`,          caption: "Botella grabada", preset: { materialId: "acero", materialProductId: "botella-ancha" } },
  { src: `${BASE}/copas.webp`,            caption: "Copas de cristal grabadas", preset: { materialId: "cristal", materialProductId: "copa" } },
  { src: `${BASE}/vasos.webp`,            caption: "Vasos personalizados", preset: { materialId: "acero", materialProductId: "vaso" } },
  { src: `${BASE}/vasos2.webp`,           caption: "Vasos personalizados", preset: { materialId: "acero", materialProductId: "vaso" } },
  { src: `${BASE}/vasos3.webp`,           caption: "Vasos personalizados", preset: { materialId: "acero", materialProductId: "vaso" } },
  { src: `${BASE}/vasosrojos.webp`,       caption: "Vasos rojos grabados", preset: { materialId: "acero", materialProductId: "vaso" } },
  { src: `${BASE}/vasoverde.webp`,        caption: "Vaso verde grabado", preset: { materialId: "acero", materialProductId: "vaso" } },
  { src: `${BASE}/vasorosa.webp`,         caption: "Vaso rosa grabado", preset: { materialId: "acero", materialProductId: "vaso" } },
  { src: `${BASE}/vasostarwars.webp`,     caption: "Vasos temáticos", preset: { materialId: "acero", materialProductId: "vaso" } },
  { src: `${BASE}/vasoconmango.webp`,     caption: "Vaso con mango" },
  { src: `${BASE}/vaso+abridor.webp`,     caption: "Vaso + abridor" },
  { src: `${BASE}/vasitos.webp`,          caption: "Vasitos grabados" },
  { src: `${BASE}/abridor.webp`,          caption: "Abridor de botellas" },
  { src: `${BASE}/petaca.webp`,           caption: "Petaca grabada" },
  { src: `${BASE}/billeteras.webp`,       caption: "Billeteras de cuero", preset: { materialId: "cuero", materialProductId: "billetera" } },
  { src: `${BASE}/tablamadera.webp`,      caption: "Tabla de madera grabada", preset: { materialId: "madera", materialProductId: "tabla" } },
  { src: `${BASE}/cajitamadera.webp`,     caption: "Caja de madera", preset: { materialId: "madera", materialProductId: "cajita" } },
  { src: `${BASE}/tronco.webp`,           caption: "Pieza de madera" },
  { src: `${BASE}/tronco2.webp`,          caption: "Pieza de madera" },
  { src: `${BASE}/acriclico.webp`,        caption: "Pieza de acrílico" },
  { src: `${BASE}/conservadora.webp`,     caption: "Conservadora personalizada", preset: { materialId: "plastico", materialProductId: "conservadora" } },
  { src: `${BASE}/recipentemascota.webp`, caption: "Recipiente para mascota" },
];
