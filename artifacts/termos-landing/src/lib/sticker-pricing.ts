/**
 * Stickers UV DTF (eufyMake E1 + Roll-to-Film): opciones y precio.
 *
 * ÚNICA fuente de precios de la sección Stickers (`stickers.tsx`). Los montos
 * son PROVISORIOS hasta tener los costos reales del taller (tinta, film, tiempo
 * de máquina): AJUSTAR acá y se actualiza todo (precio en pantalla, mensaje de
 * WhatsApp y pedido).
 *
 * Modelo: el film se consume por el rectángulo que ocupa el sticker, así que el
 * precio va por el área del rectángulo (ancho × alto), no por la silueta.
 *
 *   unitario = máx(mínimo, base + cm² × Gs/cm²) × factor del acabado
 *   con descuento por cantidad, redondeado a Gs. 100
 */

export type StickerFinishId = "brillo" | "relieve";
export type StickerCutId = "silueta" | "rectangulo";

export interface StickerFinish {
  id: StickerFinishId;
  name: string;
  desc: string;
  /** Multiplicador sobre el precio base (más tinta y más pasadas de la E1). */
  factor: number;
}

export const STICKER_FINISHES: StickerFinish[] = [
  {
    id: "brillo",
    name: "Brillante",
    desc: "Colores vivos con barniz brillante. Resiste agua y roce.",
    factor: 1,
  },
  {
    id: "relieve",
    name: "Relieve 3D",
    desc: "Tinta con volumen que se siente al tacto. Efecto premium.",
    factor: 1.5, // AJUSTAR: el relieve gasta mucha más tinta (≈ ×10 en la E1) y tiempo
  },
];

export const STICKER_CUTS: { id: StickerCutId; name: string; desc: string }[] = [
  { id: "silueta", name: "Silueta", desc: "Sigue la forma de tu diseño con un borde blanco" },
  { id: "rectangulo", name: "Rectángulo", desc: "Rectángulo con esquinas redondeadas" },
];

/** Tamaños rápidos: lado mayor del sticker terminado, en cm. */
export const STICKER_SIZE_PRESETS = [5, 7, 10, 15];
/** Límites del lado mayor (cm). El máximo lo da el ancho útil del film de la E1. */
export const STICKER_MIN_CM = 3;
export const STICKER_MAX_CM = 28;
/** Borde blanco alrededor del diseño (mm), también margen de corte. */
export const STICKER_BORDER_MM = 2.5;

export const STICKER_QTY_PRESETS = [1, 10, 25, 50, 100];
export const STICKER_MAX_QTY = 1000;

/** Descuento por cantidad: gana el escalón más alto alcanzado. AJUSTAR. */
export const STICKER_QTY_TIERS: { min: number; discount: number }[] = [
  { min: 1, discount: 0 },
  { min: 10, discount: 0.1 },
  { min: 25, discount: 0.2 },
  { min: 50, discount: 0.3 },
  { min: 100, discount: 0.35 },
];

/** AJUSTAR con los costos reales (en guaraníes). */
const PRICE = {
  /** Fijo por sticker: preparación, aplicación del film, corte. */
  basePerSticker: 2000,
  /** Por cm² del rectángulo que ocupa (tinta + film + máquina). */
  perCm2: 110,
  /** Ningún sticker baja de esto (antes del descuento por cantidad). */
  minUnit: 4000,
};

export interface StickerQuote {
  /** Precio unitario sin descuento. */
  listUnit: number;
  /** Precio unitario con el descuento por cantidad. */
  unit: number;
  total: number;
  discount: number;
  /** Lo que se ahorra frente al precio de lista. */
  savings: number;
  /** Próximo escalón de descuento, para incentivar ("desde 25 u. pagás…"). */
  next: { min: number; discount: number; unit: number } | null;
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

function unitFor(widthCm: number, heightCm: number, finish: StickerFinishId, discount: number): number {
  const factor = STICKER_FINISHES.find(f => f.id === finish)?.factor ?? 1;
  const list = Math.max(PRICE.minUnit, PRICE.basePerSticker + widthCm * heightCm * PRICE.perCm2) * factor;
  return roundTo(list * (1 - discount), 100);
}

export function tierFor(quantity: number) {
  let tier = STICKER_QTY_TIERS[0];
  for (const t of STICKER_QTY_TIERS) if (quantity >= t.min) tier = t;
  return tier;
}

export function stickerQuote(opts: {
  widthCm: number;
  heightCm: number;
  quantity: number;
  finish: StickerFinishId;
}): StickerQuote {
  const quantity = Math.max(1, Math.round(opts.quantity));
  const tier = tierFor(quantity);
  const listUnit = unitFor(opts.widthCm, opts.heightCm, opts.finish, 0);
  const unit = unitFor(opts.widthCm, opts.heightCm, opts.finish, tier.discount);
  const nextTier = STICKER_QTY_TIERS.find(t => t.min > quantity) ?? null;
  return {
    listUnit,
    unit,
    total: unit * quantity,
    discount: tier.discount,
    savings: (listUnit - unit) * quantity,
    next: nextTier
      ? { ...nextTier, unit: unitFor(opts.widthCm, opts.heightCm, opts.finish, nextTier.discount) }
      : null,
  };
}
