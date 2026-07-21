import * as THREE from "three";
import type { ProductDef } from "./products";
import {
  bandRange, DEFAULT_ART_PLACEMENT, DEFAULT_LINE_HEIGHT,
  type Placement, type TextAlign, type TextLayout,
} from "./placement";
import {
  layoutText, fillLinesAligned, measureLinesWidth, measureLinesBox, fitText,
} from "./engraving-text";
import { faceConfigFor, type MarkHalfExtents } from "./face-area";

/** Text wraps once a row passes this fraction of the wrap-around circumference. */
const TEXT_WRAP_FRAC = 0.5;

/** "Envolvente 360°": gap kept between the end and the start of the wrapped
 *  line, as a fraction of the circumference, so the text never meets itself. */
export const WRAP360_MARGIN_FRAC = 0.05;
/** Legibility floor for the wrap-around text, in texture px (matches the
 *  smallest slider size). `wrap360Fits` gates the input against it: text that
 *  can't complete the lap at this size gets its extra characters blocked. The
 *  renderer itself may shrink further (hard floor 8px) so that — whatever state
 *  it is handed — the lap can never overlap itself. */
export const MIN_WRAP_FONT_PX = 40;

/** Bare stainless steel, revealed where the laser ablates the powder coat. */
const STEEL_LIGHT = "#e6eaee";
const STEEL_MID   = "#b9c0c7";
const STEEL_DARK  = "#848d96";
/** Texture pixels of blur used to bevel the walls of the engraved groove. */
const GROOVE_BEVEL = 2.2;

/**
 * How the laser reads on the drinkware surface. Powder-coated steel reveals
 * bright frosted metal; a leather-wrapped (forrado) piece chars to a dark
 * burn; wood chars to a deep brown; bare stainless (inox) anneals to a dark
 * matte graphite mark over the light metal. `burn === null` means the steel
 * sheen.
 */
export type EngraveStyle = "steel" | "leather" | "wood" | "inox";

const ENGRAVE_APPEARANCE: Record<EngraveStyle, { roughness: number; metalness: number; haloAlpha: number; burn: string | null }> = {
  steel:   { roughness: 0.34, metalness: 0.95, haloAlpha: 0.50, burn: null },
  leather: { roughness: 0.90, metalness: 0.00, haloAlpha: 0.60, burn: "#241109" },
  wood:    { roughness: 0.80, metalness: 0.00, haloAlpha: 0.55, burn: "#2b1708" },
  inox:    { roughness: 0.85, metalness: 0.15, haloAlpha: 0.30, burn: "#4A4A4A" },
};

export const TEXTURE_W = 1024;
export const TEXTURE_H = 2048;

const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));

/**
 * The engravable band in texture pixels, plus the vertical squash needed to
 * cancel the lathe's non-uniform UV so art keeps its real-world proportions.
 */
export function bandMetrics(product: ProductDef, W: number, H: number) {
  const [vBot, vTop] = bandRange(product);
  const topPx = (1 - vTop) * H;
  const botPx = (1 - vBot) * H;
  const maxR = Math.max(...product.profile.map(p => p[0]));
  const hPxPerUnit = W / (2 * Math.PI * maxR);
  const vPxPerUnit = (botPx - topPx) / (product.band[1] - product.band[0]);
  // Resolved single-face area for THIS product (copa overrides the default) so
  // every consumer of the metrics clamps against the same rectangle.
  return { topPx, botPx, aspect: vPxPerUnit / hPxPerUnit, face: faceConfigFor(product) };
}

type BandMetrics = ReturnType<typeof bandMetrics>;

/**
 * Draw something centred on the band at the given placement. Content is drawn
 * around the origin in square pixels; we clamp it inside the band and repeat it
 * across the texture seam so it wraps cleanly.
 */
