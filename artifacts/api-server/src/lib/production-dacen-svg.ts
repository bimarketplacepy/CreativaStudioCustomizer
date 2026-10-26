// Archivo VECTORIAL de la Dacen F5 (DACEN.md §12.10). El taller pidió la
// imagen en PNG de alta calidad y los textos y logos en vector: este SVG trae
// las dos cosas por capas, a tamaño real (mm), con la vuelta completa del vaso:
//
//   IMAGEN  → el PNG que arma la landing (fondo 360°, fotos y logos raster).
//   LOGOS   → ícono de la galería y logos SVG del cliente, en vector.
//   TEXTOS  → los textos convertidos a curvas con la tipografía exacta.
//
// La landing manda cada marca con su transformación exacta (la misma del canvas
// que dibuja el 3D), así que el vector cae justo donde el cliente lo vio.

import { loadProductionFont } from "./production-fonts";
import { productionIconById } from "./production-icons";
import { runAdvance, runPath } from "./production-svg";

type Matrix = [number, number, number, number, number, number];

interface TextMark {
  kind: "text";
  fontId: string | null;
  color: string;
  lines: string[];
  fontPx: number;
  lineHeight: number;
  blockW: number;
  align: string;
  matrix: Matrix;
}
interface IconMark { kind: "icon"; iconId: string; color: string; w: number; h: number; matrix: Matrix }
interface SvgMark { kind: "svg"; svg: string; w: number; h: number; matrix: Matrix }
type Mark = TextMark | IconMark | SvgMark;

const MAX_MARKS = 60;
const MAX_LINES = 12;
const MAX_SVG_CHARS = 400_000;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const color = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{3,8}$/i.test(v) ? v : "#000000");
const fmt = (v: number) => (Math.round(v * 1000) / 1000).toString();

function matrixOf(v: unknown): Matrix | null {
  if (!Array.isArray(v) || v.length !== 6) return null;
  const m = v.map(num);
  return m.every((x): x is number => x !== null && Math.abs(x) < 1e6) ? (m as Matrix) : null;
}

/** Valida lo que manda la landing: lo que no cierra se descarta. */
export function parseVectorMarks(raw: unknown): Mark[] {
  if (!Array.isArray(raw)) return [];
  const out: Mark[] = [];
  for (const r of raw.slice(0, MAX_MARKS)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const matrix = matrixOf(o.matrix);
    if (!matrix) continue;
    if (o.kind === "text" && Array.isArray(o.lines)) {
      const fontPx = num(o.fontPx), lineHeight = num(o.lineHeight), blockW = num(o.blockW);
      if (!fontPx || fontPx <= 0 || lineHeight === null || blockW === null) continue;
      const lines = o.lines.filter((l): l is string => typeof l === "string").slice(0, MAX_LINES).map(l => l.slice(0, 200));
      out.push({
        kind: "text", fontId: typeof o.fontId === "string" ? o.fontId : null, color: color(o.color),
        lines, fontPx, lineHeight, blockW, align: typeof o.align === "string" ? o.align : "center", matrix,
      });
    } else if (o.kind === "icon" && typeof o.iconId === "string") {
      const w = num(o.w), h = num(o.h);
      if (w && h) out.push({ kind: "icon", iconId: o.iconId, color: color(o.color), w, h, matrix });
    } else if (o.kind === "svg" && typeof o.svg === "string" && o.svg.length <= MAX_SVG_CHARS) {
      const w = num(o.w), h = num(o.h);
      if (w && h) out.push({ kind: "svg", svg: o.svg, w, h, matrix });
    }
  }
  return out;
}

/**
 * SVG subido por el cliente → contenido seguro para incrustar: sin scripts,
 * eventos, foreignObject ni referencias externas (el archivo se abre en el
 * panel del taller).
 */
