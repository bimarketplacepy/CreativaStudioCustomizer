// Generador del ARCHIVO VECTORIAL DE PRODUCCIÓN (SVG) de un pedido.
// Uso interno del taller (operario de láser/UV/plotter) — nunca llega al
// cliente. Todo el texto va convertido a curvas (<path>) con la tipografía
// exacta del diseño; cero elementos <text> en el archivo.

import opentype from "opentype.js";
import { loadProductionFont, loadInfoFont, type LoadedFont } from "./production-fonts";
import { productionIconById } from "./production-icons";

// ─────────────────────────────────────────────────────────────────────────────
// Dimensiones físicas reales del área grabable por producto, en milímetros.
// AJUSTAR según medidas reales del taller.
// La clave es el nombre del producto en minúsculas (campo `product` del pedido).
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCT_AREAS_MM: Record<string, { w: number; h: number }> = {
  termo:      { w: 80, h: 110 },
  chopera:    { w: 90, h: 85 },
  hoppie:     { w: 75, h: 100 },
  vaso:       { w: 70, h: 90 },
  copa:       { w: 60, h: 70 },
  botella:    { w: 70, h: 120 },
  guampa:     { w: 60, h: 80 },
  "bolígrafo": { w: 60, h: 8 },
};
/** AJUSTAR: área usada cuando el producto no está en la tabla. */
const DEFAULT_AREA_MM = { w: 80, h: 100 };

// Rectángulo frontal del customizer (espejo de face-area.ts del landing):
// las Placement u/v del designState viven en este espacio.
// MANTENER EN SINCRONÍA con termos-landing/src/lib/face-area.ts.
const FRONT_FACE = { uMin: 0.28, uMax: 0.72, vMin: 0.08, vMax: 0.92 } as const;

/** Margen interno del área (fracción), igual que textPadFrac del landing. */
const AREA_PAD_FRAC = 0.05;
/** AJUSTAR: alto del texto a escala 1, como fracción del alto útil del área. */
const TEXT_BASE_FRACTION = 0.35;
/** AJUSTAR: lado del ícono a escala 1, como fracción del lado menor útil. */
const ICON_BASE_FRACTION = 0.38;
/** AJUSTAR: ancho del logo/foto a escala 1, como fracción del ancho útil. */
const LOGO_BASE_FRACTION = 0.6;
/** Franja inferior (mm) para la capa de info NO imprimible. */
const INFO_STRIP_MM = 18;

export type ProductionMode = "laser" | "uv" | "cut";

/** Placement tal como viaja en designState (tolerante a campos faltantes). */
interface PlacementLike {
  u?: number;
  v?: number;
  scale?: number;
  align?: string;
  layout?: string;
  lineHeight?: number;
  orientation?: string;
}

export interface ProductionInput {
  orderNumber: string;
  product: string;
  technique: string;
  createdAt: Date;
  text?: string | null;
  fontId?: string | null;
  textColor?: string | null;
  iconId?: string | null;
  /** Data URL del logo/foto original subido por el cliente (máx. resolución). */
  customImageDataUrl?: string | null;
  textPlacement?: PlacementLike | null;
  artPlacement?: PlacementLike | null;
}

