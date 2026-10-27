import React, { useRef, useEffect, useMemo, useState, useCallback, useDeferredValue, Suspense, Component, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { StudioLighting } from "./studio-lighting";
import * as THREE from "three";
import { getProduct, getSize, productForSize, resampledProfile, type ProductDef } from "@/lib/products";
import { DEFAULT_ART_PLACEMENT, DEFAULT_TEXT_PLACEMENT, bandRange, vForY, type FaceId, type Placement } from "@/lib/placement";
import { buildEngraveMask } from "@/lib/image-processing";
import { makeBodyMaps, makeGlassEngraving, type EngraveStyle, type TextMark } from "@/lib/engraving-maps";
import type { WrapDesign } from "@/lib/wrap-design";
import { FRONT_FACE, frontAreaBounds, nearU } from "@/lib/face-area";
import { trackPinch, type PinchPhase } from "@/lib/pinch";
import { keepOutKindOf, zoneFromVertices, type KeepOutZone } from "@/lib/keep-out";
import { layoutText, fillLinesAligned, measureLinesWidth, LINE_HEIGHT } from "@/lib/engraving-text";
import { LOW_END } from "@/lib/device-tier";

/**
 * Si falla el 3D (por ejemplo, se cortó la red al bajar el .glb) muestra la
 * vista 2D con un botón «Reintentar». Se monta con `key` por modelo, así que
 * cambiar de producto también vuelve a intentar con el 3D.
 */
class WebGLErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; onRetry?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  retry = () => {
    this.props.onRetry?.();
    this.setState({ failed: false });
  };
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="relative w-full h-full">
        {this.props.fallback}
        <button
          type="button"
          onClick={this.retry}
          className="absolute left-1/2 bottom-3 -translate-x-1/2 z-10 inline-flex items-center gap-2 min-h-10 px-4 rounded-[10px] bg-white/95 border border-border text-sm font-semibold text-foreground shadow-sm"
        >
          No se pudo cargar el 3D · Reintentar
        </button>
      </div>
    );
  }
}

export interface ScreenRect { left: number; top: number; width: number; height: number }

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
  /** Textos adicionales (Texto 2: ej. empresa arriba, empleado abajo). */
  extraTexts?: TextMark[];
  /** Eufy Make (UV DTF): print the artwork in colour instead of engraving it. */
  colorPrint?: boolean;
  /** Ink colour for printed text (UV DTF only). */
  textColor?: string;
  /** Fondo "Todo el vaso (360°)" (Dacen F5): solo con colorPrint. */
  wrap?: WrapDesign | null;
  /** How the laser reads: steel reveal (default), leather char or wood char. */
  engraveStyle?: EngraveStyle;
  /** "Edición en una cara": confine the design to the front-face rectangle. */
  singleFace?: boolean;
  /**
   * Modo de edición vigente sobre el visor (arrastre, snap de cámara y guías).
   * Permite editar el arte en una cara mientras el TEXTO envuelve 360°
   * (singleFace=false solo afecta el render del texto). Default: singleFace.
   */
  editSingleFace?: boolean;
  /** Draw the dashed front-face guide (single-face mode only). */
  showGuides?: boolean;
  /**
   * Ubicación libre (sin el recuadro de una cara): el diseño seleccionado se
   * arrastra por toda la banda y las guías muestran las zonas sin grabado.
   */
  freePlacement?: boolean;
  /** Zonas sin grabado a dibujar mientras se mueve el diseño (ver lib/keep-out.ts). */
  keepOutZones?: KeepOutZone[];
  /** Zona contra la que chocó el diseño: se resalta un momento. */
  keepOutHit?: KeepOutZone | null;
  /** Avisa las zonas medidas sobre las piezas del .glb (logo, manija, relieves). */
  onModelKeepOut?: (productId: string, zones: KeepOutZone[]) => void;
  /**
   * u del diseño que se está arrastrando (ubicación libre): la pieza gira con
   * él, así el diseño queda quieto en pantalla y el cuerpo corre por debajo.
   * null = no seguir.
   */
  followU?: number | null;
  /**
   * Punto del cuerpo (u, v de la banda) donde se ancla un elemento HTML sobre
   * el visor (la pastilla de acciones del diseño seleccionado). Cada cuadro se
   * proyecta a píxeles del canvas y se mueve `anchorElRef`; si el punto queda
   * del lado de atrás, el elemento se oculta.
   */
  anchor?: { u: number; v: number } | null;
  anchorElRef?: React.RefObject<HTMLElement | null>;
  /**
   * Silueta de la pieza en pantalla (px del viewport), medida sobre el modelo
   * real: el tour la usa para iluminar el producto, sea cual sea su forma.
   */
  screenBoundsRef?: React.MutableRefObject<(() => ScreenRect | null) | null>;
  /** Which u faces the camera when single-face is entered. Defaults to config. */
  frontFaceU?: number;
  /** Cara sobre la que se dibuja la guía punteada (la del elemento en edición). */
  guideFace?: FaceId;
  /** Ocultar el logo de la marca del .glb (hay un diseño en el lado del logo). */
  hideLogo?: boolean;
  /** Render the body as transparent glass (cristal) with a sandblasted engraving. */
  glass?: boolean;
  /**
   * A design (text/icon/image) is active, so a drag on the body MOVES it across
   * the front face instead of rotating the piece. Only honoured in single-face
   * mode (the front face is frozen to camera there, so screen deltas map cleanly
   * to placement). When false, a drag rotates as usual.
   */
  designActive?: boolean;
  /**
   * Arrastre del diseño seleccionado, ya convertido 1:1 a coordenadas de
   * placement: du = fracción de la vuelta, dv = fracción de la banda grabable.
   */
  onDesignMove?: (du: number, dv: number) => void;
  /**
   * Toque (sin arrastre) sobre el visor: el punto del cuerpo tocado, en
   * coordenadas de placement (u, v de la banda), o null si no se tocó el cuerpo.
   */
  onTap?: (hit: { u: number; v: number } | null) => void;
  /**
   * ¿Ese punto del cuerpo cae sobre el diseño que se está editando? En el
   * celular solo un dedo apoyado sobre el diseño lo mueve; apoyado en otro
   * lado, el desliz vertical scrollea la página.
   */
  isOverDesign?: (hit: { u: number; v: number }) => boolean;
  /**
   * Pellizco con dos dedos mientras se edita un diseño: `factor` = distancia
   * actual entre los dedos / inicial. Ver lib/pinch.ts.
   */
  onDesignPinch?: (phase: PinchPhase, factor: number) => void;
  /**
   * Dos dedos sin nada en edición: los puntos del cuerpo bajo cada dedo. Si
   * caen sobre un diseño, el padre lo selecciona y devuelve true (y ese mismo
   * gesto ya lo escala). Ver lib/pinch.ts.
   */
  onPinchSelect?: (hits: ({ u: number; v: number } | null)[]) => boolean;
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
  /**
   * El padre guarda acá una función que dibuja un cuadro en el momento. Con
   * frameloop="demand" el canvas puede no tener el último cuadro listo: la
   * captura para el resumen la llama justo antes de leer los píxeles.
   */
  renderNowRef?: React.MutableRefObject<(() => void) | null>;
  /** La pieza ya está en pantalla (modelo .glb incluido): sirve para capturarla. */
  onReady?: () => void;
  /**
   * "Ver en AR": el padre guarda acá una función que devuelve una copia de la
   * pieza (derecha, apoyada en y = 0, sin guías) y cuántos metros mide una
   * unidad de escena. Ver lib/ar-viewer.ts.
   */
  arModelRef?: React.MutableRefObject<(() => { object: THREE.Object3D; metersPerUnit: number } | null) | null>;
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

