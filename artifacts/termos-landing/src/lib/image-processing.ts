export interface ProcessedImage {
  svgDataUrl: string;
  width: number;
  height: number;
  /**
   * False when no flat background could be identified. The original image is
   * then kept whole rather than risk cutting into the artwork.
   */
  backgroundRemoved: boolean;
  /**
   * The alternative rendition, when one exists: the untouched original while
   * the cut-out is active, and vice versa. Lets the customer swap versions if
   * the automatic cut looks off. Never nested more than one level.
   */
  other?: ProcessedImage;
}

const MAX_DIM = 1200;
const ENGRAVE_MASK_MAX_DIM = 768;

/** Colour distance below which a pixel is certainly background. */
const NEAR = 30;
/** Above this distance a pixel is certainly artwork. In between the pixel gets
 *  a partial alpha, which is what keeps the cut-out edge soft. */
const FAR = 72;

/** How closely border pixels must agree before we call the background flat. */
const BORDER_TOLERANCE = 34;
/** ...and how much of the border has to agree. A busy border (photo, gradient,
 *  collage) fails this and the image is kept whole — a wrong cut looks far
 *  worse than no cut. */
const MIN_BORDER_AGREEMENT = 0.86;

/** A fill that clears less than this found an edge artifact, not a background. */
const MIN_REMOVED_FRACTION = 0.04;
/** A fill that clears more than this ate the artwork. */
const MAX_REMOVED_FRACTION = 0.97;

/** Fraction of fully-clear pixels that means the file already carries a cut-out. */
const OWN_TRANSPARENCY_FRACTION = 0.02;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Perceptual luminance, 0–255. */
const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

/**
 * Downloads an image from a remote URL as a Blob ready for `fileToProcessedSvg`.
 * Most image hosts don't send CORS headers, so a direct fetch is tried first
 * and, if it fails, the request is retried through the images.weserv.nl proxy,
 * which serves any public image with CORS enabled.
 */
export async function fetchImageBlob(url: string): Promise<Blob> {
  const attempts = [url, `https://images.weserv.nl/?url=${encodeURIComponent(url)}`];
  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      // Some hosts omit or genericise the content type; the decoder is the
      // final judge, so only clearly-not-an-image responses are rejected here.
      if (blob.type && !blob.type.startsWith("image/") && blob.type !== "application/octet-stream") {
        throw new Error(`Tipo de contenido no soportado: ${blob.type}`);
      }
      return blob;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("No se pudo descargar la imagen.");
}

function drawScaled(img: CanvasImageSource, srcW: number, srcH: number, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(srcW * scale));
  canvas.height = Math.max(1, Math.round(srcH * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** True when the file already ships its own cut-out, which we trust as-is. */
function hasOwnTransparency(data: Uint8ClampedArray): boolean {
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 8) clear++;
  }
  return clear / (data.length / 4) > OWN_TRANSPARENCY_FRACTION;
}

interface BorderColor {
  r: number;
  g: number;
  b: number;
  /** 0–1 share of border pixels within BORDER_TOLERANCE of this colour. */
  agreement: number;
}

/**
 * The dominant colour of the two-pixel ring around the image, and how uniform
 * that ring is. We take the mode of a coarse colour histogram rather than the
 * mean, so a subject that runs off one edge does not drag the estimate with it.
 */
function sampleBorder(data: Uint8ClampedArray, width: number, height: number): BorderColor | null {
  const RING = 2;
  const offsets: number[] = [];

  const consider = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    if (data[i + 3] < 200) return;
    offsets.push(i);
  };
  for (let x = 0; x < width; x++) {
    for (let t = 0; t < RING && t < height; t++) {
      consider(x, t);
      consider(x, height - 1 - t);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let t = 0; t < RING && t < width; t++) {
      consider(t, y);
      consider(width - 1 - t, y);
    }
  }
  if (!offsets.length) return null;

  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (const i of offsets) {
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.n++;
      bucket.r += data[i];
      bucket.g += data[i + 1];
      bucket.b += data[i + 2];
    } else {
      buckets.set(key, { n: 1, r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }

  let best = { n: 0, r: 0, g: 0, b: 0 };
  for (const bucket of buckets.values()) {
    if (bucket.n > best.n) best = bucket;
  }
  const r = best.r / best.n;
  const g = best.g / best.n;
  const b = best.b / best.n;

  let agreed = 0;
  for (const i of offsets) {
    const dr = data[i] - r;
    const dg = data[i + 1] - g;
    const db = data[i + 2] - b;
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= BORDER_TOLERANCE) agreed++;
  }

  return { r, g, b, agreement: agreed / offsets.length };
}

