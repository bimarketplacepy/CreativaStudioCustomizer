/**
 * Registro de máquinas y reparto automático (DACEN.md §4.1).
 *
 * El cliente elige una TÉCNICA ("Grabado láser" / "Impresión a color"); esto
 * decide la MÁQUINA. En el personalizador el nombre de la máquina no se
 * muestra: viaja en el pedido (`designState.machine`) y aparece en el panel
 * /admin. La sección «Impresión 360°» (print-360.tsx) sí nombra la Dacen F5 a
 * propósito, como diferencial del taller (pedido del dueño, 2026-10-27).
 */
import { fitsDacen, type PrintSpec } from "./print-specs";

export type MachineId = "laser" | "dacen" | "eufy";

/** Técnica que eligió el cliente. */
export type PrintTechnique = "laser" | "color";

/** Qué se produce. */
export type ProductionKind = "drinkware" | "object" | "sticker";

export interface MachineDef {
  id: MachineId;
  /** Nombre interno (panel, archivo): "Dacen F5", "eufyMake E1", "Láser CO2". */
  name: string;
  /** Lo que ve el cliente. */
  customerLabel: string;
  /** Archivo de producción que necesita la máquina. */
  fileKind: "dxf" | "png-unwrapped" | "png";
  limits?: { minDiameterMm: number; maxDiameterMm: number; maxTaperDeg: number; maxLengthMm: number };
}

export const MACHINES: Record<MachineId, MachineDef> = {
  // Láser CO2 Willpex con eje rotativo (termos). El taller trabaja Corel →
  // DXF → láser: el pedido trae el DXF (más un SVG de referencia).
  laser: { id: "laser", name: "Láser CO2", customerLabel: "Grabado láser", fileKind: "dxf" },
  // UV cilíndrica: solo piezas cilíndricas (print-specs.ts). PNG desenrollado
  // de la vuelta completa (360°), que se abre en RIPrint.
  dacen: {
    id: "dacen", name: "Dacen F5", customerLabel: "Impresión a color", fileKind: "png-unwrapped",
    limits: { minDiameterMm: 45, maxDiameterMm: 125, maxTaperDeg: 5, maxLengthMm: 270 },
  },
  eufy: { id: "eufy", name: "eufyMake E1", customerLabel: "Sticker / impresión a color", fileKind: "png" },
};

/**
 * Id de técnica del personalizador → técnica. Acepta el id viejo `"eufy"`
 * (links compartidos y pedidos anteriores al renombre a `"color"`).
 */
export function normalizeTechnique(technique: string | null | undefined): PrintTechnique {
  return technique === "color" || technique === "eufy" ? "color" : "laser";
}

/** Reparto automático: el cliente elige técnica, esto elige máquina. */
export function machineFor(opts: {
  technique: PrintTechnique | "eufy";
  kind: ProductionKind;
  /** De `printSpecFor()`; sin spec, una pieza a color no va a la Dacen. */
  spec?: PrintSpec | null;
}): MachineId {
  if (opts.kind === "sticker") return "eufy";
  if (normalizeTechnique(opts.technique) === "laser") return "laser";
  if (opts.kind === "drinkware" && opts.spec && fitsDacen(opts.spec)) return "dacen";
  // Plano a color, o pieza fuera de rango de la Dacen → sticker / cama plana.
  return "eufy";
}
