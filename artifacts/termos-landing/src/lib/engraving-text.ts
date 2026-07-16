/**
 * Multi-line engraving text. The customizer joins wrapped rows with "\n"; the
 * canvas renderers (drinkware body, flat face and the 2D fallbacks) all lay the
 * mark out through these helpers so a long name reads across several lines
 * instead of one squashed row.
 */

/** Vertical spacing between engraved rows, as a multiple of the font size. */
export const LINE_HEIGHT = 1.12;

/**
 * Word-wrap `text` into rows that each fit within `maxWidth` px at the context's
 * current font — the Instagram editor behaviour: as the font grows, fewer words
 * fit per row and the text spills onto the next line automatically. Explicit
 * "\n" breaks are honoured, and a single word wider than the margin is hard-
 * broken so it never overflows.
 */
export function wrapToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const fits = (s: string) => ctx.measureText(s).width <= maxWidth;

  const rows: string[] = [];
  // Break a word that is itself wider than the margin; returns the tail that fits.
  const hardBreak = (word: string): string => {
    let w = word;
    while (w.length > 1 && !fits(w)) {
      let cut = 1;
      while (cut < w.length && fits(w.slice(0, cut + 1))) cut++;
      rows.push(w.slice(0, cut));
      w = w.slice(cut);
    }
    return w;
  };

  for (const segment of text.split("\n")) {
    let line = "";
    for (const word of segment.split(" ")) {
      if (word === "") continue;
      if (!line) {
        line = hardBreak(word);
      } else if (fits(`${line} ${word}`)) {
        line = `${line} ${word}`;
      } else {
        rows.push(line);
        line = hardBreak(word);
      }
    }
    rows.push(line);
  }
  return rows.length ? rows : [text];
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
