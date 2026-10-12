/**
 * Geometría de los stickers: a partir del arte (con el fondo ya recortado)
 * calcula el contorno de corte —la silueta del diseño agrandada por un borde
 * blanco, o un rectángulo redondeado— y lo devuelve en milímetros reales.
 *
 * Todo se calcula sobre una máscara chica (≤ MASK_DIM px): alcanza para un
 * contorno suave y se recalcula al instante cuando cambia el tamaño.
 */

import type { StickerCutId } from "./sticker-pricing";

const MASK_DIM = 360;
/** Alfa a partir del cual un píxel cuenta como diseño (no como borde suave). */
const ALPHA_IN = 40;

export interface ArtMask {
  /** 1 = diseño, 0 = transparente. Tamaño w × h. */
  data: Uint8Array;
  w: number;
  h: number;
  /** Caja del contenido dentro de la máscara (px, inclusive). */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** Rasteriza el arte a una máscara binaria chica. */
export function buildArtMask(img: HTMLImageElement): ArtMask {
  const srcW = img.naturalWidth || img.width || 1;
  const srcH = img.naturalHeight || img.height || 1;
  const scale = Math.min(1, MASK_DIM / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;

  const data = new Uint8Array(w * h);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] >= ALPHA_IN) {
        data[y * w + x] = 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  // Imagen vacía: se trata como un rectángulo lleno para no romper nada.
  if (maxX < 0) {
    data.fill(1);
    minX = 0; minY = 0; maxX = w - 1; maxY = h - 1;
  }
  return { data, w, h, bounds: { minX, minY, maxX, maxY } };
}

export interface StickerShape {
  /** Tamaño final del sticker (mm), borde incluido. */
  widthMm: number;
  heightMm: number;
  /** Contorno de corte como path SVG, en mm, con origen en la esquina del sticker. */
  cutPath: string;
  /** Dónde va la imagen completa del arte dentro del sticker (mm). */
  imageBox: { x: number; y: number; w: number; h: number };
}

type Pt = [number, number];

/**
 * Contorno del sticker para que su LADO MAYOR mida `longSideMm`, con un borde
 * de `borderMm` alrededor del diseño.
 */
export function computeStickerShape(
  mask: ArtMask,
  longSideMm: number,
  borderMm: number,
  cut: StickerCutId,
): StickerShape {
  const { minX, minY, maxX, maxY } = mask.bounds;
  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  // mm por píxel de máscara: el contenido + 2 bordes ocupa el lado mayor.
  let k = Math.max(0.01, longSideMm - 2 * borderMm) / Math.max(contentW, contentH);
  const r = borderMm / k; // borde en px de máscara

  let polys: Pt[][];
  if (cut === "rectangulo") {
    polys = [roundedRect(minX - r, minY - r, maxX + 1 + r, maxY + 1 + r, r)];
  } else {
    polys = silhouette(mask, r);
    if (!polys.length) polys = [roundedRect(minX - r, minY - r, maxX + 1 + r, maxY + 1 + r, r)];
  }

  // Caja del contorno → origen del sticker.
  let bx1 = Infinity, by1 = Infinity, bx2 = -Infinity, by2 = -Infinity;
  for (const poly of polys) {
    for (const [x, y] of poly) {
      if (x < bx1) bx1 = x;
      if (y < by1) by1 = y;
      if (x > bx2) bx2 = x;
      if (y > by2) by2 = y;
    }
  }
  // El suavizado y el redondeo del píxel corren el tamaño unas décimas:
  // reescalar para que el lado mayor mida exactamente lo pedido.
  k *= longSideMm / (Math.max(bx2 - bx1, by2 - by1) * k);
  const f = (n: number) => (Math.round(n * 100) / 100).toString();
  const cutPath = polys
    .map(poly => "M" + poly.map(([x, y]) => `${f((x - bx1) * k)} ${f((y - by1) * k)}`).join(" L") + " Z")
    .join(" ");

  return {
    widthMm: (bx2 - bx1) * k,
    heightMm: (by2 - by1) * k,
    cutPath,
    imageBox: { x: -bx1 * k, y: -by1 * k, w: mask.w * k, h: mask.h * k },
  };
}

function roundedRect(x1: number, y1: number, x2: number, y2: number, rad: number): Pt[] {
  const r = Math.min(rad, (x2 - x1) / 2, (y2 - y1) / 2);
  const pts: Pt[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x2 - r, y1 + r, -Math.PI / 2);
  corner(x2 - r, y2 - r, 0);
  corner(x1 + r, y2 - r, Math.PI / 2);
  corner(x1 + r, y1 + r, Math.PI);
  return pts;
}

/**
 * Silueta: máscara agrandada `r` px (transformada de distancia), sin huecos
 * internos, y el contorno exterior de cada pieza que quede separada.
 */
function silhouette(mask: ArtMask, r: number): Pt[][] {
  const pad = Math.ceil(r) + 2;
  const W = mask.w + pad * 2;
  const H = mask.h + pad * 2;
  const N = W * H;

  // Distancia chamfer 3-4 a la píxel de diseño más cercana (en tercios de px).
  const INF = 1e9;
  const d = new Float32Array(N).fill(INF);
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      if (mask.data[y * mask.w + x]) d[(y + pad) * W + x + pad] = 0;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - W] + 3);
        if (x > 0) v = Math.min(v, d[i - W - 1] + 4);
        if (x < W - 1) v = Math.min(v, d[i - W + 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      let v = d[i];
      if (x < W - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < H - 1) {
        v = Math.min(v, d[i + W] + 3);
        if (x < W - 1) v = Math.min(v, d[i + W + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + W - 1] + 4);
      }
      d[i] = v;
    }
  }
  const limit = r * 3;
  const inside = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (d[i] <= limit) inside[i] = 1;

  // Rellenar huecos: lo que no se alcanza desde el borde exterior es interior.
  const outside = new Uint8Array(N);
  const stack: number[] = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (outside[p] || inside[p]) continue;
    outside[p] = 1;
    const x = p % W;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (p >= W) stack.push(p - W);
    if (p < N - W) stack.push(p + W);
  }
  for (let i = 0; i < N; i++) if (!outside[i]) inside[i] = 1;

  // Una pasada por cada pieza: rastrear su borde y marcarla como vista.
  const seen = new Uint8Array(N);
  const polys: Pt[][] = [];
  const minArea = Math.max(4, r * r); // migas: ni siquiera el borde las cubre
  for (let p = 0; p < N; p++) {
    if (!inside[p] || seen[p]) continue;
    const area = markComponent(inside, seen, W, H, p);
    if (area < minArea) continue;
    const chain = traceBoundary(inside, W, H, p);
    if (chain.length < 3) continue;
    const pts: Pt[] = chain.map(i => [(i % W) - pad + 0.5, Math.floor(i / W) - pad + 0.5]);
    polys.push(chaikin(simplify(pts, 0.7), 2));
  }
  return polys;
}