function drawPlaced(
  ctx: CanvasRenderingContext2D,
  m: BandMetrics,
  W: number,
  p: Placement,
  halfW: number,
  halfH: number,
  render: () => void,
  singleFace = false
) {
  const rot = p.orientation === "vertical" ? -Math.PI / 2 : 0;
  const boundHalfH = (rot ? halfW : halfH) * m.aspect;
  // Horizontal half-extent in circumference pixels (swaps with vertical when the
  // mark is turned on its side).
  const boundHalfW = rot ? halfH : halfW;

  let cx = ((p.u % 1) + 1) % 1 * W;
  let cy = clamp(m.topPx + (m.botPx - m.topPx) * p.v, m.topPx + boundHalfH, m.botPx - boundHalfH);

  // "Edición en una cara": trap the whole bounding box inside the front-face
  // rectangle. This is the authority — the pad clamps for UX, but here the exact
  // rendered extents guarantee nothing crosses the margin, even partially.
  if (singleFace) {
    const bandH = m.botPx - m.topPx;
    const f = m.face;
    cx = clamp(
      cx,
      (f.uCenter - f.uHalfWidth) * W + boundHalfW,
      (f.uCenter + f.uHalfWidth) * W - boundHalfW,
    );
    cy = clamp(
      cy,
      m.topPx + bandH * (f.vCenter - f.vHeightFrac / 2) + boundHalfH,
      m.topPx + bandH * (f.vCenter + f.vHeightFrac / 2) - boundHalfH,
    );
  }

  for (const dx of [-W, 0, W]) {
    ctx.save();
    ctx.translate(cx + dx, cy);
    ctx.scale(1, m.aspect);
    ctx.rotate(rot);
    render();
    ctx.restore();
  }
}

function newCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_W;
  canvas.height = TEXTURE_H;
  return [canvas, canvas.getContext("2d")!];
}

/** A linear-space grey, for the data maps that three samples without decoding. */
function grey(v: number) {
  const c = Math.round(clamp(v, 0, 1) * 255);
  return `rgb(${c},${c},${c})`;
}

