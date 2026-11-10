// Unión de contornos para la láser.
//
// En las tipografías manuscritas (Milkshake, Pacifico…) cada letra es un
// contorno cerrado que se MONTA sobre la letra siguiente para que el trazo se
// vea continuo. En pantalla no se nota (todo es relleno), pero en el archivo de
// la láser quedan contornos que se atraviesan: el programa los toma como
// formas separadas y graba mal los cruces (doble pasada o huecos).
//
// Acá se funden todos los contornos en una sola silueta: lo que se monta se
// une, y los huecos de las letras (a, e, o…) se conservan. Regla de relleno
// "nonzero", la misma con la que el navegador y el SVG dibujan el texto.
import ClipperLib from "clipper-lib";

export type Pt = [number, number];

/** Clipper trabaja con enteros: 1 unidad = 0,001 mm. */
const SCALE = 1000;

/**
 * Une contornos cerrados (mm). Devuelve contornos cerrados que no se cruzan ni
 * se tocan entre sí: exteriores en un sentido y huecos en el contrario.
 * Si algo falla, devuelve los de entrada (el archivo sale igual que antes).
 */
export function unionOutlines(polys: Pt[][]): Pt[][] {
  const input = polys.filter(p => p.length >= 3);
  if (input.length === 0) return [];
  try {
    const paths = input.map(p => p.map(([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) })));
    const clipper = new ClipperLib.Clipper();
    clipper.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
    const solution: { X: number; Y: number }[][] = [];
    const ok = clipper.Execute(
      ClipperLib.ClipType.ctUnion, solution,
      ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero,
    );
    if (!ok || solution.length === 0) return input;
    // Saca puntos alineados o repetidos que deja el redondeo (≤ 0,002 mm).
    const clean = ClipperLib.Clipper.CleanPolygons(solution, 2) as { X: number; Y: number }[][];
    const out = clean.filter(p => p.length >= 3).map(p => p.map(q => [q.X / SCALE, q.Y / SCALE] as Pt));
    return out.length ? out : input;
  } catch {
    return input;
  }
}

/** ¿Algún contorno cruza a otro? (para pruebas: tras la unión debe dar false). */
export function outlinesCross(polys: Pt[][]): boolean {
  const segs: { a: Pt; b: Pt; poly: number; i: number; n: number }[] = [];
  polys.forEach((p, poly) => p.forEach((a, i) => segs.push({ a, b: p[(i + 1) % p.length]!, poly, i, n: p.length })));
  const cross = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const EPS = 1e-9;
  // Barrido por x: solo se comparan los tramos cuyos rangos en x se pisan.
  const items = segs.map(s => ({ ...s, x0: Math.min(s.a[0], s.b[0]), x1: Math.max(s.a[0], s.b[0]) })).sort((s, t) => s.x0 - t.x0);
  for (let i = 0; i < items.length; i++) {
    const s = items[i]!;
    for (let j = i + 1; j < items.length && items[j]!.x0 <= s.x1; j++) {
      const t = items[j]!;
      // Tramos vecinos del mismo contorno comparten un punto: no cuentan.
      if (s.poly === t.poly && (Math.abs(s.i - t.i) <= 1 || Math.abs(s.i - t.i) === s.n - 1)) continue;
      const d1 = cross(s.a, s.b, t.a), d2 = cross(s.a, s.b, t.b), d3 = cross(t.a, t.b, s.a), d4 = cross(t.a, t.b, s.b);
      if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) return true;
    }
  }
  return false;
}