function markComponent(inside: Uint8Array, seen: Uint8Array, W: number, H: number, start: number): number {
  const stack = [start];
  let area = 0;
  seen[start] = 1;
  while (stack.length) {
    const p = stack.pop()!;
    area++;
    const x = p % W;
    const y = (p / W) | 0;
    const visit = (q: number) => {
      if (inside[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
    };
    if (x > 0) visit(p - 1);
    if (x < W - 1) visit(p + 1);
    if (y > 0) visit(p - W);
    if (y < H - 1) visit(p + W);
  }
  return area;
}

// Vecinos en sentido horario (y hacia abajo): E, SE, S, SO, O, NO, N, NE.
const DX = [1, 1, 0, -1, -1, -1, 0, 1];
const DY = [0, 1, 1, 1, 0, -1, -1, -1];

/**
 * Rastreo de Moore del borde exterior. `start` es el primer píxel de la pieza
 * en orden de barrido, así que su vecino oeste está siempre afuera.
 */
function traceBoundary(inside: Uint8Array, W: number, H: number, start: number): number[] {
  const isIn = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && inside[y * W + x] === 1;
  const chain = [start];
  let x = start % W;
  let y = (start / W) | 0;
  let back = 4; // vinimos del oeste
  let firstMove = -1;
  const maxSteps = W * H * 2;
  for (let step = 0; step < maxSteps; step++) {
    let found = -1;
    for (let k = 1; k <= 8; k++) {
      const dir = (back + k) % 8;
      if (isIn(x + DX[dir], y + DY[dir])) { found = dir; break; }
    }
    if (found < 0) break; // píxel aislado
    const atStart = y * W + x === start;
    if (atStart && step > 0 && found === firstMove) break;
    if (step === 0) firstMove = found;
    const prev = (found + 7) % 8; // último vecino de afuera revisado
    const nx = x + DX[found];
    const ny = y + DY[found];
    const bx = x + DX[prev] - nx;
    const by = y + DY[prev] - ny;
    back = DX.findIndex((dx, i) => dx === bx && DY[i] === by);
    if (back < 0) back = (found + 4) % 8;
    x = nx;
    y = ny;
    const idx = y * W + x;
    if (idx !== start) chain.push(idx);
  }
  return chain;
}

/** Douglas–Peucker sobre un polígono cerrado. */
function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 8) return pts;
  // Partir el anillo en el punto más lejano al primero: dos polilíneas abiertas.
  let far = 0, farD = -1;
  for (let i = 1; i < pts.length; i++) {
    const dd = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2;
    if (dd > farD) { farD = dd; far = i; }
  }
  const a = rdp(pts.slice(0, far + 1), eps);
  const b = rdp([...pts.slice(far), pts[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  const [x1, y1] = pts[0];
  const [x2, y2] = pts[pts.length - 1];
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const dist = Math.abs((y2 - y1) * pts[i][0] - (x2 - x1) * pts[i][1] + x2 * y1 - y2 * x1) / len;
    if (dist > max) { max = dist; idx = i; }
  }
  if (max <= eps) return [pts[0], pts[pts.length - 1]];
  const left = rdp(pts.slice(0, idx + 1), eps);
  const right = rdp(pts.slice(idx), eps);
  return [...left.slice(0, -1), ...right];
}

/** Suavizado de Chaikin (polígono cerrado): saca los serruchos del píxel. */
function chaikin(pts: Pt[], iterations: number): Pt[] {
  let out = pts;
  for (let it = 0; it < iterations; it++) {
    const next: Pt[] = [];
    for (let i = 0; i < out.length; i++) {
      const [x1, y1] = out[i];
      const [x2, y2] = out[(i + 1) % out.length];
      next.push([0.75 * x1 + 0.25 * x2, 0.75 * y1 + 0.25 * y2]);
      next.push([0.25 * x1 + 0.75 * x2, 0.25 * y1 + 0.75 * y2]);
    }
    out = next;
  }
  return out;
}