/**
 * Flood-fills inward from the edges, clearing whatever matches `bg`. Pixels
 * between NEAR and FAR get a partial alpha and stop the fill, which leaves an
 * anti-aliased rim instead of a jagged one.
 *
 * Mutates `data`. Returns the fraction of pixels it turned transparent.
 */
function eraseFlatBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: BorderColor
): number {
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  for (let x = 0; x < width; x++) {
    stack.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width, y * width + width - 1);
  }

  let removed = 0;
  while (stack.length) {
    const p = stack.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;

    const i = p * 4;
    const dr = data[i] - bg.r;
    const dg = data[i + 1] - bg.g;
    const db = data[i + 2] - bg.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist >= FAR) continue;

    const keep = dist <= NEAR ? 0 : (dist - NEAR) / (FAR - NEAR);
    const before = data[i + 3];
    const after = Math.round(before * keep);
    data[i + 3] = after;
    if (before >= 128 && after < 128) removed++;

    // Only fully-background pixels spread the fill; the ramp is the boundary.
    if (dist > NEAR) continue;
    const x = p % width;
    const y = (p / width) | 0;
    const left = x > 0;
    const right = x < width - 1;
    const up = y > 0;
    const down = y < height - 1;
    if (left) stack.push(p - 1);
    if (right) stack.push(p + 1);
    if (up) stack.push(p - width);
    if (down) stack.push(p + width);
    if (left && up) stack.push(p - width - 1);
    if (right && up) stack.push(p - width + 1);
    if (left && down) stack.push(p + width - 1);
    if (right && down) stack.push(p + width + 1);
  }

  return removed / (width * height);
}

/** Bounding box of everything that survived the cut-out. The alpha threshold
 *  is deliberately near zero: a fill that half-faded the artwork's light edges
 *  must never also crop them away. */
function contentBounds(data: Uint8ClampedArray, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 2) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };

  const pad = Math.round(Math.max(width, height) * 0.03);
  return {
    minX: Math.max(0, minX - pad),
    minY: Math.max(0, minY - pad),
    maxX: Math.min(width - 1, maxX + pad),
    maxY: Math.min(height - 1, maxY + pad),
  };
}

function crop(canvas: HTMLCanvasElement, b: ReturnType<typeof contentBounds>): HTMLCanvasElement {
  const w = b.maxX - b.minX + 1;
  const h = b.maxY - b.minY + 1;
  if (w === canvas.width && h === canvas.height) return canvas;

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(canvas, b.minX, b.minY, w, h, 0, 0, w, h);
  return out;
}

