import * as THREE from "three";
import type { EngraveStyle } from "./objects";
import { DEFAULT_ART_PLACEMENT, DEFAULT_TEXT_PLACEMENT, type Placement } from "./placement";
import { layoutText, fillLinesAligned, measureLinesWidth, LINE_HEIGHT } from "./engraving-text";

/** Text wraps once a row passes this fraction of the face width. */
const TEXT_WRAP_FRAC = 0.82;

/**
 * Engraving for a single flat face (wood board, leather wallet, acrylic disc,
 * steel plate…). Unlike the cylindrical drinkware maps in `engraving-maps.ts`,
 * the face has uniform UVs, so we can draw the mark straight onto a transparent
 * overlay texture that sits a hair in front of the surface — no unwrapping and
 * no per-material rebuild of the whole body.
 */

/** Base texture width; height follows the face aspect so nothing stretches. */
const BASE_W = 1024;
const GROOVE_BEVEL = 2.4;

/** How the burn looks per material: mark colour, groove halo and PBR response. */
interface InkStyle {
  /** Colour laid down where the beam bit. */
  mark: string;
  /** Optional light-catching sheen across the mark (steel / acrylic). */
  sheen?: [string, string, string];
  /** Soft ring hugging the mark, sold as chipped/charred edge. */
  halo: string;
  roughness: number;
  metalness: number;
  bumpScale: number;
}

const INK: Record<EngraveStyle, InkStyle> = {
  // Bare stainless anneals dark under the beam (see the opener photo).
  steel: {
    mark: "#454c54",
    sheen: ["#3a4048", "#5b636c", "#3a4048"],
    halo: "rgba(10,14,18,0.45)",
    roughness: 0.4,
    metalness: 0.85,
    bumpScale: 0.05,
  },
  // Wood chars to a deep brown, with a scorched rim.
  wood: {
    mark: "#301b0d",
    halo: "rgba(18,9,3,0.5)",
    roughness: 0.78,
    metalness: 0.0,
    bumpScale: 0.09,
  },
  // Leather debosses and darkens; matte with a faint charred edge.
  leather: {
    mark: "#2a1810",
    halo: "rgba(12,6,3,0.55)",
    roughness: 0.86,
    metalness: 0.0,
    bumpScale: 0.11,
  },
  // Clear acrylic frosts to a milky white where engraved.
  acrylic: {
    mark: "#eef4f8",
    sheen: ["#dfe8ef", "#ffffff", "#dfe8ef"],
    halo: "rgba(255,255,255,0.22)",
    roughness: 0.55,
    metalness: 0.0,
    bumpScale: 0.06,
  },
  // Powder-look plastic burns to a near-black etch.
  plastic: {
    mark: "#1b1e23",
    halo: "rgba(0,0,0,0.4)",
    roughness: 0.62,
    metalness: 0.0,
    bumpScale: 0.06,
  },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function newCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext("2d")!];
}

