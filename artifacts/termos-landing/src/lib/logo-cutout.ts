/**
 * Quitar el fondo de un logo o foto para ponerlo encima del fondo 360°.
 *
 * Del más barato al más caro, y la IA solo si hace falta:
 *  1. Ya trae transparencia (PNG recortado): se usa tal cual.
 *  2. Fondo liso de borde a borde (un logo sobre blanco): se borra en el
 *     navegador, instantáneo y sin costo.
 *  3. Cualquier otro fondo (una foto): Gemini devuelve el mismo logo sobre un
 *     color liso que no aparece en la imagen, y ese color se borra acá (Gemini
 *     no entrega transparencia real). Solo si la IA de imágenes está
 *     disponible (getAiStatus); si no, el logo queda con su fondo.
 *
 * Siempre se guarda la versión original para poder volver a ella.
 */
import { cutCanvasBackground, drawScaled, loadImage } from "./image-processing";
import { CUTOUT_RGB, cutoutWithAi, getAiStatus, type CutoutKey } from "./ai";

export interface LogoImage {
  url: string;
  width: number;
  height: number;
}

export type LogoCutKind = "own" | "flat" | "ai" | "none";

export interface PreparedLogo {
  /** La versión que se usa: sin fondo cuando se pudo. */
  image: LogoImage;
  /** La original con fondo (null si ya venía sin fondo o no se recortó). */
  original: LogoImage | null;
  kind: LogoCutKind;
  /** Por qué no se pudo recortar con IA (para avisarle al cliente). */
  aiError?: string;
}

/** Lado mayor de trabajo: alcanza para un logo encima del fondo 360°. */
const WORK_DIM = 1600;

/** El color de recorte que menos aparece en la imagen. */
function pickKey(canvas: HTMLCanvasElement): CutoutKey {
  const n = 48;
  const small = document.createElement("canvas");
  small.width = n;
  small.height = n;
  const ctx = small.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, n, n);
  const d = ctx.getImageData(0, 0, n, n).data;
  let best: CutoutKey = "verde";
  let bestHits = Infinity;
  for (const key of Object.keys(CUTOUT_RGB) as CutoutKey[]) {
    const [r, g, b] = CUTOUT_RGB[key];
    let hits = 0;
    for (let i = 0; i < d.length; i += 4) {
      const dist = Math.hypot(d[i] - r, d[i + 1] - g, d[i + 2] - b);
      if (dist < 140) hits++;
    }
    if (hits < bestHits) { bestHits = hits; best = key; }
  }
  return best;
}

/** PNG (con transparencia) del lienzo, como URL blob. */
function canvasToBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(URL.createObjectURL(b)) : reject(new Error("No se pudo armar la imagen."))), "image/png"),
  );
}

async function toLogoImage(canvas: HTMLCanvasElement): Promise<LogoImage> {
  return { url: await canvasToBlobUrl(canvas), width: canvas.width, height: canvas.height };
}

export async function prepareLogo(file: File, onAi?: () => void): Promise<PreparedLogo> {
  const img = await loadImage(file);
  const w = img.naturalWidth || 512, h = img.naturalHeight || 512;
  const original: LogoImage = { url: URL.createObjectURL(file), width: w, height: h };
  const canvas = drawScaled(img, w, h, WORK_DIM);

  const quick = cutCanvasBackground(canvas);
  if (quick?.kind === "own") {
    URL.revokeObjectURL(original.url);
    return { image: await toLogoImage(quick.canvas), original: null, kind: "own" };
  }
  if (quick) return { image: await toLogoImage(quick.canvas), original, kind: "flat" };

  const status = await getAiStatus();
  if (!status.images) return { image: original, original: null, kind: "none" };

  onAi?.();
  try {
    const key = pickKey(canvas);
    const aiBlob = await cutoutWithAi(file, key, w / h);
    const aiImg = await loadImage(aiBlob);
    const aiCanvas = drawScaled(aiImg, aiImg.naturalWidth, aiImg.naturalHeight, WORK_DIM);
    // La IA devuelve el color de recorte de borde a borde: se exige menos
    // uniformidad del borde que con una imagen cualquiera.
    const cut = cutCanvasBackground(aiCanvas, { minAgreement: 0.6 });
    if (!cut || cut.kind !== "flat") throw new Error("La IA no devolvió un fondo liso para recortar.");
    return { image: await toLogoImage(cut.canvas), original, kind: "ai" };
  } catch (err) {
    return {
      image: original,
      original: null,
      kind: "none",
      aiError: err instanceof Error ? err.message : "No pudimos quitar el fondo.",
    };
  }
}
