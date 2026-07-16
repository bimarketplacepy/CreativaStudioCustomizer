/**
 * Multi-line engraving text. The customizer joins wrapped rows with "\n"; the
 * canvas renderers (drinkware body, flat face and the 2D fallbacks) all lay the
 * mark out through these helpers so a long name reads across several lines
 * instead of one squashed row.
 */

/** Vertical spacing between engraved rows, as a multiple of the font size. */
export const LINE_HEIGHT = 1.12;

/** Split engraving text into its rows (the customer's line breaks). */
export function engraveLines(text: string): string[] {
  return text.split("\n");
}

/**
 * Greedy word-wrap for the "varias líneas" option: pack words into rows of at
 * most `maxChars`, joined by "\n" so the renderers stack them. A single word
 * longer than the limit keeps its own row rather than being cut mid-word.
 */
export function wrapEngraveText(text: string, maxChars: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && next.length > maxChars) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.join("\n");
}

/** Widest row in canvas pixels at the context's current font. */
export function measureLinesWidth(ctx: CanvasRenderingContext2D, lines: string[]): number {
  let w = 0;
  for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
  return w;
}

/**
 * Fill the rows centred on the origin — expects textAlign "center" and
 * textBaseline "middle". `yShift` nudges the whole block (used by the fallback's
 * groove-shadow pass).
 */
export function fillLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  lineHeight: number,
  yShift = 0
) {
  const top = -((lines.length - 1) * lineHeight) / 2 + yShift;
  lines.forEach((l, i) => ctx.fillText(l, 0, top + i * lineHeight));
}
