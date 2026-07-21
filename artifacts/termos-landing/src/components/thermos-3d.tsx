import React, { useRef, useEffect, useMemo, useState, useDeferredValue, Suspense, Component, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { getProduct, getSize, resampledProfile, type ProductDef } from "@/lib/products";
import { DEFAULT_ART_PLACEMENT, DEFAULT_TEXT_PLACEMENT, type Placement } from "@/lib/placement";
import { buildEngraveMask } from "@/lib/image-processing";
import { makeBodyMaps, makeGlassEngraving, type EngraveStyle } from "@/lib/engraving-maps";
import { FRONT_FACE, frontAreaBounds } from "@/lib/face-area";
import { layoutText, fillLinesAligned, measureLinesWidth, LINE_HEIGHT } from "@/lib/engraving-text";

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
  /** Ink colour for printed text (UV DTF only). */
  textColor?: string;
  /** How the laser reads: steel reveal (default), leather char or wood char. */
  engraveStyle?: EngraveStyle;
  /** "Edición en una cara": confine the design to the front-face rectangle. */
  singleFace?: boolean;
  /** Draw the dashed front-face guide (single-face mode only). */
  showGuides?: boolean;
  /** Which u faces the camera when single-face is entered. Defaults to config. */
  frontFaceU?: number;
  /** Render the body as transparent glass (cristal) with a sandblasted engraving. */
  glass?: boolean;
  /**
   * A design (text/icon/image) is active, so a drag on the body MOVES it across
   * the front face instead of rotating the piece. Only honoured in single-face
   * mode (the front face is frozen to camera there, so screen deltas map cleanly
   * to placement). When false, a drag rotates as usual.
   */
  designActive?: boolean;
  /** Drag delta as a fraction of the canvas (dx/width, dy/height) while moving a design. */
  onDesignMove?: (dxFrac: number, dyFrac: number) => void;
  /** A design drag started (used to flash the front-face guides). */
  onDesignDragStart?: () => void;
  /** A design drag ended. */
  onDesignDragEnd?: () => void;
  /**
   * "Envolvente 360°" while typing: spin the piece slowly and continuously so
   * the customer sees the text wrapping live. Exclusive to that disposition.
   */
  autoSpin?: boolean;
  /** Ignore manual rotation drags (used together with autoSpin while typing). */
  rotationLocked?: boolean;
  /**
   * Imperative snap hook: the parent stores here a fn that rotates the piece so
   * the given texture-u faces the camera (upright, no inertia). Used before
   * capturing the summary snapshot, so the personalized area is fully visible.
   */
  snapToURef?: React.MutableRefObject<((u: number) => void) | null>;
}

/** Everything the meshes and the camera rig need, derived from the product profile. */
interface Silhouette {
  points: THREE.Vector2[];
  scale: number;
  /** Widest radius of the body. */
  maxR: number;
  /** Radius used to fit the camera by width — includes a side handle's reach. */
  fitR: number;
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

  // La manija cuadrada de la chopera sobresale del cuerpo: el encuadre por
  // ancho debe contemplarla para que nunca quede recortada.
  const fitR = product.handle === "body-square" ? maxR + 0.23 * scale : maxR;

