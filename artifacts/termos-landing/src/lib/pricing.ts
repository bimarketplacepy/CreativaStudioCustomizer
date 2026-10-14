/**
 * Precios de TODAS las técnicas en un solo lugar (DACEN.md §4.5).
 *
 * Un precio en `null` = "se cotiza por WhatsApp" (comportamiento actual).
 * Cargar el número acá hace que aparezca en la landing sin tocar componentes.
 * `enabled` apaga los montos de una técnica aunque existan.
 *
 *  - Láser: planes fijos de `engraving-plans.ts`, pisados por Odoo (`GRAB-*`)
 *    vía `engravingPrice()`.
 *  - Dacen F5 (impresión a color sobre la pieza): escalones por cobertura.
 *  - eufyMake E1 (stickers): fórmula por área; la UI de la sección Stickers
 *    sigue usando `sticker-pricing.ts`, que lee sus números de acá.
 */
import { ENGRAVING_PLANS, type EngravingPlanId } from "./engraving-plans";
import { engravingPrice, formatGs, type Catalog } from "./odoo-catalog";
import type { MachineId } from "./machines";

export type DacenCoverage = "small" | "front" | "wrap";
export type StickerFinishId = "brillo" | "relieve";

export const PRICING = {
  laser: {
    // Planes actuales (engraving-plans.ts / Odoo GRAB-*): se mantienen allá.
  },
  dacen: {
    /** Escalones por cobertura del diseño, en Gs. null = "se cotiza". AJUSTAR. */
    tiers: {
      small: null, // logo chico o nombre (≤ smallMaxCm2)
      front: null, // frente completo
      wrap: null,  // 360°
    } as Record<DacenCoverage, number | null>,
    /** Hasta acá (cm² del diseño) es "small". AJUSTAR. */
    smallMaxCm2: 30,
    /** Preparación fija por pedido (se reparte por cantidad). null = sin cargo. */
    setupPerOrder: null as number | null,
    /** Descuentos por cantidad (empresas): gana el escalón más alto alcanzado. */
    qtyTiers: [] as { min: number; discount: number }[],
  },
  eufy: {
    /**
     * Stickers UV DTF. PROVISORIOS hasta tener los costos reales del taller
     * (tinta, film, tiempo de máquina). AJUSTAR.
     *   unitario = máx(mínimo, base + cm² × Gs/cm²) × factor del acabado
     *   con descuento por cantidad, redondeado a Gs. 100
     */
    stickers: {
      /** Fijo por sticker: preparación, aplicación del film, corte. */
      basePerSticker: 2000,
      /** Por cm² del rectángulo que ocupa (tinta + film + máquina). */
      perCm2: 110,
      /** Ningún sticker baja de esto (antes del descuento por cantidad). */
      minUnit: 4000,
      /** Multiplicador por acabado (el relieve gasta ≈ ×10 de tinta en la E1, y más tiempo). */
      finishFactor: { brillo: 1, relieve: 1.5 } as Record<StickerFinishId, number>,
      /** Descuento por cantidad: gana el escalón más alto alcanzado. */
      qtyTiers: [
        { min: 1, discount: 0 },
        { min: 10, discount: 0.1 },
        { min: 25, discount: 0.2 },
        { min: 50, discount: 0.3 },
        { min: 100, discount: 0.35 },
      ],
    },
  },
  /** Mostrar montos de cada técnica en la landing. */
  enabled: { laser: true, dacen: false, stickers: false },
};

export interface Quote {
  /** null → "se cotiza por WhatsApp". */
  total: number | null;
  /** Precio por unidad (null si se cotiza). */
  unit: number | null;
  /** Texto legible: "Termo Gs. X + grabado (solo nombres) Gs. Y". */
  note: string;
  /** Partes con monto conocido (la pieza puede estar aunque el total sea null). */
  breakdown: { label: string; amount: number }[];
  /** Máquina que lo produce (solo panel / pedido; nunca se muestra al cliente). */
  machine: MachineId;
}

export type QuoteInput =
  | {
      technique: "laser";
      plan: EngravingPlanId;
      /** Catálogo de Odoo: si trae precio del plan (GRAB-*), pisa el de engraving-plans. */
      catalog?: Catalog;
      /** Precio de la pieza (variante de Odoo); null si la trae el cliente o no hay dato. */
      piecePrice?: number | null;
      /** Nombre de la pieza para la nota ("Termo Mate 1 L"). */
      pieceLabel?: string;
      ownProduct?: boolean;
      quantity?: number;
    }
  | {
      technique: "color";
      /** De `machineFor()`: "dacen" sobre la pieza, "eufy" si no entra en la Dacen. */
      machine?: MachineId;
      coverage?: DacenCoverage;
      /** Área del diseño en cm² (para elegir "small" si no viene `coverage`). */
      areaCm2?: number;
      piecePrice?: number | null;
      pieceLabel?: string;
      quantity?: number;
    }
  | {
      technique: "sticker";
      widthCm: number;
      heightCm: number;
      quantity: number;
      finish: StickerFinishId;
    };

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

