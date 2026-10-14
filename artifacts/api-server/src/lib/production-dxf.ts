// Archivo de producción para la LÁSER CO2 (Willpex, con eje rotativo para
// termos): DXF (AutoCAD). Es el formato con el que el taller ya trabaja —
// diseño en CorelDRAW → exportar DXF → programa de la láser — así que el
// pedido llega listo para abrir.
//
// Se arma a partir del SVG de producción (production-svg.ts), que ya tiene el
// texto convertido a curvas y los íconos como vectores, todo en mm:
//  - cada forma pasa a POLILÍNEAS cerradas (las curvas y arcos se aproximan
//    con tramos de ≤ 0,1 mm), que la láser rellena al grabar en modo "scan";
//  - DXF R12 (AC1009): la versión que abren CorelDRAW, RDWorks y LightBurn;
//  - unidades en mm, con el eje Y hacia arriba (el SVG lo tiene hacia abajo);
//  - capas: GRABADO (lo que se graba) e INFO (borde del área, datos del
//    pedido y avisos: apagarla o borrarla antes de grabar);
//  - un logo/foto subido (raster) no entra en un DXF: queda su recuadro en la
//    capa LOGO-VECTORIZAR y el aviso; el logo está en el SVG de referencia.

type Pt = [number, number];
/** Matriz afín [a b c d e f]: x' = a·x + c·y + e, y' = b·x + d·y + f. */
type M = [number, number, number, number, number, number];

const IDENT: M = [1, 0, 0, 1, 0, 0];
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: M, [x, y]: Pt): Pt => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/** Escala media de la matriz (para el ancho de trazo y la tolerancia). */
const scaleOf = (m: M) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;

function parseTransform(t: string | undefined): M {
  let m = IDENT;
  if (!t) return m;
  for (const [, fn, args] of t.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const a = (args ?? "").split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === "translate") m = mul(m, [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0]);
    else if (fn === "scale") m = mul(m, [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0]);
    else if (fn === "rotate") {
      const r = ((a[0] ?? 0) * Math.PI) / 180;
      const cx = a[1] ?? 0, cy = a[2] ?? 0;
      m = mul(m, [1, 0, 0, 1, cx, cy]);
      m = mul(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]);
      m = mul(m, [1, 0, 0, 1, -cx, -cy]);
    } else if (fn === "matrix" && a.length === 6) m = mul(m, a as M);
  }
  return m;
}

// ── Trazados SVG → polilíneas ────────────────────────────────────────────────

interface Poly { pts: Pt[]; closed: boolean }

/** Cantidad de tramos para una curva de largo aproximado `len` (en mm). */
const segsFor = (len: number, tol: number) => Math.max(2, Math.min(200, Math.ceil(len / tol)));

/** Arco SVG (endpoint) → puntos, sin el inicial. */
function arcPoints(p0: Pt, rx: number, ry: number, rotDeg: number, large: boolean, sweep: boolean, p1: Pt, tol: number): Pt[] {
  if (rx === 0 || ry === 0 || (p0[0] === p1[0] && p0[1] === p1[1])) return [p1];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (rotDeg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (p0[0] - p1[0]) / 2, dy = (p0[1] - p1[1]) / 2;
  const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  let k = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) k = -k;
  const cxp = (k * rx * y1) / ry, cyp = (-k * ry * x1) / rx;
  const cx = cos * cxp - sin * cyp + (p0[0] + p1[0]) / 2;
  const cy = sin * cxp + cos * cyp + (p0[1] + p1[1]) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
  let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  else if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = segsFor(Math.abs(dt) * Math.max(rx, ry), tol);
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = t1 + (dt * i) / n;
    const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    out.push([cos * ex - sin * ey + cx, sin * ex + cos * ey + cy]);
  }
  return out;
}

