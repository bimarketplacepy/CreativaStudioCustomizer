/**
 * Máquina de producción de un pedido (DACEN.md §4.1). La landing la manda en
 * `designState.machine`; los pedidos anteriores se infieren de lo que ya
 * guardaban. MANTENER EN SINCRONÍA con termos-landing/src/lib/machines.ts.
 */
export type MachineId = "laser" | "dacen" | "eufy";

export const MACHINE_IDS: readonly MachineId[] = ["laser", "dacen", "eufy"];

export const MACHINE_LABELS: Record<MachineId, string> = {
  laser: "Láser",
  dacen: "Dacen F5",
  eufy: "eufyMake E1",
};

export function isMachineId(v: unknown): v is MachineId {
  return typeof v === "string" && (MACHINE_IDS as readonly string[]).includes(v);
}

/**
 * La máquina declarada, o la inferida: sticker → eufyMake; impresión a color
 * sobre la pieza (técnica "color", o "eufy" antes del renombre) → Dacen; el
 * resto → láser.
 */
export function orderMachine(designState: unknown): MachineId {
  const ds = (designState ?? {}) as Record<string, unknown>;
  if (isMachineId(ds.machine)) return ds.machine;
  if (ds.kind === "sticker") return "eufy";
  if (ds.technique === "color" || ds.technique === "eufy") return "dacen";
  return "laser";
}
