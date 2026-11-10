/**
 * Medida REAL del texto grabado, en milímetros: lo que el cliente ve en el
 * personalizador ("mide 6,5 × 1,8 cm") y lo que viaja en el pedido como
 * `designState.realSize`, con lo que el servidor arma el archivo de la láser
 * (api-server, production-svg.ts → parseRealSize) al MISMO tamaño y con los
 * mismos renglones.
 *
 * La textura del cuerpo mide TEXTURE_W px de vuelta: 1 px "cuadrado" (antes de
 * la deformación vertical de la textura) = vuelta en mm / TEXTURE_W.
 */
import {
  bandMetrics, computeFaceTextLayout, makeTextFont, TEXTURE_H, TEXTURE_W,
} from "./engraving-maps";
import type { Placement, TextAlign } from "./placement";
import type { ProductDef } from "./products";

/** Medidas de la pieza que usa el archivo de producción. */
export interface PieceSizeMm {
  /** Vuelta completa del cuerpo (π × Ø). */
  circumferenceMm: number;
  /** Alto de la banda grabable (entre la tapa y la base). */
  bandHeightMm: number;
  /** mm por pixel "cuadrado" de la textura. */
  mmPerPx: number;
}

export function pieceSizeMm(product: ProductDef, circumferenceMm: number): PieceSizeMm {
  const m = bandMetrics(product, TEXTURE_W, TEXTURE_H);
  const mmPerPx = circumferenceMm / TEXTURE_W;
  return { circumferenceMm, bandHeightMm: ((m.botPx - m.topPx) / m.aspect) * mmPerPx, mmPerPx };
}

/** Un texto medido: renglones tal como se graban y su tinta real. */
export interface TextSizeMm {
  lines: string[];
  /** Largo de la tinta (el renglón más ancho, de la primera a la última letra). */
  widthMm: number;
  /** Alto de la tinta (del tope del primer renglón al pie del último). */
  heightMm: number;
  /** El tamaño pedido no entraba y se achicó: no puede crecer más. */
  shrunk: boolean;
}

export interface TextSizeInput {
  /** Texto tal como se dibuja (ya en mayúsculas si la tipografía lo pide). */
  text: string;
  fontFamily?: string;
  colorPrint?: boolean;
  placement: Placement;
  singleFace: boolean;
}

let canvas: HTMLCanvasElement | null = null;
const fin = (v: number, def: number) => (Number.isFinite(v) ? v : def);

/**
 * Mide el texto con el mismo armado que el 3D (computeFaceTextLayout): mismos
 * renglones y mismo tamaño de letra; acá solo se toma la tinta exacta, que es
 * lo que mide el taller con la regla y lo que respeta el archivo de la láser.
 */
export function measureTextMm(product: ProductDef, piece: PieceSizeMm, input: TextSizeInput, scale = input.placement.scale): TextSizeMm | null {
  if (!input.text.trim() || typeof document === "undefined") return null;
  const p = input.placement;
  const L = computeFaceTextLayout(
    product,
    { text: input.text, fontFamily: input.fontFamily, colorPrint: input.colorPrint, orientation: p.orientation, align: p.align, layout: p.layout, lineHeight: p.lineHeight },
    scale,
    input.singleFace,
  );
  if (!L.lines.some(l => l.trim())) return null;
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = makeTextFont(L.fontPx, input.fontFamily ?? "Inter, system-ui, sans-serif");
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const align: TextAlign = L.align;
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  L.lines.forEach((line, i) => {
    if (!line.trim()) return;
    const mt = ctx.measureText(line);
    const w = mt.width;
    const justified = align === "justify" && i < L.lines.length - 1 && line.trim().includes(" ") && w < L.blockW;
    // Dónde arranca el renglón dentro del bloque (centrado en 0).
    const x0 = align === "center" ? -w / 2 : align === "right" ? L.blockW / 2 - w : -L.blockW / 2;
    const inkL = x0 - fin(mt.actualBoundingBoxLeft, 0);
    const inkR = justified
      ? L.blockW / 2 - (w - fin(mt.actualBoundingBoxRight, w))
      : x0 + fin(mt.actualBoundingBoxRight, w);
    left = Math.min(left, inkL);
    right = Math.max(right, inkR);
    const y = i * L.lineHeight;
    top = Math.min(top, y - fin(mt.actualBoundingBoxAscent, L.fontPx * 0.75));
    bottom = Math.max(bottom, y + fin(mt.actualBoundingBoxDescent, L.fontPx * 0.2));
  });
  if (!(right > left) || !(bottom > top)) return null;
  return {
    lines: L.lines,
    widthMm: (right - left) * piece.mmPerPx,
    heightMm: (bottom - top) * piece.mmPerPx,
    shrunk: L.shrunk,
  };
}

/** Paso de los botones − / + del largo, en mm (medio centímetro). */
export const TEXT_STEP_MM = 5;

/**
 * Escala del texto para que mida `targetMm` de largo. El largo crece casi en
 * proporción a la escala; unas pocas correcciones absorben el redondeo del
 * tamaño de letra y los cambios de renglón.
 */
export function scaleForWidthMm(
  measure: (scale: number) => number | null,
  from: number,
  targetMm: number,
  min: number,
  max: number,
): number {
  const clamp = (s: number) => Math.max(min, Math.min(max, s));
  let s = clamp(from);
  for (let i = 0; i < 5; i++) {
    const w = measure(s);
    if (!w || Math.abs(w - targetMm) < 0.2) break;
    const next = clamp(s * (targetMm / w));
    if (Math.abs(next - s) < 1e-4) break;
    s = next;
  }
  return s;
}

/** mm → "6,5" (cm con un decimal, como se lee en una regla). */
export function formatCm(mm: number): string {
  return (Math.round(mm) / 10).toLocaleString("es-PY", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** `designState.realSize`: lo que lee el servidor para el archivo de la láser. */
export function realSizePayload(piece: PieceSizeMm, text: TextSizeMm | null, text2: TextSizeMm | null, artMm: number | null) {
  const t = (s: TextSizeMm | null) => (s ? { lines: s.lines, widthMm: r1(s.widthMm), heightMm: r1(s.heightMm) } : null);
  return {
    circumferenceMm: r1(piece.circumferenceMm),
    bandHeightMm: r1(piece.bandHeightMm),
    text: t(text),
    text2: t(text2),
    artMm: artMm && artMm > 0 ? r1(artMm) : null,
  };
}
