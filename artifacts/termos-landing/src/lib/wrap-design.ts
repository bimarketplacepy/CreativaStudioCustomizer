/**
 * Diseño "Todo el vaso (360°)" para la Dacen F5 (DACEN.md §12).
 *
 * Es una capa de FONDO que llena la banda imprimible completa, debajo del
 * texto, el ícono y el logo de siempre. La dibuja `drawColorLayer`, así el 3D,
 * el desplegado y el archivo de producción salen de la misma función.
 *
 * Geometría: la textura es la vuelta desenrollada (u 0..1 = la circunferencia
 * entera, frente en u = 0,5 y costura en u = 0/1). La banda tiene un estirado
 * vertical (`aspect` de bandMetrics) que se deshace al dibujar, para que la foto
 * conserve sus proporciones reales sobre la pieza.
 */

/**
 * Cómo llena la vuelta:
 *  - cover:   una sola imagen, escalada hasta cubrir toda la banda (recorta).
 *  - tile:    n copias enteras alrededor (para patrones).
 *  - mirror:  2 copias, la segunda espejada: la costura cierra sin corte.
 *  - artwork: el arte 360° completo del cliente (hecho con la plantilla), estirado
 *             exacto a la banda.
 */
export type WrapMode = "cover" | "tile" | "mirror" | "artwork";

export const WRAP_MODES: { id: WrapMode; label: string; hint: string }[] = [
  { id: "cover", label: "Ajustar", hint: "La foto cubre toda la vuelta. Sus bordes se juntan atrás, en la costura." },
  { id: "tile", label: "Mosaico", hint: "Copias enteras alrededor del vaso. Ideal para patrones." },
  { id: "mirror", label: "Espejo", hint: "Dos copias, la segunda dada vuelta: la costura cierra sin corte." },
  { id: "artwork", label: "Arte completo", hint: "Tu diseño hecho con la plantilla: se imprime tal cual, de borde a borde." },
];

/** Copias alrededor de la vuelta en los modos que repiten. */
export const TILE_REPEATS = 3;

/** Lo que guarda el editor (y viaja en el pedido, sin la imagen). */
export interface WrapDesign {
  /** blob: o data: URL de la imagen subida. */
  url: string;
  /** Tamaño natural de la imagen, para el aviso de resolución. */
  width: number;
  height: number;
  mode: WrapMode;
  /** Zoom del modo "Ajustar" (1 = cubre justo la banda). */
  scale: number;
  /** Corrimiento del modo "Ajustar", en fracción de la vuelta / de la banda. */
  offsetU: number;
  offsetV: number;
}

/** Lo que necesita el dibujo: la imagen ya cargada. */
export interface WrapLayer {
  image: CanvasImageSource & { width: number; height: number };
  mode: WrapMode;
  scale: number;
  offsetU: number;
  offsetV: number;
}

const repeatsFor = (mode: WrapMode) => (mode === "tile" ? TILE_REPEATS : mode === "mirror" ? 2 : 1);

/**
 * Dibuja el fondo en la banda [topPx, botPx] de una textura de ancho W.
 * El contexto puede venir escalado (archivo de producción en alta resolución).
 */
export function drawWrapLayer(
  ctx: CanvasRenderingContext2D,
  W: number,
  band: { topPx: number; botPx: number; aspect: number },
  wrap: WrapLayer,
) {
  const iw = wrap.image.width || 1;
  const ih = wrap.image.height || 1;
  const bandH = band.botPx - band.topPx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, band.topPx, W, bandH);
  ctx.clip();

  if (wrap.mode === "artwork") {
    // El arte ya viene con el tamaño de la plantilla: de borde a borde.
    ctx.drawImage(wrap.image, 0, band.topPx, W, bandH);
    ctx.restore();
    return;
  }

  // En "px reales" (sin el estirado vertical) la banda mide W × realH.
  const realH = bandH / band.aspect;
  ctx.translate(0, band.topPx);
  ctx.scale(1, band.aspect);
  const n = repeatsFor(wrap.mode);
  const tw = W / n;
  const zoom = wrap.mode === "cover" ? Math.max(1, wrap.scale) : 1;
  const s = Math.max(tw / iw, realH / ih) * zoom;
  const dw = iw * s, dh = ih * s;
  // Corrimiento: solo lo que sobra del recorte (la foto nunca deja huecos).
  const slackX = Math.max(0, dw - tw), slackY = Math.max(0, dh - realH);
  const ox = wrap.mode === "cover" ? clamp(wrap.offsetU, -0.5, 0.5) * slackX : 0;
  const oy = wrap.mode === "cover" ? clamp(wrap.offsetV, -0.5, 0.5) * slackY : 0;
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(i * tw, 0, tw, realH);
    ctx.clip();
    ctx.translate(i * tw + tw / 2, realH / 2);
    if (wrap.mode === "mirror" && i % 2 === 1) ctx.scale(-1, 1);
    ctx.drawImage(wrap.image, -dw / 2 + ox, -dh / 2 + oy, dw, dh);
    ctx.restore();
  }
  ctx.restore();
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * dpi efectivos de la imagen sobre la pieza: px de la imagen ÷ pulgadas que
 * ocupa una copia a lo ancho. `realBandRatio` = alto ÷ vuelta (mm/mm).
 */
export function wrapEffectiveDpi(
  wrap: Pick<WrapDesign, "width" | "height" | "mode" | "scale">,
  circumferenceMm: number,
  realBandRatio: number,
): number {
  const n = repeatsFor(wrap.mode);
  const copyWmm = circumferenceMm / n;
  if (wrap.mode === "artwork") return Math.round(wrap.width / (circumferenceMm / 25.4));
  const bandHmm = circumferenceMm * realBandRatio;
  // La escala que se usa al dibujar, en mm por px de la imagen.
  const zoom = wrap.mode === "cover" ? Math.max(1, wrap.scale) : 1;
  const mmPerPx = Math.max(copyWmm / wrap.width, bandHmm / wrap.height) * zoom;
  return Math.round(25.4 / mmPerPx);
}

export type DpiVerdict = "ideal" | "ok" | "warn" | "bad";

/** < 100 no recomendable · < 150 advertencia · ≥ 300 ideal (DACEN.md §12.5). */
export function dpiVerdict(dpi: number): DpiVerdict {
  if (dpi >= 300) return "ideal";
  if (dpi >= 150) return "ok";
  if (dpi >= 100) return "warn";
  return "bad";
}

export const DPI_VERDICT_TEXT: Record<DpiVerdict, string> = {
  ideal: "Resolución ideal",
  ok: "Se ve bien",
  warn: "Puede verse borroso de cerca",
  bad: "Muy baja: se va a ver pixelado",
};

/**
 * "Arte completo": ¿la imagen tiene la proporción de la plantilla? Si se aleja
 * más de un 4 %, al estirarla a la banda se deforma.
 */
export function artworkDistortion(wrap: Pick<WrapDesign, "width" | "height">, realBandRatio: number): number {
  const target = 1 / realBandRatio;
  const actual = wrap.width / Math.max(1, wrap.height);
  return Math.abs(actual / target - 1);
}

/** Lee una imagen subida: URL propia (blob:) y su tamaño natural. */
export function readWrapImage(file: File): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No pudimos abrir la imagen")); };
    img.src = url;
  });
}