/** Canvas backing stores linger well past GC; drop them once composited. */
function release(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/** `paint` restricted to wherever the mask has coverage. */
function maskedFill(
  mask: HTMLCanvasElement,
  paint: (ctx: CanvasRenderingContext2D) => string | CanvasGradient
): HTMLCanvasElement {
  const [canvas, ctx] = newCanvas();
  ctx.fillStyle = paint(ctx);
  ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  return canvas;
}

/**
 * The soft dark ring that hugs the outside of an engraving, where the coating
 * chips away and the groove wall catches no light. Blur the mask, then punch
 * the sharp mask back out of it, and only the rim survives.
 */
function grooveHalo(mask: HTMLCanvasElement): HTMLCanvasElement {
  const [canvas, ctx] = newCanvas();
  ctx.filter = `blur(${GROOVE_BEVEL}px)`;
  ctx.drawImage(mask, 0, 0);
  ctx.filter = "none";
  ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
  return canvas;
}

/** The maps that describe one engraved body. */
export interface BodyMaps {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
  /** Doubles as the clearcoat mask: no lacquer survives inside the groove. */
  grooveMap: THREE.CanvasTexture;
  dispose: () => void;
}

export interface EngravingInput {
  product: ProductDef;
  colorHex: string;
  /** Base PBR values of the coating, which the engraving overrides locally. */
  finish: { roughness: number; metalness: number };
  isGradientFinish: boolean;
  text: string;
  textPlacement: Placement;
  fontFamily?: string;
  /** Coverage map of the uploaded artwork, from `buildEngraveMask`. */
  artMask?: HTMLCanvasElement | null;
  imageSize?: "none" | "small" | "large";
  artPlacement?: Placement;
  anisotropy?: number;
  /**
   * Eufy Make (UV DTF): print the artwork in full colour instead of engraving
   * it into the steel. Drinkware only. `artImage` carries the colour pixels.
   */
  colorPrint?: boolean;
  /** Ink colour for the printed text (UV DTF only). Defaults to near-black. */
  textColor?: string;
  artImage?: HTMLImageElement | null;
  /** Steel reveal (default), leather char (forrado) or wood char. */
  engraveStyle?: EngraveStyle;
  /**
   * "Edición en una cara": confine text and art to the front-face rectangle
   * instead of the full 360° band. See `face-area.ts`.
   */
  singleFace?: boolean;
}

/** Printed text/brand ink when the piece is colour-printed rather than engraved. */
const PRINT_INK = "#161616";

/** The engraved name is always heavy; the family comes from the chosen font. */
const FONT_WEIGHT = 900;
function makeTextFont(fontPx: number, fontFamily: string): string {
  return `${FONT_WEIGHT} ${Math.round(fontPx)}px ${fontFamily}`;
}

/** A fitted name for a product, in square (pre-aspect) pixels. */
export interface FaceTextLayout {
  lines: string[];
  fontPx: number;
  lineHeight: number;
  blockW: number;
  blockH: number;
  /** Painted ink extents (incl. script tails/swashes) — what clamps must use. */
  boxW: number;
  boxH: number;
  shrunk: boolean;
  align: TextAlign;
}

/**
 * How a name lays out for a product, in square (pre-aspect) pixels — the single
 * source of truth shared by the 3D texture, the placement clamp and the editor
 * preview. In single-face mode it is fitted to the front-face rectangle (word
 * wrap, then auto-shrink if the block is still too tall). In free mode it keeps
 * the original behaviour: wrap at half the circumference, no shrink.
 */
export function computeFaceTextLayout(
  product: ProductDef,
  opts: {
    text: string;
    fontFamily?: string;
    colorPrint?: boolean;
    orientation?: Placement["orientation"];
    align?: TextAlign;
    layout?: TextLayout;
    lineHeight?: number;
  },
  scale: number,
  singleFace: boolean,
): FaceTextLayout {
  const W = TEXTURE_W, H = TEXTURE_H;
  const m = bandMetrics(product, W, H);
  const fontFamily = opts.fontFamily ?? "Inter, system-ui, sans-serif";
  const align: TextAlign = opts.align ?? "center";
  const layout: TextLayout = opts.layout ?? "auto";
  const lhMul = opts.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const requestedFont = W * (opts.colorPrint ? 0.10 : 0.13) * scale;
  const rot = opts.orientation === "vertical";
  const ctx = measureCtx();

  // "Envolvente 360°" — free-edit only: one line around the full circumference,
  // auto-shrunk so the painted ink can NEVER meet itself: it must fit within
  // the perimeter minus the seam margin, down to the legibility floor.
  if (layout === "wrap360" && opts.text) {
    const avail = W * (1 - WRAP360_MARGIN_FRAC);
    const HARD_MIN = 8; // absolute floor: overlap is never allowed to render
    let fontPx = requestedFont;
    let lines: string[] = [];
    let box = { boxW: 0, boxH: 0 };
    for (let i = 0; i < 8; i++) {
      ctx.font = makeTextFont(fontPx, fontFamily);
      lines = layoutText(ctx, opts.text, "wrap360", avail);
      box = measureLinesBox(ctx, lines, fontPx, fontPx * lhMul);
      if (box.boxW <= avail || fontPx <= HARD_MIN) break;
      fontPx = Math.max(HARD_MIN, fontPx * (avail / box.boxW) * 0.99);
    }
    const lineHeight = fontPx * lhMul;
    const blockW = measureLinesWidth(ctx, lines);
    return {
      lines, fontPx, lineHeight, blockW, blockH: lines.length * lineHeight,
      boxW: box.boxW, boxH: box.boxH, shrunk: fontPx < requestedFont - 0.5, align,
    };
  }

  if (singleFace && opts.text) {
    // Room for the block in square px. Turning the text vertical swaps which
    // area dimension constrains the block's own width vs. height.
    const pad = 1 - 2 * m.face.textPadFrac;
    const areaWcyl = 2 * m.face.uHalfWidth * W;                // circumference px
    const areaHcyl = m.face.vHeightFrac * (m.botPx - m.topPx); // texture px
    const areaHsq = areaHcyl / m.aspect;                          // square px
    const availW = (rot ? areaHsq : areaWcyl) * pad;
    const availH = (rot ? areaWcyl : areaHsq) * pad;
    const fit = fitText(ctx, opts.text, (px) => makeTextFont(px, fontFamily), requestedFont, availW, availH, layout, lhMul);
    return { ...fit, align };
  }

  const fontPx = Math.round(requestedFont);
  ctx.font = makeTextFont(fontPx, fontFamily);
  const lineHeight = fontPx * lhMul;
  const lines = opts.text ? layoutText(ctx, opts.text, layout, W * TEXT_WRAP_FRAC) : [];
  const blockW = measureLinesWidth(ctx, lines);
  const box = measureLinesBox(ctx, lines, fontPx, lineHeight);
  return { lines, fontPx, lineHeight, blockW, blockH: lines.length * lineHeight, boxW: box.boxW, boxH: box.boxH, shrunk: false, align };
}

/**
 * Largest text-scale (slider value) at which `text` still fits one full wrap
 * without overlapping itself. Ink width scales ~linearly with the font, so a
 * single reference measurement at scale 1 gives the bound; the auto-shrink in
 * `computeFaceTextLayout` absorbs any residual non-linearity.
 */
export function wrap360MaxScale(opts: {
  text: string;
  fontFamily?: string;
  colorPrint?: boolean;
  lineHeight?: number;
}): number {
  if (!opts.text) return Infinity;
  const W = TEXTURE_W;
  const avail = W * (1 - WRAP360_MARGIN_FRAC);
  const fontFamily = opts.fontFamily ?? "Inter, system-ui, sans-serif";
  const refFont = W * (opts.colorPrint ? 0.10 : 0.13); // font at scale = 1
  const ctx = measureCtx();
  ctx.font = makeTextFont(refFont, fontFamily);
  const lines = layoutText(ctx, opts.text, "wrap360", avail);
  const box = measureLinesBox(ctx, lines, refFont, refFont * (opts.lineHeight ?? DEFAULT_LINE_HEIGHT));
  if (box.boxW <= 0) return Infinity;
  return avail / box.boxW;
}

/**
 * Can `text` complete the wrap at the legibility floor? When false, the input
 * must not accept more characters for this disposition.
 */
export function wrap360Fits(opts: { text: string; fontFamily?: string; lineHeight?: number }): boolean {
  if (!opts.text) return true;
  const W = TEXTURE_W;
  const avail = W * (1 - WRAP360_MARGIN_FRAC);
  const fontFamily = opts.fontFamily ?? "Inter, system-ui, sans-serif";
  const ctx = measureCtx();
  ctx.font = makeTextFont(MIN_WRAP_FONT_PX, fontFamily);
  const lines = layoutText(ctx, opts.text, "wrap360", avail);
  const box = measureLinesBox(ctx, lines, MIN_WRAP_FONT_PX, MIN_WRAP_FONT_PX * (opts.lineHeight ?? DEFAULT_LINE_HEIGHT));
  return box.boxW <= avail;
}

/**
 * Paints the engraving once as an alpha coverage mask — how deep the laser bit
 * at every texel — then derives colour, roughness, metalness and depth from it.
 * That is what sells the engraving: the marks are not lighter paint, they are
 * recessed metal that reflects the environment while the coating around them
 * does not.
 */
export function makeBodyMaps({
  product,
  colorHex,
  finish,
  isGradientFinish,
  text,
  textPlacement,
  fontFamily = "Inter, system-ui, sans-serif",
  artMask = null,
  imageSize = "none",
  artPlacement = DEFAULT_ART_PLACEMENT,
  anisotropy = 1,
  colorPrint = false,
  textColor = PRINT_INK,
  artImage = null,
  engraveStyle = "steel",
  singleFace = false,
}: EngravingInput): BodyMaps {
  const W = TEXTURE_W, H = TEXTURE_H;
  const m = bandMetrics(product, W, H);

  // ── Albedo base (shared by both the engraved and the printed piece) ────────
  const [base, ctx] = newCanvas();
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, W, H);

  if (isGradientFinish) {
    const fade = ctx.createLinearGradient(0, 0, 0, H);
    fade.addColorStop(0.0, "rgba(255,255,255,0.28)");
    fade.addColorStop(0.5, "rgba(255,255,255,0.00)");
    fade.addColorStop(1.0, "rgba(0,0,0,0.34)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, H);
  }

  // Vertical light stripe (label area highlight)
  const stripe = ctx.createLinearGradient(0, 0, W, 0);
  stripe.addColorStop(0.0,  "rgba(0,0,0,0.0)");
  stripe.addColorStop(0.42, "rgba(255,255,255,0.06)");
  stripe.addColorStop(0.50, "rgba(255,255,255,0.12)");
  stripe.addColorStop(0.58, "rgba(255,255,255,0.06)");
  stripe.addColorStop(1.0,  "rgba(0,0,0,0.0)");
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 0, W, H);

  // Acero inoxidable natural: vetas verticales sutiles para que el reflejo se
  // lea como acero cepillado y no como plástico gris. El patrón es determinista
  // (la textura se reconstruye en cada edición; uno aleatorio "hormiguearía").
  if (engraveStyle === "inox") {
    for (let i = 0; i < 140; i++) {
      const t = Math.sin(i * 12.9898) * 43758.5453;
      const fx = t - Math.floor(t);
      ctx.fillStyle = i % 2 === 0
        ? `rgba(255,255,255,${0.015 + (i % 5) * 0.006})`
        : `rgba(40,44,48,${0.02 + (i % 4) * 0.007})`;
      ctx.fillRect(Math.floor(fx * W), 0, 1 + (i % 3), H);
    }
  }

  // Occlusion: the cap shadows the shoulder, and the base curves away from the
  // light. Canvas y=0 is the top of the lathe, so these bracket the band.
  const shoulder = ctx.createLinearGradient(0, 0, 0, H * 0.09);
  shoulder.addColorStop(0, "rgba(0,0,0,0.40)");
  shoulder.addColorStop(1, "rgba(0,0,0,0.00)");
  ctx.fillStyle = shoulder;
  ctx.fillRect(0, 0, W, H * 0.09);

  const foot = ctx.createLinearGradient(0, H, 0, H * 0.90);
  foot.addColorStop(0, "rgba(0,0,0,0.45)");
  foot.addColorStop(1, "rgba(0,0,0,0.00)");
  ctx.fillStyle = foot;
  ctx.fillRect(0, H * 0.90, W, H * 0.10);

  // Engravable band (slightly lighter bg) — never the lid or the base
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, m.topPx, W, m.botPx - m.topPx);

  // ── Eufy Make (UV DTF): the artwork is PRINTED in colour, not engraved ─────
  if (colorPrint) {
    if (artImage && imageSize !== "none") {
      const naturalW = artImage.naturalWidth || artImage.width || 1;
      const naturalH = artImage.naturalHeight || artImage.height || 1;
      const maxDim = W * (imageSize === "large" ? 0.34 : 0.19) * artPlacement.scale;
      const ratio = Math.min(maxDim / naturalW, maxDim / naturalH);
      const dw = naturalW * ratio;
      const dh = naturalH * ratio;
      drawPlaced(ctx, m, W, artPlacement, dw / 2, dh / 2, () => {
        ctx.drawImage(artImage, -dw / 2, -dh / 2, dw, dh);
      }, singleFace);
    }

    if (text) {
      const L = computeFaceTextLayout(
        product,
        { text, fontFamily, colorPrint: true, orientation: textPlacement.orientation, align: textPlacement.align, layout: textPlacement.layout, lineHeight: textPlacement.lineHeight },
        textPlacement.scale,
        singleFace,
      );
      drawPlaced(ctx, m, W, textPlacement, L.boxW / 2, L.boxH / 2, () => {
        ctx.font = makeTextFont(L.fontPx, fontFamily);
        ctx.textBaseline = "middle";
        ctx.fillStyle = textColor;
        fillLinesAligned(ctx, L.lines, L.lineHeight, L.blockW, L.align);
      }, singleFace);
    }

    // Print sits flush on the coating: keep the base finish, no groove.
    const [rough, rctx] = newCanvas();
    rctx.fillStyle = grey(finish.roughness);
    rctx.fillRect(0, 0, W, H);
    const [metal, mtctx] = newCanvas();
    mtctx.fillStyle = grey(finish.metalness);
    mtctx.fillRect(0, 0, W, H);
    const [groove, gctx] = newCanvas();
    gctx.fillStyle = "#ffffff";
    gctx.fillRect(0, 0, W, H);

    const map = new THREE.CanvasTexture(base);
    map.colorSpace = THREE.SRGBColorSpace;
    const roughnessMap = new THREE.CanvasTexture(rough);
    const metalnessMap = new THREE.CanvasTexture(metal);
    const grooveMap = new THREE.CanvasTexture(groove);
    for (const t of [map, roughnessMap, metalnessMap, grooveMap]) t.anisotropy = anisotropy;
    return {
      map, roughnessMap, metalnessMap, grooveMap,
      dispose: () => { map.dispose(); roughnessMap.dispose(); metalnessMap.dispose(); grooveMap.dispose(); },
    };
  }

  // ── Coverage mask for the laser burn ───────────────────────────────────────
  const [mark, mk] = newCanvas();
  drawEngravingMark(mk, m, W, { product, text, textPlacement, fontFamily, artMask, imageSize, artPlacement, singleFace });

  // The chipped/charred rim first, then the mark the beam laid bare on top of it.
  const app = ENGRAVE_APPEARANCE[engraveStyle];
  const halo = grooveHalo(mark);
  ctx.globalAlpha = app.haloAlpha;
  ctx.drawImage(halo, 0, 0);
  ctx.globalAlpha = 1;
  release(halo);

  // Steel reveals a frosted sheen; leather/wood char to a flat dark burn.
  const markFill = maskedFill(mark, (c) => {
    if (!app.burn) {
      const sheen = c.createLinearGradient(0, 0, W, 0);
      sheen.addColorStop(0.00, STEEL_DARK);
      sheen.addColorStop(0.30, STEEL_MID);
      sheen.addColorStop(0.48, STEEL_LIGHT);
      sheen.addColorStop(0.66, STEEL_MID);
      sheen.addColorStop(1.00, STEEL_DARK);
      return sheen;
    }
    return app.burn;
  });
  ctx.drawImage(markFill, 0, 0);
  release(markFill);

  // ── Data maps ──────────────────────────────────────────────────────────────
  const [rough, rctx] = newCanvas();
  rctx.fillStyle = grey(finish.roughness);
  rctx.fillRect(0, 0, W, H);
  const roughMark = maskedFill(mark, () => grey(app.roughness));
  rctx.drawImage(roughMark, 0, 0);
  release(roughMark);

  const [metal, mtctx] = newCanvas();
  mtctx.fillStyle = grey(finish.metalness);
  mtctx.fillRect(0, 0, W, H);
  const metalMark = maskedFill(mark, () => grey(app.metalness));
  mtctx.drawImage(metalMark, 0, 0);
  release(metalMark);

  // White is the untouched coating; black is the floor of the groove. The blur
  // bevels the walls so the bump derivative reads as a cut edge, not a cliff.
  const [groove, gctx] = newCanvas();
  gctx.fillStyle = "#ffffff";
  gctx.fillRect(0, 0, W, H);
  gctx.filter = `blur(${GROOVE_BEVEL}px)`;
  const grooveMark = maskedFill(mark, () => "#000000");
  gctx.drawImage(grooveMark, 0, 0);
  gctx.filter = "none";
  release(grooveMark);
  release(mark);

  const map = new THREE.CanvasTexture(base);
  // Only the albedo is colour; the rest are data three must sample undecoded.
  map.colorSpace = THREE.SRGBColorSpace;
  const roughnessMap = new THREE.CanvasTexture(rough);
  const metalnessMap = new THREE.CanvasTexture(metal);
  const grooveMap = new THREE.CanvasTexture(groove);

  // Text wraps around a cylinder, so it is always viewed at a grazing angle.
  for (const t of [map, roughnessMap, metalnessMap, grooveMap]) {
    t.anisotropy = anisotropy;
  }

  return {
    map, roughnessMap, metalnessMap, grooveMap,
    dispose: () => {
      map.dispose();
      roughnessMap.dispose();
      metalnessMap.dispose();
      grooveMap.dispose();
    },
  };
}