/** Técnica del pedido → modo de color del archivo. */
export function productionMode(technique: string): ProductionMode {
  const t = technique.toLowerCase();
  if (/uv|color/.test(t)) return "uv";
  if (/plotter|corte/.test(t)) return "cut";
  return "laser";
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Los comentarios XML no pueden contener "--". */
const escComment = (s: string) => s.replace(/-{2,}/g, "-");

const round = (n: number) => Math.round(n * 1000) / 1000;

// ── Layout de texto (puerto del engraving-text.ts del landing, con opentype
//    como medidor en lugar del canvas) ─────────────────────────────────────────

type Measure = (s: string) => number;

function pushHardBroken(rows: string[], word: string, fits: (s: string) => boolean): string {
  let w = word;
  while (w.length > 1 && !fits(w)) {
    let cut = 1;
    while (cut < w.length && fits(w.slice(0, cut + 1))) cut++;
    rows.push(w.slice(0, cut));
    w = w.slice(cut);
  }
  return w;
}

function wrapToWidth(text: string, maxWidth: number, measure: Measure): string[] {
  if (!text) return [];
  const fits = (s: string) => measure(s) <= maxWidth;
  const rows: string[] = [];
  for (const segment of text.split("\n")) {
    let line = "";
    for (const word of segment.split(" ")) {
      if (word === "") continue;
      if (!line) line = pushHardBroken(rows, word, fits);
      else if (fits(`${line} ${word}`)) line = `${line} ${word}`;
      else {
        rows.push(line);
        line = pushHardBroken(rows, word, fits);
      }
    }
    rows.push(line);
  }
  return rows.length ? rows : [text];
}

function layoutLines(text: string, layout: string, maxWidth: number, measure: Measure): string[] {
  if (!text) return [];
  switch (layout) {
    case "stack": {
      const fits = (s: string) => measure(s) <= maxWidth;
      const rows: string[] = [];
      for (const word of text.split(/\s+/)) {
        if (word === "") continue;
        rows.push(pushHardBroken(rows, word, fits));
      }
      return rows.length ? rows : [text];
    }
    case "manual": {
      const rows = text.split("\n");
      while (rows.length > 1 && rows[rows.length - 1] === "") rows.pop();
      return rows;
    }
    case "wrap360":
      // Envolvente 360°: en el archivo plano queda como UNA línea; el operario
      // la envuelve alrededor del cuerpo (ver nota en la capa de info).
      return [text.replace(/\n+/g, " ").trim() || text];
    case "auto":
    default:
      return wrapToWidth(text, maxWidth, measure);
  }
}

// ── Motor de shaping por glifo ───────────────────────────────────────────────
// No usamos font.getPath()/getAdvanceWidth(): su pipeline BiDi aplica tablas
// GSUB (ccmp) incondicionalmente y varias fuentes (Inter incluida) traen
// lookups que la versión actual de opentype.js no soporta → crash. Componer
// glifo a glifo (charToGlyph + kerning manual) es determinista para las 23
// fuentes del customizer; solo se pierden ligaduras, irrelevantes en grabado.

function runAdvance(lf: LoadedFont, text: string, size: number): number {
  const scale = size / lf.font.unitsPerEm;
  let w = 0;
  let prev: opentype.Glyph | null = null;
  for (const ch of text) {
    const g = lf.font.charToGlyph(ch);
    if (prev) w += lf.font.getKerningValue(prev, g) * scale;
    w += (g.advanceWidth ?? 0) * scale + lf.letterSpacing * size;
    prev = g;
  }
  return w;
}

function runPath(lf: LoadedFont, text: string, x: number, y: number, size: number): opentype.Path {
  const scale = size / lf.font.unitsPerEm;
  const out = new opentype.Path();
  let cx = x;
  let prev: opentype.Glyph | null = null;
  for (const ch of text) {
    const g = lf.font.charToGlyph(ch);
    if (prev) cx += lf.font.getKerningValue(prev, g) * scale;
    out.extend(g.getPath(cx, y, size));
    cx += (g.advanceWidth ?? 0) * scale + lf.letterSpacing * size;
    prev = g;
  }
  return out;
}

interface Bounds { x1: number; y1: number; x2: number; y2: number }

function unionBounds(a: Bounds | null, b: Bounds): Bounds {
  if (!a) return b;
  return { x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1), x2: Math.max(a.x2, b.x2), y2: Math.max(a.y2, b.y2) };
}

interface TextBlock {
  /** Datos `d` de todos los renglones (un solo <path> los une). */
  d: string;
  /** Bounding box de tinta real del bloque, en mm. */
  bounds: Bounds;
}

