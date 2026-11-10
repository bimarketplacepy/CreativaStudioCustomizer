/** Resolución de una imagen sobre la pieza (DACEN.md §12.5). */
export type DpiVerdict = "ideal" | "ok" | "warn" | "bad";

/** Umbrales en dpi: ≥ 300 ideal · ≥ 150 bien · ≥ 100 advertencia · menos, no recomendable. */
export const DPI_THRESHOLDS = { ideal: 300, ok: 150, warn: 100 } as const;

export function dpiVerdict(dpi: number): DpiVerdict {
  if (dpi >= DPI_THRESHOLDS.ideal) return "ideal";
  if (dpi >= DPI_THRESHOLDS.ok) return "ok";
  if (dpi >= DPI_THRESHOLDS.warn) return "warn";
  return "bad";
}

export const DPI_VERDICT_TEXT: Record<DpiVerdict, string> = {
  ideal: "Resolución ideal",
  ok: "Se ve bien",
  warn: "Puede verse borroso de cerca",
  bad: "Muy baja: se va a ver pixelado",
};
