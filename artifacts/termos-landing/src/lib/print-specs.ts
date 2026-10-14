/**
 * Medidas físicas reales de cada pieza para producción (DACEN.md §4.2).
 *
 * El 3D usa perfiles aproximados; el archivo para la máquina tiene que salir
 * de las medidas REALES (calibre) de cada producto y tamaño. Mientras no estén
 * medidas, los valores quedan en `null` (AJUSTAR) y manda el flag `dacen`, que
 * hoy reproduce exactamente la regla de `allowsColorPrint()`: todo el
 * drinkware de acero admite impresión a color, salvo la guampa.
 *
 * Vive en la landing: el api-server todavía tiene sus propias medidas del
 * frente en `production-svg.ts` (PRODUCT_AREAS_MM). Cuando el archivo de la
 * Dacen (fase 2) las necesite en los dos lados, pasar esto a un paquete
 * compartido del monorepo (`lib/print-specs`).
 */
import type { ProductId } from "./products";

/** Medidas en mm. `null` = falta medir (AJUSTAR con calibre). */
export interface PrintDims {
  /** Diámetro del cuerpo arriba de la zona imprimible. */
  diameterTopMm: number | null;
  /** Diámetro del cuerpo abajo de la zona imprimible (cónico: ≠ arriba). */
  diameterBottomMm: number | null;
  /** Alto imprimible del cuerpo, sin tapa ni base. */
  printableHeightMm: number | null;
  /** Franja de la manija en la vuelta (u 0..1) que no se imprime; null = sin manija o sin medir. */
  handleU: [number, number] | null;
}

export interface PrintSpec extends PrintDims {
  /** Se puede imprimir a color en la Dacen F5 (lo confirma el taller). */
  dacen: boolean;
  /**
   * Por qué una pieza de acero NO va a la Dacen: la UV cilíndrica solo toma
   * cuerpos cilíndricos (lo dice el taller). La landing no ofrece color y
   * manda a consultar en el local. `handle`: cuerpo cilíndrico con manija
   * (estorba al giro); `shape`: la pieza no es cilíndrica.
   */
  consult?: "handle" | "shape";
}

interface PrintSpecEntry extends PrintSpec {
  /** Cada tamaño mide distinto: lo que cambie respecto de la base, por sizeId. */
  bySize?: Record<string, Partial<PrintDims>>;
}

const UNMEASURED: PrintDims = {
  diameterTopMm: null,
  diameterBottomMm: null,
  printableHeightMm: null,
  handleU: null,
};

const steel = (extra: Partial<PrintSpecEntry> = {}): PrintSpecEntry => ({ ...UNMEASURED, dacen: true, ...extra });

/**
 * AJUSTAR: completar con medidas reales (DACEN.md §8, punto 4).
 * La Dacen solo imprime piezas CILÍNDRICAS (regla del taller): las que tienen
 * manija, las cónicas y las copas quedan en `dacen: false` con `consult`, y la
 * landing ofrece solo grabado láser + "consultá en el local" para el color.
 */
export const PRINT_SPECS: Record<ProductId, PrintSpecEntry> = {
  "termo": steel(),
  "termo-mate": steel(),
  "termo-mate-forge": steel(),
  "termo-kids": steel(),
  "hoppie": steel(),
  "hoppie-hydrate": steel(),
  "botella-ancha": steel(),
  "botella": steel(),
  "jug": steel({ dacen: false, consult: "handle" }),
  "vaso": steel(),
  "vaso-hydrate": steel(),
  "vaso-sunbeam": steel({ dacen: false, consult: "handle" }),
  "vaso-espresso": steel({ dacen: false, consult: "shape" }),
  "vaso-manija": steel({ dacen: false, consult: "handle" }),
  "taza-manija": steel({ dacen: false, consult: "handle" }),
  "mini-coffee": steel({ dacen: false, consult: "handle" }),
  "chopera": steel({ dacen: false, consult: "handle" }),
  "copa": steel({ dacen: false, consult: "shape" }),
  "copa-hydrate": steel({ dacen: false, consult: "shape" }),
  // Base redondeada y paredes que se abren.
  "guampa": steel({ dacen: false, consult: "shape" }),
};

/** Medidas de un producto en un tamaño (la base, pisada por las del tamaño). */
export function printSpecFor(productId: string, sizeId?: string | null): PrintSpec | null {
  const entry = (PRINT_SPECS as Record<string, PrintSpecEntry | undefined>)[productId];
  if (!entry) return null;
  const { bySize, ...base } = entry;
  const size = sizeId ? bySize?.[sizeId] : undefined;
  return size ? { ...base, ...size } : base;
}

/** Límites físicos de la Dacen F5 (DACEN.md §1). */
export const DACEN_LIMITS = {
  minDiameterMm: 45,
  maxDiameterMm: 125,
  maxTaperDeg: 5,
  maxLengthMm: 270,
} as const;

/** Conicidad en grados: atan((Øarriba − Øabajo) / 2 / alto). null sin medidas. */
export function taperDeg(spec: PrintDims): number | null {
  const { diameterTopMm: top, diameterBottomMm: bot, printableHeightMm: h } = spec;
  if (top === null || bot === null || h === null || h <= 0) return null;
  return Math.abs(Math.atan((top - bot) / 2 / h)) * (180 / Math.PI);
}

/**
 * ¿La pieza entra en la Dacen? Con medidas: Ø dentro de rango en las dos
 * puntas, conicidad ≤ 5° y largo ≤ 270 mm (y el taller la habilitó). Sin
 * medidas, manda el flag `dacen`.
 */
export function fitsDacen(spec: PrintSpec): boolean {
  if (!spec.dacen) return false;
  const { diameterTopMm: top, diameterBottomMm: bot, printableHeightMm: h } = spec;
  if (top === null || bot === null || h === null) return spec.dacen;
  const L = DACEN_LIMITS;
  const inRange = (d: number) => d >= L.minDiameterMm && d <= L.maxDiameterMm;
  const taper = taperDeg(spec) ?? 0;
  return inRange(top) && inRange(bot) && taper <= L.maxTaperDeg && h <= L.maxLengthMm;
}
