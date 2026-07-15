import React, { useRef, useEffect, useMemo, useState, Suspense, Component, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows, PerspectiveCamera, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { getObject, type ObjectDef } from "@/lib/objects";
import { DEFAULT_ART_PLACEMENT, DEFAULT_TEXT_PLACEMENT, type Placement } from "@/lib/placement";
import { buildEngraveMask } from "@/lib/image-processing";
import { makeFaceMaps } from "@/lib/engraving-face";

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

interface Object3DProps {
  objectId: string;
  /** Overrides the blank's base colour on colourable products. */
  colorHex?: string;
  text: string;
  fontStyle?: React.CSSProperties;
  customImageUrl: string | null;
  imageSize: "none" | "small" | "large";
  textPlacement?: Placement;
  artPlacement?: Placement;
}

const FOV = 30;
const HALF_FOV_TAN = Math.tan((FOV / 2) * (Math.PI / 180));

function frame(obj: ObjectDef) {
  const [hx, hy, hz] = obj.size;
  const maxFull = 2 * Math.max(hx, hy, hz);
  const camZ = maxFull * 2.35 * (obj.fit ?? 1);
  return { camZ, camY: maxFull * 0.12 };
}

/** The shop-shaped blank, built from primitives per product id. */
function Blank({ obj, baseColor }: { obj: ObjectDef; baseColor: string }) {
  const [hx, hy, hz] = obj.size;
  const body = { color: baseColor, roughness: obj.roughness, metalness: obj.metalness, clearcoat: obj.clearcoat };

  switch (obj.id) {
    case "conservadora":
      return (
        <group>
          {/* Base tub */}
          <RoundedBox args={[hx * 2, hy * 1.5, hz * 2]} radius={0.1} smoothness={4} position={[0, -hy * 0.28, 0]} castShadow receiveShadow>
            <meshPhysicalMaterial {...body} />
          </RoundedBox>
          {/* Lid, slightly overhanging */}
          <RoundedBox args={[hx * 2.06, hy * 0.6, hz * 2.06]} radius={0.08} smoothness={4} position={[0, hy * 0.62, 0]} castShadow>
            <meshPhysicalMaterial {...body} />
          </RoundedBox>
          {/* Rubber T-latches on the front */}
          {[-hx * 0.72, hx * 0.72].map((x, i) => (
            <RoundedBox key={i} args={[0.16, 0.34, 0.1]} radius={0.03} smoothness={2} position={[x, hy * 0.2, hz + 0.02]} castShadow>
              <meshPhysicalMaterial color={obj.accentColor} roughness={0.6} metalness={0.1} />
            </RoundedBox>
          ))}
        </group>
      );

    case "billetera":
      return (
        <group>
          {/* Main body — slim landscape rounded rectangle */}
          <RoundedBox args={[hx * 2, hy * 2, hz * 2]} radius={0.07} smoothness={5} castShadow receiveShadow>
            <meshPhysicalMaterial {...body} />
          </RoundedBox>
          {/* Spine fold — rounded leather edge on the left (hinge/fold side) */}
          <RoundedBox args={[hx * 0.12, hy * 1.86, hz * 2.18]} radius={0.05} smoothness={3} position={[-hx, 0, 0]} castShadow>
            <meshPhysicalMaterial color={obj.accentColor} roughness={0.85} metalness={0} clearcoat={0.05} />
          </RoundedBox>
          {/* Card-pocket strip — thinner edge on the right (open side where cards are inserted) */}
          <RoundedBox args={[hx * 0.08, hy * 1.60, hz * 2.12]} radius={0.03} smoothness={3} position={[hx, 0, 0]} castShadow>
            <meshPhysicalMaterial color={obj.accentColor} roughness={0.85} metalness={0} clearcoat={0.05} />
          </RoundedBox>
        </group>
      );

    case "tabla":
      return (
        <group>
          <RoundedBox args={[hx * 2, hy * 2, hz * 2]} radius={0.06} smoothness={4} castShadow receiveShadow>
            <meshPhysicalMaterial {...body} />
          </RoundedBox>
          {/* Routed inset border on the top face */}
          <mesh position={[0, hy + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[hx * 1.72, hz * 1.72]} />
            <meshPhysicalMaterial color={obj.accentColor} roughness={0.8} metalness={0} transparent opacity={0.5} />
          </mesh>
        </group>
      );

    case "cajita":
      return (
        <group>
          {/* Base */}
          <RoundedBox args={[hx * 2, hy * 1.24, hz * 2]} radius={0.05} smoothness={4} position={[0, -hy * 0.38, 0]} castShadow receiveShadow>
            <meshPhysicalMaterial {...body} />
          </RoundedBox>
          {/* Lid */}
          <RoundedBox args={[hx * 2.02, hy * 0.72, hz * 2.02]} radius={0.05} smoothness={4} position={[0, hy * 0.6, 0]} castShadow>
            <meshPhysicalMaterial {...body} />
          </RoundedBox>
          {/* Gold clasp on the front seam */}
          <RoundedBox args={[0.22, 0.24, 0.05]} radius={0.02} smoothness={2} position={[0, hy * 0.1, hz + 0.02]} castShadow>
            <meshPhysicalMaterial color={obj.accentColor} roughness={0.25} metalness={0.9} clearcoat={0.6} />
          </RoundedBox>
        </group>
      );

    case "acrilico":
      return (
        <group>
          {/* Thick clear disc — circular faces to camera */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[hx, hx, hz * 2, 72]} />
            <meshPhysicalMaterial
              color={baseColor}
              transmission={0.92}
              thickness={hz * 2}
              roughness={0.04}
              metalness={0}
              ior={1.49}
              clearcoat={1}
              transparent
              opacity={0.62}
              envMapIntensity={2}
            />
          </mesh>
          {/* Small display stand */}
          {[-hx * 0.42, hx * 0.42].map((x, i) => (
            <mesh key={i} position={[x, -hx - 0.12, -0.02]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.05, 0.4, 0.05]} />
              <meshPhysicalMaterial color={obj.accentColor} roughness={0.4} metalness={0.3} />
            </mesh>
          ))}
        </group>
      );

    case "boligrafo":
      return (
        <group rotation={[0, 0, Math.PI / 2]}>
          {/* Barrel */}
          <mesh castShadow>
            <cylinderGeometry args={[hx * 0.065, hx * 0.062, hx * 2, 40]} />
            <meshPhysicalMaterial {...body} />
          </mesh>
          {/* Cone nib (silver) */}
          <mesh position={[0, -hx * 1.06, 0]} castShadow>
            <coneGeometry args={[hx * 0.062, hx * 0.16, 32]} />
            <meshPhysicalMaterial color={obj.accentColor} roughness={0.22} metalness={0.95} clearcoat={0.5} />
          </mesh>
          {/* Top cap (silver) */}
          <mesh position={[0, hx * 1.02, 0]} castShadow>
            <cylinderGeometry args={[hx * 0.07, hx * 0.07, hx * 0.12, 32]} />
            <meshPhysicalMaterial color={obj.accentColor} roughness={0.22} metalness={0.95} clearcoat={0.5} />
          </mesh>
          {/* Clip (silver) */}
          <RoundedBox args={[0.03, hx * 0.5, 0.05]} radius={0.012} smoothness={2} position={[0, hx * 0.7, hx * 0.075]} castShadow>
            <meshPhysicalMaterial color={obj.accentColor} roughness={0.22} metalness={0.95} clearcoat={0.5} />
          </RoundedBox>
        </group>
      );

    case "abridor":
      return (
        <group>
          {/* Main plate — landscape 1.54:1 rounded rectangle */}
          <RoundedBox args={[hx * 2, hy * 2, hz * 2]} radius={0.09} smoothness={5} castShadow receiveShadow>
            <meshPhysicalMaterial {...body} />
          </RoundedBox>
          {/* Opener cutout: left ~42% of plate, full height (overflow ensures clean edge through rounded corners) */}
          <RoundedBox args={[hx * 0.84, hy * 1.40, hz * 2.6]} radius={0.07} smoothness={3} position={[-hx * 0.58, 0, 0]}>
            <meshPhysicalMaterial color="#1e2328" roughness={0.6} metalness={0.2} />
          </RoundedBox>
          {/* Bottle-cap hook notch: protrudes into the cutout from the right wall, lower portion */}
          <mesh position={[-hx * 0.22, -hy * 0.20, hz + 0.004]}>
            <boxGeometry args={[hx * 0.26, hy * 0.46, 0.04]} />
            <meshPhysicalMaterial color="#1e2328" roughness={0.6} metalness={0.2} />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}

function ObjectMesh({
  obj, baseColor, text, fontFamily, customImageUrl, imageSize, textPlacement, artPlacement,
}: {
  obj: ObjectDef; baseColor: string; text: string; fontFamily?: string;
  customImageUrl: string | null; imageSize: "none" | "small" | "large";
  textPlacement: Placement; artPlacement: Placement;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const velYaw = useRef(0);
  const velPitch = useRef(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const { gl } = useThree();

  // Seat the blank at its resting tilt so a top-engraved face reads to camera.
  useEffect(() => {
    if (groupRef.current) groupRef.current.rotation.x = obj.restPitch;
  }, [obj.restPitch]);

  const [fontReady, setFontReady] = useState(0);
  useEffect(() => {
    if (!fontFamily) return;
    const primary = fontFamily.split(",")[0]?.trim().replace(/['"]/g, "");
    if (!primary) return;
    document.fonts.load(`400 32px "${primary}"`).then(() => setFontReady(n => n + 1));
  }, [fontFamily]);

  const [customImageEl, setCustomImageEl] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!customImageUrl) { setCustomImageEl(null); return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setCustomImageEl(img); };
    img.onerror = () => { if (!cancelled) setCustomImageEl(null); };
    img.src = customImageUrl;
    return () => { cancelled = true; };
  }, [customImageUrl]);

  const artMask = useMemo(() => (customImageEl ? buildEngraveMask(customImageEl) : null), [customImageEl]);
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  const maps = useMemo(
    () => makeFaceMaps({
      engrave: obj.engrave, faceW: obj.face.w, faceH: obj.face.h,
      text, textPlacement, fontFamily, artMask, imageSize, artPlacement,
      anisotropy: maxAnisotropy,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obj, text, textPlacement, fontFamily, fontReady, artMask, imageSize, artPlacement, maxAnisotropy]
  );
  useEffect(() => () => maps.dispose(), [maps]);

  // Drag to rotate (both axes), with inertia and a rest tilt to settle back to.
  useEffect(() => {
    const canvas = gl.domElement;
    const onDown = (e: PointerEvent) => {
      isDragging.current = true;
      velYaw.current = 0; velPitch.current = 0;
      lastX.current = e.clientX; lastY.current = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;
      velYaw.current = dx * 0.5;
      velPitch.current = dy * 0.5;
      lastX.current = e.clientX; lastY.current = e.clientY;
      if (groupRef.current) {
        groupRef.current.rotation.y += dx * 0.008;
        const np = groupRef.current.rotation.x + dy * 0.008;
        groupRef.current.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, np));
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
    if (!groupRef.current || isDragging.current) return;
    if (Math.abs(velYaw.current) > 0.001) {
      groupRef.current.rotation.y += velYaw.current * delta;
      velYaw.current *= 0.9;
    } else {
      velYaw.current = 0;
      groupRef.current.rotation.y += delta * 0.35;
    }
    if (Math.abs(velPitch.current) > 0.001) {
      const np = groupRef.current.rotation.x + velPitch.current * delta;
      groupRef.current.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, np));
      velPitch.current *= 0.9;
    } else {
      velPitch.current = 0;
      // Ease back toward the resting tilt.
      groupRef.current.rotation.x += (obj.restPitch - groupRef.current.rotation.x) * 0.05;
    }
  });

  const c = obj.face.center;
  const faceRot: [number, number, number] = obj.face.normal === "y" ? [-Math.PI / 2, 0, 0] : [0, 0, 0];

  return (
    <group ref={groupRef}>
      <Blank obj={obj} baseColor={baseColor} />

      {/* Engraving overlay — a hair in front of the face */}
      <mesh position={[c[0], c[1], c[2]]} rotation={faceRot}>
        <planeGeometry args={[obj.face.w, obj.face.h]} />
        <meshPhysicalMaterial
          map={maps.map}
          transparent
          alphaTest={0.03}
          side={THREE.DoubleSide}
          bumpMap={maps.bumpMap}
          bumpScale={maps.bumpScale}
          roughness={maps.roughness}
          metalness={maps.metalness}
          clearcoat={obj.engrave === "acrylic" ? 0.4 : 0}
          polygonOffset
          polygonOffsetFactor={-4}
          depthWrite={false}
          envMapIntensity={1.4}
        />
      </mesh>
    </group>
  );
}

function Rig({ obj }: { obj: ObjectDef }) {
  const { camZ, camY } = frame(obj);
  return <PerspectiveCamera makeDefault fov={FOV} position={[0, camY, camZ]} />;
}

function isWebGLAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

/** Lightweight DOM fallback when WebGL is unavailable. */
function ObjectFallback({ obj, text }: { obj: ObjectDef; text: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <div
        className="rounded-2xl shadow-inner flex items-center justify-center text-center p-6"
        style={{
          width: "72%",
          aspectRatio: `${obj.face.w} / ${obj.face.h}`,
          background: obj.baseColor,
          color: obj.engrave === "acrylic" || obj.engrave === "steel" ? "#ffffff" : "#1a0f08",
        }}
      >
        <span className="font-bold text-lg break-words">{text || obj.singular}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-4">Vista previa referencial</p>
    </div>
  );
}

function ThreeCanvas({ obj, ...props }: Object3DProps & { obj: ObjectDef }) {
  const { camY } = frame(obj);
  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent", cursor: "grab" }}
    >
      <Rig obj={obj} />
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.9} />
        <ObjectMesh
          obj={obj}
          baseColor={obj.colorable && props.colorHex ? props.colorHex : obj.baseColor}
          text={props.text}
          fontFamily={props.fontStyle?.fontFamily as string | undefined}
          customImageUrl={props.customImageUrl}
          imageSize={props.imageSize}
          textPlacement={props.textPlacement ?? DEFAULT_TEXT_PLACEMENT}
          artPlacement={props.artPlacement ?? DEFAULT_ART_PLACEMENT}
        />
        <ContactShadows
          position={[0, -obj.size[1] - 0.3, 0]}
          opacity={0.5}
          scale={Math.max(5, obj.size[0] * 7)}
          blur={2.4}
          resolution={512}
          far={4}
          color="#000000"
        />
      </Suspense>
      <directionalLight position={[4, 6, 4]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#aaccff" />
      <directionalLight position={[-3, 4, -6]} intensity={1.1} color="#ffffff" />
      <ambientLight intensity={0.3} />
    </Canvas>
  );
}

export default function Object3D(props: Object3DProps) {
  const obj = getObject(props.objectId);
  const [webgl] = useState(() => isWebGLAvailable());
  const fallback = <ObjectFallback obj={obj} text={props.text} />;
  if (!webgl) return fallback;
  return (
    <WebGLErrorBoundary fallback={fallback}>
      <ThreeCanvas {...props} obj={obj} />
    </WebGLErrorBoundary>
  );
}
