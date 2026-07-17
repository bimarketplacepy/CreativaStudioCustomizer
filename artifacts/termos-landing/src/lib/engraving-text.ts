/**
 * Multi-line engraving text. The customizer joins wrapped rows with "\n"; the
 * canvas renderers (drinkware body, flat face and the 2D fallbacks) all lay the
 * mark out through these helpers so a long name reads across several lines
 * instead of one squashed row.
 */

import type { TextAlign, TextLayout } from "./placement";

/** Vertical spacing between engraved rows, as a multiple of the font size. */
export const LINE_HEIGHT = 1.12;

/** Does `s` fit within `maxWidth` at the context's current font? */
const fitsFn = (ctx: CanvasRenderingContext2D, maxWidth: number) =>
  (s: string) => ctx.measureText(s).width <= maxWidth;

/**
 * Hard-break a word that is itself wider than the margin, pushing the prefix
 * rows into `rows` and returning the tail that fits. Shared by every layout mode
 * so a single very long word never overflows the area.
 */
function pushHardBroken(rows: string[], word: string, fits: (s: string) => boolean): string {
  let w = word;
  while (w.length > 1 && !fits(w)) {
    let cut = 1;
    while (cut < w.length && fits(w.slice(0, cut + 1))) cut++;
    rows.push(w.slice(0, cut));
    w = w.slice(cut);
  }
  return w;
}

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
  const fits = fitsFn(ctx, maxWidth);

  const rows: string[] = [];
  for (const segment of text.split("\n")) {
    let line = "";
    for (const word of segment.split(" ")) {
      if (word === "") continue;
      if (!line) {
        line = pushHardBroken(rows, word, fits);
      } else if (fits(`${line} ${word}`)) {
        line = `${line} ${word}`;
      } else {
        rows.push(line);
        line = pushHardBroken(rows, word, fits);
      }
    }
    rows.push(line);
  }
  return rows.length ? rows : [text];
}

/** One word per line, always. A word wider than the area is hard-broken. */
function stackWords(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const fits = fitsFn(ctx, maxWidth);
  const rows: string[] = [];
  for (const word of text.split(/\s+/)) {
    if (word === "") continue;
    rows.push(pushHardBroken(rows, word, fits));
  }
  return rows.length ? rows : [text];
}

/** Respect exactly the user's "\n" breaks; no width wrapping. Trailing blank
 *  lines (from a final Enter) are dropped so they don't add phantom height. */
function manualLines(text: string): string[] {
  const rows = text.split("\n");
  while (rows.length > 1 && rows[rows.length - 1] === "") rows.pop();
  return rows;
}

/**
 * The single entry point that turns raw text into the final rows, honouring the
 * chosen disposition. Every caller — the fitting, the measurement and the render
 * — goes through here so the three never disagree on where the breaks land.
 */
export function layoutText(
  ctx: CanvasRenderingContext2D,
  text: string,
  layout: TextLayout,
  maxWidth: number,
): string[] {
  if (!text) return [];
  switch (layout) {
    case "stack":
      return stackWords(ctx, text, maxWidth);
    case "manual":
      return manualLines(text);
    case "auto":
    default:
      return wrapToWidth(ctx, text, maxWidth);
  }
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

/**
 * Fill the rows honouring a horizontal alignment within a block `blockW` wide,
 * centred on the origin (expects textBaseline "middle"). "justify" stretches the
 * inter-word gaps to fill the block on every row except the last. Used so the
 * engraved text reads like any text editor's alignment, not just centred.
 */
export function fillLinesAligned(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  lineHeight: number,
  blockW: number,
  align: TextAlign,
  yShift = 0
) {
  const top = -((lines.length - 1) * lineHeight) / 2 + yShift;
  const left = -blockW / 2;
  lines.forEach((line, i) => {
    const y = top + i * lineHeight;
    if (align === "center") {
      ctx.textAlign = "center";
      ctx.fillText(line, 0, y);
      return;
    }
    if (align === "right") {
      ctx.textAlign = "right";
      ctx.fillText(line, blockW / 2, y);
      return;
    }
    if (align === "justify") {
      const words = line.split(" ").filter(Boolean);
      const isLast = i === lines.length - 1;
      const lineW = ctx.measureText(line).width;
      if (!isLast && words.length >= 2 && lineW < blockW) {
        const wordsW = words.reduce((s, w) => s + ctx.measureText(w).width, 0);
        const gap = (blockW - wordsW) / (words.length - 1);
        ctx.textAlign = "left";
        let x = left;
        for (const w of words) {
          ctx.fillText(w, x, y);
          x += ctx.measureText(w).width + gap;
        }
        return;
      }
      // Last row (or a single word / already-overflowing row): fall back to left.
    }
    // left (and justify fallthrough)
    ctx.textAlign = "left";
    ctx.fillText(line, left, y);
  });
}

/** A fitted text block: wrapped rows plus the font size that made them fit. */
export interface FitResult {
  lines: string[];
  /** Final font size in px (may be smaller than requested — auto-shrink). */
  fontPx: number;
  lineHeight: number;
  /** Widest row width in px. */
  blockW: number;
  /** Total block height in px (rows × line height). */
  blockH: number;
  /** True when the font was shrunk below the requested size to fit the area. */
  shrunk: boolean;
}

/**
 * Fit `text` into a `maxWidth` × `maxHeight` box for the chosen disposition:
 * lay it out at the requested size, and if the block is still too wide OR too
 * tall, shrink the font (re-laying-out each step) until it fits or hits
 * `minFontPx`. Shrinking on width matters for "stack"/"manual", where a single
 * word or an un-wrapped manual line can be wider than the area — auto-wrap can't
 * help there, so the font must give. This is the single source of truth for how
 * a name lays out inside the front-face area — the 3D texture, the editor
 * preview and the placement clamp all call it so they always agree.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  makeFont: (px: number) => string,
  requestedFontPx: number,
  maxWidth: number,
  maxHeight: number,
  layout: TextLayout,
  lineHeightMul: number,
  minFontPx = 8
): FitResult {
  let fontPx = Math.max(minFontPx, requestedFontPx);
  let lines: string[] = [];
  let lineHeight = 0;
  let blockW = 0;
  let blockH = 0;

  for (let i = 0; i < 12; i++) {
    ctx.font = makeFont(fontPx);
    lineHeight = fontPx * lineHeightMul;
    lines = layoutText(ctx, text, layout, maxWidth);
    blockW = measureLinesWidth(ctx, lines);
    blockH = lines.length * lineHeight;
    const wRatio = blockW > maxWidth ? maxWidth / blockW : 1;
    const hRatio = blockH > maxHeight ? maxHeight / blockH : 1;
    const ratio = Math.min(wRatio, hRatio);
    if (ratio >= 1 || fontPx <= minFontPx) break;
    // Shrink toward the binding dimension (a hair extra so we converge, not oscillate).
    const next = Math.max(minFontPx, fontPx * ratio * 0.98);
    if (next >= fontPx) break;
    fontPx = next;
  }

  return { lines, fontPx, lineHeight, blockW, blockH, shrunk: fontPx < requestedFontPx - 0.5 };
}
