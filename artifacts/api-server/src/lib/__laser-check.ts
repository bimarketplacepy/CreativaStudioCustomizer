import { writeFileSync } from "node:fs";
import { buildProductionSvg } from "./production-svg";
import { svgToDxf, pathToPolys } from "./production-dxf";
import { outlinesCross, type Pt } from "./outline-union";

const out = process.argv[2]!;
const dxfPolys = (dxf: string, layer: string): Pt[][] => {
  const t = dxf.split("\r\n"); const polys: Pt[][] = []; let cur: Pt[] | null = null;
  for (let i = 0; i + 1 < t.length; i += 2) {
    const c = t[i]!.trim(), v = t[i + 1]!;
    if (c === "0" && v === "POLYLINE") { cur = t[i + 3] === layer ? [] : null; if (cur) polys.push(cur); }
    if (c === "0" && v === "VERTEX" && cur) cur.push([Number(t[i + 5]), Number(t[i + 7])]);
  }
  return polys;
};
for (const [name, fontId, text, lines, widthMm] of [
  ["milkshake", "f14", "fabri", ["fabri"], 60],
  ["pacifico", "f15", "Maria Jose", ["Maria Jose"], 75],
  ["abril", "f1", "fabri", ["fabri"], 50],
  ["versalita", "f22", "Version B", ["VERSION B"], 55],
] as const) {
  const base = { orderNumber: "CS-TEST", product: "Vaso Sunbeam", technique: "Grabado láser", createdAt: new Date("2026-11-10"), text, fontId,
    textPlacement: { u: 0.5, v: 0.4, scale: 0.6 }, placementMode: "free" };
  const svg = await buildProductionSvg({ ...base, realSize: { circumferenceMm: 290, bandHeightMm: 150, text: { lines: [...lines], widthMm } } });
  const dxf = svgToDxf(svg);
  writeFileSync(`${out}/${name}.svg`, svg); writeFileSync(`${out}/${name}.dxf`, dxf);
  const g = dxfPolys(dxf, "GRABADO");
  const xs = g.flat().map(p => p[0]), ys = g.flat().map(p => p[1]);
  // Antes: contornos crudos de las letras (sin unir), del SVG sin realSize ni unión.
  const rawD = (await buildProductionSvg({ ...base, technique: "Impresión UV color" })).match(/<path d="([^"]*)"/)?.[1] ?? "";
  const raw = pathToPolys(rawD, 0.05).map(p => p.pts);
  console.log(name.padEnd(10), "antes: contornos", String(raw.length).padStart(2), "cruces", outlinesCross(raw), "| ahora: contornos", String(g.length).padStart(2), "cruces", outlinesCross(g),
    "| ancho", (Math.max(...xs) - Math.min(...xs)).toFixed(2), "mm (pedido", widthMm + ")", "alto", (Math.max(...ys) - Math.min(...ys)).toFixed(2),
    "| rojo svg", /<g id="texto"[^>]*>\s*<path [^>]*fill="#ff0000"/.test(svg), "| zonas", /no-grabar|MANIJA/.test(svg), "| color capa", dxf.match(/LAYER\r\n2\r\nGRABADO\r\n70\r\n0\r\n62\r\n(\d+)/)?.[1]);
}