function embedSvg(svg: string, w: number, h: number): string | null {
  const root = svg.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>/i);
  if (!root) return null;
  const attrs = root[1] ?? "";
  const vb = attrs.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1]
    ?? (() => {
      const aw = parseFloat(attrs.match(/\bwidth\s*=\s*["']([\d.]+)/i)?.[1] ?? "");
      const ah = parseFloat(attrs.match(/\bheight\s*=\s*["']([\d.]+)/i)?.[1] ?? "");
      return aw > 0 && ah > 0 ? `0 0 ${aw} ${ah}` : null;
    })();
  if (!vb || !/^[\d.\s,eE+-]+$/.test(vb)) return null;
  const inner = (root[2] ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/\s(?:xlink:)?href\s*=\s*("(?!#|data:image\/)[^"]*"|'(?!#|data:image\/)[^']*')/gi, "")
    .replace(/url\(\s*(['"]?)(?!#)[^)]*\)/gi, "none");
  return `<svg x="${fmt(-w / 2)}" y="${fmt(-h / 2)}" width="${fmt(w)}" height="${fmt(h)}" viewBox="${vb}" preserveAspectRatio="none">${inner}</svg>`;
}

const transform = (m: Matrix) => `matrix(${m.map(fmt).join(" ")})`;

async function textPath(mark: TextMark): Promise<string | null> {
  const lf = await loadProductionFont(mark.fontId);
  if (!lf) return null;
  const size = mark.fontPx;
  const scale = size / lf.font.unitsPerEm;
  // El canvas dibuja con textBaseline "middle" (mitad del em): la línea base
  // queda (ascender + descender) / 2 más abajo.
  const middleToBaseline = ((lf.font.ascender + lf.font.descender) / 2) * scale;
  const top = -((mark.lines.length - 1) * mark.lineHeight) / 2;
  const parts: string[] = [];
  mark.lines.forEach((raw, i) => {
    const line = lf.uppercase ? raw.toUpperCase() : raw;
    if (!line.trim()) return;
    const adv = runAdvance(lf, line, size);
    const x = mark.align === "center" ? -adv / 2
      : mark.align === "right" ? mark.blockW / 2 - adv
      : -mark.blockW / 2;
    const y = top + i * mark.lineHeight + middleToBaseline;
    parts.push(runPath(lf, line, x, y, size).toPathData(3));
  });
  if (!parts.length) return null;
  return `<path transform="${transform(mark.matrix)}" fill="${mark.color}" d="${parts.join(" ")}"/>`;
}

export interface DacenSvgInput {
  orderNumber: string;
  widthMm: number;
  heightMm: number;
  /** PNG con los dpi ya grabados (capa IMAGEN). */
  png: Buffer | null;
  marks: Mark[];
}

export async function buildDacenSvg(input: DacenSvgInput): Promise<string> {
  const W = input.widthMm, H = input.heightMm;
  const logos: string[] = [];
  const texts: string[] = [];
  for (const m of input.marks) {
    if (m.kind === "text") {
      const p = await textPath(m);
      if (p) texts.push(p);
    } else if (m.kind === "icon") {
      const icon = productionIconById(m.iconId);
      if (!icon) continue;
      logos.push(
        `<g transform="${transform(m.matrix)} translate(${fmt(-m.w / 2)} ${fmt(-m.h / 2)}) scale(${fmt(m.w / 24)} ${fmt(m.h / 24)})" color="${m.color}">${icon.body}</g>`,
      );
    } else {
      const svg = embedSvg(m.svg, m.w, m.h);
      if (svg) logos.push(`<g transform="${transform(m.matrix)}">${svg}</g>`);
    }
  }
  const image = input.png
    ? `<image x="0" y="0" width="${fmt(W)}" height="${fmt(H)}" preserveAspectRatio="none" href="data:image/png;base64,${input.png.toString("base64")}"/>`
    : "";
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(W)}mm" height="${fmt(H)}mm" viewBox="0 0 ${fmt(W)} ${fmt(H)}">`,
    `<title>${input.orderNumber} · Dacen F5 · vuelta completa ${Math.round(W)} × ${Math.round(H)} mm (frente al centro, costura en los bordes)</title>`,
    `<defs><clipPath id="vuelta"><rect x="0" y="0" width="${fmt(W)}" height="${fmt(H)}"/></clipPath></defs>`,
    `<g id="IMAGEN">${image}</g>`,
    `<g id="LOGOS" clip-path="url(#vuelta)">${logos.join("")}</g>`,
    `<g id="TEXTOS" clip-path="url(#vuelta)">${texts.join("")}</g>`,
    `</svg>`,
  ].join("\n");
}
