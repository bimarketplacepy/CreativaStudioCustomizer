import React, { useRef, useEffect, useMemo, useState, Suspense, Component, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { getProduct, getSize, resampledProfile, type ProductDef } from "@/lib/products";
import { bandRange, DEFAULT_ART_PLACEMENT, DEFAULT_TEXT_PLACEMENT, type Placement } from "@/lib/placement";

class WebGLErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface Thermos3DProps {
  colorHex: string;
  finish: string;
  text: string;
  fontClass: string;
  fontStyle?: React.CSSProperties;
  productId: string;
  sizeId: string;
  customImageUrl: string | null;
  imageSize: "none" | "small" | "large";
  textPlacement?: Placement;
  artPlacement?: Placement;
}

/** Everything the meshes and the camera rig need, derived from the product profile. */
interface Silhouette {
  points: THREE.Vector2[];
  scale: number;
  /** Widest radius of the body. */
  maxR: number;
  bottomY: number;
  /** Y of the topmost profile point (where the cap seats). */
  neckY: number;
  neckR: number;
  capR: number;
  capH: number;
  /** Top of the whole object, cap included. */
  topY: number;
  /** Engravable band [bottomY, topY], scaled. */
  band: [number, number];
}

function buildSilhouette(product: ProductDef, scale: number): Silhouette {
  const points = resampledProfile(product).map(([x, y]) => new THREE.Vector2(x * scale, y * scale));
  const maxR = Math.max(...product.profile.map(p => p[0])) * scale;
  const bottomY = product.profile[0][1] * scale;
  const last = product.profile[product.profile.length - 1];
  const neckR = last[0] * scale;
  const neckY = last[1] * scale;

  const capH = product.cap === "screw" ? 0.42 * scale : product.cap === "lid" ? 0.18 * scale : 0;
  const capR = product.cap === "screw" ? neckR * 1.16 : neckR * 1.06;

  return {
    points, scale, maxR, bottomY, neckY, neckR, capR, capH,
    topY: neckY + capH,
    band: [product.band[0] * scale, product.band[1] * scale] as [number, number],
  };
}

const FOV = 30;
const HALF_FOV_TAN = Math.tan((FOV / 2) * (Math.PI / 180));
/** Conservative worst-case aspect (w/h) of the preview canvas. */
const CANVAS_ASPECT = 0.7;

function fitCamera(sil: Silhouette) {
  const height = sil.topY - sil.bottomY;
  const centerY = (sil.topY + sil.bottomY) / 2;
  const fitByHeight = (height / 2) * 1.18 / HALF_FOV_TAN;
  const fitByWidth = sil.maxR * 1.35 / (HALF_FOV_TAN * CANVAS_ASPECT);
  return { fov: FOV, camY: centerY, camZ: Math.max(fitByHeight, fitByWidth), shadowY: sil.bottomY };
}

const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));

/**
 * The engravable band in texture pixels, plus the vertical squash needed to
 * cancel the lathe's non-uniform UV so art keeps its real-world proportions.
 */