/** `d` de un <path> → polilíneas (en las coordenadas del propio path). */
export function pathToPolys(d: string, tol: number): Poly[] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const polys: Poly[] = [];
  let cur: Pt[] = [];
  let pos: Pt = [0, 0], start: Pt = [0, 0];
  let lastCtrl: Pt | null = null, lastQ: Pt | null = null;
  let cmd = "";
  let i = 0;
  const num = () => Number(tokens[i++]);
  const flush = (closed: boolean) => {
    if (cur.length > 1) polys.push({ pts: cur, closed });
    cur = [];
  };
  const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const cubic = (p0: Pt, c1: Pt, c2: Pt, p: Pt) => {
    const n = segsFor(dist(p0, c1) + dist(c1, c2) + dist(c2, p), tol);
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      cur.push([
        u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1],
      ]);
    }
  };
  const quad = (p0: Pt, c: Pt, p: Pt) => {
    const n = segsFor(dist(p0, c) + dist(c, p), tol);
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      cur.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p[1]]);
    }
  };

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i]!)) cmd = tokens[i++]!;
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? pos[0] : 0, oy = rel ? pos[1] : 0;
    switch (C) {
      case "M": {
        flush(false);
        pos = [num() + ox, num() + oy];
        start = pos;
        cur = [pos];
        cmd = rel ? "l" : "L"; // coordenadas siguientes = lineto implícito
        lastCtrl = lastQ = null;
        continue;
      }
      case "L": pos = [num() + ox, num() + oy]; cur.push(pos); break;
      case "H": pos = [num() + ox, pos[1]]; cur.push(pos); break;
      case "V": pos = [pos[0], num() + oy]; cur.push(pos); break;
      case "C": {
        const c1: Pt = [num() + ox, num() + oy], c2: Pt = [num() + ox, num() + oy], p: Pt = [num() + ox, num() + oy];
        cubic(pos, c1, c2, p);
        pos = p; lastCtrl = c2; lastQ = null;
        continue;
      }
      case "S": {
        const c1: Pt = lastCtrl ? [2 * pos[0] - lastCtrl[0], 2 * pos[1] - lastCtrl[1]] : pos;
        const c2: Pt = [num() + ox, num() + oy], p: Pt = [num() + ox, num() + oy];
        cubic(pos, c1, c2, p);
        pos = p; lastCtrl = c2; lastQ = null;
        continue;
      }
      case "Q": {
        const c: Pt = [num() + ox, num() + oy], p: Pt = [num() + ox, num() + oy];
        quad(pos, c, p);
        pos = p; lastQ = c; lastCtrl = null;
        continue;
      }
      case "T": {
        const c: Pt = lastQ ? [2 * pos[0] - lastQ[0], 2 * pos[1] - lastQ[1]] : pos;
        const p: Pt = [num() + ox, num() + oy];
        quad(pos, c, p);
        pos = p; lastQ = c; lastCtrl = null;
        continue;
      }
      case "A": {
        const rx = num(), ry = num(), rot = num(), large = num() !== 0, sweep = num() !== 0;
        const p: Pt = [num() + ox, num() + oy];
        cur.push(...arcPoints(pos, rx, ry, rot, large, sweep, p, tol));
        pos = p;
        break;
      }
      case "Z": {
        flush(true);
        pos = start;
        cur = [pos];
        break;
      }
      default:
        i++; // comando desconocido: se saltea
    }
    lastCtrl = lastQ = null;
  }
  flush(false);
  return polys;
}

function ellipsePoly(cx: number, cy: number, rx: number, ry: number, tol: number): Poly {
  const n = Math.max(24, segsFor(2 * Math.PI * Math.max(rx, ry), tol));
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const t = (2 * Math.PI * k) / n;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return { pts, closed: true };
}

/**
 * Un trazo (stroke) de ancho `w` no se puede "rellenar" en la láser como
 * línea: se convierte en su contorno cerrado (offset a cada lado del centro).
 */