/** Convierte los renglones a curvas con alineación e interlineado, en mm. */
function buildTextBlock(
  lf: LoadedFont,
  lines: string[],
  fontMm: number,
  lineHeightMul: number,
  align: string,
): TextBlock | null {
  const measure = (s: string) => runAdvance(lf, s, fontMm);
  const rowH = fontMm * lineHeightMul;
  const widths = lines.map(measure);
  const blockW = Math.max(...widths, 0);

  const parts: string[] = [];
  let bounds: Bounds | null = null;
  const addPath = (s: string, x: number, y: number) => {
    const p = runPath(lf, s, x, y, fontMm);
    const bb = p.getBoundingBox();
    if (Number.isFinite(bb.x1) && bb.x1 !== bb.x2) {
      bounds = unionBounds(bounds, { x1: bb.x1, y1: bb.y1, x2: bb.x2, y2: bb.y2 });
    }
    const d = p.toPathData(3);
    if (d) parts.push(d);
  };

  lines.forEach((line, i) => {
    const y = i * rowH; // baseline del renglón i
    if (!line) return;
    if (align === "right") {
      addPath(line, blockW - widths[i]!, y);
      return;
    }
    if (align === "left") {
      addPath(line, 0, y);
      return;
    }
    if (align === "justify") {
      const words = line.split(" ").filter(Boolean);
      const isLast = i === lines.length - 1;
      if (!isLast && words.length >= 2 && widths[i]! < blockW) {
        const wordsW = words.reduce((s, w) => s + measure(w), 0);
        const gap = (blockW - wordsW) / (words.length - 1);
        let x = 0;
        for (const w of words) {
          addPath(w, x, y);
          x += measure(w) + gap;
        }
        return;
      }
      addPath(line, 0, y); // último renglón: cae a izquierda, como en el 3D
      return;
    }
    // center (default)
    addPath(line, (blockW - widths[i]!) / 2, y);
  });

  if (!bounds || !parts.length) return null;
  return { d: parts.join(" "), bounds };
}

/**
 * Ajuste tipo fitText del landing: arranca en el tamaño pedido y encoge hasta
 * que la caja de tinta entra en maxW×maxH (12 iteraciones máx.).
 */
function fitTextBlock(
  lf: LoadedFont,
  rawText: string,
  requestedMm: number,
  maxW: number,
  maxH: number,
  layout: string,
  lineHeightMul: number,
  align: string,
): TextBlock | null {
  const text = lf.uppercase ? rawText.toUpperCase() : rawText;
  const minMm = 2; // por debajo de 2mm el grabado no resuelve
  let fontMm = Math.max(minMm, requestedMm);
  let block: TextBlock | null = null;

  for (let i = 0; i < 12; i++) {
    const measure = (s: string) => runAdvance(lf, s, fontMm);
    const lines = layoutLines(text, layout, maxW, measure);
    block = buildTextBlock(lf, lines, fontMm, lineHeightMul, align);
    if (!block) return null;
    const w = block.bounds.x2 - block.bounds.x1;
    const h = block.bounds.y2 - block.bounds.y1;
    const ratio = Math.min(w > maxW ? maxW / w : 1, h > maxH ? maxH / h : 1);
    if (ratio >= 1 || fontMm <= minMm) break;
    const next = Math.max(minMm, fontMm * ratio * 0.98);
    if (next >= fontMm) break;
    fontMm = next;
  }
  return block;
}

// ── Posicionamiento ──────────────────────────────────────────────────────────

/** u/v del placement → posición relativa 0..1 dentro del área frontal. */
function relPos(p: PlacementLike | null | undefined): { x: number; y: number } {
  const u = typeof p?.u === "number" ? p.u : 0.5;
  const v = typeof p?.v === "number" ? p.v : 0.5;
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  return {
    x: clamp01((u - FRONT_FACE.uMin) / (FRONT_FACE.uMax - FRONT_FACE.uMin)),
    y: clamp01((v - FRONT_FACE.vMin) / (FRONT_FACE.vMax - FRONT_FACE.vMin)),
  };
}