// ── Stickers ────────────────────────────────────────────────────────────────

export function stickerTierFor(quantity: number) {
  const tiers = PRICING.eufy.stickers.qtyTiers;
  let tier = tiers[0];
  for (const t of tiers) if (quantity >= t.min) tier = t;
  return tier;
}

/** Unitario de un sticker con el descuento dado (redondeado a Gs. 100). */
export function stickerUnit(widthCm: number, heightCm: number, finish: StickerFinishId, discount: number): number {
  const P = PRICING.eufy.stickers;
  const factor = P.finishFactor[finish] ?? 1;
  const list = Math.max(P.minUnit, P.basePerSticker + widthCm * heightCm * P.perCm2) * factor;
  return roundTo(list * (1 - discount), 100);
}

// ── Cotizador único ─────────────────────────────────────────────────────────

/** Escalón de la Dacen según cobertura explícita o área del diseño. */
export function dacenCoverageFor(opts: { coverage?: DacenCoverage; areaCm2?: number }): DacenCoverage {
  if (opts.coverage) return opts.coverage;
  if (typeof opts.areaCm2 === "number" && opts.areaCm2 <= PRICING.dacen.smallMaxCm2) return "small";
  return "front";
}

const COVERAGE_LABEL: Record<DacenCoverage, string> = {
  small: "diseño chico",
  front: "frente",
  wrap: "360°",
};

export function quote(input: QuoteInput): Quote {
  if (input.technique === "sticker") {
    const quantity = Math.max(1, Math.round(input.quantity));
    const unit = stickerUnit(input.widthCm, input.heightCm, input.finish, stickerTierFor(quantity).discount);
    const total = unit * quantity;
    if (!PRICING.enabled.stickers) {
      return { total: null, unit: null, note: "Te pasamos el precio por WhatsApp", breakdown: [], machine: "eufy" };
    }
    return {
      total, unit,
      note: `${quantity} sticker${quantity === 1 ? "" : "s"} × ${formatGs(unit)}`,
      breakdown: [{ label: "Stickers", amount: total }],
      machine: "eufy",
    };
  }

  const quantity = Math.max(1, Math.round(input.quantity ?? 1));
  const piece = input.piecePrice ?? null;
  const pieceLabel = input.pieceLabel ?? "Pieza";

  if (input.technique === "laser") {
    // Mismo cálculo y textos que el "Precio estimado" del personalizador.
    const plan = ENGRAVING_PLANS.find(p => p.id === input.plan) ?? ENGRAVING_PLANS[0];
    const engraving = engravingPrice(input.catalog, plan.id);
    const planName = plan.shortLabel.toLowerCase();
    const breakdown = [{ label: `Grabado (${planName})`, amount: engraving }];
    if (!PRICING.enabled.laser) {
      return { total: null, unit: null, note: "Te pasamos el precio por WhatsApp", breakdown: [], machine: "laser" };
    }
    if (piece !== null) {
      const unit = piece + engraving;
      return {
        total: unit * quantity, unit,
        note: `${pieceLabel} ${formatGs(piece)} + grabado (${planName}) ${formatGs(engraving)}`,
        breakdown: [{ label: pieceLabel, amount: piece }, ...breakdown],
        machine: "laser",
      };
    }
    return {
      total: engraving * quantity, unit: engraving,
      note: input.ownProduct
        ? `Grabado (${planName}) sobre tu producto`
        : `Grabado (${planName}). La pieza se cotiza aparte`,
      breakdown,
      machine: "laser",
    };
  }

  // Impresión a color.
  const machine = input.machine ?? "dacen";
  const pieceRow = piece !== null ? [{ label: pieceLabel, amount: piece }] : [];
  const coverage = dacenCoverageFor(input);
  const tierPrice = machine === "dacen" ? PRICING.dacen.tiers[coverage] : null;
  if (!PRICING.enabled.dacen || tierPrice === null) {
    return {
      total: null, unit: null,
      note: piece !== null
        ? `${pieceLabel} ${formatGs(piece)}. La impresión a color se cotiza según el diseño`
        : "Se cotiza según el diseño",
      breakdown: pieceRow,
      machine,
    };
  }
  let discount = 0;
  for (const t of PRICING.dacen.qtyTiers) if (quantity >= t.min) discount = t.discount;
  const setup = PRICING.dacen.setupPerOrder ?? 0;
  const print = roundTo(tierPrice * (1 - discount) + setup / quantity, 100);
  const unit = (piece ?? 0) + print;
  return {
    total: unit * quantity, unit,
    note: piece !== null
      ? `${pieceLabel} ${formatGs(piece)} + impresión a color (${COVERAGE_LABEL[coverage]}) ${formatGs(print)}`
      : `Impresión a color (${COVERAGE_LABEL[coverage]}). La pieza se cotiza aparte`,
    breakdown: [...pieceRow, { label: `Impresión a color (${COVERAGE_LABEL[coverage]})`, amount: print }],
    machine,
  };
}