function strokeOutline(poly: Poly, w: number): Poly[] {
  const h = w / 2;
  const pts = poly.pts;
  const n = pts.length;
  if (n < 2) return [];
  const normal = (a: Pt, b: Pt): Pt => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  const offsetSide = (sign: number): Pt[] =>
    pts.map((p, k) => {
      const prev = poly.closed ? pts[(k - 1 + n) % n]! : k > 0 ? pts[k - 1]! : null;
      const next = poly.closed ? pts[(k + 1) % n]! : k < n - 1 ? pts[k + 1]! : null;
      // Normal del tramo de entrada y del de salida (en las puntas, la única).
      const n1 = prev ? normal(prev, p) : normal(p, next!);
      const n2 = next ? normal(p, next) : n1;
      let nx = n1[0] + n2[0], ny = n1[1] + n2[1];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l; ny /= l;
      // Inglete limitado: en esquinas cerradas no se dispara.
      const cosHalf = Math.max(0.5, nx * n1[0] + ny * n1[1]);
      return [p[0] + (sign * h * nx) / cosHalf, p[1] + (sign * h * ny) / cosHalf];
    });
  if (poly.closed) {
    // Anillo: contorno exterior + interior en sentido contrario, así queda
    // hueco tanto con relleno par-impar como con "nonzero".
    return [{ pts: offsetSide(1), closed: true }, { pts: offsetSide(-1).reverse(), closed: true }];
  }
  return [{ pts: [...offsetSide(1), ...offsetSide(-1).reverse()], closed: true }];
}

// ── SVG (el nuestro) → entidades ─────────────────────────────────────────────

type Layer = "GRABADO" | "INFO" | "LOGO-VECTORIZAR";
interface Entity { layer: Layer; poly: Poly }

const attr = (attrs: string, name: string): string | undefined =>
  attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
const numAttr = (attrs: string, name: string, def = 0) => {
  const v = Number(attr(attrs, name));
  return Number.isFinite(v) ? v : def;
};

/**
 * Lee el SVG de producción (estructura conocida: <g> con transform, path,
 * circle, ellipse, rect, polygon, line, image) y devuelve las formas en mm,
 * con el eje Y del SVG (hacia abajo).
 */
function svgEntities(svg: string, tolMm: number): { entities: Entity[]; height: number; width: number } {
  const root = svg.match(/<svg\b([^>]*)>/);
  const vb = (attr(root?.[1] ?? "", "viewBox") ?? "0 0 100 100").split(/[\s,]+/).map(Number);
  const width = vb[2] ?? 100, height = vb[3] ?? 100;

  const body = svg.replace(/<!--[\s\S]*?-->/g, "").replace(/<\?xml[^>]*\?>/, "");
  interface Frame { m: M; fill?: string; stroke?: string; strokeWidth?: number; layer: Layer }
  const stack: Frame[] = [{ m: IDENT, layer: "GRABADO" }];
  const entities: Entity[] = [];

  for (const [, close, tag, attrs = "", selfClose] of body.matchAll(/<(\/?)([a-zA-Z]+)\b([^>]*?)(\/?)>/g)) {
    if (tag === "svg") continue;
    if (close) {
      if (tag === "g" && stack.length > 1) stack.pop();
      continue;
    }
    const parent = stack[stack.length - 1]!;
    const frame: Frame = {
      m: mul(parent.m, parseTransform(attr(attrs, "transform"))),
      fill: attr(attrs, "fill") ?? parent.fill,
      stroke: attr(attrs, "stroke") ?? parent.stroke,
      strokeWidth: attr(attrs, "stroke-width") !== undefined ? numAttr(attrs, "stroke-width") : parent.strokeWidth,
      layer: attr(attrs, "id") === "INFO-NO-IMPRIMIR" ? "INFO" : parent.layer,
    };
    if (tag === "g") {
      if (!selfClose) stack.push(frame);
      continue;
    }

    // Tolerancia en unidades locales (los íconos están en un viewBox de 24).
    const tol = tolMm / scaleOf(frame.m);
    let polys: Poly[] = [];
    switch (tag) {
      case "path": polys = pathToPolys(attr(attrs, "d") ?? "", tol); break;
      case "circle": { const r = numAttr(attrs, "r"); polys = [ellipsePoly(numAttr(attrs, "cx"), numAttr(attrs, "cy"), r, r, tol)]; break; }
      case "ellipse": polys = [ellipsePoly(numAttr(attrs, "cx"), numAttr(attrs, "cy"), numAttr(attrs, "rx"), numAttr(attrs, "ry"), tol)]; break;
      case "rect":
      case "image": {
        const x = numAttr(attrs, "x"), y = numAttr(attrs, "y"), w = numAttr(attrs, "width"), h = numAttr(attrs, "height");
        polys = [{ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true }];
        break;
      }
      case "polygon": {
        const n = (attr(attrs, "points") ?? "").split(/[\s,]+/).filter(Boolean).map(Number);
        const pts: Pt[] = [];
        for (let k = 0; k + 1 < n.length; k += 2) pts.push([n[k]!, n[k + 1]!]);
        polys = [{ pts, closed: true }];
        break;
      }
      case "line":
        polys = [{ pts: [[numAttr(attrs, "x1"), numAttr(attrs, "y1")], [numAttr(attrs, "x2"), numAttr(attrs, "y2")]], closed: false }];
        break;
      default:
        continue;
    }

    const layer: Layer = tag === "image" ? "LOGO-VECTORIZAR" : frame.layer;
    // En GRABADO, un trazo sin relleno se pasa a su contorno con su ancho real.
    const strokeOnly = layer === "GRABADO" && frame.fill === "none" && frame.stroke && frame.stroke !== "none" && (frame.strokeWidth ?? 0) > 0;
    if (strokeOnly) polys = polys.flatMap(p => strokeOutline(p, frame.strokeWidth!));
    for (const p of polys) entities.push({ layer, poly: { pts: p.pts.map(pt => apply(frame.m, pt)), closed: p.closed } });
  }
  return { entities, height, width };
}