function bandMetrics(product: ProductDef, W: number, H: number) {
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

function makeBodyTexture(
  product: ProductDef,
  colorHex: string,
  text: string,
  textPlacement: Placement,
  fontFamily = "Inter, system-ui, sans-serif",
  customImageEl: HTMLImageElement | null = null,
  imageSize: "none" | "small" | "large" = "none",
  artPlacement: Placement = DEFAULT_ART_PLACEMENT
): THREE.CanvasTexture {
  const W = 1024, H = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, W, H);

  // Vertical light stripe (label area highlight)
  const stripe = ctx.createLinearGradient(0, 0, W, 0);
  stripe.addColorStop(0.0,  "rgba(0,0,0,0.0)");
  stripe.addColorStop(0.42, "rgba(255,255,255,0.06)");
  stripe.addColorStop(0.50, "rgba(255,255,255,0.12)");
  stripe.addColorStop(0.58, "rgba(255,255,255,0.06)");
  stripe.addColorStop(1.0,  "rgba(0,0,0,0.0)");
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 0, W, H);

  const m = bandMetrics(product, W, H);

  // Engravable band (slightly lighter bg) — never the lid or the base
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, m.topPx, W, m.botPx - m.topPx);

  const hasArt = !!(customImageEl && imageSize !== "none");

  // Custom uploaded logo or photo (background already removed)
  if (hasArt && customImageEl) {
    const maxDim = W * (imageSize === "large" ? 0.34 : 0.19);
    const naturalW = customImageEl.naturalWidth || customImageEl.width || 1;
    const naturalH = customImageEl.naturalHeight || customImageEl.height || 1;
    const ratio = Math.min(maxDim / naturalW, maxDim / naturalH);
    const dw = naturalW * ratio;
    const dh = naturalH * ratio;
    drawPlaced(ctx, m, W, artPlacement, dw / 2, dh / 2, () => {
      ctx.globalAlpha = 0.95;
      ctx.drawImage(customImageEl, -dw / 2, -dh / 2, dw, dh);
    });
  }

  // Custom text
  if (text) {
    const fontSize = Math.round(W * 0.13 * textPlacement.scale);
    const font = `900 ${fontSize}px ${fontFamily}`;
    ctx.font = font;
    const textW = ctx.measureText(text).width;
    drawPlaced(ctx, m, W, textPlacement, textW / 2, fontSize * 0.6, () => {
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 18;
      ctx.fillText(text, 0, 0);
    });
  }

  // Brand text — pinned near the bottom of the band
  ctx.save();
  ctx.font = `500 ${Math.round(W * 0.040)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.30)";
  ctx.letterSpacing = "0.15em";
  ctx.fillText("CREATIVA STUDIO", W / 2, m.botPx - (m.botPx - m.topPx) * 0.07);
  ctx.restore();

  return new THREE.CanvasTexture(canvas);
}

function ThermosMesh({
  colorHex, finish, text, product, sil, fontFamily, customImageUrl, imageSize,
  textPlacement, artPlacement,
}: {
  colorHex: string; finish: string; text: string;
  product: ProductDef; sil: Silhouette; fontFamily?: string;
  customImageUrl: string | null; imageSize: "none" | "small" | "large";
  textPlacement: Placement; artPlacement: Placement;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const velYaw = useRef(0);   // Y-axis (horizontal drag) velocity
  const velPitch = useRef(0); // X-axis (vertical drag) velocity
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const { gl } = useThree();

  const bodyGeo = useMemo(() => {
    const geo = new THREE.LatheGeometry(sil.points, 128);
    geo.computeVertexNormals();
    return geo;
  }, [sil]);

  // Cap: chunky screw cap for termos/jugs, low press-on lid for vasos/hoppies, none for guampas
  const capGeo = useMemo(() => {
    if (product.cap === "none") return null;
    return new THREE.CylinderGeometry(sil.capR, sil.capR * 0.94, sil.capH, 64);
  }, [product.cap, sil]);

  // Handle: torus centered exactly on the outer wall → inner half depth-clipped → D-shape
  const handleGeo = useMemo(() => {
    if (product.handle === "none") return null;
    const r = product.handle === "cap-d" ? sil.capR * 0.42 : sil.maxR * 0.58;
    const tube = product.handle === "cap-d" ? sil.capR * 0.11 : sil.maxR * 0.10;
    return new THREE.TorusGeometry(r, tube, 12, 32);
  }, [product.handle, sil]);

  // Thin metal collar ring at the neck seam (screw caps only)
  const collarGeo = useMemo(() => {
    if (product.cap !== "screw") return null;
    return new THREE.TorusGeometry(sil.neckR * 1.02, 0.030 * sil.scale, 6, 64);
  }, [product.cap, sil]);


  const [fontReady, setFontReady] = useState(0);

  useEffect(() => {
    if (!fontFamily) return;
    const families = fontFamily.split(",").map(f => f.trim().replace(/['"]/g, ""));
    const primary = families[0];
    if (!primary) return;
    document.fonts.load(`400 32px "${primary}"`).then(() => {
      setFontReady(n => n + 1);
    });
  }, [fontFamily]);

  const [customImageEl, setCustomImageEl] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!customImageUrl) {
      setCustomImageEl(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setCustomImageEl(img); };
    img.onerror = () => { if (!cancelled) setCustomImageEl(null); };
    img.src = customImageUrl;
    return () => { cancelled = true; };
  }, [customImageUrl]);

  const texture = useMemo(
    () => makeBodyTexture(product, colorHex, text, textPlacement, fontFamily, customImageEl, imageSize, artPlacement),
    // fontReady triggers re-creation once the font is actually loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, colorHex, text, textPlacement, fontFamily, fontReady, customImageEl, imageSize, artPlacement]
  );

  // PBR material params per finish
  const matProps = useMemo(() => {
    const base = { roughness: 0.35, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.15 };
    if (finish === "matte")    return { ...base, roughness: 0.88, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 0.8 };
    if (finish === "glossy")   return { ...base, roughness: 0.05, metalness: 0.10, clearcoat: 1.0, clearcoatRoughness: 0.02 };
    if (finish === "metallic") return { ...base, roughness: 0.18, metalness: 0.90, clearcoat: 0.6, clearcoatRoughness: 0.08 };
    if (finish === "gradient") return { ...base, roughness: 0.22, metalness: 0.20, clearcoat: 0.9, clearcoatRoughness: 0.05 };
    return base;
  }, [finish]);

  // Pointer drag handlers — both axes
  useEffect(() => {
    const canvas = gl.domElement;

    const onDown = (e: PointerEvent) => {
      isDragging.current = true;
      velYaw.current = 0;
      velPitch.current = 0;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      lastTime.current = performance.now();
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const now = performance.now();
      const dt = Math.max(1, now - lastTime.current);
      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;
      velYaw.current   = dx / dt * 16;
      velPitch.current = dy / dt * 16;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      lastTime.current = now;
      if (groupRef.current) {
        groupRef.current.rotation.y += dx * 0.008;
        // Clamp pitch so it doesn't flip upside-down
        const newPitch = groupRef.current.rotation.x + dy * 0.008;
        groupRef.current.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, newPitch));
      }
    };
    const onUp = () => { isDragging.current = false; };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (isDragging.current) return;

    const hasYawInertia   = Math.abs(velYaw.current) > 0.001;
    const hasPitchInertia = Math.abs(velPitch.current) > 0.001;

    if (hasYawInertia) {
      groupRef.current.rotation.y += velYaw.current * delta;
      velYaw.current *= 0.90;
    } else {
      velYaw.current = 0;
      groupRef.current.rotation.y += delta * 0.55;
    }

    if (hasPitchInertia) {
      const newPitch = groupRef.current.rotation.x + velPitch.current * delta;
      groupRef.current.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, newPitch));
      velPitch.current *= 0.90;
    } else {
      velPitch.current = 0;
      // Gently return to upright
      groupRef.current.rotation.x *= 0.97;
    }
  });

  const capCenterY = sil.neckY + sil.capH / 2;
  const collarY    = sil.neckY - 0.10 * sil.scale;
  // Handle center sits exactly on the outer wall → inner half depth-clipped → D-shape
  const handleX = product.handle === "cap-d" ? sil.capR : sil.maxR;
  const handleY = product.handle === "cap-d" ? capCenterY : 0.05 * sil.scale;

  return (
    <group ref={groupRef}>
      {/* Main body */}
      <mesh geometry={bodyGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          map={texture}
          color={colorHex}
          roughness={matProps.roughness}
          metalness={matProps.metalness}
          clearcoat={matProps.clearcoat}
          clearcoatRoughness={matProps.clearcoatRoughness}
          envMapIntensity={finish === "metallic" ? 2.0 : finish === "glossy" ? 1.8 : 1.2}
        />
      </mesh>

      {/* Cap / lid */}
      {capGeo && (
        <mesh geometry={capGeo} position={[0, capCenterY, 0]} castShadow>
          <meshPhysicalMaterial color="#1a1a1a" roughness={0.28} metalness={0.55} clearcoat={0.7} clearcoatRoughness={0.08} envMapIntensity={1.6} />
        </mesh>
      )}

      {/* D-ring handle: center ON the outer wall → depth test hides inner half → D-shape */}
      {handleGeo && (
        <mesh geometry={handleGeo} position={[handleX, handleY, 0]} castShadow>
          <meshPhysicalMaterial color="#1a1a1a" roughness={0.28} metalness={0.55} clearcoat={0.7} clearcoatRoughness={0.08} envMapIntensity={1.6} />
        </mesh>
      )}

      {/* Metal collar seam ring */}
      {collarGeo && (
        <mesh geometry={collarGeo} position={[0, collarY, 0]}>
          <meshPhysicalMaterial color="#aaaaaa" roughness={0.12} metalness={0.98} clearcoat={0.6} envMapIntensity={2.2} />
        </mesh>
      )}
    </group>
  );
}

function Rig({ sil }: { sil: Silhouette }) {
  const { fov, camZ, camY } = fitCamera(sil);
  return <PerspectiveCamera makeDefault fov={fov} position={[0, camY, camZ]} />;
}

// Detect WebGL support
function isWebGLAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      c.getContext("webgl2") ||
      c.getContext("webgl") ||
      c.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

// Canvas 2D fallback (simplified)
function FallbackCanvas({
  colorHex, text, product, sil, customImageUrl, imageSize, textPlacement, artPlacement,
}: Omit<Thermos3DProps, "finish" | "fontClass" | "productId" | "sizeId"> & {
  product: ProductDef; sil: Silhouette; textPlacement: Placement; artPlacement: Placement;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const angleXRef = useRef(0); // pitch (up/down tilt)
  const rafRef = useRef<number>(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const velRef = useRef(0);
  const velXRef = useRef(0);
  const customImgRef = useRef<HTMLImageElement | null>(null);
  const propsRef = useRef({ colorHex, text, product, sil, imageSize, textPlacement, artPlacement });
  propsRef.current = { colorHex, text, product, sil, imageSize, textPlacement, artPlacement };

  useEffect(() => {
    if (!customImageUrl) { customImgRef.current = null; return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) customImgRef.current = img; };
    img.onerror = () => { if (!cancelled) customImgRef.current = null; };
    img.src = customImageUrl;
    return () => { cancelled = true; };
  }, [customImageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;

    function hexToRgb(hex: string): [number, number, number] {
      return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    }
    function mix(a: number, b: number, t: number) { return a + (b - a) * t; }

    const draw = () => {
      const { colorHex, text, product, sil, imageSize, textPlacement, artPlacement } = propsRef.current;
      const customImg = customImgRef.current;
      const hasArt = !!(customImg && imageSize && imageSize !== "none");
      ctx.clearRect(0, 0, W, H);
      // Scale the silhouette into the canvas, leaving room for cap and shadow
      const px = Math.min((H - 100) / (sil.topY - sil.bottomY), (W - 50) / (sil.maxR * 3));
      const bH = (sil.neckY - sil.bottomY) * px;
      const bW = sil.maxR * 2 * px;
      const a  = angleRef.current;
      const ax = Math.max(-1.1, Math.min(1.1, angleXRef.current)); // pitch clamp
      const [r,g,b] = hexToRgb(colorHex);

      // Tilt: offset the visual center based on pitch
      const tiltOffset = ax * bH * 0.18;
      const cx = W / 2;
      const cy = H / 2 + 10 - tiltOffset * 0.5;

      // Foreshortening: the body appears shorter when tilted
      const foreshorten = Math.cos(ax * 0.7);
      const visH = bH * foreshorten;

      const hlPos = 0.5 + 0.44 * Math.sin(a);
      const left = cx - bW/2, right = cx + bW/2;
      const top = cy - visH/2, bottom = cy + visH/2;

      const grad = ctx.createLinearGradient(left, 0, right, 0);
      grad.addColorStop(0, `rgb(${mix(r,0,0.55)},${mix(g,0,0.55)},${mix(b,0,0.55)})`);
      grad.addColorStop(Math.max(0, hlPos-0.22), `rgb(${mix(r,0,0.12)},${mix(g,0,0.12)},${mix(b,0,0.12)})`);
      grad.addColorStop(hlPos, `rgb(${mix(r,255,0.55)},${mix(g,255,0.55)},${mix(b,255,0.55)})`);
      grad.addColorStop(Math.min(1, hlPos+0.20), `rgb(${mix(r,0,0.10)},${mix(g,0,0.10)},${mix(b,0,0.10)})`);
      grad.addColorStop(1, `rgb(${mix(r,0,0.58)},${mix(g,0,0.58)},${mix(b,0,0.58)})`);

      // Body shape: small rounded top corners, large semicircular bottom (no ring)
      const topRnd = 8;
      const botRnd = bW / 2;
      ctx.beginPath();
      ctx.moveTo(left + topRnd, top);
      ctx.lineTo(right - topRnd, top);
      ctx.quadraticCurveTo(right, top, right, top + topRnd);
      ctx.lineTo(right, bottom - botRnd);
      ctx.bezierCurveTo(right, bottom + botRnd * 0.55, left, bottom + botRnd * 0.55, left, bottom - botRnd);
      ctx.lineTo(left, top + topRnd);
      ctx.quadraticCurveTo(left, top, left + topRnd, top);
      ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      // Top ellipse (depth / rim indicator)
      const eRY = Math.max(3, (bW/2)*0.30*Math.abs(Math.cos(a)));
      const topEllipseExtra = Math.max(0, ax) * 10;
      ctx.beginPath(); ctx.ellipse(cx, top, bW/2, eRY + topEllipseExtra, 0, 0, Math.PI*2);
      ctx.fillStyle = `rgb(${mix(r,0,0.32)},${mix(g,0,0.32)},${mix(b,0,0.32)})`; ctx.fill();

      // Cap / lid (guampas have none)
      const cW = sil.capR * 2 * px;
      const capH = sil.capH * px * foreshorten;
      const capTop = top - capH;
      const handleAlpha = Math.max(0.18, Math.abs(Math.cos(a)) * 0.88 + 0.18);

      if (product.cap !== "none") {
        const cGrad = ctx.createLinearGradient(cx-cW/2,0,cx+cW/2,0);
        const hl = 0.5 + 0.38 * Math.sin(a);
        cGrad.addColorStop(0,"#111");
        cGrad.addColorStop(Math.max(0,hl-0.18),"#2a2a2a");
        cGrad.addColorStop(hl,"#555");
        cGrad.addColorStop(Math.min(1,hl+0.18),"#222");
        cGrad.addColorStop(1,"#111");
        // Cap body — straight-sided (cylinder)
        ctx.beginPath();
        ctx.moveTo(cx-cW/2, top);
        ctx.lineTo(cx+cW/2, top);
        ctx.lineTo(cx+cW/2, capTop+4);
        ctx.quadraticCurveTo(cx+cW/2, capTop, cx+cW/2-6, capTop);
        ctx.lineTo(cx-cW/2+6, capTop);
        ctx.quadraticCurveTo(cx-cW/2, capTop, cx-cW/2, capTop+4);
        ctx.closePath();
        ctx.fillStyle = cGrad; ctx.fill();
        // Cap top ellipse
        ctx.beginPath(); ctx.ellipse(cx, capTop, cW/2, Math.max(2, eRY*0.8 + topEllipseExtra*0.5), 0, 0, Math.PI*2);
        ctx.fillStyle="#333"; ctx.fill();
      }
      if (product.cap === "screw") {
        // Metal collar seam line between body and cap
        ctx.beginPath();
        ctx.moveTo(cx-bW/2+2, top+2); ctx.lineTo(cx+bW/2-2, top+2);
        ctx.strokeStyle="rgba(180,180,180,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
      }
      if (product.handle !== "none") {
        // Compact C-arc springing from the right wall (cap wall or body wall)
        const onCap = product.handle === "cap-d";
        const hR      = bW * (onCap ? 0.20 : 0.30);
        const hTube   = bW * (onCap ? 0.055 : 0.05);
        const anchorX = cx + (onCap ? cW : bW) / 2;
        const anchorY = onCap ? top - capH / 2 : cy;
        ctx.beginPath();
        ctx.arc(anchorX, anchorY, hR, -Math.PI / 2, Math.PI / 2); // right C-arc only
        ctx.strokeStyle = `rgba(18,18,18,${handleAlpha})`;
        ctx.lineWidth = hTube * 2;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      // Map a placement onto the visible face: y from the band, x/alpha from the spin angle
      const bandTopPx    = bottom - (sil.band[1] - sil.bottomY) / (sil.neckY - sil.bottomY) * visH;
      const bandBottomPx = bottom - (sil.band[0] - sil.bottomY) / (sil.neckY - sil.bottomY) * visH;
      const project = (p: Placement) => {
        const phase = a + (p.u - 0.5) * Math.PI * 2;
        return {
          facing: Math.cos(phase),
          x: cx + Math.sin(phase) * (bW / 2) * 0.55,
          y: bandTopPx + (bandBottomPx - bandTopPx) * p.v,
          rot: p.orientation === "vertical" ? -Math.PI / 2 : 0,
        };
      };

      // Custom uploaded logo or photo
      if (hasArt && customImg) {
        const art = project(artPlacement);
        if (art.facing > 0) {
          const naturalW = customImg.naturalWidth || customImg.width || 1;
          const naturalH = customImg.naturalHeight || customImg.height || 1;
          const maxDim = bW * (imageSize === "large" ? 0.62 : 0.36);
          const ratio = Math.min(maxDim / naturalW, maxDim / naturalH);
          const dw = naturalW * ratio;
          const dh = naturalH * ratio;
          ctx.save();
          ctx.beginPath(); ctx.rect(left, top, bW, visH); ctx.clip();
          ctx.globalAlpha = Math.min(1, art.facing * 1.2);
          ctx.translate(art.x, art.y);
          ctx.rotate(art.rot);
          ctx.drawImage(customImg, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        }
      }
      // Text
      if (text) {
        const tp = project(textPlacement);
        if (tp.facing > -0.15) {
          ctx.save();
          ctx.beginPath(); ctx.rect(left, top, bW, visH); ctx.clip();
          ctx.translate(tp.x, tp.y);
          ctx.rotate(tp.rot);
          ctx.font = `900 ${Math.max(12, Math.floor(bW * 0.25 * textPlacement.scale))}px Inter, sans-serif`;
          ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.globalAlpha = Math.max(0, Math.min(1, tp.facing+0.25));
          ctx.fillStyle="rgba(255,255,255,0.93)";
          ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=4;
          ctx.fillText(text, 0, 0); ctx.restore();
        }
      }
      // Shadow — offset below the rounded bottom
      const shadowY = bottom + botRnd * 0.35 + 10;
      const sGrad = ctx.createRadialGradient(cx, shadowY, 4, cx, shadowY, bW*0.85);
      sGrad.addColorStop(0,"rgba(0,0,0,0.18)"); sGrad.addColorStop(1,"rgba(0,0,0,0)");
      ctx.beginPath(); ctx.ellipse(cx, shadowY, bW*0.70, 10, 0, 0, Math.PI*2);
      ctx.fillStyle=sGrad; ctx.fill();

      // Advance angles
      if (!isDragging.current) {
        if (Math.abs(velRef.current) > 0.0005) {
          angleRef.current += velRef.current;
          velRef.current *= 0.93;
        } else {
          velRef.current = 0;
          angleRef.current += 0.013;
        }
        if (Math.abs(velXRef.current) > 0.0005) {
          const np = angleXRef.current + velXRef.current;
          angleXRef.current = Math.max(-1.1, Math.min(1.1, np));
          velXRef.current *= 0.93;
        } else {
          velXRef.current = 0;
          // Gently return to upright
          angleXRef.current *= 0.97;
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const onPDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    velRef.current = 0; velXRef.current = 0;
    lastX.current = e.clientX; lastY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;
    velRef.current  = dx * 0.010;
    velXRef.current = dy * 0.010;
    angleRef.current  += dx * 0.009;
    const np = angleXRef.current + dy * 0.009;
    angleXRef.current = Math.max(-1.1, Math.min(1.1, np));
    lastX.current = e.clientX; lastY.current = e.clientY;
  };
  const onPUp = () => { isDragging.current = false; };

  return (
    <canvas ref={canvasRef} width={280} height={480}
      style={{ width:"100%", height:"100%", cursor:"grab", touchAction:"none" }}
      onPointerDown={onPDown} onPointerMove={onPMove} onPointerUp={onPUp} onPointerLeave={onPUp}
    />
  );
}

function ThreeCanvas({ product, sil, ...props }: Thermos3DProps & { product: ProductDef; sil: Silhouette }) {
  const { shadowY } = fitCamera(sil);
  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent", cursor: "grab" }}
    >
      <Rig sil={sil} />

      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.9} />

        <ThermosMesh
          colorHex={props.colorHex}
          finish={props.finish}
          text={props.text}
          product={product}
          sil={sil}
          fontFamily={props.fontStyle?.fontFamily as string | undefined}
          customImageUrl={props.customImageUrl}
          imageSize={props.imageSize}
          textPlacement={props.textPlacement ?? DEFAULT_TEXT_PLACEMENT}
          artPlacement={props.artPlacement ?? DEFAULT_ART_PLACEMENT}
        />

        <ContactShadows
          position={[0, shadowY, 0]}
          opacity={0.45}
          scale={Math.max(5, sil.maxR * 7)}
          blur={2.5}
          far={3}
          color="#000000"
        />
      </Suspense>

      <directionalLight position={[4, 6, 4]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#aaccff" />
      <directionalLight position={[0, -2, -5]} intensity={0.3} color="#ffeecc" />
      <ambientLight intensity={0.35} />
    </Canvas>
  );
}

export default function Thermos3D(props: Thermos3DProps) {
  const product = getProduct(props.productId);
  const sil = useMemo(
    () => buildSilhouette(product, getSize(product, props.sizeId).scale),
    [product, props.sizeId]
  );

  const fallback = (
    <FallbackCanvas
      colorHex={props.colorHex}
      text={props.text}
      product={product}
      sil={sil}
      customImageUrl={props.customImageUrl}
      imageSize={props.imageSize}
      textPlacement={props.textPlacement ?? DEFAULT_TEXT_PLACEMENT}
      artPlacement={props.artPlacement ?? DEFAULT_ART_PLACEMENT}
    />
  );

  const [webgl] = useState(() => isWebGLAvailable());
  if (!webgl) return fallback;

  return (
    <WebGLErrorBoundary fallback={fallback}>
      <ThreeCanvas {...props} product={product} sil={sil} />
    </WebGLErrorBoundary>
  );
}
