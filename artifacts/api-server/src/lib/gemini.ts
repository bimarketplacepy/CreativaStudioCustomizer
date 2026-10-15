/**
 * Cliente mínimo de la API de Gemini (Google AI Studio), con la clave del
 * secret API_GEMINI. La clave vive solo en el servidor: el navegador habla con
 * /api/ai/* y nunca la ve.
 *
 *  - Texto (ideas de frases): modelos "flash-lite", rápidos y baratos; entran
 *    en la capa gratuita.
 *  - Imágenes (crear un diseño, pasar una foto a dibujo): modelos "image"
 *    ("Nano Banana"). Google NO los da en la capa gratuita: hace falta activar
 *    la facturación del proyecto en AI Studio. Sin eso responden 429 con
 *    "limit: 0" y la landing esconde la función (ver imagesAvailable).
 */
import { logger } from "./logger";

const API = "https://generativelanguage.googleapis.com/v1beta/models";

/** Se prueban en orden: si uno está saturado (503) o no existe, el siguiente. */
// gemini-3.5-flash-lite queda último: a veces contesta sin tildes ("Feliz dia papa").
const TEXT_MODELS = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite"];
/** Palabras que casi nunca van sin tilde: si aparecen así, la respuesta se descarta. */
const MISSING_ACCENTS = /\b(dia|papa|mama|cumpleanos|corazon|tambien|campeon|numero|ano|anos|anio|anios|nino|nina|ninos|pasion|exito|ilusion|corazon)\b/i;
const IMAGE_MODELS = ["gemini-3.1-flash-image", "gemini-2.5-flash-image"];

export function geminiKey(): string | null {
  return process.env.API_GEMINI?.trim() || null;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    /** "quota": sin cupo (capa gratuita o límite de gasto). "blocked": filtro de seguridad. */
    readonly kind: "quota" | "blocked" | "unavailable" | "bad_response",
  ) {
    super(message);
  }
}

interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