/** What kind of mark to measure, with just the inputs that drive its size. */
export type MarkSpec =
  | { kind: "text"; text: string; fontFamily?: string; colorPrint?: boolean }
  | { kind: "art"; imageSize: "none" | "small" | "large"; artW: number; artH: number };

// A single reusable measuring context — text metrics only, never painted.
let measureCanvas: HTMLCanvasElement | null = null;
function measureCtx(): CanvasRenderingContext2D {
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  return measureCanvas.getContext("2d")!;
}

/**
 * Half-size of a placed mark expressed in placement space (u = fraction of the
 * circumference, v = fraction of the band). Mirrors exactly the sizing that
 * `makeBodyMaps` / `drawPlaced` apply, so the drag pad and the single-face clamp
 * can reason about "does the whole box fit" without re-deriving the font math.
 */
export function markHalfExtents(
  product: ProductDef,
  spec: MarkSpec,
  placement: Placement,
  singleFace = false,
): MarkHalfExtents {
  const W = TEXTURE_W, H = TEXTURE_H;
  const m = bandMetrics(product, W, H);
  let halfWpx = 0, halfHpx = 0; // pre-aspect "square" pixels, matching drawPlaced's halfW/halfH

  if (spec.kind === "text") {
    if (spec.text) {
      const L = computeFaceTextLayout(
        product,
        { text: spec.text, fontFamily: spec.fontFamily, colorPrint: spec.colorPrint, orientation: placement.orientation, align: placement.align, layout: placement.layout, lineHeight: placement.lineHeight },
        placement.scale,
        singleFace,
      );
      halfWpx = L.boxW / 2;
      halfHpx = L.boxH / 2;
    }
  } else if (spec.imageSize !== "none" && spec.artW > 0 && spec.artH > 0) {
    const maxDim = W * (spec.imageSize === "large" ? 0.34 : 0.19) * placement.scale;
    const ratio = Math.min(maxDim / spec.artW, maxDim / spec.artH);
    halfWpx = (spec.artW * ratio) / 2;
    halfHpx = (spec.artH * ratio) / 2;
  }

  const rot = placement.orientation === "vertical";
  const horizHalfPx = rot ? halfHpx : halfWpx;
  const vertHalfPx = (rot ? halfWpx : halfHpx) * m.aspect;
  return {
    halfU: horizHalfPx / W,
    halfV: vertHalfPx / (m.botPx - m.topPx),
  };
}