  return {
    points, scale, maxR, fitR, bottomY, neckY, neckR, capR, capH,
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
  const fitByWidth = sil.fitR * 1.35 / (HALF_FOV_TAN * CANVAS_ASPECT);
  return { fov: FOV, camY: centerY, camZ: Math.max(fitByHeight, fitByWidth), shadowY: sil.bottomY };
}

/**
 * Cuello roscado de acero del Hoppie (botella de boca ancha): la pintura del
 * cuerpo termina en un labio; de ahí hacia arriba todo es acero inoxidable
 * pulido a la vista — pared del cuello, rosca externa de 3 vueltas (anillos
 * toroidales apilados) y la boca abierta sin tapa, con su cara superior
 * anular visible y el interior oscuro. Reemplaza la tapa genérica.
 */
function HoppieNeck({ sil }: { sil: Silhouette }) {
  const s = sil.scale;
  const r = sil.neckR;
  const y0 = sil.neckY;
  const h = sil.topY - y0;
  const innerR = r * 0.82;

  const steel = { color: "#dfe3e6", roughness: 0.15, metalness: 1.0, envMapIntensity: 2.2 };

  return (
    <group>
      {/* Anillo/labio donde termina la pintura */}
      <mesh position={[0, y0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[r * 1.02, 0.032 * s, 10, 64]} />
        <meshPhysicalMaterial {...steel} />
      </mesh>

      {/* Pared del cuello */}
      <mesh position={[0, y0 + h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, h, 64, 1, true]} />
        <meshPhysicalMaterial {...steel} side={THREE.DoubleSide} />
      </mesh>

      {/* Rosca externa: 3 vueltas apiladas */}
      {[0.30, 0.50, 0.70].map(f => (
        <mesh key={f} position={[0, y0 + h * f, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[r * 1.015, 0.024 * s, 8, 64]} />
          <meshPhysicalMaterial {...steel} />
        </mesh>
      ))}

      {/* Cara superior anular de la boca abierta */}
      <mesh position={[0, y0 + h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[innerR, r, 64]} />
        <meshPhysicalMaterial {...steel} roughness={0.22} side={THREE.DoubleSide} />
      </mesh>

      {/* Interior oscuro */}
      <mesh position={[0, y0 + h - (h * 0.92) / 2, 0]}>
        <cylinderGeometry args={[innerR, innerR, h * 0.92, 48, 1, true]} />
        <meshPhysicalMaterial color="#101214" roughness={0.9} metalness={0.2} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, y0 + h * 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[innerR, 48]} />
        <meshPhysicalMaterial color="#0b0c0d" roughness={0.95} />
      </mesh>
    </group>
  );
}

/**
 * Remate de la Chopera: banda superior de acero inoxidable cepillado (mismo
 * diámetro que el cuerpo — solo cambia el material, con transición horizontal
 * nítida donde termina la pintura), disco metálico interior apenas visible y
 * tapa plástica transparente press-fit: pestaña que envuelve el borde y disco
 * superior levemente abombado que sobresale del vaso.
 */
function ChoperaTop({ sil }: { sil: Silhouette }) {
  const s = sil.scale;
  const R = sil.maxR;
  const y0 = sil.neckY;    // fin de la zona pintada (~86% de la altura)
  const bandH = 0.21 * s;  // banda de acero 86–96%
  const lidY = y0 + bandH; // borde superior del vaso

  const clear = {
    color: "#d9dcdf", transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.6, depthWrite: false,
  };

  return (
    <group>
      {/* Banda de acero cepillado */}
      <mesh position={[0, y0 + bandH / 2, 0]} castShadow>
        <cylinderGeometry args={[R, R, bandH, 96, 1, true]} />
        <meshPhysicalMaterial color="#c9cdd1" roughness={0.3} metalness={1.0} envMapIntensity={1.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Disco metálico interior, apenas visible bajo la tapa */}
      <mesh position={[0, y0 + bandH * 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.95, 64]} />
        <meshPhysicalMaterial color="#b6bbc0" roughness={0.35} metalness={0.9} />
      </mesh>

      {/* Pestaña de la tapa envolviendo el borde */}
      <mesh position={[0, lidY - 0.045 * s, 0]}>
        <cylinderGeometry args={[R * 1.025, R * 1.025, 0.11 * s, 96, 1, true]} />
        <meshPhysicalMaterial {...clear} side={THREE.DoubleSide} />
      </mesh>

      {/* Domo superior levemente abombado (~2% por encima del borde) */}
      <mesh position={[0, lidY, 0]} scale={[1, 0.08, 1]}>
        <sphereGeometry args={[R * 1.02, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial {...clear} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * The dashed rectangle drawn on the front face in "Edición en una cara" — a
 * closed line loop that hugs the body surface over the editable area, so the
 * customer sees exactly the box their design is trapped inside. Built straight
 * from the same `FRONT_FACE` config the clamp uses, so guide and limit agree.
 */
function FrontFaceGuide({ sil, product }: { sil: Silhouette; product: ProductDef }) {
  const object = useMemo(() => {
    const b = frontAreaBounds(product);
    const bandTopY = sil.band[1]; // placement v = 0 (band top)
    const bandBotY = sil.band[0]; // placement v = 1 (band bottom)
    const yAtV = (v: number) => bandTopY + (bandBotY - bandTopY) * v;

    const pts = sil.points; // Vector2 [radius, y], bottom → top
    const radiusAtY = (y: number) => {
      if (y <= pts[0].y) return pts[0].x;
      if (y >= pts[pts.length - 1].y) return pts[pts.length - 1].x;
      for (let i = 0; i < pts.length - 1; i++) {
        const y0 = pts[i].y, y1 = pts[i + 1].y;
        if (y >= y0 && y <= y1) {
          const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
          return pts[i].x + (pts[i + 1].x - pts[i].x) * t;
        }
      }
      return pts[pts.length - 1].x;
    };

    // Float the loop just off the surface so it never z-fights the body.
    const OFFSET = 1.014;
    const at = (u: number, v: number) => {
      const phi = u * Math.PI * 2;
      const y = yAtV(v);
      const r = radiusAtY(y) * OFFSET;
      return new THREE.Vector3(r * Math.sin(phi), y, r * Math.cos(phi));
    };

    const NH = 28, NV = 12;
    const verts: THREE.Vector3[] = [];
    for (let i = 0; i <= NH; i++) verts.push(at(b.uMin + (b.uMax - b.uMin) * (i / NH), b.vMin));
    for (let i = 1; i <= NV; i++) verts.push(at(b.uMax, b.vMin + (b.vMax - b.vMin) * (i / NV)));
    for (let i = 1; i <= NH; i++) verts.push(at(b.uMax - (b.uMax - b.uMin) * (i / NH), b.vMax));
    for (let i = 1; i < NV; i++) verts.push(at(b.uMin, b.vMax - (b.vMax - b.vMin) * (i / NV)));

    const geo = new THREE.BufferGeometry().setFromPoints(verts);
    const mat = new THREE.LineDashedMaterial({
      color: "#C1121F",
      dashSize: 0.05 * sil.scale,
      gapSize: 0.035 * sil.scale,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const line = new THREE.LineLoop(geo, mat);
    line.computeLineDistances();
    return line;
  }, [sil, product]);

  useEffect(() => () => {
    object.geometry.dispose();
    (object.material as THREE.Material).dispose();
  }, [object]);

  return <primitive object={object} />;
}

function ThermosMesh({
  colorHex, finish, text, product, sil, fontFamily, customImageUrl, imageSize,
  textPlacement, artPlacement, colorPrint, textColor, engraveStyle, singleFace, showGuides, frontFaceU, glass,
  designActive, onDesignMove, onDesignDragStart, onDesignDragEnd, snapToURef,
  autoSpin = false, rotationLocked = false,
}: {
  colorHex: string; finish: string; text: string;
  product: ProductDef; sil: Silhouette; fontFamily?: string;
  customImageUrl: string | null; imageSize: "none" | "small" | "large";
  textPlacement: Placement; artPlacement: Placement; colorPrint: boolean; textColor?: string;
  engraveStyle: EngraveStyle;
  singleFace: boolean; showGuides: boolean; frontFaceU: number; glass: boolean;
  designActive: boolean;
  onDesignMove?: (dxFrac: number, dyFrac: number) => void;
  onDesignDragStart?: () => void;
  onDesignDragEnd?: () => void;
  snapToURef?: React.MutableRefObject<((u: number) => void) | null>;
  autoSpin?: boolean; rotationLocked?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const velYaw = useRef(0);   // Y-axis (horizontal drag) velocity
  const velPitch = useRef(0); // X-axis (vertical drag) velocity
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  // "rotate" spins the piece; "design" drags the active mark across the face.
  const dragMode = useRef<"rotate" | "design">("rotate");
  const { gl } = useThree();

  // Latest design-drag inputs, read inside the (stable) pointer listeners so we
  // don't re-attach them every render when the callbacks change identity.
  const designRef = useRef({ designActive, singleFace, rotationLocked, onDesignMove, onDesignDragStart, onDesignDragEnd });
  designRef.current = { designActive, singleFace, rotationLocked, onDesignMove, onDesignDragStart, onDesignDragEnd };

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
      case "body-square":
        return { kind: "square-grip" as const, mat: "powder" as const, position: [0, 0, 0] as [number, number, number] };
      default:
        return null;
    }
  }, [product.handle, sil]);

  const handleGeo = useMemo(() => {
    if (!handle) return null;
    if (handle.kind === "square-grip") {
      // Manija de la chopera: perfil cuadrado/rectangular redondeado, angular y
      // moderno. Brazo superior horizontal a ~78% de la altura que se extiende
      // ~35–40% del diámetro hacia afuera, bajada vertical recta, retorno
      // horizontal a ~30% de altura y remate en gancho suave hacia abajo. Las
      // esquinas exteriores quedan redondeadas por la propia curva; los dos
      // extremos nacen enterrados en la pared para leerse anclados.
      const s = sil.scale;
      const R = sil.maxR;
      const out = R + 0.42 * s;
      const yT = 0.588 * s;
      const yB = -0.42 * s;
      const curve = new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(R * 0.88, yT, 0),
          new THREE.Vector3(R + 0.26 * s, yT, 0),
          new THREE.Vector3(out - 0.03 * s, yT - 0.03 * s, 0),
          new THREE.Vector3(out, yT - 0.16 * s, 0),
          new THREE.Vector3(out, (yT + yB) / 2, 0),
          new THREE.Vector3(out, yB + 0.16 * s, 0),
          new THREE.Vector3(out - 0.03 * s, yB + 0.03 * s, 0),
          new THREE.Vector3(R + 0.26 * s, yB, 0),
          new THREE.Vector3(R * 0.96, yB, 0),
          new THREE.Vector3(R * 0.90, yB - 0.12 * s, 0),
        ],
        false,
        "catmullrom",
        0.35
      );
      return new THREE.TubeGeometry(curve, 72, 0.048 * s, 12, false);
    }
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

  // Free the GPU buffers of the PREVIOUS product/size before the memos above swap
  // in fresh geometry. These are created imperatively and handed to <mesh> via the
  // `geometry` prop, so R3F never disposes them — without this cleanup every product
  // or size change leaks the old Lathe/cap/handle/collar buffers. After ~20 changes
  // the accumulated buffers exhaust GPU memory, the WebGL context is lost, and the
  // body mesh corrupts/deforms. (Root cause of the "se deforma tras un rato" bug.)
  useEffect(() => () => {
    bodyGeo.dispose();
    capGeo?.dispose();
    handleGeo?.dispose();
    collarGeo?.dispose();
  }, [bodyGeo, capGeo, handleGeo, collarGeo]);

  const [fontReady, setFontReady] = useState(0);

  useEffect(() => {
    if (!fontFamily) return;
    const families = fontFamily.split(",").map(f => f.trim().replace(/['"]/g, ""));
    const primary = families[0];
    if (!primary) return;
    // Load the same weight the engraving draws with (see FONT_WEIGHT in
    // engraving-maps): measuring before the real face is in would fit/clamp
    // against the fallback font's metrics.
    document.fonts.load(`900 32px "${primary}"`).then(() => {
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
    if (finish === "matte") {
      // Hoppie y chopera llevan powder-coat real: mate con cuerpo, no tiza.
      if (product.id === "hoppie" || product.id === "chopera")
        return { ...base, roughness: 0.6, metalness: 0.1, clearcoat: 0.06, clearcoatRoughness: 0.7 };
      return { ...base, roughness: 0.88, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 0.8 };
    }
    if (finish === "glossy")   return { ...base, roughness: 0.05, metalness: 0.10, clearcoat: 1.0, clearcoatRoughness: 0.02 };
    if (finish === "metallic") return { ...base, roughness: 0.18, metalness: 0.90, clearcoat: 0.6, clearcoatRoughness: 0.08 };
    if (finish === "gradient") return { ...base, roughness: 0.22, metalness: 0.20, clearcoat: 0.9, clearcoatRoughness: 0.05 };
    // Cuero forrado: superficie muy mate, sin metal ni barniz, con un leve satinado.
    if (finish === "cuero")    return { ...base, roughness: 0.95, metalness: 0.0, clearcoat: 0.06, clearcoatRoughness: 0.9 };
    // Acero inoxidable natural: cepillado, no espejo.
    if (finish === "inox")     return { ...base, roughness: 0.32, metalness: 0.95, clearcoat: 0.12, clearcoatRoughness: 0.3 };
    return base;
  }, [finish, product.id]);

  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  // Rebuilding the four 1024×2048 canvas textures is the single most expensive
  // thing this component does, and it re-runs on every keystroke / drag frame —
  // which used to freeze the whole tab while typing a name. Deferring the
  // inputs that drive it lets React keep the text field and rotation responsive
  // and coalesce the texture rebuild to the last value once input settles.
  const dText = useDeferredValue(text);
  const dTextPlacement = useDeferredValue(textPlacement);
  const dArtPlacement = useDeferredValue(artPlacement);

  // Steel/leather/wood body maps — skipped entirely for glass, which paints no
  // colour/roughness/metalness maps onto the clear body.
  const maps = useMemo(
    () => glass ? null : makeBodyMaps({
      product, colorHex, finish: matProps, isGradientFinish: finish === "gradient",
      text: dText, textPlacement: dTextPlacement, fontFamily, artMask, imageSize, artPlacement: dArtPlacement,
      anisotropy: maxAnisotropy, colorPrint, textColor, artImage: customImageEl, engraveStyle, singleFace,
    }),
    // fontReady triggers re-creation once the font is actually loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass, product, colorHex, matProps, finish, dText, dTextPlacement, fontFamily, fontReady, artMask, imageSize, dArtPlacement, maxAnisotropy, colorPrint, textColor, customImageEl, engraveStyle, singleFace]
  );

  // Four textures per rebuild, now coalesced to the settled input via useDeferredValue.
  useEffect(() => () => maps?.dispose(), [maps]);

  // Glass frost coverage — the sandblasted mark, used as alpha/colour on the
  // frosted overlay mesh. Only built for cristal pieces.
  const glassFrost = useMemo(
    () => glass ? makeGlassEngraving({
      product, text: dText, textPlacement: dTextPlacement, fontFamily,
      artMask, imageSize, artPlacement: dArtPlacement, singleFace, anisotropy: maxAnisotropy,
    }) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass, product, dText, dTextPlacement, fontFamily, fontReady, artMask, imageSize, dArtPlacement, singleFace, maxAnisotropy]
  );
  useEffect(() => () => glassFrost?.dispose(), [glassFrost]);

  // transmission (real refraction) is heavy; on phones fall back to a cheaper
  // transparent+reflection glass so the preview stays smooth.
  const lowPerf = useMemo(() => {
    try { return typeof matchMedia !== "undefined" && matchMedia("(max-width: 768px)").matches; }
    catch { return false; }
  }, []);

  // Pointer drag handlers — both axes
  useEffect(() => {
    const canvas = gl.domElement;

    const onDown = (e: PointerEvent) => {
      // With a design active in single-face mode, this gesture repositions the
      // mark on the frozen front face instead of rotating the piece.
      const d = designRef.current;
      const mode = d.designActive && d.singleFace ? "design" : "rotate";
      // Envolvente 360° while typing: manual rotation is locked (the piece is
      // auto-spinning); ignore the gesture entirely until the input blurs.
      if (mode === "rotate" && d.rotationLocked) return;
      isDragging.current = true;
      velYaw.current = 0;
      velPitch.current = 0;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      lastTime.current = performance.now();
      dragMode.current = mode;
      if (dragMode.current === "design") d.onDesignDragStart?.();
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const now = performance.now();
      const dt = Math.max(1, now - lastTime.current);
      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      lastTime.current = now;
      if (dragMode.current === "design") {
        // Move the mark: screen delta as a fraction of the canvas. The parent
        // maps it into the front-face rectangle and clamps.
        const rect = canvas.getBoundingClientRect();
        designRef.current.onDesignMove?.(dx / rect.width, dy / rect.height);
        return;
      }
      velYaw.current   = dx / dt * 16;
      velPitch.current = dy / dt * 16;
      if (groupRef.current) {
        groupRef.current.rotation.y += dx * 0.008;
        // Clamp pitch so it doesn't flip upside-down
        const newPitch = groupRef.current.rotation.x + dy * 0.008;
        groupRef.current.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, newPitch));
      }
    };
    const onUp = () => {
      if (isDragging.current && dragMode.current === "design") designRef.current.onDesignDragEnd?.();
      isDragging.current = false;
      dragMode.current = "rotate";
    };

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

  // "Edición en una cara": swing the front face to the camera when the mode is
  // entered (and if the configured front angle changes), so the customer looks
  // straight at the editable area. Still fully draggable afterwards.
  useEffect(() => {
    if (!singleFace || !groupRef.current) return;
    groupRef.current.rotation.y = -frontFaceU * Math.PI * 2;
    groupRef.current.rotation.x = 0;
    velYaw.current = 0;
    velPitch.current = 0;
  }, [singleFace, frontFaceU]);

  // Expose the same "swing u to camera" move imperatively, so the parent can
  // face the personalized area right before capturing the summary snapshot.
  useEffect(() => {
    if (!snapToURef) return;
    snapToURef.current = (u: number) => {
      if (!groupRef.current) return;
      groupRef.current.rotation.y = -u * Math.PI * 2;
      groupRef.current.rotation.x = 0;
      velYaw.current = 0;
      velPitch.current = 0;
    };
    return () => { snapToURef.current = null; };
  }, [snapToURef]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (isDragging.current) return;

    // Envolvente 360° while typing: slow continuous spin so the customer sees
    // the text wrap the piece live. Overrides inertia/idle behaviour.
    if (autoSpin) {
      groupRef.current.rotation.y += delta * 0.45;
      groupRef.current.rotation.x *= 0.95; // ease back upright
      velYaw.current = 0;
      velPitch.current = 0;
      return;
    }

    // Idle auto-spin only while the piece is blank; freeze once the customer is
    // placing text/icon/image so they can position it calmly (still draggable).
    // Single-face mode also freezes, keeping the front face pointed at the camera.
    const hasContent = singleFace || !!text || (!!customImageUrl && imageSize !== "none");
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
      {glass ? (
        <>
          {/* Clear glass body — real refraction via transmission (lite fallback
              on phones uses plain transparency + reflections instead). */}
          <mesh geometry={bodyGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              key={lowPerf ? "glass-lite" : "glass"}
              color="#ffffff"
              transmission={lowPerf ? 0 : 1}
              transparent
              opacity={lowPerf ? 0.28 : 1}
              roughness={0.05}
              metalness={0}
              ior={1.5}
              thickness={lowPerf ? 0 : 0.35}
              clearcoat={1}
              clearcoatRoughness={0.05}
              envMapIntensity={2.2}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Sandblasted engraving: a frosted, light-diffusing white that only
              shows where the design's coverage mask is opaque. Slightly scaled
              out to sit on the glass surface without z-fighting; FrontSide so the
              back-face mark doesn't muddy the read when the glass is rotated. */}
          {glassFrost && (
            <mesh geometry={bodyGeo} scale={1.004}>
              <meshPhysicalMaterial
                color="#ffffff"
                map={glassFrost.frostMap}
                alphaMap={glassFrost.alphaMap}
                transparent
                opacity={0.95}
                roughness={0.92}
                metalness={0}
                envMapIntensity={0.8}
                depthWrite={false}
                side={THREE.FrontSide}
              />
            </mesh>
          )}
        </>
      ) : (
        /* Main body. The maps carry the colour and the finish; leaving `color`
           white keeps the exposed steel steel-coloured instead of tinting it. */
        <mesh geometry={bodyGeo} castShadow receiveShadow>
          {/* Keyed on finish: three only recompiles a shader when material.version
              changes, so toggling clearcoat on a live material never lights up the
              USE_CLEARCOAT define. Remounting sidesteps that. */}
          <meshPhysicalMaterial
            key={finish}
            map={maps!.map}
            roughnessMap={maps!.roughnessMap}
            roughness={1}
            metalnessMap={maps!.metalnessMap}
            metalness={1}
            bumpMap={maps!.grooveMap}
            bumpScale={0.42}
            clearcoatMap={maps!.grooveMap}
            clearcoat={matProps.clearcoat}
            clearcoatRoughness={matProps.clearcoatRoughness}
            envMapIntensity={finish === "metallic" || finish === "inox" ? 2.0 : finish === "glossy" ? 1.8 : 1.4}
          />
        </mesh>
      )}

      {/* Piezas a medida: cuello de acero del hoppie y remate (banda de acero +
          tapa transparente) de la chopera. El resto usa cap/handle genéricos. */}
      {product.id === "hoppie" && <HoppieNeck sil={sil} />}
      {product.id === "chopera" && <ChoperaTop sil={sil} />}

      {/* Cap / lid */}
      {capGeo && product.id !== "hoppie" && product.id !== "chopera" && (
        <mesh geometry={capGeo} position={[0, capCenterY, 0]} castShadow>
          <meshPhysicalMaterial color="#1a1a1a" roughness={0.28} metalness={0.55} clearcoat={0.7} clearcoatRoughness={0.08} envMapIntensity={1.6} />
        </mesh>
      )}

      {/* Handle: buried halfway so the depth test hides the inner half */}
      {handleGeo && handle && product.id !== "hoppie" && (
        <mesh geometry={handleGeo} position={handle.position} castShadow>
          {handle.mat === "plastic" ? (
            // Matte plastic — no metal, no clearcoat sheen. Colour matches the
            // body, except on bare stainless (inox): there the grip is black
            // plastic instead of body-grey.
            <meshPhysicalMaterial color={finish === "inox" ? "#1f1f21" : colorHex} roughness={0.9} metalness={0.0} clearcoat={0.04} clearcoatRoughness={0.9} envMapIntensity={0.6} />
          ) : handle.mat === "powder" ? (
            // Powder-coat como el cuerpo (chopera). En inox la manija sigue en acero.
            finish === "inox" ? (
              <meshPhysicalMaterial color={colorHex} roughness={0.32} metalness={0.95} envMapIntensity={2.0} />
            ) : (
              <meshPhysicalMaterial color={colorHex} roughness={0.6} metalness={0.1} clearcoat={0.06} clearcoatRoughness={0.7} envMapIntensity={0.9} />
            )
          ) : (
            // Metal handle keeps a fixed dark charcoal — never inherits the body colour
            // so it reads well against both natural steel and any painted finish.
            <meshPhysicalMaterial color="#1c1e22" roughness={0.55} metalness={0.25} clearcoat={0.12} clearcoatRoughness={0.6} envMapIntensity={0.8} />
          )}
        </mesh>
      )}

      {/* Metal collar seam ring (el hoppie trae su propio labio en HoppieNeck) */}
      {collarGeo && product.id !== "hoppie" && (
        <mesh geometry={collarGeo} position={[0, collarY, 0]}>
          <meshPhysicalMaterial color="#aaaaaa" roughness={0.12} metalness={0.98} clearcoat={0.6} envMapIntensity={2.2} />
        </mesh>
      )}

      {/* Front-face editable area outline (single-face mode, guides visible) */}
      {singleFace && showGuides && <FrontFaceGuide sil={sil} product={product} />}
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
          ctx.textBaseline="middle";
          ctx.globalAlpha = Math.max(0, Math.min(1, tp.facing+0.25));
          const lines = layoutText(ctx, text, textPlacement.layout ?? "auto", bW * 0.9);
          const lh = fs * (textPlacement.lineHeight ?? LINE_HEIGHT);
          const tw = measureLinesWidth(ctx, lines);
          const al = textPlacement.align ?? "center";
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          fillLinesAligned(ctx, lines, lh, tw, al, -Math.max(1, fs * 0.035));
          const steel = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2);
          steel.addColorStop(0, "#8f979f");
          steel.addColorStop(0.45, "#e6eaee");
          steel.addColorStop(1, "#9aa2aa");
          ctx.fillStyle = steel;
          fillLinesAligned(ctx, lines, lh, tw, al); ctx.restore();
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

function ThreeCanvas({ product, sil, onContextLost, onContextRestored, ...props }: Thermos3DProps & {
  product: ProductDef; sil: Silhouette;
  onContextLost?: () => void; onContextRestored?: () => void;
}) {
  const { shadowY } = fitCamera(sil);
  return (
    <Canvas
      // Cap the pixel ratio so high-DPI phones don't render 3–4× the pixels of a
      // transmission/glass scene (keeps it smooth and eases GPU memory pressure).
      dpr={[1.5, 2]}
      // preserveDrawingBuffer keeps the last frame readable so we can capture a
      // PNG of the finished piece (canvas.toDataURL) for the WhatsApp summary.
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      // preventDefault on context loss lets the browser fire `contextrestored`
      // and R3F rebuild the scene instead of leaving a black canvas. We surface a
      // placeholder while lost and force a re-render once the context is back.
      onCreated={({ gl, invalidate }) => {
        const canvas = gl.domElement;
        canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); onContextLost?.(); }, false);
        canvas.addEventListener("webglcontextrestored", () => { onContextRestored?.(); invalidate(); }, false);
      }}
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
          textColor={props.textColor}
          engraveStyle={props.engraveStyle ?? "steel"}
          singleFace={props.singleFace ?? false}
          showGuides={props.showGuides ?? true}
          frontFaceU={props.frontFaceU ?? FRONT_FACE.uCenter}
          glass={props.glass ?? false}
          designActive={props.designActive ?? false}
          onDesignMove={props.onDesignMove}
          onDesignDragStart={props.onDesignDragStart}
          onDesignDragEnd={props.onDesignDragEnd}
          snapToURef={props.snapToURef}
          autoSpin={props.autoSpin ?? false}
          rotationLocked={props.rotationLocked ?? false}
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
  const [contextLost, setContextLost] = useState(false);
  if (!webgl) return fallback;

  return (
    <WebGLErrorBoundary fallback={fallback}>
      <div className="relative w-full h-full">
        <ThreeCanvas
          {...props}
          product={product}
          sil={sil}
          onContextLost={() => setContextLost(true)}
          onContextRestored={() => setContextLost(false)}
        />
        {contextLost && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-secondary/40 backdrop-blur-sm rounded-2xl">
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Restaurando vista 3D…</p>
          </div>
        )}
      </div>
    </WebGLErrorBoundary>
  );
}