function canvasToSvgDataUrl(canvas: HTMLCanvasElement): string {
  const pngDataUrl = canvas.toDataURL("image/png");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image href="${pngDataUrl}" x="0" y="0" width="${canvas.width}" height="${canvas.height}" /></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Cuts the background out of a logo or drawing — but only when it can prove
 * there is a flat background to cut. A photograph, a gradient backdrop or a
 * fill that swallows the subject all fall back to the untouched image, because
 * a bad cut-out engraves worse than no cut-out at all.
 */
export async function fileToProcessedSvg(file: Blob): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const canvas = drawScaled(img, img.naturalWidth, img.naturalHeight, MAX_DIM);
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // The file already ships its own cut-out: trust it, just trim the margins.
  if (hasOwnTransparency(data)) {
    const output = crop(canvas, contentBounds(data, width, height));
    return {
      svgDataUrl: canvasToSvgDataUrl(output),
      width: output.width,
      height: output.height,
      backgroundRemoved: true,
    };
  }

  const bg = sampleBorder(data, width, height);
  if (bg && bg.agreement >= MIN_BORDER_AGREEMENT) {
    const removed = eraseFlatBackground(data, width, height, bg);
    if (removed >= MIN_REMOVED_FRACTION && removed <= MAX_REMOVED_FRACTION) {
      // Nearly-invisible remnants of the fill's soft rim read as dirty halos
      // around the cut — drop them before measuring the content bounds.
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0 && data[i] < 12) data[i] = 0;
      }

      // The untouched rendition is kept alongside the cut-out so the customer
      // can swap back when the automatic cut misfires on their artwork.
      const original: ProcessedImage = {
        svgDataUrl: canvasToSvgDataUrl(canvas),
        width: canvas.width,
        height: canvas.height,
        backgroundRemoved: false,
      };

      ctx.putImageData(imageData, 0, 0);
      const output = crop(canvas, contentBounds(data, width, height));
      return {
        svgDataUrl: canvasToSvgDataUrl(output),
        width: output.width,
        height: output.height,
        backgroundRemoved: true,
        other: original,
      };
    }
  }

  // No provable flat background — keep the image whole.
  return {
    svgDataUrl: canvasToSvgDataUrl(canvas),
    width: canvas.width,
    height: canvas.height,
    backgroundRemoved: false,
  };
}

/** Value at quantile `q` of a 256-bin luminance histogram. */
function percentile(hist: Uint32Array, count: number, q: number): number {
  const target = count * q;
  let seen = 0;
  for (let l = 0; l < 256; l++) {
    seen += hist[l];
    if (seen >= target) return l;
  }
  return 255;
}

/**
 * Turns artwork into the coverage map a laser would burn: white pixels whose
 * alpha says how deep the beam bites, transparent where the coating survives.
 *
 * Cut-out art burns its silhouette, with tone only modulating depth, so a flat
 * logo stays solid. An opaque photo burns tonally instead — dark tones deeper —
 * which is how photo engraving actually reads on steel. Light-on-transparent
 * art is inverted, otherwise a white logo would burn away to nothing.
 */
export function buildEngraveMask(img: HTMLImageElement): HTMLCanvasElement {
  const srcW = img.naturalWidth || img.width || 1;
  const srcH = img.naturalHeight || img.height || 1;
  const src = drawScaled(img, srcW, srcH, ENGRAVE_MASK_MAX_DIM);
  const { width, height } = src;

  const data = src.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, width, height).data;
  const total = width * height;

  const hist = new Uint32Array(256);
  let opaque = 0;
  let clear = 0;
  let lumSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 8) {
      clear++;
      continue;
    }
    if (a > 128) {
      const l = luminance(data[i], data[i + 1], data[i + 2]) | 0;
      hist[l]++;
      lumSum += l;
      opaque++;
    }
  }

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const outCtx = out.getContext("2d")!;
  if (!opaque) return out;

  const lo = percentile(hist, opaque, 0.02);
  const hi = percentile(hist, opaque, 0.98);
  const span = Math.max(8, hi - lo);

  const cutout = clear / total > OWN_TRANSPARENCY_FRACTION * 3;
  const invert = cutout && lumSum / opaque > 148;
  // A silhouette never burns shallower than this; a photo may fade to nearly nothing.
  const floor = cutout ? 0.5 : 0.1;

  const mask = new ImageData(width, height);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    const l = clamp01((luminance(data[i], data[i + 1], data[i + 2]) - lo) / span);
    const tone = invert ? l : 1 - l;
    mask.data[i] = 255;
    mask.data[i + 1] = 255;
    mask.data[i + 2] = 255;
    mask.data[i + 3] = Math.round(a * (floor + (1 - floor) * tone) * 255);
  }
  outCtx.putImageData(mask, 0, 0);
  return out;
}