/** Radio del perfil (Vector2 [radio, y], de abajo hacia arriba) a esa altura. */
function profileRadiusAt(pts: THREE.Vector2[], y: number): number {
  if (y <= pts[0].y) return pts[0].x;
  for (let i = 0; i < pts.length - 1; i++) {
    const y0 = pts[i].y, y1 = pts[i + 1].y;
    if (y >= y0 && y <= y1) return pts[i].x + (pts[i + 1].x - pts[i].x) * (y1 === y0 ? 0 : (y - y0) / (y1 - y0));
  }
  return pts[pts.length - 1].x;
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

  const band = [product.band[0] * scale, product.band[1] * scale] as [number, number];

  // Modelo .glb: el perfil cubre solo el cuerpo pintable; la base de acero, la
  // tapa y la manija salen de las medidas del propio modelo.
  if (product.model) {
    const m = product.model;
    const k = m.unitsPerMeter * scale;
    return {
      points, scale, maxR, fitR: m.reachM * k, neckY, neckR, capR: neckR, capH: 0,
      bottomY: -m.centerYm * k,
      topY: (m.heightM - m.centerYm) * k,
      band,
    };
  }

  return {
    points, scale, maxR, fitR, bottomY, neckY, neckR, capR, capH,
    topY: neckY + capH,
    band,
  };
}

const FOV = 30;

/** Pausa sin cambios tras la cual las texturas de borrador pasan a calidad completa. */
const SETTLE_MS = 280;

/** Velocidad del giro de "vidriera" al aparecer (rad/s). */
const IDLE_SPIN_SPEED = 0.55;

/** Celulares: menos píxeles y vidrio sin refracción real (ver lowPerf). */
const LOW_PERF = (() => {
  try { return typeof matchMedia !== "undefined" && matchMedia("(max-width: 768px)").matches; }
  catch { return false; }
})();
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

/** Marca el cuerpo grabable: el toque sobre el visor se resuelve contra esta malla. */
const ENGRAVE_BODY = { engraveBody: true };

/** Decoder Draco servido localmente (public/draco), no desde el CDN de Google. */
const DRACO_PATH = "/draco/";

/**
 * Piezas de un modelo .glb (forma base de GUIA-MODELOS-3D.md), llevadas al
 * mismo espacio que el lathe para que el resto del visor no note la diferencia:
 *  - escala `unitsPerMeter × talla` y centro en `centerYm`;
 *  - giro de 180° en Y: el frente del .glb (+Z) queda en u = 0.5, la cara que
 *    el personalizador trata como frente (FRONT_FACE.uCenter), y la manija
 *    (+X del .glb) en u = 0.75, igual que la del termo;
 *  - el cuerpo conserva la u cilíndrica del .glb (0.5 al frente, crece hacia la
 *    manija, igual que el lathe tras el giro) y recibe una v nueva calculada con
 *    `vForY`, la misma que usan las texturas de grabado y las guías.
 */
function useModelGeometries(product: ProductDef, sil: Silhouette) {
  const model = product.model!;
  const gltf = useGLTF(model.url, DRACO_PATH);

  const parts = useMemo(() => {
    const k = model.unitsPerMeter * sil.scale;
    const yaw = model.yawDeg ?? 0;
    const xf = new THREE.Matrix4()
      .makeScale(k, k, k)
      .multiply(new THREE.Matrix4().makeRotationY(Math.PI + THREE.MathUtils.degToRad(yaw)))
      .multiply(new THREE.Matrix4().makeTranslation(0, -model.centerYm, 0));
    const out: Record<string, { geometry: THREE.BufferGeometry; material: THREE.Material }> = {};
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(xf, mesh.matrixWorld));
      if (mesh.name === "body") {
        // Con giro extra, la u del .glb se corre la misma fracción de vuelta.
        // Su costura (atrás en el .glb) pasa a otro lado y aparece una nueva
        // donde u salta de 1 a 0: se desindexa y, en los triángulos que la
        // cruzan, la u chica se lleva a >1 (las texturas repiten en S).
        const shift = yaw / 360;
        const g = shift ? geometry.toNonIndexed() : geometry;
        if (g !== geometry) geometry.dispose();
        const pos = g.attributes.position;
        const uvSrc = g.attributes.uv;
        const uv = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
          const u0 = uvSrc ? uvSrc.getX(i) : 0.5;
          uv[i * 2] = shift ? (((u0 + shift) % 1) + 1) % 1 : u0;
          uv[i * 2 + 1] = vForY(product, pos.getY(i) / sil.scale);
        }
        if (shift) {
          for (let t = 0; t < pos.count; t += 3) {
            const a = uv[t * 2], b = uv[t * 2 + 2], c = uv[t * 2 + 4];
            if (Math.max(a, b, c) - Math.min(a, b, c) > 0.5) {
              for (let j = 0; j < 3; j++) if (uv[(t + j) * 2] < 0.5) uv[(t + j) * 2] += 1;
            }
          }
        }
        g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        out[mesh.name] = { geometry: g, material: mesh.material as THREE.Material };
        return;
      }
      out[mesh.name] = { geometry, material: mesh.material as THREE.Material };
    });
    return out;
  }, [gltf, model, product, sil.scale]);

  useEffect(() => () => {
    Object.values(parts).forEach(p => p.geometry.dispose());
  }, [parts]);

  return parts;
}

/**
 * El modelo completo. El cuerpo lleva `bodyMaterial`, el mismo material con las
 * texturas de color y grabado que usa el lathe; el resto son piezas fijas.
 */
