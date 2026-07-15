/**
 * Ejemplos de trabajos ya realizados, alojados en la carpeta
 * "Creativa Studio Fotos" del App Storage y copiados a /public/galeria.
 * Se usan en el carrusel del hero ("Diseñe su propia pieza exclusiva").
 */
export interface GalleryImage {
  /** Archivo dentro de /public/galeria. */
  src: string;
  /** Rótulo corto que describe el trabajo. */
  caption: string;
}

const BASE = "/galeria";

export const GALLERY_IMAGES: GalleryImage[] = [
  { src: `${BASE}/termomate.jpeg`,        caption: "Termo con mate grabado" },
  { src: `${BASE}/termoguampa.jpeg`,      caption: "Set termo + guampa" },
  { src: `${BASE}/termoguampa2.jpeg`,     caption: "Set termo + guampa" },
  { src: `${BASE}/termoforrado.jpeg`,     caption: "Termo forrado en cuero" },
  { src: `${BASE}/guampaforrada.jpeg`,    caption: "Guampa forrada en cuero" },
  { src: `${BASE}/hoppie.jpeg`,           caption: "Hoppie personalizado" },
  { src: `${BASE}/hoppiedisenouv.jpeg`,   caption: "Hoppie con diseño UV" },
  { src: `${BASE}/minihoppie.jpeg`,       caption: "Mini hoppie" },
  { src: `${BASE}/jugs.jpeg`,             caption: "Jug térmico grabado" },
  { src: `${BASE}/botella.jpeg`,          caption: "Botella de whisky grabada" },
  { src: `${BASE}/copas.jpeg`,            caption: "Copas de cristal grabadas" },
  { src: `${BASE}/vasos.jpeg`,            caption: "Vasos personalizados" },
  { src: `${BASE}/vasos2.jpeg`,           caption: "Vasos personalizados" },
  { src: `${BASE}/vasos3.jpeg`,           caption: "Vasos personalizados" },
  { src: `${BASE}/vasosrojos.jpeg`,       caption: "Vasos rojos grabados" },
  { src: `${BASE}/vasoverde.jpeg`,        caption: "Vaso verde grabado" },
  { src: `${BASE}/vasorosa.jpeg`,         caption: "Vaso rosa grabado" },
  { src: `${BASE}/vasostarwars.jpeg`,     caption: "Vasos temáticos" },
  { src: `${BASE}/vasoconmango.jpeg`,     caption: "Vaso con mango" },
  { src: `${BASE}/vaso+abridor.jpeg`,     caption: "Vaso + abridor" },
  { src: `${BASE}/vasitos.jpeg`,          caption: "Vasitos grabados" },
  { src: `${BASE}/abridor.jpeg`,          caption: "Abridor de botellas" },
  { src: `${BASE}/petaca.jpeg`,           caption: "Petaca grabada" },
  { src: `${BASE}/billeteras.jpeg`,       caption: "Billeteras de cuero" },
  { src: `${BASE}/tablamadera.jpeg`,      caption: "Tabla de madera grabada" },
  { src: `${BASE}/cajitamadera.jpeg`,     caption: "Cajita de madera" },
  { src: `${BASE}/tronco.jpeg`,           caption: "Pieza de madera" },
  { src: `${BASE}/tronco2.jpeg`,          caption: "Pieza de madera" },
  { src: `${BASE}/acriclico.jpeg`,        caption: "Pieza de acrílico" },
  { src: `${BASE}/conservadora.jpeg`,     caption: "Conservadora personalizada" },
  { src: `${BASE}/recipentemascota.jpeg`, caption: "Recipiente para mascota" },
];
