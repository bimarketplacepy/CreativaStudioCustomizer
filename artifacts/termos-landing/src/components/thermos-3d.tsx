import { useRef, useEffect, useMemo, useState, Suspense, Component, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

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
  iconName: string | null;
  size: string;
}

const ICON_CHARS: Record<string, string> = {
  flames: "🔥", star: "★", lightning: "⚡", heart: "♥",
  mountain: "▲", waves: "≈", leaf: "✿",
};

function buildThermosPoints(size: string): THREE.Vector2[] {
  const scale = size === "sm" ? 0.78 : size === "md" ? 1.0 : size === "lg" ? 1.22 : 1.4;
  const s = (x: number, y: number) => new THREE.Vector2(x * scale, y * scale);
  return [
    s(0.01, -1.80),
    s(0.52, -1.80),
    s(0.58, -1.72),
    s(0.60, -1.50),
    s(0.60,  0.80),
    s(0.58,  1.20),
    s(0.50,  1.52),
    s(0.38,  1.65),
    s(0.32,  1.80),
    s(0.30,  2.05),
    s(0.22,  2.12),
    s(0.18,  2.20),
    s(0.16,  2.22),
  ];
}

function makeBodyTexture(
  colorHex: string,
  text: string,
  iconName: string | null
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

  // Label band (slightly lighter bg)
  const labelTop = H * 0.28, labelBot = H * 0.72;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, labelTop, W, labelBot - labelTop);

  // Icon
  if (iconName && ICON_CHARS[iconName]) {
    ctx.save();
    ctx.font = `${Math.round(W * 0.22)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.80;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(ICON_CHARS[iconName], W / 2, H * 0.36);
    ctx.restore();
  }

  // Custom text — horizontal across the label
  if (text) {
    ctx.save();
    const fontSize = Math.round(W * 0.115);
    ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 18;
    const textY = iconName ? H * 0.58 : H * 0.50;
    ctx.fillText(text.toUpperCase(), W / 2, textY);
    ctx.restore();
  }

  // Brand text
  ctx.save();
  ctx.font = `500 ${Math.round(W * 0.040)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.30)";
  ctx.letterSpacing = "0.15em";
  ctx.fillText("MARKETPLACE", W / 2, H * 0.82);
  ctx.restore();

  return new THREE.CanvasTexture(canvas);
}