// ── Generador principal ──────────────────────────────────────────────────────

export async function buildProductionSvg(input: ProductionInput): Promise<string> {
  const mode = productionMode(input.technique);
  const area = PRODUCT_AREAS_MM[input.product.trim().toLowerCase()] ?? DEFAULT_AREA_MM;

  const padX = area.w * AREA_PAD_FRAC;
  const padY = area.h * AREA_PAD_FRAC;
  const usableW = area.w - padX * 2;
  const usableH = area.h - padY * 2;

  // Colores según técnica: láser = negro puro sólido; UV = colores reales;
  // plotter = solo contornos negros.
  const CUT_STROKE_MM = 0.25;
  const fillAttrsFor = (uvColor: string | null | undefined): string => {
    if (mode === "cut") return `fill="none" stroke="#000000" stroke-width="${CUT_STROKE_MM}"`;
    if (mode === "uv") return `fill="${esc(uvColor || "#000000")}"`;
    return `fill="#000000"`;
  };

  const body: string[] = [];
  const warnings: string[] = [];

  // ── Texto a curvas ──
  const text = (input.text ?? "").trim();
  if (text) {
    const lf = await loadProductionFont(input.fontId);
    if (lf) {
      const p = input.textPlacement ?? {};
      const vertical = p.orientation === "vertical";
      const scale = typeof p.scale === "number" && p.scale > 0 ? p.scale : 1;
      const layout = p.layout ?? "auto";
      const align = p.align ?? "center";
      const lineHeightMul = typeof p.lineHeight === "number" ? p.lineHeight : 1.12;
      // En vertical el bloque se rota -90°: los límites se intercambian.
      const maxW = vertical ? usableH : usableW;
      const maxH = vertical ? usableW : usableH;
      const requestedMm = usableH * TEXT_BASE_FRACTION * scale;

      const block = fitTextBlock(lf, text, requestedMm, maxW, maxH, layout, lineHeightMul, align);
      if (block) {
        const rel = relPos(input.textPlacement);
        const cx = padX + rel.x * usableW;
        const cy = padY + rel.y * usableH;
        const bcx = (block.bounds.x1 + block.bounds.x2) / 2;
        const bcy = (block.bounds.y1 + block.bounds.y2) / 2;
        const rotate = vertical ? ` rotate(-90 ${round(bcx)} ${round(bcy)})` : "";
        body.push(
          `  <g id="texto" transform="translate(${round(cx - bcx)} ${round(cy - bcy)})${rotate}">`,
          `    <path d="${block.d}" ${fillAttrsFor(input.textColor)}/>`,
          `  </g>`,
        );
        if ((p.layout ?? "auto") === "wrap360") {
          warnings.push("Texto envolvente 360°: en este archivo va como una sola línea; envolver alrededor del cuerpo.");
        }
      }
    } else {
      warnings.push(`No se pudo cargar la fuente (${input.fontId ?? "?"}); texto omitido — regenerar a mano.`);
    }
  }

  // ── Ícono como vector nativo ──
  const icon = productionIconById(input.iconId);
  if (icon) {
    const p = input.artPlacement ?? {};
    const scale = typeof p.scale === "number" && p.scale > 0 ? p.scale : 1;
    const box = Math.min(usableW, usableH) * ICON_BASE_FRACTION * scale;
    const rel = relPos(input.artPlacement);
    const cx = padX + rel.x * usableW;
    const cy = padY + rel.y * usableH;
    let iconBody = icon.body;
    if (mode === "cut") {
      // Plotter: solo contornos. stroke-width en unidades del viewBox 24.
      const strokeU = round((CUT_STROKE_MM * 24) / box);
      iconBody = iconBody
        .replace(/fill="currentColor"/g, `fill="none" stroke="#000000" stroke-width="${strokeU}"`)
        .replace(/stroke="currentColor"/g, `stroke="#000000"`);
    } else {
      // Láser y UV: el ícono del diseño es monocromático (así lo previsualiza
      // el cliente); negro puro sólido.
      iconBody = iconBody.replace(/currentColor/g, "#000000");
    }
    body.push(
      `  <g id="icono-${esc(icon.id)}" transform="translate(${round(cx - box / 2)} ${round(cy - box / 2)}) scale(${round(box / 24)})">`,
      `    ${iconBody}`,
      `  </g>`,
    );
  }

  // ── Logo/foto del cliente, embebido en máxima resolución disponible ──
  const dataUrl = input.customImageDataUrl?.trim();
  if (dataUrl && /^data:image\/(png|jpeg|svg\+xml|webp);base64,/.test(dataUrl)) {
    const p = input.artPlacement ?? {};
    const scale = typeof p.scale === "number" && p.scale > 0 ? p.scale : 1;
    const box = Math.min(usableW * LOGO_BASE_FRACTION * scale, usableW, usableH);
    const rel = relPos(input.artPlacement);
    const cx = padX + rel.x * usableW;
    const cy = padY + rel.y * usableH;
    body.push(
      `  <!-- LOGO RASTER - revisar/vectorizar manualmente si es grabado láser -->`,
      `  <image id="logo-cliente" x="${round(cx - box / 2)}" y="${round(cy - box / 2)}" width="${round(box)}" height="${round(box)}" preserveAspectRatio="xMidYMid meet" href="${dataUrl}"/>`,
    );
    if (mode === "laser") warnings.push("Incluye logo/foto raster: vectorizar antes de grabar a láser.");
  }

  // ── Capa de info NO imprimible (borrable de un click) ──
  const totalH = area.h + INFO_STRIP_MM;
  const dateStr = input.createdAt.toISOString().slice(0, 10);
  const infoLines = [
    `PEDIDO ${input.orderNumber} · ${input.product.toUpperCase()} · ${input.technique.toUpperCase()}`,
    `Área grabable: ${area.w}×${area.h} mm · ${dateStr} · CAPA NO IMPRIMIR`,
    ...warnings,
  ];
  const infoFont = await loadInfoFont();
  const infoPaths: string[] = [];
  if (infoFont) {
    const size = 3; // mm
    infoLines.forEach((line, i) => {
      const p = runPath(infoFont, line, padX, area.h + 6 + i * (size * 1.35), size);
      const d = p.toPathData(3);
      if (d) infoPaths.push(`    <path d="${d}" fill="#888888"/>`);
    });
  }

  const meta = escComment(
    [
      `ARCHIVO DE PRODUCCION - USO INTERNO - NO ENVIAR AL CLIENTE`,
      `Pedido: ${input.orderNumber}`,
      `Producto: ${input.product}`,
      `Técnica: ${input.technique} (modo ${mode})`,
      `Área grabable: ${area.w}x${area.h} mm`,
      `Fecha: ${dateStr}`,
      ...warnings,
    ].join(" | "),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- ${meta} -->`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${area.w}mm" height="${totalH}mm" viewBox="0 0 ${area.w} ${totalH}">`,
    ...body,
    `  <g id="INFO-NO-IMPRIMIR">`,
    `    <!-- Capa informativa para el operario: borrar antes de producir. -->`,
    `    <rect x="0" y="0" width="${area.w}" height="${area.h}" fill="none" stroke="#bbbbbb" stroke-width="0.2" stroke-dasharray="2 1.5"/>`,
    `    <line x1="0" y1="${area.h + 2}" x2="${area.w}" y2="${area.h + 2}" stroke="#bbbbbb" stroke-width="0.2"/>`,
    ...infoPaths,
    `  </g>`,
    `</svg>`,
    ``,
  ].join("\n");
}
