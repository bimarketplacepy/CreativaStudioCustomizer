/**
 * Registro de máquinas y reparto automático (DACEN.md §4.1).
 *
 * El cliente elige una TÉCNICA ("Grabado láser" / "Impresión a color"); esto
 * decide la MÁQUINA. El nombre de la máquina nunca se muestra en la landing:
 * viaja en el pedido (`designState.machine`) y aparece en el panel /admin.
 */
import { fitsDacen, type PrintSpec } from "./print-specs";

export type MachineId = "laser" | "dacen" | "eufy";

/** Técnica que eligió el cliente. */
export type PrintTechnique = "laser" | "color";

/** Qué se produce. */
export type ProductionKind = "drinkware" | "object" | "sticker";

export interface MachineDef {
  id: MachineId;
  /** Nombre interno (panel, archivo): "Dacen F5", "eufyMake E1", "Láser". */
  name: string;
  /** Lo que ve el cliente. */
  customerLabel: string;
  /** Archivo de producción que necesita la máquina. */
  fileKind: "svg" | "png-unwrapped" | "png";
  limits?: { minDiameterMm: number; maxDiameterMm: number; maxTaperDeg: number; maxLengthMm: number };
}

export const MACHINES: Record<MachineId, MachineDef> = {
  laser: { id: "laser", name: "Láser", customerLabel: "Grabado láser", fileKind: "svg" },
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
