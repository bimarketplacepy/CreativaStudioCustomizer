import { useRef, useEffect, useCallback } from "react";

interface Thermos3DProps {
  colorHex: string;
  finish: string;
  text: string;
  fontClass: string;
  iconName: string | null;
  size: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgbStr(r: number, g: number, b: number, a = 1) {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

function darkenRgb([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  return [r * (1 - amount), g * (1 - amount), b * (1 - amount)];
}

function lightenRgb([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  return [r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount];
}

const ICON_CHARS: Record<string, string> = {
  flames: "🔥",
  star: "⭐",
  lightning: "⚡",
  heart: "❤️",
  mountain: "⛰️",
  waves: "〰",
  leaf: "🍃",
};

export default function Thermos3D({ colorHex, finish, text, iconName, size }: Thermos3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const rafRef = useRef<number>(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);

  const propsRef = useRef({ colorHex, finish, text, iconName, size });
  propsRef.current = { colorHex, finish, text, iconName, size };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { colorHex, finish, text, iconName, size } = propsRef.current;
    const W = canvas.width;
    const H = canvas.height;

    const bodyH = size === "sm" ? 200 : size === "md" ? 255 : size === "lg" ? 310 : 355;
    const bodyW = size === "xl" ? 115 : size === "lg" ? 105 : size === "sm" ? 88 : 96;
    const cx = W / 2;
    const cy = H / 2 + 20;

    ctx.clearRect(0, 0, W, H);

    const angle = angleRef.current;
    const rgb = hexToRgb(colorHex);

    // Lighting based on finish
    const shininess = finish === "glossy" ? 0.65 : finish === "metallic" ? 0.55 : finish === "gradient" ? 0.5 : 0.35;

    // Highlight sweeps around cylinder: position 0–1 across the width
    const hlPos = 0.5 + 0.43 * Math.sin(angle);

    // Build cylindrical gradient (left to right)
    const left = cx - bodyW / 2;
    const right = cx + bodyW / 2;
    const top = cy - bodyH / 2;
    const bottom = cy + bodyH / 2;

    const bodyGrad = ctx.createLinearGradient(left, 0, right, 0);
    bodyGrad.addColorStop(0, rgbStr(...darkenRgb(rgb, 0.55)));
    bodyGrad.addColorStop(Math.max(0, hlPos - 0.25), rgbStr(...darkenRgb(rgb, 0.18)));
    bodyGrad.addColorStop(hlPos, rgbStr(...lightenRgb(rgb, shininess)));
    bodyGrad.addColorStop(Math.min(1, hlPos + 0.22), rgbStr(...darkenRgb(rgb, 0.15)));
    bodyGrad.addColorStop(1, rgbStr(...darkenRgb(rgb, 0.58)));

    // --- Draw body ---
    const radius = 18;
    ctx.beginPath();
    ctx.moveTo(left + radius, top);
    ctx.lineTo(right - radius, top);
    ctx.quadraticCurveTo(right, top, right, top + radius);
    ctx.lineTo(right, bottom - radius);
    ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
    ctx.lineTo(left + radius, bottom);
    ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
    ctx.lineTo(left, top + radius);
    ctx.quadraticCurveTo(left, top, left + radius, top);
    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // --- Gradient finish overlay ---
    if (finish === "gradient") {
      const fGrad = ctx.createLinearGradient(left, top, right, bottom);
      fGrad.addColorStop(0, "rgba(120,0,220,0.18)");
      fGrad.addColorStop(0.5, "rgba(0,160,255,0.10)");
      fGrad.addColorStop(1, "rgba(255,80,0,0.14)");
      ctx.beginPath();
      ctx.moveTo(left + radius, top);
      ctx.lineTo(right - radius, top);
      ctx.quadraticCurveTo(right, top, right, top + radius);
      ctx.lineTo(right, bottom - radius);
      ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
      ctx.lineTo(left + radius, bottom);
      ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
      ctx.lineTo(left, top + radius);
      ctx.quadraticCurveTo(left, top, left + radius, top);
      ctx.closePath();
      ctx.fillStyle = fGrad;
      ctx.fill();
    }

    // --- Glossy shine streak ---
    if (finish === "glossy" || finish === "metallic") {
      const shine = ctx.createLinearGradient(left, top, left, bottom);
      shine.addColorStop(0, "rgba(255,255,255,0.25)");
      shine.addColorStop(0.4, "rgba(255,255,255,0.05)");
      shine.addColorStop(1, "rgba(255,255,255,0)");
      const shineX = left + (hlPos - 0.08) * bodyW;
      const shineW = bodyW * 0.14;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left + radius, top);
      ctx.lineTo(right - radius, top);
      ctx.quadraticCurveTo(right, top, right, top + radius);
      ctx.lineTo(right, bottom - radius);
      ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
      ctx.lineTo(left + radius, bottom);
      ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
      ctx.lineTo(left, top + radius);
      ctx.quadraticCurveTo(left, top, left + radius, top);
      ctx.clip();
      ctx.fillStyle = shine;
      ctx.fillRect(shineX, top, shineW, bodyH);
      ctx.restore();
    }

    // --- Top ellipse (shows cylinder depth) ---
    const ellipseRY = Math.max(4, (bodyW / 2) * 0.35 * Math.abs(Math.cos(angle)));
    ctx.beginPath();
    ctx.ellipse(cx, top, bodyW / 2, ellipseRY, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgbStr(...darkenRgb(rgb, 0.3));
    ctx.fill();
    ctx.strokeStyle = rgbStr(...darkenRgb(rgb, 0.45));
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- Bottom disc ---
    ctx.beginPath();
    ctx.ellipse(cx, bottom, bodyW / 2, Math.max(3, ellipseRY), 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();

    // --- Cap collar ---
    const capH = 42;
    const capW = bodyW * 0.78;
    const capTop = top - capH;
    const capGrad = ctx.createLinearGradient(cx - capW / 2, 0, cx + capW / 2, 0);
    capGrad.addColorStop(0, "#1a1a1a");
    capGrad.addColorStop(0.5 + 0.4 * Math.sin(angle), "#555");
    capGrad.addColorStop(1, "#111");
    ctx.beginPath();
    ctx.moveTo(cx - capW / 2, top);
    ctx.lineTo(cx + capW / 2, top);
    ctx.lineTo(cx + capW / 2 - 4, capTop + 8);
    ctx.quadraticCurveTo(cx + capW / 2, capTop, cx + capW / 2 - 10, capTop);
    ctx.lineTo(cx - capW / 2 + 10, capTop);
    ctx.quadraticCurveTo(cx - capW / 2, capTop, cx - capW / 2 + 4, capTop + 8);
    ctx.closePath();
    ctx.fillStyle = capGrad;
    ctx.fill();

    // Cap ridge lines
    for (let i = 0; i < 5; i++) {
      const ridgeY = capTop + 8 + i * 6;
      ctx.beginPath();
      ctx.moveTo(cx - capW / 2 + 2, ridgeY);
      ctx.lineTo(cx + capW / 2 - 2, ridgeY);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Cap top ellipse
    ctx.beginPath();
    ctx.ellipse(cx, capTop, capW / 2, Math.max(2, ellipseRY * 0.7), 0, 0, Math.PI * 2);
    ctx.fillStyle = "#333";
    ctx.fill();

    // --- Icon on body ---
    const iconChar = iconName ? ICON_CHARS[iconName] : null;
    const iconFacing = Math.cos(angle);
    if (iconChar && iconFacing > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, iconFacing * 1.3);
      ctx.font = `${Math.floor(bodyW * 0.55)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(iconChar, cx, cy - bodyH * 0.1);
      ctx.restore();
    }

    // --- Text on body (vertical, scrolls around) ---
    if (text) {
      const textFacing = Math.cos(angle - Math.PI * 0.5);
      if (textFacing > -0.2) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(left, top, bodyW, bodyH);
        ctx.clip();
        ctx.translate(cx, cy + (iconChar ? bodyH * 0.2 : 0));
        ctx.rotate(-Math.PI / 2);
        const fontSize = Math.max(14, Math.floor(bodyW * 0.28));
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = Math.max(0, Math.min(1, textFacing + 0.3));
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 4;
        ctx.fillText(text.toUpperCase(), 0, 0);
        ctx.restore();
      }
    }

    // Brand label near bottom
    const brandFacing = Math.cos(angle - Math.PI);
    if (brandFacing > 0.3) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.45, brandFacing * 0.45);
      ctx.font = `${Math.floor(bodyW * 0.13)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText("MARKETPLACE", cx, bottom - 20);
      ctx.restore();
    }

    // --- Floor shadow ---
    const shadowGrad = ctx.createRadialGradient(cx, bottom + 18, 4, cx, bottom + 18, bodyW * 0.9);
    shadowGrad.addColorStop(0, "rgba(0,0,0,0.22)");
    shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.ellipse(cx, bottom + 18, bodyW * 0.75, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = shadowGrad;
    ctx.fill();

    // Advance rotation
    if (!isDragging.current) {
      angleRef.current += 0.012;
    }
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Drag to rotate
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastX.current = e.clientX;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastX.current;
    angleRef.current += dx * 0.012;
    lastX.current = e.clientX;
  };
  const onMouseUp = () => { isDragging.current = false; };
  const onTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    lastX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - lastX.current;
    angleRef.current += dx * 0.012;
    lastX.current = e.touches[0].clientX;
  };
  const onTouchEnd = () => { isDragging.current = false; };

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={480}
      style={{ width: "100%", height: "100%", cursor: "grab", touchAction: "none" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    />
  );
}
