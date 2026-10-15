/**
 * Funciones con IA (Gemini, vía /api/ai/* del api-server: la clave nunca llega
 * al navegador). Lo que el servidor diga que no está disponible no se muestra.
 */

export interface AiStatus {
  phrases: boolean;
  images: boolean;
}

export interface PhraseIdea {
  text: string;
  /** Segunda línea (texto 2), o "". */
  text2: string;
}

export type AiImageStyle = "laser" | "color";

let statusPromise: Promise<AiStatus> | null = null;

/** Una sola consulta por visita. Si falla, nada de IA (la página sigue igual). */
export function getAiStatus(): Promise<AiStatus> {
  statusPromise ??= fetch("/api/ai/status")
    .then(r => (r.ok ? r.json() : { phrases: false, images: false }))
    .then((s: Partial<AiStatus>) => ({ phrases: !!s.phrases, images: !!s.images }))
    .catch(() => ({ phrases: false, images: false }));
  return statusPromise;
}

/** El servidor dejó de tener cupo de imágenes: se esconde hasta recargar. */
function disableImages() {
  statusPromise = getAiStatus().then(s => ({ ...s, images: false }));
}

async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error("No pudimos conectar con la IA. Revisá tu conexión y probá de nuevo.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) throw new Error("Usaste la IA muchas veces seguidas. Probá de nuevo en un rato.");
    throw new Error((json as { message?: string }).message || "La IA no respondió. Probá de nuevo.");
  }
  return json as T;
}

export async function fetchPhraseIdeas(opts: {
  occasion: string;
  product: string;
  twoLines: boolean;
}): Promise<PhraseIdea[]> {
  const { suggestions } = await post<{ suggestions: PhraseIdea[] }>("/api/ai/phrases", { ...opts, maxChars: 28 }, 20_000);
  return suggestions;
}

/** Imagen nueva desde una descripción, o una foto (`photo`) pasada a dibujo. */
export async function generateAiImage(opts: {
  prompt: string;
  style: AiImageStyle;
  photo?: Blob;
}): Promise<Blob> {
  const photo = opts.photo ? await photoForUpload(opts.photo) : undefined;
  try {
    const { image } = await post<{ image: string }>("/api/ai/image", { prompt: opts.prompt, style: opts.style, photo }, 90_000);
    return await (await fetch(image)).blob();
  } catch (err) {
    if (err instanceof Error && /máximo de imágenes|ocupada/.test(err.message)) disableImages();
    throw err;
  }
}

/** La foto achicada (lado mayor 1024 px, JPEG) para que el envío sea liviano. */
async function photoForUpload(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const k = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  const ctx = canvas.getContext("2d")!;
  // Fondo blanco: un PNG transparente no queda negro en el JPEG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.88);
}