function release(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/** Draw `render` centred at the placement, clamped to stay inside the face. */
function drawPlaced(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  p: Placement,
  halfW: number,
  halfH: number,
  render: () => void
) {
  const rot = p.orientation === "vertical" ? -Math.PI / 2 : 0;
  const bw = rot ? halfH : halfW;
  const bh = rot ? halfW : halfH;
  const cx = clamp(p.u * W, bw + 4, W - bw - 4);
  const cy = clamp(p.v * H, bh + 4, H - bh - 4);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  render();
  ctx.restore();
}

export interface FaceMaps {
  /** RGBA overlay: mark colour in RGB, burn depth in alpha. */
  map: THREE.CanvasTexture;
  /** Groove depth for the overlay's bump. */
  bumpMap: THREE.CanvasTexture;
  roughness: number;
  metalness: number;
  bumpScale: number;
  dispose: () => void;
}

export interface FaceEngravingInput {
  engrave: EngraveStyle;
  /** Real face size in world units — sets the texture aspect. */
  faceW: number;
  faceH: number;
  text: string;
  textPlacement?: Placement;
  fontFamily?: string;
  /** Coverage mask of the uploaded artwork (from `buildEngraveMask`). */
  artMask?: HTMLCanvasElement | null;
  imageSize?: "none" | "small" | "large";
  artPlacement?: Placement;
  anisotropy?: number;
  /** Per-blank multiplier on the mark's base size (see ObjectDef.markScale). */
  markScale?: number;
}

export function makeFaceMaps({
  engrave,
  faceW,
  faceH,
  text,
  textPlacement = DEFAULT_TEXT_PLACEMENT,
  fontFamily = "Inter, system-ui, sans-serif",
  artMask = null,
  imageSize = "none",
  artPlacement = DEFAULT_ART_PLACEMENT,
  anisotropy = 1,
  markScale = 1,
}: FaceEngravingInput): FaceMaps {
  const style = INK[engrave];
  const W = BASE_W;
  const H = Math.max(64, Math.round((BASE_W * faceH) / faceW));

  // ── 1. Coverage mask (white = full burn, transparent = untouched) ──────────
  const [mark, mk] = newCanvas(W, H);

  if (artMask && imageSize !== "none") {
    // Cap to the face so a scaled-up mark grows to fill the (short) face without
    // ever spilling past its bounds and getting cropped by the canvas edge.
    const maxDim = Math.min(
      Math.min(W, H) * (imageSize === "large" ? 0.5 : 0.3) * markScale * artPlacement.scale,
      Math.min(W, H) - 8,
    );
    const ratio = Math.min(maxDim / artMask.width, maxDim / artMask.height);
    const dw = artMask.width * ratio;
    const dh = artMask.height * ratio;
    drawPlaced(mk, W, H, artPlacement, dw / 2, dh / 2, () => {
      mk.drawImage(artMask, -dw / 2, -dh / 2, dw, dh);
    });
  }

  if (text) {
    // Auto-shrink: if the laid-out block overflows the face (tall stacks on the
    // short pen barrel, very long names), scale the font down until it fits —
    // the mark must always stay inside the engravable face, never clipped.
    let fontSize = Math.round(H * 0.15 * markScale * textPlacement.scale);
    let font = `900 ${fontSize}px ${fontFamily}`;
    let lineHeight = fontSize * (textPlacement.lineHeight ?? LINE_HEIGHT);
    mk.font = font;
    let lines = layoutText(mk, text, textPlacement.layout ?? "auto", W * TEXT_WRAP_FRAC);
    let textW = measureLinesWidth(mk, lines);
    for (let i = 0; i < 4; i++) {
      const blockH = lines.length * lineHeight;
      const fit = Math.min((W - 12) / Math.max(1, textW), (H - 12) / Math.max(1, blockH));
      if (fit >= 1) break;
      fontSize = Math.max(8, Math.floor(fontSize * fit));
      font = `900 ${fontSize}px ${fontFamily}`;
      lineHeight = fontSize * (textPlacement.lineHeight ?? LINE_HEIGHT);
      mk.font = font;
      lines = layoutText(mk, text, textPlacement.layout ?? "auto", W * TEXT_WRAP_FRAC);
      textW = measureLinesWidth(mk, lines);
    }
    drawPlaced(mk, W, H, textPlacement, textW / 2, (lines.length * lineHeight) / 2, () => {
      mk.font = font;
      mk.textBaseline = "middle";
      mk.fillStyle = "#ffffff";
      fillLinesAligned(mk, lines, lineHeight, textW, textPlacement.align ?? "center");
    });
  }

  // ── 2. Colour overlay (RGB = ink, A = coverage) ────────────────────────────
  const [ink, ic] = newCanvas(W, H);

  // Charred/frosted halo first, so the crisp mark lands on top of it.
  ic.save();
  ic.filter = `blur(${GROOVE_BEVEL}px)`;
  ic.drawImage(mark, 0, 0);
  ic.filter = "none";
  ic.globalCompositeOperation = "destination-out";
  ic.drawImage(mark, 0, 0);
  ic.globalCompositeOperation = "source-in";
  ic.fillStyle = style.halo;
  ic.fillRect(0, 0, W, H);
  ic.restore();

  // The crisp mark, tinted with the material's burn colour.
  const [tint, tc] = newCanvas(W, H);
  if (style.sheen) {
    const g = tc.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, style.sheen[0]);
    g.addColorStop(0.5, style.sheen[1]);
    g.addColorStop(1, style.sheen[2]);
    tc.fillStyle = g;
  } else {
    tc.fillStyle = style.mark;
  }
  tc.fillRect(0, 0, W, H);
  tc.globalCompositeOperation = "destination-in";
  tc.drawImage(mark, 0, 0);
  ic.drawImage(tint, 0, 0);
  release(tint);

  // ── 3. Bump: white base, dark bevelled marks ───────────────────────────────
  const [bump, bc] = newCanvas(W, H);
  bc.fillStyle = "#ffffff";
  bc.fillRect(0, 0, W, H);
  bc.filter = `blur(${GROOVE_BEVEL}px)`;
  const [bm, bmc] = newCanvas(W, H);
  bmc.fillStyle = "#000000";
  bmc.fillRect(0, 0, W, H);
  bmc.globalCompositeOperation = "destination-in";
  bmc.drawImage(mark, 0, 0);
  bc.drawImage(bm, 0, 0);
  bc.filter = "none";
  release(bm);
  release(mark);

  const map = new THREE.CanvasTexture(ink);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(bump);
  for (const t of [map, bumpMap]) t.anisotropy = anisotropy;

  return {
    map,
    bumpMap,
    roughness: style.roughness,
    metalness: style.metalness,
    bumpScale: style.bumpScale,
    dispose: () => {
      map.dispose();
      bumpMap.dispose();
    },
  };
}