function ModelPieces({
  product, sil, colorHex, finish, bodyMaterial, hideLogo, onKeepOut,
}: {
  product: ProductDef;
  sil: Silhouette;
  colorHex: string;
  finish: string;
  bodyMaterial: ReactNode;
  hideLogo?: boolean;
  onKeepOut?: (productId: string, zones: KeepOutZone[]) => void;
}) {
  const parts = useModelGeometries(product, sil);
  // Zonas sin grabado medidas sobre el propio modelo: logo y marca, manija,
  // etiqueta y relieves (por el nombre de la pieza, ver keepOutKindOf).
  const zones = useMemo(() => {
    const [botY, topY] = sil.band;
    const vOfY = (y: number) => (topY - y) / Math.max(1e-6, topY - botY);
    const out: KeepOutZone[] = [];
    for (const [name, part] of Object.entries(parts)) {
      const kind = keepOutKindOf(name);
      if (!kind) continue;
      const z = zoneFromVertices(kind, part.geometry.attributes.position.array, vOfY);
      if (z) out.push(z);
    }
    return out;
  }, [parts, sil]);
  const onKeepOutRef = useRef(onKeepOut);
  onKeepOutRef.current = onKeepOut;
  useEffect(() => { onKeepOutRef.current?.(product.id, zones); }, [product.id, zones]);
  const steel = { color: "#c9cdd1", roughness: 0.3, metalness: 1.0, envMapIntensity: 1.9 };
  const darkLogo = isWhiteBody(colorHex, finish);
  return (
    <>
      {parts.body && (
        <mesh geometry={parts.body.geometry} castShadow receiveShadow userData={ENGRAVE_BODY}>
          {bodyMaterial}
        </mesh>
      )}
      {parts.steel && (
        <mesh geometry={parts.steel.geometry}>
          <meshPhysicalMaterial {...steel} />
        </mesh>
      )}
      {parts.interior && (
        <mesh geometry={parts.interior.geometry}>
          <meshPhysicalMaterial {...steel} color="#b6bbc0" roughness={0.35} metalness={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Manija: del color del cuerpo (pintura en polvo); en inox, acero. */}
      {parts.handle && (
        <mesh geometry={parts.handle.geometry}>
          {finish === "inox" ? (
            <meshPhysicalMaterial color={colorHex} roughness={0.32} metalness={0.95} envMapIntensity={2.0} />
          ) : (
            <meshPhysicalMaterial color={colorHex} roughness={0.6} metalness={0.1} clearcoat={0.06} clearcoatRoughness={0.7} envMapIntensity={0.9} />
          )}
        </mesh>
      )}
      {/* Tapa, pajita, logos y demás piezas: el material del .glb, salvo las
          que el producto pinta con el color elegido (funda, boquilla…). */}
      {Object.entries(parts)
        .filter(([name]) => !BUILT_IN_PARTS.has(name) && !(hideLogo && LOGO_PARTS.has(name)))
        .map(([name, part]) => {
          const m = product.model!;
          if (darkLogo && LOGO_PARTS.has(name)) {
            const src = part.material as THREE.MeshStandardMaterial;
            return (
              <mesh key={`${name}:dark`} geometry={part.geometry}>
                <meshStandardMaterial color={LOGO_ON_WHITE} roughness={src.roughness ?? 0.6} metalness={0} side={src.side} />
              </mesh>
            );
          }
          const light = m.paintLight?.includes(name);
          const dark = m.paintDark?.includes(name);
          if (m.paint?.includes(name) || light || dark) {
            const src = part.material as THREE.MeshStandardMaterial;
            return (
              <mesh key={`${name}:paint`} geometry={part.geometry}>
                <meshStandardMaterial
                  color={light ? lighten(colorHex, 0.22) : dark ? darken(colorHex, 0.35) : colorHex}
                  roughness={src.roughness ?? 0.8}
                  metalness={0}
                  side={src.side}
                />
              </mesh>
            );
          }
          return <mesh key={name} geometry={part.geometry} material={part.material} />;
        })}
    </>
  );
}

/** Piezas con tratamiento propio en ModelPieces (el resto usa su material del .glb). */
const BUILT_IN_PARTS = new Set(["body", "steel", "interior", "handle"]);
/** El logo de la marca sobre el cuerpo (no el de la funda, ej. "logo_funda" del Sunbeam). */
const LOGO_PARTS = new Set(["logo", "logo_texto"]);
/** Sobre un cuerpo blanco, el logo y la marca van en negro (pedido del dueño, 2026-10-26). */
const LOGO_ON_WHITE = "#161616";

/**
 * Cuerpo blanco: muy claro y casi sin color ("Blanco" de Odoo #f2f2f0, "Blanco
 * Perla" #dddddd). Los pasteles, los beige, el gris y el acero (inox) no cuentan.
 */
function isWhiteBody(hex: string, finish: string): boolean {
  if (finish === "inox") return false;
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(hex).getHSL(hsl, THREE.SRGBColorSpace);
  return hsl.l >= 0.85 && hsl.s <= 0.2;
}

/** Mezcla un hex con blanco (0..1). */
function lighten(hex: string, t: number): string {
  const c = new THREE.Color(hex);
  return "#" + c.lerp(new THREE.Color("#ffffff"), t).getHexString();
}

/** Mezcla un hex con negro (0..1). */
function darken(hex: string, t: number): string {
  const c = new THREE.Color(hex);
  return "#" + c.lerp(new THREE.Color("#000000"), t).getHexString();
}

/**
 * The dashed rectangle drawn on the front face in "Edición en una cara" — a
 * closed line loop that hugs the body surface over the editable area, so the
 * customer sees exactly the box their design is trapped inside. Built straight
 * from the same `FRONT_FACE` config the clamp uses, so guide and limit agree.
 */
function FrontFaceGuide({ sil, product, face }: { sil: Silhouette; product: ProductDef; face: FaceId }) {
  const object = useMemo(() => {
    const b = frontAreaBounds(product, face);
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
  }, [sil, product, face]);

  useEffect(() => () => {
    object.geometry.dispose();
    (object.material as THREE.Material).dispose();
  }, [object]);

  return <primitive object={object} />;
}

/**
 * Ubicación libre: el contorno de cada zona sin grabado (logo, manija,
 * relieve) pegado al cuerpo, mientras se mueve el diseño. La zona contra la
 * que chocó se ve más fuerte.
 */
function KeepOutGuides({ sil, zones, hit }: { sil: Silhouette; zones: KeepOutZone[]; hit?: KeepOutZone | null }) {
  const lines = useMemo(() => {
    const [botY, topY] = sil.band;
    const yAtV = (v: number) => topY + (botY - topY) * v;
    const pts = sil.points;
    const radiusAtY = (y: number) => {
      if (y <= pts[0].y) return pts[0].x;
      if (y >= pts[pts.length - 1].y) return pts[pts.length - 1].x;
      for (let i = 0; i < pts.length - 1; i++) {
        const y0 = pts[i].y, y1 = pts[i + 1].y;
        if (y >= y0 && y <= y1) return pts[i].x + (pts[i + 1].x - pts[i].x) * (y1 === y0 ? 0 : (y - y0) / (y1 - y0));
      }
      return pts[pts.length - 1].x;
    };
    const at = (u: number, v: number) => {
      const phi = u * Math.PI * 2;
      const y = yAtV(v);
      const r = radiusAtY(y) * 1.016;
      return new THREE.Vector3(r * Math.sin(phi), y, r * Math.cos(phi));
    };
    return zones.map(z => {
      const u0 = z.u - z.halfU, u1 = z.u + z.halfU;
      const NH = 20, NV = 10;
      const verts: THREE.Vector3[] = [];
      for (let i = 0; i <= NH; i++) verts.push(at(u0 + (u1 - u0) * (i / NH), z.v0));
      for (let i = 1; i <= NV; i++) verts.push(at(u1, z.v0 + (z.v1 - z.v0) * (i / NV)));
      for (let i = 1; i <= NH; i++) verts.push(at(u1 - (u1 - u0) * (i / NH), z.v1));
      for (let i = 1; i < NV; i++) verts.push(at(u0, z.v1 - (z.v1 - z.v0) * (i / NV)));
      const isHit = !!hit && hit.u === z.u && hit.v0 === z.v0 && hit.kind === z.kind;
      const mat = new THREE.LineDashedMaterial({
        color: isHit ? "#C1121F" : "#9a8f8c",
        dashSize: 0.04 * sil.scale,
        gapSize: (isHit ? 0.015 : 0.035) * sil.scale,
        transparent: true,
        opacity: isHit ? 1 : 0.7,
        depthWrite: false,
      });
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(verts), mat);
      line.computeLineDistances();
      return line;
    });
  }, [sil, zones, hit]);
  useEffect(() => () => lines.forEach(l => { l.geometry.dispose(); (l.material as THREE.Material).dispose(); }), [lines]);
  return <>{lines.map((l, i) => <primitive key={i} object={l} />)}</>;
}

function ThermosMesh({
  colorHex, finish, text, product, sil, fontFamily, customImageUrl, imageSize,
  textPlacement, artPlacement, extraTexts, colorPrint, textColor, engraveStyle, singleFace, editSingleFace, showGuides, frontFaceU, guideFace, hideLogo = false, glass,
  designActive, onDesignMove, onDesignPinch, onPinchSelect, onDesignDragStart, onDesignDragEnd, onTap, isOverDesign, snapToURef, renderNowRef, onReady,
  autoSpin = false, rotationLocked = false, onMotionChange, arModelRef,
  freePlacement = false, keepOutZones, keepOutHit, onModelKeepOut, followU = null, anchor = null, anchorElRef,
  wrap = null, screenBoundsRef,
}: {
  colorHex: string; finish: string; text: string;
  product: ProductDef; sil: Silhouette; fontFamily?: string;
  customImageUrl: string | null; imageSize: "none" | "small" | "large";
  textPlacement: Placement; artPlacement: Placement; extraTexts?: TextMark[]; colorPrint: boolean; textColor?: string;
  wrap?: WrapDesign | null;
  engraveStyle: EngraveStyle;
  singleFace: boolean; editSingleFace: boolean; showGuides: boolean; frontFaceU: number; guideFace: FaceId; hideLogo?: boolean; glass: boolean;
  designActive: boolean;
  onDesignMove?: (du: number, dv: number) => void;
  onDesignPinch?: Thermos3DProps["onDesignPinch"];
  onPinchSelect?: Thermos3DProps["onPinchSelect"];
  onDesignDragStart?: () => void;
  onDesignDragEnd?: () => void;
  onTap?: (hit: { u: number; v: number } | null) => void;
  isOverDesign?: (hit: { u: number; v: number }) => boolean;
  snapToURef?: React.MutableRefObject<((u: number) => void) | null>;
  renderNowRef?: React.MutableRefObject<(() => void) | null>;
  onReady?: () => void;
  autoSpin?: boolean; rotationLocked?: boolean;
  /** La pieza empezó (true) o terminó (false) de moverse: giro, arrastre, inercia. */
  onMotionChange?: (moving: boolean) => void;
  arModelRef?: Thermos3DProps["arModelRef"];
  freePlacement?: boolean;
  keepOutZones?: KeepOutZone[];
  keepOutHit?: KeepOutZone | null;
  onModelKeepOut?: Thermos3DProps["onModelKeepOut"];
  followU?: number | null;
  anchor?: { u: number; v: number } | null;
  anchorElRef?: React.RefObject<HTMLElement | null>;
  screenBoundsRef?: Thermos3DProps["screenBoundsRef"];
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
  const get = useThree(s => s.get);
  const invalidate = useThree(s => s.invalidate);

  // Latest design-drag inputs, read inside the (stable) pointer listeners so we
  // don't re-attach them every render when the callbacks change identity.
  // Ubicación libre: se arrastra igual que en "una cara" (el diseño se mueve
  // por toda la banda y la pieza gira para seguirlo, ver followU).
  const dragEdit = editSingleFace || freePlacement;
  const designRef = useRef({ designActive, editSingleFace: dragEdit, rotationLocked, onDesignMove, onDesignPinch, onPinchSelect, onDesignDragStart, onDesignDragEnd, onTap, isOverDesign, sil, product });
  designRef.current = { designActive, editSingleFace: dragEdit, rotationLocked, onDesignMove, onDesignPinch, onPinchSelect, onDesignDragStart, onDesignDragEnd, onTap, isOverDesign, sil, product };

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
  // Las fuentes de los textos adicionales también se esperan antes de medir.
  const extraFontsKey = (extraTexts ?? []).map(t => t.fontFamily ?? "").join("|");
  useEffect(() => {
    if (!extraFontsKey || !document.fonts?.load) return;
    let alive = true;
    const loads = extraFontsKey.split("|").map(f => f.split(",")[0]?.trim().replace(/['"]/g, "")).filter(Boolean)
      .map(f => document.fonts.load(`900 32px "${f}"`));
    Promise.all(loads).then(() => { if (alive) setFontReady(n => n + 1); }).catch(() => {});
    return () => { alive = false; };
  }, [extraFontsKey]);

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

  // Fondo 360°: la imagen se carga una vez; modo, zoom y corrimiento solo
  // rearman la textura.
  const wrapUrl = colorPrint ? wrap?.url ?? null : null;
  const [wrapEl, setWrapEl] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!wrapUrl) { setWrapEl(null); return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setWrapEl(img); };
    img.onerror = () => { if (!cancelled) setWrapEl(null); };
    img.src = wrapUrl;
    return () => { cancelled = true; };
  }, [wrapUrl]);
  // Logos encima del fondo: se cargan una vez por URL.
  const logoKey = wrapUrl ? (wrap?.logos ?? []).map(l => l.url).join("|") : "";
  const [logoEls, setLogoEls] = useState<Record<string, HTMLImageElement>>({});
  useEffect(() => {
    const urls = logoKey ? logoKey.split("|") : [];
    if (!urls.length) { setLogoEls({}); return; }
    let cancelled = false;
    Promise.all(urls.map(u => new Promise<[string, HTMLImageElement | null]>(res => {
      const img = new Image();
      img.onload = () => res([u, img]);
      img.onerror = () => res([u, null]);
      img.src = u;
    }))).then(pairs => {
      if (cancelled) return;
      const map: Record<string, HTMLImageElement> = {};
      for (const [u, img] of pairs) if (img) map[u] = img;
      setLogoEls(map);
    });
    return () => { cancelled = true; };
  }, [logoKey]);
  const dWrap = useDeferredValue(wrap);
  const wrapLayer = useMemo(
    () => (wrapEl && dWrap ? {
      image: wrapEl, mode: dWrap.mode, scale: dWrap.scale, offsetU: dWrap.offsetU, offsetV: dWrap.offsetV,
      logos: (dWrap.logos ?? []).filter(l => logoEls[l.url]).map(l => ({ image: logoEls[l.url]!, u: l.u, v: l.v, widthFrac: l.widthFrac })),
    } : null),
    [wrapEl, dWrap, logoEls],
  );

  // The laser burns tone, not colour: resolve the artwork to a coverage map once.
  const artMask = useMemo(() => (customImageEl ? buildEngraveMask(customImageEl) : null), [customImageEl]);

  // PBR material params per finish
  const matProps = useMemo(() => {
    const base = { roughness: 0.35, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.15 };
    if (finish === "matte") {
      // Hoppie, chopera y vaso con manija llevan powder-coat real: mate con cuerpo, no tiza.
      if (product.id === "hoppie" || product.id === "botella-ancha" || product.id === "chopera" || product.id === "vaso-manija" || product.id === "vaso-hydrate" || product.id === "vaso-sunbeam" || product.id === "termo-mate" || product.id === "termo-mate-forge" || product.id === "termo-kids" || product.id === "hoppie-hydrate" || product.id === "copa-hydrate" || product.id === "vaso-espresso" || product.id === "taza-manija" || product.id === "mini-coffee" || product.id === "vaso-taza" || product.id === "coffee-cup" || product.id === "vaso-shaker" || product.id === "vaso-whisky" || product.id === "vaso-cafe" || product.id === "growler" || product.id === "ice-bucket" || product.id === "guampa")
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

  const maxAnisotropy = useMemo(() => Math.min(gl.capabilities.getMaxAnisotropy(), LOW_END ? 2 : 16), [gl]);

  // Rebuilding the four 1024×2048 canvas textures is the single most expensive
  // thing this component does, and it re-runs on every keystroke / drag frame —
  // which used to freeze the whole tab while typing a name. Deferring the
  // inputs that drive it lets React keep the text field and rotation responsive
  // and coalesce the texture rebuild to the last value once input settles.
  const dText = useDeferredValue(text);
  const dTextPlacement = useDeferredValue(textPlacement);
  const dArtPlacement = useDeferredValue(artPlacement);
  const dExtraTexts = useDeferredValue(extraTexts);

  // Mientras el cliente escribe, arrastra o prueba colores, las texturas se
  // arman en borrador (¼ de los píxeles, sin desenfoques); la versión completa
  // se arma una sola vez, cuando deja de tocar (~280 ms).
  // Cada edición es una identidad nueva y el borrador se decide en el MISMO
  // render que trae el cambio. (Antes un estado `settled` recién pasaba a false
  // en un efecto: cada tecla armaba primero la versión completa, con los
  // desenfoques, y después el borrador — el doble de trabajo, y el caro.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const editKey = useMemo(() => ({}), [dText, dTextPlacement, dArtPlacement, dExtraTexts, artMask, imageSize, colorHex, wrapLayer]);
  const [settledKey, setSettledKey] = useState(editKey);
  useEffect(() => {
    if (settledKey === editKey) return;
    const t = setTimeout(() => setSettledKey(editKey), SETTLE_MS);
    return () => clearTimeout(t);
  }, [editKey, settledKey]);
  const settled = settledKey === editKey;

  // Steel/leather/wood body maps — skipped entirely for glass, which paints no
  // colour/roughness/metalness maps onto the clear body.
  const maps = useMemo(
    () => glass ? null : makeBodyMaps({
      product, colorHex, finish: matProps, isGradientFinish: finish === "gradient",
      text: dText, textPlacement: dTextPlacement, fontFamily, extraTexts: dExtraTexts, artMask, imageSize, artPlacement: dArtPlacement,
      anisotropy: maxAnisotropy, colorPrint, textColor, artImage: customImageEl, engraveStyle, singleFace,
      quality: settled ? "full" : "draft", wrap: colorPrint ? wrapLayer : null,
    }),
    // fontReady triggers re-creation once the font is actually loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass, product, colorHex, matProps, finish, dText, dTextPlacement, dExtraTexts, fontFamily, fontReady, artMask, imageSize, dArtPlacement, maxAnisotropy, colorPrint, textColor, customImageEl, engraveStyle, singleFace, settled, wrapLayer]
  );

  // Four textures per rebuild, now coalesced to the settled input via useDeferredValue.
  useEffect(() => () => maps?.dispose(), [maps]);

  // Glass frost coverage — the sandblasted mark, used as alpha/colour on the
  // frosted overlay mesh. Only built for cristal pieces.
  const glassFrost = useMemo(
    () => glass ? makeGlassEngraving({
      product, text: dText, textPlacement: dTextPlacement, fontFamily, extraTexts: dExtraTexts,
      artMask, imageSize, artPlacement: dArtPlacement, singleFace, anisotropy: maxAnisotropy,
    }) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass, product, dText, dTextPlacement, dExtraTexts, fontFamily, fontReady, artMask, imageSize, dArtPlacement, singleFace, maxAnisotropy]
  );
  useEffect(() => () => glassFrost?.dispose(), [glassFrost]);

  // transmission (real refraction) is heavy; on phones fall back to a cheaper
  // transparent+reflection glass so the preview stays smooth.
  const lowPerf = LOW_PERF;

  // Giro automático de "vidriera" al entrar o cambiar de producto: arranca con
  // el frente de la marca (el logo del modelo, en +Z del grupo = giro 0) mirando
  // a la cámara y da una vuelta entera hasta volver a él. Con
  // frameloop="demand", un giro eterno sería render continuo.
  const spinLeft = useRef(0);
  const spinFromLogo = useRef(false);
  useEffect(() => {
    // Gama baja: sin la vuelta de presentación (son segundos de render continuo
    // justo cuando el cliente quiere empezar a diseñar).
    spinLeft.current = LOW_END ? 0 : Math.PI * 2;
    spinFromLogo.current = true;
    invalidate();
  }, [product.id, invalidate]);
  useEffect(() => { if (autoSpin) invalidate(); }, [autoSpin, invalidate]);

  // Pointer handlers: girar, mover el diseño seleccionado y detectar toques.
  useEffect(() => {
    const canvas = gl.domElement;

    // Gestos táctiles: el desliz VERTICAL es de la página (touch-action:
    // pan-y, ver el efecto de abajo). En el celular el visor ocupa casi toda
    // la pantalla y queda fijo arriba: si se quedaba el gesto, no se podía
    // bajar la página y el termo se inclinaba y "se iba para abajo". El desliz
    // horizontal gira la pieza. Editando un diseño, solo un dedo apoyado SOBRE
    // el diseño lo mueve (en las dos direcciones). Con mouse se sigue pudiendo
    // inclinar para ver la base.
    // Toque = soltar cerca de donde se apoyó y rápido. Sirve para seleccionar
    // el diseño (o terminar la edición tocando fuera de él).
    let down: { x: number; y: number; t: number; id: number } | null = null;
    // El arrastre del diseño se acumula y se entrega una vez por cuadro: cada
    // entrega re-renderiza el personalizador entero (y re-mide el texto), y el
    // puntero dispara eventos bastante más seguido que la pantalla.
    let pendDu = 0, pendDv = 0, moveRaf = 0;
    const flushMove = () => {
      if (moveRaf) { cancelAnimationFrame(moveRaf); moveRaf = 0; }
      if (!pendDu && !pendDv) return;
      const du = pendDu, dv = pendDv;
      pendDu = 0; pendDv = 0;
      designRef.current.onDesignMove?.(du, dv);
    };
    // El diseño no arranca a moverse hasta pasar este umbral: así un toque
    // para seleccionar o deseleccionar no lo corre de lugar.
    const DESIGN_SLOP = 5;
    let designMoving = false;

    const startDrag = (e: PointerEvent, mode: "design" | "rotate") => {
      isDragging.current = true;
      // Con el dedo solo se gira: el eje vertical es el scroll de la página.
      allowPitch = e.pointerType === "mouse";
      velYaw.current = 0;
      spinLeft.current = 0;
      velPitch.current = 0;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      lastTime.current = performance.now();
      dragMode.current = mode;
      designMoving = false;
      // El dedo recorre menos pantalla que el mouse: más giro por píxel.
      rotGain = e.pointerType === "mouse" ? 0.008 : 0.013;
      canvas.setPointerCapture(e.pointerId);
    };
    let rotGain = 0.008;
    let allowPitch = true;
    /** El dedo se apoyó sobre el diseño en edición (lo mueve en vez de girar). */
    let touchOnDesign = false;

    // Dos dedos sobre el visor con un diseño en edición: tamaño. Corta el
    // arrastre que haya empezado el primer dedo y anula el "toque" al soltar.
    let pinched = false;
    const pinch = trackPinch(canvas, {
      enabled: () => !!designRef.current.designActive && !!designRef.current.onDesignPinch,
      claim: (points) => {
        const d = designRef.current;
        if (d.designActive || !d.onDesignPinch || !d.onPinchSelect || d.rotationLocked) return false;
        return d.onPinchSelect(points.map(p => pick({ clientX: p.x, clientY: p.y })));
      },
      onPinch: (phase, factor) => {
        if (phase === "start") {
          pinched = true;
          const wasDesign = isDragging.current && dragMode.current === "design" && designMoving;
          flushMove();
          if (wasDesign) designRef.current.onDesignDragEnd?.();
          isDragging.current = false;
          dragMode.current = "rotate";
          designMoving = false;
        }
        designRef.current.onDesignPinch?.(phase, factor);
      },
    });

    const onDown = (e: PointerEvent) => {
      if (pinch.isActive()) return;
      if (!isDragging.current) pinched = false;
      down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      // Con un diseño seleccionado (en una cara), el gesto lo mueve; si no, gira.
      // Con el dedo, solo si se apoyó sobre el diseño (ver onTouchStart).
      const d = designRef.current;
      const editing = d.designActive && d.editSingleFace;
      // Chrome dispara pointerdown ANTES que touchstart: se calcula acá también.
      if (editing && e.pointerType !== "mouse") touchOnDesign = onDesignAt(e);
      // Editando, un dedo fuera del diseño no gira (la cara queda de frente):
      // ese gesto es solo el scroll de la página.
      if (editing && e.pointerType !== "mouse" && !touchOnDesign) return;
      const mode = editing ? "design" : "rotate";
      // Envolvente 360° while typing: manual rotation is locked (the piece is
      // auto-spinning); ignore the gesture entirely until the input blurs.
      if (mode === "rotate" && d.rotationLocked) return;
      startDrag(e, mode);
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current || pinch.isActive()) return;
      if (dragMode.current === "design" && !designMoving) {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) < DESIGN_SLOP) return;
        designMoving = true;
        lastX.current = e.clientX;
        lastY.current = e.clientY;
        designRef.current.onDesignDragStart?.();
        return;
      }
      const now = performance.now();
      const dt = Math.max(1, now - lastTime.current);
      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      lastTime.current = now;
      if (dragMode.current === "design") {
        // 1:1 con el dedo: píxeles de pantalla → metros sobre la cara frontal
        // (a la distancia de la cámara) → fracción de la vuelta (u) y de la
        // banda grabable (v).
        const { sil: sl } = designRef.current;
        const cam = get().camera as THREE.PerspectiveCamera;
        const rect = canvas.getBoundingClientRect();
        const dist = Math.max(0.1, cam.position.z - sl.maxR);
        const worldPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) / Math.max(1, rect.height);
        const du = (dx * worldPerPx) / (2 * Math.PI * sl.maxR);
        const dv = (dy * worldPerPx) / Math.max(1e-6, sl.band[1] - sl.band[0]);
        pendDu += du;
        pendDv += dv;
        if (!moveRaf) moveRaf = requestAnimationFrame(() => { moveRaf = 0; flushMove(); });
        return;
      }
      velYaw.current   = dx / dt * 16;
      velPitch.current = allowPitch ? dy / dt * 16 : 0;
      if (groupRef.current) {
        groupRef.current.rotation.y += dx * rotGain;
        if (allowPitch) {
          // Clamp pitch so it doesn't flip upside-down
          const newPitch = groupRef.current.rotation.x + dy * rotGain;
          groupRef.current.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, newPitch));
        }
      }
      invalidate();
    };

    /** Qué hay bajo el dedo: un punto del cuerpo (u, v de la banda) o nada. */
    const pick = (e: { clientX: number; clientY: number }): { u: number; v: number } | null => {
      const group = groupRef.current;
      if (!group) return null;
      const { camera, raycaster } = get();
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObject(group, true).find(h => (h.object as THREE.Mesh).isMesh && h.object.visible);
      if (!hit || !hit.object.userData.engraveBody || !hit.uv) return null;
      const [vBot, vTop] = bandRange(designRef.current.product);
      return { u: hit.uv.x, v: (vTop - hit.uv.y) / Math.max(1e-6, vTop - vBot) };
    };

    const onUp = (e: PointerEvent) => {
      const wasDesign = isDragging.current && dragMode.current === "design" && designMoving;
      flushMove();
      if (wasDesign) designRef.current.onDesignDragEnd?.();
      const tap = !pinched && !!down && e.type === "pointerup" && e.pointerId === down.id
        && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8
        && performance.now() - down.t < 500;
      down = null;
      isDragging.current = false;
      dragMode.current = "rotate";
      designMoving = false;
      if (tap) designRef.current.onTap?.(pick(e));
      invalidate(); // la inercia sigue en useFrame
    };

    // Toque sobre el diseño en edición: el gesto es del visor (moverlo en las
    // dos direcciones), así que se cancela el scroll de la página. Tiene que
    // decidirse acá: el navegador elige entre scroll y gesto en el touchstart.
    const onDesignAt = (p: { clientX: number; clientY: number }) => {
      const d = designRef.current;
      if (!(d.designActive && d.editSingleFace)) return false;
      const hit = pick(p);
      return !!hit && (d.isOverDesign ? d.isOverDesign(hit) : true);
    };
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchOnDesign = !!t && e.touches.length === 1 && onDesignAt(t);
      if (touchOnDesign && e.cancelable) e.preventDefault();
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);
    // pointercancel: el sistema cortó el gesto (llamada, notificación…).
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      if (moveRaf) cancelAnimationFrame(moveRaf);
      pinch.dispose();
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [gl, get, invalidate]);

  // Ubicación libre: mientras se arrastra, la pieza gira junto con el diseño
  // desde el primer momento. El diseño queda quieto en pantalla (donde estaba
  // al apoyar el dedo, a lo sumo a ≈25° del centro) y el cuerpo corre por
  // debajo: así se lo lleva alrededor de todo el cuerpo sin perderlo de vista.
  const followOff = useRef<number | null>(null);
  useEffect(() => {
    if (followU == null || !groupRef.current) { followOff.current = null; return; }
    const g = groupRef.current;
    const facing = -g.rotation.y / (Math.PI * 2);
    if (followOff.current === null) {
      const LIM = 0.07; // ≈ 25° del centro
      followOff.current = Math.max(-LIM, Math.min(LIM, nearU(followU, facing) - facing));
    }
    const target = nearU(followU, facing) - followOff.current;
    if (Math.abs(target - facing) < 1e-5) return;
    g.rotation.y = -target * Math.PI * 2;
    velYaw.current = 0;
    spinLeft.current = 0;
    invalidate();
  }, [followU, invalidate]);

  // Con pellizco (editor de una pantalla del celular) el gesto es todo del
  // visor: no hay página que scrollear detrás y así el navegador no se queda
  // con el primer dedo antes de que llegue el segundo. Con onPinchSelect se
  // puede pellizcar un diseño sin seleccionarlo antes, así que vale siempre.
  const pinchable = !!onDesignPinch && (designActive || !!onPinchSelect);
  useEffect(() => {
    gl.domElement.style.touchAction = pinchable ? "none" : "";
  }, [gl, pinchable]);

  // "Edición en una cara": swing the front face to the camera when the mode is
  // entered (and if the configured front angle changes), so the customer looks
  // straight at the editable area. Still fully draggable afterwards.
  useEffect(() => {
    if (!editSingleFace || !groupRef.current) return;
    groupRef.current.rotation.y = -frontFaceU * Math.PI * 2;
    groupRef.current.rotation.x = 0;
    velYaw.current = 0;
    velPitch.current = 0;
    invalidate();
  }, [editSingleFace, frontFaceU, invalidate]);

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
      invalidate();
    };
    return () => { snapToURef.current = null; };
  }, [snapToURef, invalidate]);

  useEffect(() => {
    if (!arModelRef) return;
    arModelRef.current = () => {
      const g = groupRef.current;
      if (!g) return null;
      // Copia superficial: comparte geometría y materiales (texturas del
      // grabado incluidas) con el visor.
      const copy = g.clone(true);
      copy.rotation.set(0, 0, 0);
      copy.position.set(0, -sil.bottomY, 0);
      const lines: THREE.Object3D[] = [];
      copy.traverse(o => { if ((o as THREE.Line).isLine) lines.push(o); });
      lines.forEach(o => o.removeFromParent());
      // Modelos .glb: unidades por metro conocidas. Formas genéricas: ~10/m,
      // la escala con la que están dibujados los perfiles.
      const unitsPerMeter = product.model?.unitsPerMeter ?? 10;
      return { object: copy, metersPerUnit: 1 / unitsPerMeter };
    };
    return () => { arModelRef.current = null; };
  }, [arModelRef, sil, product]);

  useEffect(() => {
    if (!renderNowRef) return;
    renderNowRef.current = () => {
      const { gl: r, scene, camera } = get();
      r.render(scene, camera);
    };
    return () => { renderNowRef.current = null; };
  }, [renderNowRef, get]);

  // Este componente recién monta cuando el Suspense resolvió (con un .glb, ya
  // cargado): avisar para que la captura del resumen no salga vacía.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => { onReadyRef.current?.(); }, [product.id, product.model?.url]);

  const motionRef = useRef({ moving: false, onMotionChange });
  motionRef.current.onMotionChange = onMotionChange;
  const reportMotion = (moving: boolean) => {
    if (motionRef.current.moving === moving) return;
    motionRef.current.moving = moving;
    motionRef.current.onMotionChange?.(moving);
  };

  // Silueta en pantalla: se proyectan los vértices de todas las piezas (una
  // muestra de hasta ~3000 por pieza), así la caja sigue la forma real del
  // modelo y del tamaño, no un recuadro fijo.
  useEffect(() => {
    if (!screenBoundsRef) return;
    screenBoundsRef.current = () => {
      const g = groupRef.current;
      if (!g) return null;
      const { camera } = get();
      g.updateMatrixWorld(true);
      const rect = gl.domElement.getBoundingClientRect();
      const v = new THREE.Vector3();
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      g.traverse(o => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || !mesh.visible) return;
        const pos = mesh.geometry.attributes.position;
        if (!pos) return;
        const step = Math.max(1, Math.floor(pos.count / 3000));
        for (let i = 0; i < pos.count; i += step) {
          v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).project(camera);
          const sx = rect.left + ((v.x + 1) / 2) * rect.width;
          const sy = rect.top + ((1 - v.y) / 2) * rect.height;
          if (sx < x1) x1 = sx;
          if (sx > x2) x2 = sx;
          if (sy < y1) y1 = sy;
          if (sy > y2) y2 = sy;
        }
      });
      if (!Number.isFinite(x1)) return null;
      // Nunca más allá del visor.
      x1 = Math.max(rect.left, x1); y1 = Math.max(rect.top, y1);
      x2 = Math.min(rect.right, x2); y2 = Math.min(rect.bottom, y2);
      return x2 > x1 && y2 > y1 ? { left: x1, top: y1, width: x2 - x1, height: y2 - y1 } : null;
    };
    return () => { screenBoundsRef.current = null; };
  }, [screenBoundsRef, get, gl]);

  // Pastilla del diseño seleccionado: pegada debajo de él en la pantalla.
  useEffect(() => { invalidate(); }, [anchor?.u, anchor?.v, invalidate]);
  const anchorTmp = useMemo(() => ({ p: new THREE.Vector3(), n: new THREE.Vector3(), c: new THREE.Vector3() }), []);
  useFrame(({ camera, size }) => {
    const el = anchorElRef?.current;
    if (!el) return;
    const g = groupRef.current;
    if (!anchor || !g) { el.style.visibility = "hidden"; return; }
    const y = sil.band[1] + (sil.band[0] - sil.band[1]) * Math.min(1, Math.max(0, anchor.v));
    const phi = anchor.u * Math.PI * 2;
    const r = profileRadiusAt(sil.points, y);
    const { p, n, c } = anchorTmp;
    g.updateMatrixWorld();
    p.set(r * Math.sin(phi), y, r * Math.cos(phi)).applyMatrix4(g.matrixWorld);
    n.set(Math.sin(phi), 0, Math.cos(phi)).transformDirection(g.matrixWorld);
    c.copy(camera.position).sub(p);
    if (n.dot(c) <= 0) { el.style.visibility = "hidden"; return; }
    p.project(camera);
    const x = Math.min(size.width - 8, Math.max(8, ((p.x + 1) / 2) * size.width));
    const sy = Math.min(size.height - 52, Math.max(8, ((1 - p.y) / 2) * size.height + 8));
    el.style.transform = `translate(${x}px, ${sy}px) translateX(-50%)`;
    el.style.visibility = "visible";
  });

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (isDragging.current) { reportMotion(true); return; }
    // Con frameloop="demand" cada cuadro pide el siguiente solo mientras algo
    // se mueve (giro, inercia o vuelta a la vertical).
    let animating = false;

    // Envolvente 360° while typing: slow continuous spin so the customer sees
    // the text wrap the piece live. Overrides inertia/idle behaviour.
    if (autoSpin) {
      groupRef.current.rotation.y += delta * 0.45;
      groupRef.current.rotation.x *= 0.95; // ease back upright
      velYaw.current = 0;
      velPitch.current = 0;
      reportMotion(true);
      invalidate();
      return;
    }

    // Idle auto-spin only while the piece is blank (and only for a few seconds);
    // freeze once the customer is placing text/icon/image so they can position
    // it calmly (still draggable). Single-face mode also freezes, keeping the
    // front face pointed at the camera.
    const hasContent = editSingleFace || !!text || (!!customImageUrl && imageSize !== "none") || !!wrapUrl;
    const hasYawInertia   = Math.abs(velYaw.current) > 0.001;
    const hasPitchInertia = Math.abs(velPitch.current) > 0.001;

    // Al aparecer la pieza (sin diseño todavía) se ve el frente de la marca,
    // aunque la edición en una cara la haya girado hacia la cara de grabado:
    // al seleccionar el diseño, el customizer la vuelve a girar hacia ella.
    if (spinFromLogo.current) {
      spinFromLogo.current = false;
      if (!text && !(customImageUrl && imageSize !== "none")) {
        groupRef.current.rotation.y = 0;
        groupRef.current.rotation.x = 0;
        animating = true;
      }
    }
    // Con diseño puesto no hay vidriera: la pieza queda donde la dejó el cliente.
    if (hasContent) spinLeft.current = 0;

    if (hasYawInertia) {
      groupRef.current.rotation.y += velYaw.current * delta;
      velYaw.current *= 0.90;
      spinLeft.current = 0;
      animating = true;
    } else {
      velYaw.current = 0;
      if (spinLeft.current > 0) {
        const step = Math.min(spinLeft.current, Math.min(delta, 0.05) * IDLE_SPIN_SPEED);
        groupRef.current.rotation.y += step;
        spinLeft.current -= step;
        animating = true;
      }
    }

    if (hasPitchInertia) {
      const newPitch = groupRef.current.rotation.x + velPitch.current * delta;
      groupRef.current.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, newPitch));
      velPitch.current *= 0.90;
      animating = true;
    } else {
      velPitch.current = 0;
      // Gently return to upright
      groupRef.current.rotation.x *= 0.97;
      if (Math.abs(groupRef.current.rotation.x) > 0.0005) animating = true;
      else groupRef.current.rotation.x = 0;
    }

    reportMotion(animating);
    if (animating) invalidate();
  });

  // Keyed on finish: three only recompiles a shader when material.version
  // changes, so toggling clearcoat on a live material never lights up the
  // USE_CLEARCOAT define. Remounting sidesteps that.
  const bodyMaterial = maps && (
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
  );

  const capCenterY = sil.neckY + sil.capH / 2;
  const collarY    = sil.neckY - 0.10 * sil.scale;

  return (
    <group ref={groupRef}>
      {glass ? (
        <>
          {/* Clear glass body — real refraction via transmission (lite fallback
              on phones uses plain transparency + reflections instead). */}
          <mesh geometry={bodyGeo} castShadow receiveShadow userData={ENGRAVE_BODY}>
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
            <mesh geometry={bodyGeo} scale={1.004} userData={ENGRAVE_BODY}>
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
           white keeps the exposed steel steel-coloured instead of tinting it.
           Con modelo .glb, el mismo material va sobre el cuerpo del modelo. */
        product.model ? (
          /* key: al cambiar de producto las piezas se montan de cero. Si React
             reutiliza un <mesh> del modelo anterior con el mismo nombre ("lid"),
             al pasar de `material={…}` a un material hijo R3F repone la prop
             quitada con el default de THREE.Mesh: un MeshBasicMaterial blanco
             (la tapa del Termo Mate salía blanca y sin luz). */
          <ModelPieces key={product.model.url} product={product} sil={sil} colorHex={colorHex} finish={finish} bodyMaterial={bodyMaterial} hideLogo={hideLogo} onKeepOut={onModelKeepOut} />
        ) : (
          <mesh geometry={bodyGeo} castShadow receiveShadow userData={ENGRAVE_BODY}>
            {bodyMaterial}
          </mesh>
        )
      )}

      {/* Piezas a medida: cuello de acero de la botella de boca ancha y remate (banda de acero +
          tapa transparente) de la chopera. El resto usa cap/handle genéricos. */}
      {product.id === "botella-ancha" && <HoppieNeck sil={sil} />}
      {product.id === "chopera" && <ChoperaTop sil={sil} />}

      {/* Cap / lid */}
      {capGeo && product.id !== "botella-ancha" && product.id !== "chopera" && (
        <mesh geometry={capGeo} position={[0, capCenterY, 0]} castShadow>
          <meshPhysicalMaterial color="#1a1a1a" roughness={0.28} metalness={0.55} clearcoat={0.7} clearcoatRoughness={0.08} envMapIntensity={1.6} />
        </mesh>
      )}

      {/* Handle: buried halfway so the depth test hides the inner half */}
      {handleGeo && handle && product.id !== "botella-ancha" && (
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
      {collarGeo && product.id !== "botella-ancha" && (
        <mesh geometry={collarGeo} position={[0, collarY, 0]}>
          <meshPhysicalMaterial color="#aaaaaa" roughness={0.12} metalness={0.98} clearcoat={0.6} envMapIntensity={2.2} />
        </mesh>
      )}

      {/* Front-face editable area outline (edit mode una-cara, guides visible) */}
      {editSingleFace && showGuides && <FrontFaceGuide sil={sil} product={product} face={guideFace} />}
      {freePlacement && (showGuides || !!keepOutHit) && !!keepOutZones?.length && (
        <KeepOutGuides sil={sil} zones={keepOutZones} hit={keepOutHit} />
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
  colorHex, text, product, sil, customImageUrl, imageSize, textPlacement, artPlacement, extraTexts,
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
  const propsRef = useRef({ colorHex, text, product, sil, imageSize, textPlacement, artPlacement, extraTexts });
  propsRef.current = { colorHex, text, product, sil, imageSize, textPlacement, artPlacement, extraTexts };

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
      const { colorHex, text: mainText, product, sil, imageSize, textPlacement: mainPlacement, artPlacement, extraTexts } = propsRef.current;
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
      const allTexts = [{ text: mainText, placement: mainPlacement }, ...(extraTexts ?? [])];
      for (const { text, placement: textPlacement } of allTexts) {
        if (!text) continue;
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

  // Igual que el canvas WebGL (ver ThermosMesh): el desliz vertical táctil es
  // de la página (touch-action: pan-y); el dedo solo gira, el mouse inclina.
  const pitchRef = useRef(true);
  const startDrag = (e: React.PointerEvent) => {
    isDragging.current = true;
    pitchRef.current = e.pointerType === "mouse";
    velRef.current = 0; velXRef.current = 0;
    lastX.current = e.clientX; lastY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPDown = (e: React.PointerEvent) => startDrag(e);
  const onPMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;
    velRef.current  = dx * 0.010;
    angleRef.current  += dx * 0.009;
    if (pitchRef.current) {
      velXRef.current = dy * 0.010;
      const np = angleXRef.current + dy * 0.009;
      angleXRef.current = Math.max(-1.1, Math.min(1.1, np));
    }
    lastX.current = e.clientX; lastY.current = e.clientY;
  };
  const onPUp = () => { isDragging.current = false; };

  return (
    <canvas ref={canvasRef} width={280} height={480}
      style={{ width:"100%", height:"100%", cursor:"grab", touchAction:"pan-y" }}
      onPointerDown={onPDown} onPointerMove={onPMove} onPointerUp={onPUp} onPointerLeave={onPUp} onPointerCancel={onPUp}
    />
  );
}

/**
 * Sombra de contacto horneada: re-dibujarla en vivo cuesta un render extra de
 * toda la escena (1024²) y cuatro pasadas de desenfoque POR CUADRO — ~⅓ del
 * trabajo de GPU mientras se gira la pieza. Se congela mientras la pieza se
 * mueve y se vuelve a hornear una vez cuando se detiene. Como el cuerpo es de
 * revolución, durante el giro casi no cambia.
 * (ContactShadows dibuja `frames` cuadros contados desde su último render: con
 * memo, solo re-renderiza al cambiar `moving` o el producto/talla.)
 */
const SettledShadows = React.memo(function SettledShadows({ setMovingRef, position, scale }: {
  setMovingRef: React.MutableRefObject<((moving: boolean) => void) | null>;
  position: [number, number, number];
  scale: number;
}) {
  const [moving, setMoving] = useState(false);
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => {
    setMovingRef.current = setMoving;
    return () => { setMovingRef.current = null; };
  }, [setMovingRef]);
  // Al detenerse hace falta un cuadro para hornear (frameloop="demand").
  useEffect(() => { if (!moving) invalidate(); }, [moving, invalidate]);
  return (
    <ContactShadows
      position={position}
      opacity={0.5}
      scale={scale}
      blur={2.6}
      resolution={LOW_END ? 256 : 1024}
      frames={moving ? 0 : 1}
      far={4}
      color="#000000"
    />
  );
}, (a, b) => a.setMovingRef === b.setMovingRef && a.scale === b.scale
  && a.position[0] === b.position[0] && a.position[1] === b.position[1] && a.position[2] === b.position[2]);

function ThreeCanvas({ product, sil, onContextLost, onContextRestored, ...props }: Thermos3DProps & {
  product: ProductDef; sil: Silhouette;
  onContextLost?: () => void; onContextRestored?: () => void;
}) {
  const { shadowY } = fitCamera(sil);
  const setShadowMovingRef = useRef<((moving: boolean) => void) | null>(null);
  const onMotionChange = useCallback((moving: boolean) => setShadowMovingRef.current?.(moving), []);
  return (
    <Canvas
      // Cap the pixel ratio so high-DPI phones don't render 3–4× the pixels of a
      // transmission/glass scene (keeps it smooth and eases GPU memory pressure).
      // Piso 1 (no 1.5): en gama baja el dpr nativo es la resolución justa.
      dpr={[1, LOW_END ? 1 : LOW_PERF ? 1.5 : 2]}
      // Solo se dibuja cuando algo cambia (giro, arrastre, diseño): quieto, el
      // visor no gasta batería ni CPU. ThermosMesh pide cuadros mientras anima.
      frameloop="demand"
      // Sin preserveDrawingBuffer (obliga a copiar el buffer en cada cuadro, caro
      // en GPUs de celular): la captura del resumen dibuja un cuadro con
      // renderNowRef y lo lee en la misma tarea, cuando el buffer sigue vigente.
      // Gama baja: sin antialiasing (multiplica el costo de cada cuadro en GPUs chicas).
      gl={{ antialias: !LOW_END, alpha: true, powerPreference: "high-performance" }}
      // preventDefault on context loss lets the browser fire `contextrestored`
      // and R3F rebuild the scene instead of leaving a black canvas. We surface a
      // placeholder while lost and force a re-render once the context is back.
      onCreated={({ gl, invalidate }) => {
        const canvas = gl.domElement;
        canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); onContextLost?.(); }, false);
        canvas.addEventListener("webglcontextrestored", () => { onContextRestored?.(); invalidate(); }, false);
      }}
      // none: todo gesto sobre el producto es del visor (girar en cualquier
      // dirección, inclinar para ver la base, mover el diseño). La página se
      // scrollea tocando fuera del visor.
      // pan-y: el desliz vertical scrollea la página; un dedo apoyado sobre el
      // diseño en edición lo cancela en el touchstart (ThermosMesh).
      style={{ background: "transparent", cursor: "grab", touchAction: "pan-y" }}
    >
      <Rig sil={sil} />
      {/* 0.5: con las luces direccionales de abajo, más reflejo lava los colores
          y el color del 3D tiene que coincidir con el real de Odoo. */}
      <StudioLighting intensity={0.5} />

      <Suspense fallback={null}>

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
          extraTexts={props.extraTexts}
          artPlacement={props.artPlacement ?? DEFAULT_ART_PLACEMENT}
          colorPrint={props.colorPrint ?? false}
          textColor={props.textColor}
          wrap={props.wrap ?? null}
          engraveStyle={props.engraveStyle ?? "steel"}
          singleFace={props.singleFace ?? false}
          editSingleFace={props.editSingleFace ?? props.singleFace ?? false}
          showGuides={props.showGuides ?? true}
          frontFaceU={props.frontFaceU ?? FRONT_FACE.uCenter}
          guideFace={props.guideFace ?? "front"}
          hideLogo={props.hideLogo}
          glass={props.glass ?? false}
          designActive={props.designActive ?? false}
          onDesignMove={props.onDesignMove}
          onDesignPinch={props.onDesignPinch}
          onPinchSelect={props.onPinchSelect}
          onDesignDragStart={props.onDesignDragStart}
          onDesignDragEnd={props.onDesignDragEnd}
          onTap={props.onTap}
          isOverDesign={props.isOverDesign}
          snapToURef={props.snapToURef}
          renderNowRef={props.renderNowRef}
          onReady={props.onReady}
          autoSpin={props.autoSpin ?? false}
          rotationLocked={props.rotationLocked ?? false}
          onMotionChange={onMotionChange}
          arModelRef={props.arModelRef}
          freePlacement={props.freePlacement ?? false}
          keepOutZones={props.keepOutZones}
          keepOutHit={props.keepOutHit}
          onModelKeepOut={props.onModelKeepOut}
          followU={props.followU ?? null}
          anchor={props.anchor ?? null}
          anchorElRef={props.anchorElRef}
          screenBoundsRef={props.screenBoundsRef}
        />

        {/* Single, stable ground shadow, anchored to the floor plane — no
            real-time shadow map, so no self-shadow acne. */}
        <SettledShadows
          setMovingRef={setShadowMovingRef}
          position={[0, shadowY, 0]}
          scale={Math.max(5, sil.maxR * 7)}
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
  const product = productForSize(getProduct(props.productId), props.sizeId);
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
      extraTexts={props.extraTexts}
    />
  );

  const [webgl] = useState(() => isWebGLAvailable());
  const [contextLost, setContextLost] = useState(false);
  if (!webgl) return fallback;

  return (
    <WebGLErrorBoundary
      key={product.model?.url ?? props.productId}
      fallback={fallback}
      // drei guarda la promesa rechazada del .glb en su caché: sin limpiarla,
      // el reintento falla al instante sin volver a pedir el archivo.
      onRetry={() => { if (product.model?.url) useGLTF.clear(product.model.url); }}
    >
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