function ThermosMesh({
  colorHex, finish, text, iconName, size,
}: {
  colorHex: string; finish: string; text: string;
  iconName: string | null; size: string;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const velYaw = useRef(0);   // Y-axis (horizontal drag) velocity
  const velPitch = useRef(0); // X-axis (vertical drag) velocity
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const { gl } = useThree();

  // Build points and geometry
  const points = useMemo(() => buildThermosPoints(size), [size]);

  const bodyGeo = useMemo(() => {
    const geo = new THREE.LatheGeometry(points, 128);
    geo.computeVertexNormals();
    return geo;
  }, [points]);

  const capGeo = useMemo(() => {
    const capScale = size === "sm" ? 0.78 : size === "md" ? 1.0 : size === "lg" ? 1.22 : 1.4;
    const geo = new THREE.CylinderGeometry(0.20 * capScale, 0.32 * capScale, 0.20 * capScale, 64);
    return geo;
  }, [size]);

  const texture = useMemo(
    () => makeBodyTexture(colorHex, text, iconName),
    [colorHex, text, iconName]
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

  const scale = size === "sm" ? 0.78 : size === "md" ? 1.0 : size === "lg" ? 1.22 : 1.4;

  return (
    <group ref={groupRef}>
      {/* Main thermos body */}
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

      {/* Cap top button */}
      <mesh geometry={capGeo} position={[0, 2.22 * scale + 0.10 * scale, 0]} castShadow>
        <meshPhysicalMaterial
          color="#222222"
          roughness={0.30}
          metalness={0.80}
          clearcoat={0.6}
          clearcoatRoughness={0.1}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Bottom ring */}
      <mesh position={[0, -1.80 * scale - 0.02, 0]}>
        <torusGeometry args={[0.54 * scale, 0.04 * scale, 8, 128]} />
        <meshPhysicalMaterial color="#1a1a1a" roughness={0.4} metalness={0.8} />
      </mesh>
    </group>
  );
}

function Rig({ size }: { size: string }) {
  const fov  = size === "sm" ? 34 : size === "md" ? 36 : size === "lg" ? 38 : 42;
  const camZ = size === "sm" ? 5.0 : size === "md" ? 6.2 : size === "lg" ? 8.0 : 9.8;
  const camY = size === "sm" ? 0.2 : size === "md" ? 0.3 : size === "lg" ? 0.4 : 0.5;
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
function FallbackCanvas({ colorHex, text, iconName, size }: Omit<Thermos3DProps, "finish" | "fontClass">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const angleXRef = useRef(0); // pitch (up/down tilt)
  const rafRef = useRef<number>(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const velRef = useRef(0);
  const velXRef = useRef(0);
  const propsRef = useRef({ colorHex, text, iconName, size });
  propsRef.current = { colorHex, text, iconName, size };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;

    function hexToRgb(hex: string): [number, number, number] {
      return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    }
    function mix(a: number, b: number, t: number) { return a + (b - a) * t; }

    const draw = () => {
      const { colorHex, text, iconName, size } = propsRef.current;
      ctx.clearRect(0, 0, W, H);
      const bH = size === "sm" ? 190 : size === "md" ? 240 : size === "lg" ? 290 : 330;
      const bW = size === "xl" ? 108 : size === "lg" ? 98 : size === "sm" ? 82 : 92;
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

      const rnd = 14;
      ctx.beginPath();
      ctx.moveTo(left+rnd, top); ctx.lineTo(right-rnd, top);
      ctx.quadraticCurveTo(right,top,right,top+rnd);
      ctx.lineTo(right, bottom-rnd);
      ctx.quadraticCurveTo(right,bottom,right-rnd,bottom);
      ctx.lineTo(left+rnd, bottom);
      ctx.quadraticCurveTo(left,bottom,left,bottom-rnd);
      ctx.lineTo(left, top+rnd);
      ctx.quadraticCurveTo(left,top,left+rnd,top);
      ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      // Ellipses: depth changes with yaw; size changes with pitch (top bigger when tilted back)
      const eRY = Math.max(3, (bW/2)*0.30*Math.abs(Math.cos(a)));
      const topEllipseExtra   = Math.max(0,  ax) * 10; // tilted back → bigger top
      const botEllipseExtra   = Math.max(0, -ax) * 10; // tilted fwd  → bigger bottom

      ctx.beginPath(); ctx.ellipse(cx, top, bW/2, eRY + topEllipseExtra, 0, 0, Math.PI*2);
      ctx.fillStyle = `rgb(${mix(r,0,0.32)},${mix(g,0,0.32)},${mix(b,0,0.32)})`; ctx.fill();

      ctx.beginPath(); ctx.ellipse(cx, bottom, bW/2, eRY + botEllipseExtra, 0, 0, Math.PI*2);
      ctx.fillStyle = "#1a1a1a"; ctx.fill();

      // Cap
      const cW = bW*0.76;
      const capH = 36 * foreshorten;
      const capTop = top - capH;
      const cGrad = ctx.createLinearGradient(cx-cW/2,0,cx+cW/2,0);
      cGrad.addColorStop(0,"#111"); cGrad.addColorStop(0.5+0.4*Math.sin(a),"#555"); cGrad.addColorStop(1,"#111");
      ctx.beginPath();
      ctx.moveTo(cx-cW/2, top); ctx.lineTo(cx+cW/2, top);
      ctx.lineTo(cx+cW/2-3, capTop+5); ctx.quadraticCurveTo(cx+cW/2, capTop, cx+cW/2-8, capTop);
      ctx.lineTo(cx-cW/2+8, capTop); ctx.quadraticCurveTo(cx-cW/2, capTop, cx-cW/2+3, capTop+5);
      ctx.closePath(); ctx.fillStyle = cGrad; ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, capTop, cW/2, Math.max(2, eRY*0.7 + topEllipseExtra*0.5), 0, 0, Math.PI*2);
      ctx.fillStyle="#333"; ctx.fill();

      // Icon
      const iChar = iconName ? ICON_CHARS[iconName] : null;
      if (iChar && Math.cos(a) > 0) {
        ctx.save(); ctx.font = `${Math.floor(bW*0.50)}px serif`;
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.globalAlpha = Math.min(1, Math.cos(a)*1.2);
        ctx.fillText(iChar, cx, cy - visH*0.10); ctx.restore();
      }
      // Text
      if (text) {
        const facing = Math.cos(a - Math.PI*0.5);
        if (facing > -0.15) {
          ctx.save();
          ctx.beginPath(); ctx.rect(left, top, bW, visH); ctx.clip();
          ctx.translate(cx, cy + (iChar ? visH*0.18 : 0));
          ctx.rotate(-Math.PI/2);
          ctx.font = `900 ${Math.max(12, Math.floor(bW*0.25))}px Inter, sans-serif`;
          ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.globalAlpha = Math.max(0, Math.min(1, facing+0.25));
          ctx.fillStyle="rgba(255,255,255,0.93)";
          ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=4;
          ctx.fillText(text.toUpperCase(), 0, 0); ctx.restore();
        }
      }
      // Shadow
      const sGrad = ctx.createRadialGradient(cx, bottom+12, 4, cx, bottom+12, bW*0.85);
      sGrad.addColorStop(0,"rgba(0,0,0,0.18)"); sGrad.addColorStop(1,"rgba(0,0,0,0)");
      ctx.beginPath(); ctx.ellipse(cx, bottom+12, bW*0.70, 10, 0, 0, Math.PI*2);
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

function ThreeCanvas(props: Thermos3DProps) {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent", cursor: "grab" }}
    >
      <Rig size={props.size} />

      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.9} />

        <ThermosMesh
          colorHex={props.colorHex}
          finish={props.finish}
          text={props.text}
          iconName={props.iconName}
          size={props.size}
        />

        <ContactShadows
          position={[0, -1.85, 0]}
          opacity={0.45}
          scale={5}
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
  const fallback = (
    <FallbackCanvas
      colorHex={props.colorHex}
      text={props.text}
      iconName={props.iconName}
      size={props.size}
    />
  );

  const [webgl] = useState(() => isWebGLAvailable());
  if (!webgl) return fallback;

  return (
    <WebGLErrorBoundary fallback={fallback}>
      <ThreeCanvas {...props} />
    </WebGLErrorBoundary>
  );
}