async function callModel(model: string, body: unknown, timeoutMs: number): Promise<{ parts: Part[]; finishReason?: string }> {
  const key = geminiKey();
  if (!key) throw new GeminiError("API_GEMINI no está configurada", "unavailable");
  const res = await fetch(`${API}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    promptFeedback?: { blockReason?: string };
    candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
  };
  if (!res.ok) {
    const msg = json.error?.message ?? `HTTP ${res.status}`;
    if (res.status === 429) throw new GeminiError(msg, "quota");
    throw new GeminiError(`${model}: ${msg.slice(0, 200)}`, res.status === 400 ? "bad_response" : "unavailable");
  }
  if (json.promptFeedback?.blockReason) throw new GeminiError(json.promptFeedback.blockReason, "blocked");
  const cand = json.candidates?.[0];
  return { parts: cand?.content?.parts ?? [], finishReason: cand?.finishReason };
}

/** Prueba los modelos en orden; la cuota agotada o un bloqueo cortan enseguida. */
async function withFallback<T>(models: string[], run: (model: string) => Promise<T>): Promise<T> {
  let last: unknown;
  for (const model of models) {
    try {
      return await run(model);
    } catch (err) {
      last = err;
      if (err instanceof GeminiError && err.kind === "blocked") throw err;
      // Sin cupo en un modelo puede haberlo en otro (cada uno tiene su límite).
      logger.warn({ model, err: err instanceof Error ? err.message.slice(0, 200) : String(err) }, "gemini: modelo falló");
    }
  }
  throw last instanceof GeminiError ? last : new GeminiError(String(last), "unavailable");
}

// ── Ideas de frases ─────────────────────────────────────────────────────────

export interface PhraseSuggestion {
  text: string;
  /** Segunda línea (texto 2), o "" si la idea es de una sola. */
  text2: string;
}

export async function suggestPhrases(opts: {
  occasion: string;
  product: string;
  twoLines: boolean;
  maxChars: number;
}): Promise<PhraseSuggestion[]> {
  const prompt = [
    `Regla obligatoria: ortografía española perfecta, con TODAS las tildes y eñes (papá, día, mamá, cumpleaños, Pérez). Nunca escribas sin tildes.`,
    `Sos el asistente de un local de Paraguay que graba con láser e imprime termos, vasos y regalos personalizados.`,
    `El cliente está diseñando: ${opts.product}.`,
    `Lo que pidió el cliente (puede ser la ocasión, a quién va dirigido o datos como nombres o empresa): """${opts.occasion}"""`,
    `Proponé 6 ideas de texto para grabar, en español (como se habla en Paraguay, con voseo si hace falta), variadas en tono: emotivas, divertidas, elegantes.`,
    opts.twoLines
      ? `Cada idea tiene DOS líneas: "text" arriba (ej. empresa, nombre o frase principal) y "text2" abajo (ej. nombre del empleado, fecha o dedicatoria corta).`
      : `Cada idea es una sola línea en "text" con "text2" vacío. EXCEPCIÓN: si el cliente dio dos datos distintos (ej. empresa y empleado, nombre y fecha), poné uno en "text" y el otro en "text2"; nunca los juntes en una línea con "/" o "-".`,
    `Cada línea: máximo ${opts.maxChars} caracteres. Usá los nombres, empresas o fechas que dio el cliente tal cual, sin inventar otros nombres propios.`,
    `Si ponés un año, es ${new Date().getFullYear()}. Sin emojis, sin comillas, sin hashtags.`,
  ].join("\n");
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          suggestions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { text: { type: "STRING" }, text2: { type: "STRING" } },
              required: ["text", "text2"],
            },
          },
        },
        required: ["suggestions"],
      },
    },
  };
  return withFallback(TEXT_MODELS, async model => {
    const { parts } = await callModel(model, body, 15_000);
    const raw = parts.map(p => p.text ?? "").join("");
    let parsed: { suggestions?: PhraseSuggestion[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new GeminiError("respuesta sin JSON", "bad_response");
    }
    const clean = (s: unknown) =>
      typeof s === "string" ? s.replace(/["“”#]/g, "").replace(/\s+/g, " ").trim() : "";
    const all = (parsed.suggestions ?? []).map(s => {
      const text = clean(s.text), text2 = clean(s.text2);
      // "Juan Pérez / Acme" en una sola línea: son dos textos.
      const m = !text2 && /^(.+?)\s+[/|–—-]\s+(.+)$/.exec(text);
      return m ? { text: m[1], text2: m[2] } : { text, text2 };
    });
    if (all.some(s => MISSING_ACCENTS.test(`${s.text} ${s.text2}`))) throw new GeminiError("respuesta sin tildes", "bad_response");
    // Las que no entran se descartan (cortarlas deja frases a medias).
    const out = all.filter(s => s.text && s.text.length <= opts.maxChars && s.text2.length <= opts.maxChars);
    if (!out.length) throw new GeminiError("sin ideas", "bad_response");
    return out.slice(0, 6);
  });
}

// ── Imágenes ────────────────────────────────────────────────────────────────

export type ImageStyle = "laser" | "color";

const STYLE_PROMPT: Record<ImageStyle, string> = {
  laser:
    "Estilo: ilustración para GRABADO LÁSER sobre acero, en un solo color. Líneas y rellenos NEGRO puro sobre fondo BLANCO puro, " +
    "alto contraste, sin grises, sin degradados, sin sombras, sin texturas finas. Trazos firmes que se lean bien chicos (unos 5 cm).",
  color:
    "Estilo: ilustración a todo color para IMPRESIÓN UV sobre un termo, tipo calcomanía o vector plano, colores vivos, bordes nítidos, " +
    "sobre fondo BLANCO puro y liso (se recorta después), sin sombra proyectada, sin marco.",
};

/**
 * Crea una imagen para el diseñador. Con `photo`, la transforma (ej. pasar una
 * foto a dibujo de líneas); sin ella, la crea desde la descripción.
 */
export async function generateDesignImage(opts: {
  prompt: string;
  style: ImageStyle;
  photo?: { mimeType: string; data: string };
}): Promise<{ mimeType: string; data: string }> {
  const instructions = opts.photo
    ? [
        `Transformá esta foto en un diseño para personalizar un termo. ${STYLE_PROMPT[opts.style]}`,
        `Conservá lo principal de la foto (la persona, mascota u objeto) reconocible, sin el fondo.`,
        opts.prompt ? `Indicaciones del cliente: """${opts.prompt}"""` : "",
      ]
    : [
        `Creá un diseño para personalizar un termo. ${STYLE_PROMPT[opts.style]}`,
        `Lo que pidió el cliente: """${opts.prompt}"""`,
      ];
  instructions.push(
    "Un solo motivo, centrado, que ocupe casi todo el cuadro, con margen blanco alrededor.",
    "No agregues texto ni letras salvo que el cliente lo pida explícitamente. No dibujes el termo: solo el diseño.",
  );
  const parts: Part[] = [{ text: instructions.filter(Boolean).join("\n") }];
  if (opts.photo) parts.push({ inlineData: opts.photo });
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } },
  };
  return withFallback(IMAGE_MODELS, async model => {
    const { parts: out, finishReason } = await callModel(model, body, 60_000);
    const img = out.find(p => p.inlineData?.data)?.inlineData;
    if (!img) {
      if (finishReason && /SAFETY|PROHIBITED|BLOCK|IMAGE_OTHER/i.test(finishReason)) throw new GeminiError(finishReason, "blocked");
      throw new GeminiError(`sin imagen (${finishReason ?? "?"})`, "bad_response");
    }
    return { mimeType: img.mimeType, data: img.data };
  });
}

// ── Disponibilidad de imágenes ──────────────────────────────────────────────
// La capa gratuita de Gemini no genera imágenes. En vez de mostrarle al
// cliente un botón que falla, el servidor recuerda cómo salieron los pedidos
// reales. No se hace ninguna generación de prueba: costaba una imagen paga,
// no pasaba por los topes y demoraba /ai/status hasta ~2 min.

/** Apagado hasta este momento (0 = disponible). */
let imagesOffUntil = 0;
let consecutiveFailures = 0;
/** Sin cupo o fallando: se vuelve a ofrecer recién pasado este tiempo. */
const RECHECK_MS = 30 * 60 * 1000;
/** Fallas seguidas que no son de cupo (modelo inexistente, 400, timeouts…). */
const MAX_FAILURES = 3;

export function markImagesUnavailable() {
  imagesOffUntil = Date.now() + RECHECK_MS;
  consecutiveFailures = 0;
}
export function markImagesAvailable() {
  imagesOffUntil = 0;
  consecutiveFailures = 0;
}
/** Una generación falló por algo que no es el filtro ni el cupo. */
export function markImagesFailure() {
  if (++consecutiveFailures >= MAX_FAILURES) {
    logger.warn("gemini: imágenes apagadas tras fallas seguidas");
    markImagesUnavailable();
  }
}

/** ¿Se ofrece crear imágenes? Instantáneo: no llama a Gemini. */
export function imagesAvailable(): boolean {
  if (!geminiKey() || process.env.AI_IMAGES_ENABLED === "false") return false;
  return Date.now() >= imagesOffUntil;
}
