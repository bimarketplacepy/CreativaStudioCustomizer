import * as THREE from "three";
import type { ProductDef } from "./products";
import { bandRange, DEFAULT_ART_PLACEMENT, type Placement } from "./placement";

/** Bare stainless steel, revealed where the laser ablates the powder coat. */
const STEEL_LIGHT = "#e6eaee";
const STEEL_MID   = "#b9c0c7";
const STEEL_DARK  = "#848d96";
/** The exposed steel is frosted by the beam, never mirror-polished. */
const ENGRAVED_ROUGHNESS = 0.34;
const ENGRAVED_METALNESS = 0.95;
/** Texture pixels of blur used to bevel the walls of the engraved groove. */
const GROOVE_BEVEL = 2.2;

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
  return { topPx, botPx, aspect: vPxPerUnit / hPxPerUnit };
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
  render: () => void
) {
  const rot = p.orientation === "vertical" ? -Math.PI / 2 : 0;
  const boundHalfH = (rot ? halfW : halfH) * m.aspect;

  const cx = ((p.u % 1) + 1) % 1 * W;
  const cy = clamp(m.topPx + (m.botPx - m.topPx) * p.v, m.topPx + boundHalfH, m.botPx - boundHalfH);

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
  artImage?: HTMLImageElement | null;
}

/** Printed text/brand ink when the piece is colour-printed rather than engraved. */
const PRINT_INK = "#161616";

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
  artImage = null,
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
      const maxDim = W * (imageSize === "large" ? 0.34 : 0.19);
      const ratio = Math.min(maxDim / naturalW, maxDim / naturalH);
      const dw = naturalW * ratio;
      const dh = naturalH * ratio;
      drawPlaced(ctx, m, W, artPlacement, dw / 2, dh / 2, () => {
        ctx.drawImage(artImage, -dw / 2, -dh / 2, dw, dh);
      });
    }

    if (text) {
      const fontSize = Math.round(W * 0.13 * textPlacement.scale);
      const font = `900 ${fontSize}px ${fontFamily}`;
      ctx.font = font;
      const textW = ctx.measureText(text).width;
      drawPlaced(ctx, m, W, textPlacement, textW / 2, fontSize * 0.6, () => {
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = PRINT_INK;
        ctx.fillText(text, 0, 0);
      });
    }

    ctx.save();
    ctx.font = `500 ${Math.round(W * 0.040)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.letterSpacing = "0.15em";
    ctx.fillText("CREATIVA STUDIO", W / 2, m.botPx - (m.botPx - m.topPx) * 0.07);
    ctx.restore();

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

  if (artMask && imageSize !== "none") {
    const maxDim = W * (imageSize === "large" ? 0.34 : 0.19);
    const ratio = Math.min(maxDim / artMask.width, maxDim / artMask.height);
    const dw = artMask.width * ratio;
    const dh = artMask.height * ratio;
    drawPlaced(mk, m, W, artPlacement, dw / 2, dh / 2, () => {
      mk.drawImage(artMask, -dw / 2, -dh / 2, dw, dh);
    });
  }

  if (text) {
    const fontSize = Math.round(W * 0.13 * textPlacement.scale);
    const font = `900 ${fontSize}px ${fontFamily}`;
    mk.font = font;
    const textW = mk.measureText(text).width;
    drawPlaced(mk, m, W, textPlacement, textW / 2, fontSize * 0.6, () => {
      mk.font = font;
      mk.textAlign = "center";
      mk.textBaseline = "middle";
      mk.fillStyle = "#ffffff";
      mk.fillText(text, 0, 0);
    });
  }

  // Brand mark — a shallower burn, pinned near the bottom of the band
  mk.save();
  mk.font = `500 ${Math.round(W * 0.040)}px Inter, system-ui, sans-serif`;
  mk.textAlign = "center";
  mk.textBaseline = "middle";
  mk.fillStyle = "rgba(255,255,255,0.55)";
  mk.letterSpacing = "0.15em";
  mk.fillText("CREATIVA STUDIO", W / 2, m.botPx - (m.botPx - m.topPx) * 0.07);
  mk.restore();

  // The chipped rim first, then the steel that the beam laid bare on top of it.
  const halo = grooveHalo(mark);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(halo, 0, 0);
  ctx.globalAlpha = 1;
  release(halo);

  const steel = maskedFill(mark, (c) => {
    const sheen = c.createLinearGradient(0, 0, W, 0);
    sheen.addColorStop(0.00, STEEL_DARK);
    sheen.addColorStop(0.30, STEEL_MID);
    sheen.addColorStop(0.48, STEEL_LIGHT);
    sheen.addColorStop(0.66, STEEL_MID);
    sheen.addColorStop(1.00, STEEL_DARK);
    return sheen;
  });
  ctx.drawImage(steel, 0, 0);
  release(steel);

  // ── Data maps ──────────────────────────────────────────────────────────────
  const [rough, rctx] = newCanvas();
  rctx.fillStyle = grey(finish.roughness);
  rctx.fillRect(0, 0, W, H);
  const roughMark = maskedFill(mark, () => grey(ENGRAVED_ROUGHNESS));
  rctx.drawImage(roughMark, 0, 0);
  release(roughMark);

  const [metal, mtctx] = newCanvas();
  mtctx.fillStyle = grey(finish.metalness);
  mtctx.fillRect(0, 0, W, H);
  const metalMark = maskedFill(mark, () => grey(ENGRAVED_METALNESS));
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
