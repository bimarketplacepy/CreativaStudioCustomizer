/**
 * Archivo de producción de la Dacen F5 (UV cilíndrica, DACEN.md §4.3): el
 * diseño a color DESENROLLADO, para cargar en RIPrint.
 *
 *  - Ancho = la vuelta completa del cuerpo (π × Ø); alto = la banda imprimible.
 *    Es el mismo espacio u/v de la textura del 3D: lo que se ve es lo que sale.
 *  - El frente queda en el centro del archivo (u = 0,5); los bordes izquierdo y
 *    derecho son la costura, atrás de la pieza.
 *  - PNG con fondo transparente: solo hay píxeles donde va tinta (RIPrint arma
 *    el blanco y el barniz a partir de eso).
 *  - Medidas: las reales de print-specs.ts cuando están cargadas; si no, las
 *    del modelo 3D (aproximadas: se avisa en el pedido).
 *  - El servidor graba los dpi en el PNG para que RIPrint lo abra a tamaño real.
 *  - Con fondo "Todo el vaso (360°)" la banda va llena: sale en JPEG (sin
 *    transparencia que perder) para mantener 300 dpi; una foto en PNG pesa
 *    10–20 MB y no entra en el pedido (DACEN.md §12.6).
 */
import { drawColorLayer, bandMetrics, TEXTURE_H, TEXTURE_W, type ColorLayerInput } from "./engraving-maps";
import { getProduct, getSize, productForSize } from "./products";
import { printSpecFor } from "./print-specs";

export interface DacenPrintFile {
  /** PNG o JPEG (fondo 360°) como data URL. */
  dataUrl: string;
  format: "png" | "jpeg";
  dpi: number;
  /** Ancho = la vuelta completa (mm). */
  widthMm: number;
  heightMm: number;
  /** true: medidas tomadas del modelo 3D, no del calibre (print-specs). */
  approxSize: boolean;
}

/** Tope del PNG (el pedido viaja en JSON; el server acepta hasta 4,5 MB). */
const MAX_BYTES = 3.5 * 1024 * 1024;
/** Resolución buscada; se baja si el archivo no entra en MAX_BYTES. */
const DPI_STEPS = [300, 240, 200, 150];
/** Fondo 360° en JPEG: tope propio (el server acepta hasta 6 MB) y calidad. */
const MAX_JPEG_BYTES = 5.5 * 1024 * 1024;
const JPEG_QUALITY = 0.92;

/** Medidas reales del área imprimible: calibre si existe, si no el modelo 3D. */
export function dacenPrintSize(productId: string, sizeId: string): { circumferenceMm: number; heightMm: number; approx: boolean } {
  const spec = printSpecFor(productId, sizeId);
  const top = spec?.diameterTopMm ?? null, bot = spec?.diameterBottomMm ?? null, h = spec?.printableHeightMm ?? null;
  if (top !== null && bot !== null && h !== null) {
    // Cónico: el ancho se toma del Ø mayor (DACEN.md §10, pregunta 1).
    return { circumferenceMm: Math.PI * Math.max(top, bot), heightMm: h, approx: false };
  }
  const product = productForSize(getProduct(productId), sizeId);
  const scale = getSize(product, sizeId).scale;
  const mmPerUnit = (1000 * scale) / (product.model?.unitsPerMeter ?? 10);
  const maxR = Math.max(...product.profile.map(p => p[0]));
  return {
    circumferenceMm: 2 * Math.PI * maxR * mmPerUnit,
    heightMm: (product.band[1] - product.band[0]) * mmPerUnit,
    approx: true,
  };
}

const toBlob = (c: HTMLCanvasElement, type: "image/png" | "image/jpeg" = "image/png") =>
  new Promise<Blob | null>(resolve => c.toBlob(resolve, type, JPEG_QUALITY));

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

/** Carga una imagen (data/blob URL del logo o ícono) para dibujarla. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("no se pudo cargar la imagen"));
    img.src = src;
  });
}

/**
 * Arma el PNG desenrollado. null si no hay nada que imprimir o el navegador
 * no pudo generarlo (el pedido sale igual, con el SVG de referencia).
 */
export async function renderDacenPng(
  productId: string,
  sizeId: string,
  design: ColorLayerInput,
): Promise<DacenPrintFile | null> {
  const hasArt = !!design.artImage && design.imageSize !== "none";
  if (!design.text.trim() && !hasArt && !design.wrap) return null;
  const jpeg = !!design.wrap;
  const maxBytes = jpeg ? MAX_JPEG_BYTES : MAX_BYTES;
  const product = productForSize(getProduct(productId), sizeId);
  const m = bandMetrics(product, TEXTURE_W, TEXTURE_H);
  const size = dacenPrintSize(productId, sizeId);
  const bandPx = m.botPx - m.topPx;

  for (const dpi of DPI_STEPS) {
    const outW = Math.round((size.circumferenceMm / 25.4) * dpi);
    const outH = Math.round((size.heightMm / 25.4) * dpi);
    // Se dibuja directo la banda imprimible: escala X = archivo / textura; la Y
    // además deshace el estirado vertical de la textura del 3D, así el archivo
    // sale en proporción real. Un solo lienzo del tamaño final (iOS limita la
    // memoria de canvas: nada de lienzos intermedios de la textura completa).
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const octx = out.getContext("2d");
    if (!octx) return null;
    // JPEG no tiene transparencia: lo que el arte deje sin tinta sale blanco.
    if (jpeg) { octx.fillStyle = "#ffffff"; octx.fillRect(0, 0, outW, outH); }
    octx.scale(outW / TEXTURE_W, outH / bandPx);
    octx.translate(0, -m.topPx);
    drawColorLayer(octx, product, design);
    const blob = await toBlob(out, jpeg ? "image/jpeg" : "image/png");
    out.width = out.height = 0;
    if (!blob) return null;
    if (blob.size <= maxBytes || dpi === DPI_STEPS[DPI_STEPS.length - 1]) {
      if (blob.size > maxBytes) return null;
      return {
        dataUrl: await blobToDataUrl(blob),
        format: jpeg ? "jpeg" : "png",
        dpi,
        widthMm: Math.round(size.circumferenceMm * 10) / 10,
        heightMm: Math.round(size.heightMm * 10) / 10,
        approxSize: size.approx,
      };
    }
  }
  return null;
}

/**
 * Vista "Ver desplegado": la banda imprimible a `widthPx` de ancho, en las
 * proporciones reales de la pieza (mismo dibujo que el archivo de producción).
 */
export function renderUnwrappedPreview(
  productId: string,
  sizeId: string,
  design: ColorLayerInput,
  widthPx: number,
): { canvas: HTMLCanvasElement; widthMm: number; heightMm: number } | null {
  const product = productForSize(getProduct(productId), sizeId);
  const m = bandMetrics(product, TEXTURE_W, TEXTURE_H);
  const size = dacenPrintSize(productId, sizeId);
  const outW = Math.round(widthPx);
  const outH = Math.max(1, Math.round(outW * size.heightMm / size.circumferenceMm));
  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const octx = out.getContext("2d");
  if (!octx) return null;
  octx.scale(outW / TEXTURE_W, outH / (m.botPx - m.topPx));
  octx.translate(0, -m.topPx);
  drawColorLayer(octx, product, design);
  return { canvas: out, widthMm: size.circumferenceMm, heightMm: size.heightMm };
}
