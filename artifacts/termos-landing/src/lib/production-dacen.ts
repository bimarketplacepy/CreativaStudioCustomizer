/**
 * Archivo de producción de la Dacen F5 (UV cilíndrica, DACEN.md §4.3): el
 * diseño a color DESENROLLADO, para cargar en RIPrint.
 *
 *  - Ancho = la vuelta completa del cuerpo (π × Ø); alto = la banda imprimible.
 *    Es el mismo espacio u/v de la textura del 3D: lo que se ve es lo que sale.
 *  - El frente queda en el centro del archivo (u = 0,5); los bordes izquierdo y
 *    derecho son la costura, atrás de la pieza.
 *  - Lo que pidió el taller (DACEN.md §12.10): la IMAGEN en PNG de alta
 *    calidad y los TEXTOS y LOGOS en vector. El PNG lleva solo lo raster (fondo
 *    360°, fotos y logos en PNG/JPG), con fondo transparente; los textos, el
 *    ícono y los logos SVG salen como marcas vectoriales que el server pasa a
 *    curvas en un SVG por capas, encima del PNG. El blanco lo arma el programa
 *    de la máquina.
 *  - Medidas: el taller pide el alto y el diámetro de la BASE de cada pieza
 *    (print-specs.ts); él ajusta el resto en la máquina. Sin medidas cargadas,
 *    las del modelo 3D (aproximadas: se avisa en el pedido).
 *  - El servidor graba los dpi en el PNG para que se abra a tamaño real.
 */
import { drawColorLayer, bandMetrics, TEXTURE_H, TEXTURE_W, type ColorLayerInput } from "./engraving-maps";
import { getProduct, getSize, productForSize } from "./products";
import { printSpecFor } from "./print-specs";
import { matrixToMm, type VectorMark } from "./vector-marks";

export interface DacenPrintFile {
  /** PNG (lo raster del diseño) como data URL. */
  dataUrl: string;
  format: "png";
  /** Textos, ícono y logos SVG, en mm del archivo, para ir en vector. */
  vectors: VectorMark[];
  dpi: number;
  /** Ancho = la vuelta completa (mm). */
  widthMm: number;
  heightMm: number;
  /** true: medidas tomadas del modelo 3D, no del calibre (print-specs). */
  approxSize: boolean;
}

/** Tope del PNG (el pedido viaja en JSON; el server acepta hasta 12 MB). Un
 *  fondo 360° fotográfico a 300 dpi pesa ~8–11 MB. */
const MAX_BYTES = 11.5 * 1024 * 1024;
/** Resolución buscada; se baja si el archivo no entra en MAX_BYTES. */
const DPI_STEPS = [300, 240, 200, 150];

/** Medidas reales del área imprimible: calibre si existe, si no el modelo 3D. */
export function dacenPrintSize(productId: string, sizeId: string): { circumferenceMm: number; heightMm: number; approx: boolean } {
  const spec = printSpecFor(productId, sizeId);
  const bot = spec?.diameterBottomMm ?? null, h = spec?.printableHeightMm ?? null;
  if (bot !== null && h !== null) {
    // El taller trabaja con el alto y el Ø de la BASE (DACEN.md §12.10); la
    // conicidad la ajusta él en la máquina.
    return { circumferenceMm: Math.PI * bot, heightMm: h, approx: false };
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

const toBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob | null>(resolve => c.toBlob(resolve, "image/png"));

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
  const hasExtraText = !!design.extraTexts?.some(t => t.text.trim());
  if (!design.text.trim() && !hasExtraText && !hasArt && !design.wrap) return null;
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
    octx.scale(outW / TEXTURE_W, outH / bandPx);
    octx.translate(0, -m.topPx);
    const vectors: VectorMark[] = [];
    const mmPerPx = size.circumferenceMm / outW;
    drawColorLayer(octx, product, {
      ...design,
      vectorSink: (mark) => vectors.push({ ...mark, matrix: matrixToMm(mark.matrix, mmPerPx) }),
    });
    const blob = await toBlob(out);
    out.width = out.height = 0;
    if (!blob) return null;
    if (blob.size <= MAX_BYTES || dpi === DPI_STEPS[DPI_STEPS.length - 1]) {
      if (blob.size > MAX_BYTES) return null;
      return {
        dataUrl: await blobToDataUrl(blob),
        format: "png",
        vectors,
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