// ── Glass (cristal) engraving ────────────────────────────────────────────────

/**
 * Draw the engraving coverage (uploaded art + text) as opaque white on `mk`'s
 * otherwise-transparent canvas. This is the raw *shape* of the mark, shared by
 * both the steel laser burn (makeBodyMaps) and the glass frost below, so text
 * fitting / placement stay identical across materials.
 */
function drawEngravingMark(
  mk: CanvasRenderingContext2D,
  m: BandMetrics,
  W: number,
  opts: {
    product: ProductDef;
    text: string;
    textPlacement: Placement;
    fontFamily: string;
    artMask?: HTMLCanvasElement | null;
    imageSize?: "none" | "small" | "large";
    artPlacement?: Placement;
    singleFace?: boolean;
  },
) {
  const {
    product, text, textPlacement, fontFamily,
    artMask = null, imageSize = "none", artPlacement = DEFAULT_ART_PLACEMENT, singleFace = false,
  } = opts;

  if (artMask && imageSize !== "none") {
    const maxDim = W * (imageSize === "large" ? 0.34 : 0.19) * artPlacement.scale;
    const ratio = Math.min(maxDim / artMask.width, maxDim / artMask.height);
    const dw = artMask.width * ratio;
    const dh = artMask.height * ratio;
    drawPlaced(mk, m, W, artPlacement, dw / 2, dh / 2, () => {
      mk.drawImage(artMask, -dw / 2, -dh / 2, dw, dh);
    }, singleFace);
  }

  if (text) {
    const L = computeFaceTextLayout(
      product,
      { text, fontFamily, colorPrint: false, orientation: textPlacement.orientation, align: textPlacement.align, layout: textPlacement.layout, lineHeight: textPlacement.lineHeight },
      textPlacement.scale,
      singleFace,
    );
    drawPlaced(mk, m, W, textPlacement, L.boxW / 2, L.boxH / 2, () => {
      mk.font = makeTextFont(L.fontPx, fontFamily);
      mk.textBaseline = "middle";
      mk.fillStyle = "#ffffff";
      fillLinesAligned(mk, L.lines, L.lineHeight, L.blockW, L.align);
    }, singleFace);
  }
}

