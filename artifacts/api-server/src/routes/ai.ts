import { Router, type IRouter, type Response } from "express";
import { rateLimit, sameOriginOnly } from "../middlewares/rate-limit";
import { logger } from "../lib/logger";
import {
  CUTOUT_ASPECTS, CUTOUT_KEYS, GeminiError, cutoutImage, generateDesignImage, geminiKey, imagesAvailable, markImagesAvailable,
  markImagesFailure, markImagesUnavailable, suggestPhrases, type CutoutAspect, type CutoutKey, type ImageStyle,
} from "../lib/gemini";

/**
 * Funciones con IA (Gemini) del personalizador:
 *  - GET  /api/ai/status  → qué está disponible (la landing esconde lo que no).
 *  - POST /api/ai/phrases → ideas de texto para grabar.
 *  - POST /api/ai/image   → crear una imagen desde una descripción, o pasar una
 *    foto a dibujo. Va al diseñador como cualquier imagen subida.
 *  - POST /api/ai/cutout  → quitarle el fondo a un logo o foto del fondo 360°:
 *    vuelve sobre un color liso que la landing recorta.
 *
 * Límites por IP y un tope diario de imágenes, para que la cuenta de Google no
 * se dispare si alguien abusa.
 */
const router: IRouter = Router();

/**
 * Tope diario para todo el sitio, además del límite por IP: pone un techo al
 * gasto aunque alguien reparta los pedidos entre muchas IPs.
 */
function dailyCap(max: number) {
  let day = "";
  let used = 0;
  const today = () => new Date().toISOString().slice(0, 10);
  return {
    /** Reserva un uso; false si ya se llegó al tope de hoy. */
    take(): boolean {
      if (today() !== day) { day = today(); used = 0; }
      if (used >= max) return false;
      used++;
      return true;
    },
    /** Devuelve el uso reservado (la llamada falló y no se cobró). */
    release() { if (used > 0) used--; },
  };
}

/** Imágenes por día (AI_IMAGE_DAILY_CAP lo cambia). */
const images = dailyCap(Number(process.env.AI_IMAGE_DAILY_CAP) || 150);
/** Pedidos de frases por día (AI_PHRASES_DAILY_CAP lo cambia). */
const phrases = dailyCap(Number(process.env.AI_PHRASES_DAILY_CAP) || 1500);

router.use("/ai", sameOriginOnly);

function fail(res: Response, err: unknown, what: string) {
  if (err instanceof GeminiError) {
    if (err.kind === "blocked") {
      res.status(422).json({ message: "No podemos crear eso. Probá con otra descripción." });
      return;
    }
    if (err.kind === "quota") {
      res.status(503).json({ message: "La IA está ocupada en este momento. Probá de nuevo en unos minutos." });
      return;
    }
  }
  logger.error({ err: err instanceof Error ? err.message.slice(0, 300) : String(err) }, `ai: ${what} falló`);
  res.status(502).json({ message: "La IA no respondió. Probá de nuevo." });
}

router.get("/ai/status", (_req, res) => {
  const enabled = !!geminiKey();
  res.setHeader("Cache-Control", "no-store");
  res.json({ phrases: enabled, images: imagesAvailable() });
});

router.post("/ai/phrases", rateLimit({ max: 30, windowMs: 60 * 60 * 1000 }), async (req, res) => {
  const occasion = typeof req.body?.occasion === "string" ? req.body.occasion.trim().slice(0, 200) : "";
  const product = typeof req.body?.product === "string" ? req.body.product.trim().slice(0, 60) : "termo";
  const twoLines = req.body?.twoLines === true;
  const maxChars = Math.max(8, Math.min(40, Number(req.body?.maxChars) || 28));
  if (!occasion) {
    res.status(400).json({ message: "Contanos para qué es el regalo." });
    return;
  }
  if (!phrases.take()) {
    res.status(503).json({ message: "Llegamos al máximo de ideas con IA por hoy. Probá mañana." });
    return;
  }
  try {
    res.json({ suggestions: await suggestPhrases({ occasion, product, twoLines, maxChars }) });
  } catch (err) {
    phrases.release();
    fail(res, err, "frases");
  }
});

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

router.post("/ai/image", rateLimit({ max: 8, windowMs: 60 * 60 * 1000 }), async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim().slice(0, 400) : "";
  const style: ImageStyle = req.body?.style === "color" ? "color" : "laser";
  // Foto opcional (data URL) para transformarla.
  let photo: { mimeType: string; data: string } | undefined;
  if (typeof req.body?.photo === "string") {
    const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(req.body.photo);
    if (!m || (m[2].length * 3) / 4 > MAX_PHOTO_BYTES) {
      res.status(400).json({ message: "La foto no es válida o es muy pesada." });
      return;
    }
    photo = { mimeType: m[1], data: m[2] };
  }
  if (!prompt && !photo) {
    res.status(400).json({ message: "Describí la imagen que querés." });
    return;
  }
  if (!imagesAvailable()) {
    res.status(503).json({ message: "La IA está ocupada en este momento. Probá de nuevo en unos minutos." });
    return;
  }
  if (!images.take()) {
    res.status(503).json({ message: "Llegamos al máximo de imágenes con IA por hoy. Probá mañana o subí tu propia imagen." });
    return;
  }
  try {
    const img = await generateDesignImage({ prompt, style, photo });
    markImagesAvailable();
    res.json({ image: `data:${img.mimeType};base64,${img.data}` });
  } catch (err) {
    images.release();
    // Sin cupo de la capa gratuita: la landing deja de ofrecerlo por un rato.
    // Otras fallas repetidas (modelo inexistente, 400, timeouts…) también.
    if (err instanceof GeminiError && err.kind === "quota") {
      if (/limit: 0|free_tier/i.test(err.message)) markImagesUnavailable();
    } else if (!(err instanceof GeminiError && err.kind === "blocked")) markImagesFailure();
    fail(res, err, "imagen");
  }
});

/** Igual que /ai/image: cuenta en el mismo tope diario de imágenes. */
router.post("/ai/cutout", rateLimit({ max: 20, windowMs: 60 * 60 * 1000 }), async (req, res) => {
  const m = typeof req.body?.photo === "string"
    ? /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(req.body.photo)
    : null;
  if (!m || (m[2].length * 3) / 4 > MAX_PHOTO_BYTES) {
    res.status(400).json({ message: "La imagen no es válida o es muy pesada." });
    return;
  }
  const key: CutoutKey = Object.hasOwn(CUTOUT_KEYS, req.body?.key) ? req.body.key : "verde";
  const aspect: CutoutAspect = (CUTOUT_ASPECTS as readonly string[]).includes(req.body?.aspect) ? req.body.aspect : "1:1";
  if (!imagesAvailable()) {
    res.status(503).json({ message: "La IA está ocupada en este momento. Probá de nuevo en unos minutos." });
    return;
  }
  if (!images.take()) {
    res.status(503).json({ message: "Llegamos al máximo de imágenes con IA por hoy. Probá mañana." });
    return;
  }
  try {
    const img = await cutoutImage({ photo: { mimeType: m[1], data: m[2] }, key, aspect });
    markImagesAvailable();
    res.json({ image: `data:${img.mimeType};base64,${img.data}` });
  } catch (err) {
    images.release();
    if (err instanceof GeminiError && err.kind === "quota") {
      if (/limit: 0|free_tier/i.test(err.message)) markImagesUnavailable();
    } else if (!(err instanceof GeminiError && err.kind === "blocked")) markImagesFailure();
    fail(res, err, "recorte");
  }
});

export default router;
