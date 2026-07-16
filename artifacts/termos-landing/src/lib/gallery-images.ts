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
}

const BASE = "/galeria";

export const GALLERY_IMAGES: GalleryImage[] = [
  { src: `${BASE}/termomate.webp`,        caption: "Termo con mate grabado" },
  { src: `${BASE}/termoguampa.webp`,      caption: "Set termo + guampa" },
  { src: `${BASE}/termoguampa2.webp`,     caption: "Set termo + guampa" },
  { src: `${BASE}/termoforrado.webp`,     caption: "Termo forrado en cuero" },
  { src: `${BASE}/guampaforrada.webp`,    caption: "Guampa forrada en cuero" },
  { src: `${BASE}/hoppie.webp`,           caption: "Hoppie personalizado" },
  { src: `${BASE}/hoppiedisenouv.webp`,   caption: "Hoppie con diseño UV" },
  { src: `${BASE}/minihoppie.webp`,       caption: "Mini hoppie" },
  { src: `${BASE}/jugs.webp`,             caption: "Jug térmico grabado" },
  { src: `${BASE}/botella.webp`,          caption: "Botella grabada" },
  { src: `${BASE}/copas.webp`,            caption: "Copas de cristal grabadas" },
  { src: `${BASE}/vasos.webp`,            caption: "Vasos personalizados" },
  { src: `${BASE}/vasos2.webp`,           caption: "Vasos personalizados" },
  { src: `${BASE}/vasos3.webp`,           caption: "Vasos personalizados" },
  { src: `${BASE}/vasosrojos.webp`,       caption: "Vasos rojos grabados" },
  { src: `${BASE}/vasoverde.webp`,        caption: "Vaso verde grabado" },
  { src: `${BASE}/vasorosa.webp`,         caption: "Vaso rosa grabado" },
  { src: `${BASE}/vasostarwars.webp`,     caption: "Vasos temáticos" },
  { src: `${BASE}/vasoconmango.webp`,     caption: "Vaso con mango" },
  { src: `${BASE}/vaso+abridor.webp`,     caption: "Vaso + abridor" },
  { src: `${BASE}/vasitos.webp`,          caption: "Vasitos grabados" },
  { src: `${BASE}/abridor.webp`,          caption: "Abridor de botellas" },
  { src: `${BASE}/petaca.webp`,           caption: "Petaca grabada" },
  { src: `${BASE}/billeteras.webp`,       caption: "Billeteras de cuero" },
  { src: `${BASE}/tablamadera.webp`,      caption: "Tabla de madera grabada" },
  { src: `${BASE}/cajitamadera.webp`,     caption: "Caja de madera" },
  { src: `${BASE}/tronco.webp`,           caption: "Pieza de madera" },
  { src: `${BASE}/tronco2.webp`,          caption: "Pieza de madera" },
  { src: `${BASE}/acriclico.webp`,        caption: "Pieza de acrílico" },
  { src: `${BASE}/conservadora.webp`,     caption: "Conservadora personalizada" },
  { src: `${BASE}/recipentemascota.webp`, caption: "Recipiente para mascota" },
];
