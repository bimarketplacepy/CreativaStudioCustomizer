/**
 * "Sin fondo" con IA: recorta la persona, mascota, producto o logo de una foto
 * con cualquier fondo, en el navegador del cliente (la foto no sale del
 * dispositivo, no hay servidor ni API paga de por medio).
 *
 *  - Modelo: ISNet "general use" (DIS, Apache-2.0; conversión ONNX MIT) con los
 *    pesos cuantizados a int8: 44 MB, misma calidad que el original. Se sirve
 *    desde /ai/ y se baja recién la primera vez que alguien pide "Sin fondo";
 *    después queda en la caché del navegador.
 *  - Motor: onnxruntime-web (WebAssembly). Este módulo pesa: se importa recién
 *    al pedir el recorte (import dinámico desde image-upload.tsx).
 *
 * El recorte de fondo liso de image-processing.ts sigue siendo el automático
 * al subir (instantáneo, ideal para logos sobre blanco); este es para fotos.
 */
import * as ort from "onnxruntime-web/wasm";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import wasmMjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import {
  canvasToSvgDataUrl, contentBounds, crop, drawScaled, loadImage, MAX_DIM, type ProcessedImage,
} from "./image-processing";

const MODEL_URL = "/ai/isnet-general-int8.onnx";
/** Tamaño real del modelo: el server lo manda comprimido, así que Content-Length
 *  no sirve para el porcentaje de descarga (cuenta bytes comprimidos). */
const MODEL_BYTES = 44_229_662;
/** Lado de la imagen que espera el modelo. */
const SIZE = 1024;

export type RemovalProgress =
  | { stage: "download"; fraction: number | null }
  | { stage: "process" };

let sessionPromise: Promise<ort.InferenceSession> | null = null;

/** Baja el modelo informando el avance. */
async function downloadModel(onProgress?: (p: RemovalProgress) => void): Promise<Uint8Array> {
  const res = await fetch(MODEL_URL);
  if (!res.ok || !res.body) throw new Error(`modelo: HTTP ${res.status}`);
  const total = MODEL_BYTES;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress?.({ stage: "download", fraction: total ? Math.min(1, got / total) : null });
  }
  const out = new Uint8Array(got);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

function getSession(onProgress?: (p: RemovalProgress) => void): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: wasmMjsUrl };
      // Hilos solo con aislamiento de origen (SharedArrayBuffer); si no, uno.
      ort.env.wasm.numThreads = globalThis.crossOriginIsolated
        ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1))
        : 1;
      const model = await downloadModel(onProgress);
      return ort.InferenceSession.create(model, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
    })();
    // Un fallo (sin conexión, memoria) no queda cacheado: el próximo intento reintenta.
    sessionPromise.catch(() => { sessionPromise = null; });
  }
  return sessionPromise;
}

/** Yield al navegador para que pinte el estado ("Quitando el fondo…") antes del cálculo pesado. */
const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => setTimeout(r, 0)));

/**
 * Recorta el fondo de `source` y devuelve la imagen lista para el diseñador,
 * con `other` = la versión con fondo (para volver a ella con un toque).
 */
export async function removeBackgroundAI(
  source: Blob,
  original: ProcessedImage,
  opts: { maxDim?: number; onProgress?: (p: RemovalProgress) => void } = {},
): Promise<ProcessedImage> {
  const session = await getSession(opts.onProgress);
  opts.onProgress?.({ stage: "process" });
  await nextFrame();

  const img = await loadImage(source);
  const W = img.naturalWidth, H = img.naturalHeight;

  // Entrada: RGB 1024×1024 (estirada, como en el entrenamiento), (v − 128) / 256.
  const inCanvas = document.createElement("canvas");
  inCanvas.width = SIZE;
  inCanvas.height = SIZE;
  const ictx = inCanvas.getContext("2d", { willReadFrequently: true })!;
  ictx.drawImage(img, 0, 0, SIZE, SIZE);
  const px = ictx.getImageData(0, 0, SIZE, SIZE).data;
  const plane = SIZE * SIZE;
  const input = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    input[i] = (px[i * 4] - 128) / 256;
    input[plane + i] = (px[i * 4 + 1] - 128) / 256;
    input[2 * plane + i] = (px[i * 4 + 2] - 128) / 256;
  }

  const feeds = { [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]) };
  const results = await session.run(feeds, [session.outputNames[0]]);
  const mask = results[session.outputNames[0]].data as Float32Array;

  // Máscara normalizada (mín–máx) → canal alfa, y escalada al tamaño de salida.
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < plane; i++) { const v = mask[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  const range = hi - lo || 1;
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = SIZE;
  maskCanvas.height = SIZE;
  const mctx = maskCanvas.getContext("2d")!;
  const mImg = mctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < plane; i++) {
    const a = Math.round(((mask[i] - lo) / range) * 255);
    mImg.data[i * 4 + 3] = a;
  }
  mctx.putImageData(mImg, 0, 0);

  const out = drawScaled(img, W, H, opts.maxDim ?? MAX_DIM);
  const octx = out.getContext("2d", { willReadFrequently: true })!;
  // destination-in: deja la foto solo donde la máscara tiene alfa.
  octx.globalCompositeOperation = "destination-in";
  octx.imageSmoothingQuality = "high";
  octx.drawImage(maskCanvas, 0, 0, out.width, out.height);
  octx.globalCompositeOperation = "source-over";

  const data = octx.getImageData(0, 0, out.width, out.height).data;
  // Restos casi invisibles del borde se ven como halo sucio: afuera.
  let kept = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 12) data[i] = 0;
    else kept++;
  }
  if (kept < (data.length / 4) * 0.005) throw new Error("no se encontró un sujeto para recortar");
  octx.putImageData(new ImageData(data, out.width, out.height), 0, 0);
  const cut = crop(out, contentBounds(data, out.width, out.height));

  const { other: _drop, ...withBackground } = original;
  return {
    svgDataUrl: canvasToSvgDataUrl(cut),
    width: cut.width,
    height: cut.height,
    backgroundRemoved: true,
    aiCut: true,
    source,
    other: { ...withBackground, backgroundRemoved: false, aiCut: false, source: undefined },
  };
}