// ── Escritura DXF R12 ────────────────────────────────────────────────────────

const LAYER_COLORS: Record<Layer, number> = { GRABADO: 7, INFO: 8, "LOGO-VECTORIZAR": 1 };
const f = (n: number) => (Math.round(n * 1000) / 1000).toString();

/** SVG de producción (mm) → DXF R12 en mm, Y hacia arriba. */
export function svgToDxf(svg: string, opts: { tolMm?: number; comment?: string } = {}): string {
  const { entities, height, width } = svgEntities(svg, opts.tolMm ?? 0.1);
  const out: string[] = [];
  const g = (code: number, value: string | number) => out.push(String(code), String(value));

  if (opts.comment) for (const line of opts.comment.split("\n")) g(999, line.replace(/[\r\n]/g, " ").slice(0, 250));
  g(0, "SECTION"); g(2, "HEADER");
  g(9, "$ACADVER"); g(1, "AC1009");
  g(9, "$INSUNITS"); g(70, 4); // 4 = milímetros
  g(9, "$MEASUREMENT"); g(70, 1); // métrico
  g(9, "$EXTMIN"); g(10, 0); g(20, 0); g(30, 0);
  g(9, "$EXTMAX"); g(10, f(width)); g(20, f(height)); g(30, 0);
  g(0, "ENDSEC");

  g(0, "SECTION"); g(2, "TABLES");
  g(0, "TABLE"); g(2, "LAYER"); g(70, Object.keys(LAYER_COLORS).length);
  for (const [name, color] of Object.entries(LAYER_COLORS)) {
    g(0, "LAYER"); g(2, name); g(70, 0); g(62, color); g(6, "CONTINUOUS");
  }
  g(0, "ENDTAB");
  g(0, "ENDSEC");

  g(0, "SECTION"); g(2, "ENTITIES");
  for (const { layer, poly } of entities) {
    const pts = poly.pts.filter((p, k, a) => k === 0 || p[0] !== a[k - 1]![0] || p[1] !== a[k - 1]![1]);
    // Cerrada: sin repetir el primer punto al final (el flag 70=1 la cierra).
    if (poly.closed && pts.length > 2) {
      const a = pts[0]!, b = pts[pts.length - 1]!;
      if (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) pts.pop();
    }
    if (pts.length < 2) continue;
    g(0, "POLYLINE"); g(8, layer); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, poly.closed ? 1 : 0);
    for (const [x, y] of pts) {
      g(0, "VERTEX"); g(8, layer); g(10, f(x)); g(20, f(height - y)); g(30, 0);
    }
    g(0, "SEQEND"); g(8, layer);
  }
  g(0, "ENDSEC");
  g(0, "EOF");
  return out.join("\r\n") + "\r\n";
}