export interface GlassMaps {
  /**
   * Colour of the mark: crisp white core with a soft slate rim. The rim gives
   * the frost the edge contrast a real sandblasted engraving has — pure white
   * frost disappears against the light glass.
   */
  frostMap: THREE.CanvasTexture;
  /**
   * Coverage (luminance = alpha) of core + rim. Separate from the colour map:
   * with a single map the dark rim would also read as low alpha and erase
   * itself, so colour and opacity have to travel on different textures.
   */
  alphaMap: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Engraving texture for a glass (cristal) piece. Unlike steel — which reveals
 * bare metal — glass is sandblasted: the mark is a frosted, light-diffusing
 * white. We only need the coverage shape; the frosted look itself comes from the
 * overlay material in the 3D component (high roughness, translucent white).
 */
export function makeGlassEngraving(opts: {
  product: ProductDef;
  text: string;
  textPlacement: Placement;
  fontFamily?: string;
  artMask?: HTMLCanvasElement | null;
  imageSize?: "none" | "small" | "large";
  artPlacement?: Placement;
  singleFace?: boolean;
  anisotropy?: number;
}): GlassMaps {
  const W = TEXTURE_W, H = TEXTURE_H;
  const m = bandMetrics(opts.product, W, H);
  const [mark, mk] = newCanvas();
  drawEngravingMark(mk, m, W, {
    product: opts.product,
    text: opts.text,
    textPlacement: opts.textPlacement,
    fontFamily: opts.fontFamily ?? "Inter, system-ui, sans-serif",
    artMask: opts.artMask,
    imageSize: opts.imageSize,
    artPlacement: opts.artPlacement,
    singleFace: opts.singleFace,
  });

  // Colour map: a soft slate rim under the crisp white core. The rim gives the
  // mark the edge contrast a real sandblasted engraving has.
  const [frost, fk] = newCanvas();
  fk.save();
  fk.shadowColor = "rgba(52, 64, 76, 1)";
  fk.shadowBlur = 9;
  fk.drawImage(mark, 0, 0);
  fk.drawImage(mark, 0, 0); // extra passes deepen the rim
  fk.drawImage(mark, 0, 0);
  fk.restore();
  fk.drawImage(mark, 0, 0); // crisp white core on top

  // Alpha map: same coverage (core + rim) but drawn in white, so the rim keeps
  // full opacity. Luminance drives alpha — black background = fully clear.
  const [alpha, ak] = newCanvas();
  ak.fillStyle = "#000000";
  ak.fillRect(0, 0, W, H);
  ak.save();
  ak.shadowColor = "rgba(255, 255, 255, 1)";
  ak.shadowBlur = 9;
  ak.drawImage(mark, 0, 0);
  ak.drawImage(mark, 0, 0);
  ak.drawImage(mark, 0, 0);
  ak.restore();
  ak.drawImage(mark, 0, 0);

  const frostMap = new THREE.CanvasTexture(frost);
  frostMap.colorSpace = THREE.SRGBColorSpace;
  frostMap.anisotropy = opts.anisotropy ?? 1;
  const alphaMap = new THREE.CanvasTexture(alpha);
  alphaMap.anisotropy = opts.anisotropy ?? 1;
  return { frostMap, alphaMap, dispose: () => { frostMap.dispose(); alphaMap.dispose(); } };
}
