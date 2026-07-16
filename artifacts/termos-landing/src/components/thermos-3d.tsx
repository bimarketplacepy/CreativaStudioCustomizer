import React, { useRef, useEffect, useMemo, useState, Suspense, Component, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { getProduct, getSize, resampledProfile, type ProductDef } from "@/lib/products";
import { DEFAULT_ART_PLACEMENT, DEFAULT_TEXT_PLACEMENT, type Placement } from "@/lib/placement";
import { buildEngraveMask } from "@/lib/image-processing";
import { makeBodyMaps, type EngraveStyle } from "@/lib/engraving-maps";
import { wrapToWidth, fillLines, LINE_HEIGHT } from "@/lib/engraving-text";

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
  /** Eufy Make (UV DTF): print the artwork in colour instead of engraving it. */
  colorPrint?: boolean;
  /** How the laser reads: steel reveal (default), leather char or wood char. */
  engraveStyle?: EngraveStyle;
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

  // A flip-straw lid stands taller than a sliding one but shorter than a screw cap.
  const capH = (product.cap === "screw" ? 0.42 : product.cap === "flip" ? 0.30 : product.cap === "lid" ? 0.18 : 0) * scale;
  const capR = neckR * (product.cap === "screw" ? 1.16 : product.cap === "flip" ? 1.08 : 1.06);

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

/**
 * Detailed flip-straw lid for the Hoppie (Stanley Flip Straw Tumbler 887ml):
 * a stepped lid seated on the body, a hinged flip spout with the straw
 * mouthpiece poking out, and a rotating carry-handle arch across the top.
 * Replaces the generic cylinder cap + torus handle for this product.
 */
function HoppieLid({ sil }: { sil: Silhouette }) {
  const s = sil.scale;
  const { neckY, neckR, capR } = sil;

  const lid = { color: "#1c1c1e", roughness: 0.55, metalness: 0.2, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 1.2 };
  const accent = { color: "#0f0f10", roughness: 0.5, metalness: 0.25, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 1.2 };

  const collarY = neckY + 0.05 * s;
  const bodyY = neckY + 0.17 * s;
  const topY = neckY + 0.27 * s;

  return (
    <group>
      {/* Collar seating on the body rim */}
      <mesh position={[0, collarY, 0]} castShadow>
        <cylinderGeometry args={[capR, neckR * 1.02, 0.10 * s, 64]} />
        <meshPhysicalMaterial {...lid} />
      </mesh>
      {/* Lid body */}
      <mesh position={[0, bodyY, 0]} castShadow>
        <cylinderGeometry args={[capR * 0.98, capR, 0.16 * s, 64]} />
        <meshPhysicalMaterial {...lid} />
      </mesh>
      {/* Domed top plate */}
      <mesh position={[0, topY, 0]} castShadow>
        <cylinderGeometry args={[capR * 0.86, capR * 0.98, 0.06 * s, 64]} />
        <meshPhysicalMaterial {...lid} />
      </mesh>

      {/* Flip-spout hinge block near the +X edge */}
      <mesh position={[capR * 0.4, topY + 0.03 * s, 0]} castShadow>
        <boxGeometry args={[capR * 0.5, 0.10 * s, capR * 0.52]} />
        <meshPhysicalMaterial {...accent} />
      </mesh>
      {/* Flip nozzle (the spout you flip up to drink), angled outward */}
      <group position={[capR * 0.5, topY + 0.06 * s, 0]} rotation={[0, 0, -0.5]}>
        <mesh position={[0, 0.11 * s, 0]} castShadow>
          <cylinderGeometry args={[0.085 * s, 0.10 * s, 0.22 * s, 24]} />
          <meshPhysicalMaterial {...accent} />
        </mesh>
        {/* Straw mouthpiece tip protruding from the nozzle */}
        <mesh position={[0, 0.25 * s, 0]} castShadow>
          <cylinderGeometry args={[0.05 * s, 0.055 * s, 0.11 * s, 20]} />
          <meshPhysicalMaterial color="#3a3a3d" roughness={0.4} metalness={0.1} clearcoat={0.3} />
        </mesh>
      </group>

      {/* Rotating carry handle: half-torus arch across the top (front↔back),
          seated opposite the spout so the two never collide. */}
      <mesh position={[-capR * 0.12, topY + 0.02 * s, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[capR * 0.5, 0.055 * s, 12, 40, Math.PI]} />
        <meshPhysicalMaterial {...lid} />
      </mesh>
    </group>
  );
}

function ThermosMesh({
  colorHex, finish, text, product, sil, fontFamily, customImageUrl, imageSize,
  textPlacement, artPlacement, colorPrint, engraveStyle,
}: {
  colorHex: string; finish: string; text: string;
  product: ProductDef; sil: Silhouette; fontFamily?: string;
  customImageUrl: string | null; imageSize: "none" | "small" | "large";
  textPlacement: Placement; artPlacement: Placement; colorPrint: boolean;
  engraveStyle: EngraveStyle;
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

  // Handles. Most are toruses buried halfway into the body/cap they spring from,
  // so the depth test clips the inner half and leaves a D or an arch. The termo
  // uses a rigid "D" grip mounted on the body wall (classic mate-thermos style):
  // a matte-plastic tube anchored at two points on the body.
  const handle = useMemo(() => {
    switch (product.handle) {
      case "cap-d":
        return { kind: "torus" as const, mat: "metal" as const, r: sil.capR * 0.42, tube: sil.capR * 0.11, position: [sil.capR, sil.neckY + sil.capH / 2, 0] as [number, number, number] };
      case "cap-arch":
        // A carry loop rising off the lid: sunk into the cap, not the wall.
        return { kind: "torus" as const, mat: "metal" as const, r: sil.capR * 0.62, tube: sil.capR * 0.09, position: [0, sil.topY, 0] as [number, number, number] };
      case "body":
        return { kind: "torus" as const, mat: "metal" as const, r: sil.maxR * 0.58, tube: sil.maxR * 0.10, position: [sil.maxR, 0.05 * sil.scale, 0] as [number, number, number] };
      case "body-d":
        return { kind: "d-grip" as const, mat: "plastic" as const, position: [0, 0, 0] as [number, number, number] };
      default:
        return null;
    }
  }, [product.handle, sil]);

  const handleGeo = useMemo(() => {
    if (!handle) return null;
    if (handle.kind === "d-grip") {
      // Rigid D grip on the +X body wall. The path starts inside the wall
      // (buried, so it reads as anchored), bows out, runs down the outside,
      // and returns into the wall at a second anchor — a "D" with the body
      // itself as the flat side, leaving a finger gap to grip.
      const s = sil.scale;
      const R = sil.maxR;
      const out = R + 0.36 * s;   // how far the grip stands off the slim body
      const yT = 0.55 * s;        // upper anchor height (centred on the tall body)
      const yB = -0.85 * s;       // lower anchor height
      const curve = new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(R * 0.86, yT, 0),
          new THREE.Vector3(out, yT - 0.10 * s, 0),
          new THREE.Vector3(out, yB + 0.10 * s, 0),
          new THREE.Vector3(R * 0.86, yB, 0),
        ],
        false,
        "catmullrom",
        0.5
      );
      return new THREE.TubeGeometry(curve, 48, 0.075 * s, 16, false);
    }
    return new THREE.TorusGeometry(handle.r, handle.tube, 12, 32);
  }, [handle, sil]);

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

  // The laser burns tone, not colour: resolve the artwork to a coverage map once.
  const artMask = useMemo(() => (customImageEl ? buildEngraveMask(customImageEl) : null), [customImageEl]);

  // PBR material params per finish
  const matProps = useMemo(() => {
    const base = { roughness: 0.35, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.15 };
    if (finish === "matte")    return { ...base, roughness: 0.88, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 0.8 };
    if (finish === "glossy")   return { ...base, roughness: 0.05, metalness: 0.10, clearcoat: 1.0, clearcoatRoughness: 0.02 };
    if (finish === "metallic") return { ...base, roughness: 0.18, metalness: 0.90, clearcoat: 0.6, clearcoatRoughness: 0.08 };
    if (finish === "gradient") return { ...base, roughness: 0.22, metalness: 0.20, clearcoat: 0.9, clearcoatRoughness: 0.05 };
    // Cuero forrado: superficie muy mate, sin metal ni barniz, con un leve satinado.
    if (finish === "cuero")    return { ...base, roughness: 0.95, metalness: 0.0, clearcoat: 0.06, clearcoatRoughness: 0.9 };
    return base;
  }, [finish]);

  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  const maps = useMemo(
    () => makeBodyMaps({
      product, colorHex, finish: matProps, isGradientFinish: finish === "gradient",
      text, textPlacement, fontFamily, artMask, imageSize, artPlacement,
      anisotropy: maxAnisotropy, colorPrint, artImage: customImageEl, engraveStyle,
    }),
    // fontReady triggers re-creation once the font is actually loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, colorHex, matProps, finish, text, textPlacement, fontFamily, fontReady, artMask, imageSize, artPlacement, maxAnisotropy, colorPrint, customImageEl, engraveStyle]
  );

  // Four textures per rebuild, and a rebuild lands on every keystroke.
  useEffect(() => () => maps.dispose(), [maps]);

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

    // Idle auto-spin only while the piece is blank; freeze once the customer is
    // placing text/icon/image so they can position it calmly (still draggable).
    const hasContent = !!text || (!!customImageUrl && imageSize !== "none");
    const hasYawInertia   = Math.abs(velYaw.current) > 0.001;
    const hasPitchInertia = Math.abs(velPitch.current) > 0.001;

    if (hasYawInertia) {
      groupRef.current.rotation.y += velYaw.current * delta;
      velYaw.current *= 0.90;
    } else {
      velYaw.current = 0;
      if (!hasContent) groupRef.current.rotation.y += delta * 0.55;
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

  return (
    <group ref={groupRef}>
      {/* Main body. The maps carry the colour and the finish; leaving `color`
          white keeps the exposed steel steel-coloured instead of tinting it. */}
      <mesh geometry={bodyGeo} castShadow receiveShadow>
        {/* Keyed on finish: three only recompiles a shader when material.version
            changes, so toggling clearcoat on a live material never lights up the
            USE_CLEARCOAT define. Remounting sidesteps that. */}
        <meshPhysicalMaterial
          key={finish}
          map={maps.map}
          roughnessMap={maps.roughnessMap}
          roughness={1}
          metalnessMap={maps.metalnessMap}
          metalness={1}
          bumpMap={maps.grooveMap}
          bumpScale={0.42}
          clearcoatMap={maps.grooveMap}
          clearcoat={matProps.clearcoat}
          clearcoatRoughness={matProps.clearcoatRoughness}
          envMapIntensity={finish === "metallic" ? 2.0 : finish === "glossy" ? 1.8 : 1.4}
        />
      </mesh>

      {/* Hoppie gets a bespoke detailed flip-straw lid; everything else uses the
          generic cap + handle below. */}
      {product.id === "hoppie" && <HoppieLid sil={sil} />}

      {/* Cap / lid */}
      {capGeo && product.id !== "hoppie" && (
        <mesh geometry={capGeo} position={[0, capCenterY, 0]} castShadow>
          <meshPhysicalMaterial color="#1a1a1a" roughness={0.28} metalness={0.55} clearcoat={0.7} clearcoatRoughness={0.08} envMapIntensity={1.6} />
        </mesh>
      )}

      {/* Handle: buried halfway so the depth test hides the inner half */}
      {handleGeo && handle && product.id !== "hoppie" && (
        <mesh geometry={handleGeo} position={handle.position} castShadow>
          {handle.mat === "plastic" ? (
            // Matte plastic — no metal, no clearcoat sheen. Colour matches the body.
            <meshPhysicalMaterial color={colorHex} roughness={0.9} metalness={0.0} clearcoat={0.04} clearcoatRoughness={0.9} envMapIntensity={0.6} />
          ) : (
            <meshPhysicalMaterial color={colorHex} roughness={0.28} metalness={0.55} clearcoat={0.7} clearcoatRoughness={0.08} envMapIntensity={1.6} />
          )}
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
          const maxDim = bW * (imageSize === "large" ? 0.62 : 0.36) * artPlacement.scale;
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
      // Text — engraved: a dark groove wall above, bare steel catching light below
      if (text) {
        const tp = project(textPlacement);
        if (tp.facing > -0.15) {
          ctx.save();
          ctx.beginPath(); ctx.rect(left, top, bW, visH); ctx.clip();
          ctx.translate(tp.x, tp.y);
          ctx.rotate(tp.rot);
          const fs = Math.max(12, Math.floor(bW * 0.19 * textPlacement.scale));
          ctx.font = `900 ${fs}px Inter, sans-serif`;
          ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.globalAlpha = Math.max(0, Math.min(1, tp.facing+0.25));
          const lines = wrapToWidth(ctx, text, bW * 0.9);
          const lh = fs * LINE_HEIGHT;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          fillLines(ctx, lines, lh, -Math.max(1, fs * 0.035));
          const steel = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2);
          steel.addColorStop(0, "#8f979f");
          steel.addColorStop(0.45, "#e6eaee");
          steel.addColorStop(1, "#9aa2aa");
          ctx.fillStyle = steel;
          fillLines(ctx, lines, lh); ctx.restore();
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
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      // touch-action none: a drag that starts on the product rotates it instead
      // of scrolling the page. To scroll, the finger must start outside the canvas.
      style={{ background: "transparent", cursor: "grab", touchAction: "none" }}
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
          colorPrint={props.colorPrint ?? false}
          engraveStyle={props.engraveStyle ?? "steel"}
        />

        {/* Single, stable ground shadow. Re-renders every frame so it tracks the
            spin, and stays anchored to the floor plane — no real-time shadow map,
            so no self-shadow acne / flicker on the rotating body. */}
        <ContactShadows
          position={[0, shadowY, 0]}
          opacity={0.5}
          scale={Math.max(5, sil.maxR * 7)}
          blur={2.6}
          resolution={1024}
          frames={Infinity}
          far={4}
          color="#000000"
        />
      </Suspense>

      <directionalLight position={[4, 6, 4]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#aaccff" />
      <directionalLight position={[0, -2, -5]} intensity={0.3} color="#ffeecc" />
      {/* Rim light: separates the silhouette from the background and rakes across
          the engraving, which is what makes the cut edges read as depth. */}
      <directionalLight position={[-3, 4, -6]} intensity={1.1} color="#ffffff" />
      <ambientLight intensity={0.28} />
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
