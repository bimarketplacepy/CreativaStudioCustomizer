/**
 * Marcas vectoriales del archivo de la Dacen F5 (DACEN.md §12.10): el taller
 * pide la imagen en PNG y los textos y logos en VECTOR. Al armar el archivo,
 * `drawColorLayer` no pinta esas marcas en el PNG: las anota con su
 * transformación exacta (la misma que usaría el canvas) y el server las pasa a
 * curvas en un SVG por capas, encima del PNG.
 *
 * Coordenadas: `matrix` [a, b, c, d, e, f] lleva las coordenadas LOCALES de la
 * marca (px de la textura, centradas en 0,0) a mm del archivo.
 */
export type VectorMark =
  | {
      kind: "text";
      /** Familia CSS tal como la dibuja el canvas; el pedido la traduce a fontId. */
      family: string;
      fontId?: string | null;
      color: string;
      lines: string[];
      fontPx: number;
      lineHeight: number;
      blockW: number;
      align: "left" | "center" | "right" | "justify";
      matrix: number[];
    }
  | { kind: "icon"; iconId: string; color: string; w: number; h: number; matrix: number[] }
  | { kind: "svg"; svg: string; w: number; h: number; matrix: number[] };

/** Recibe las marcas mientras se dibuja (null = dibujar todo en el raster). */
export type VectorSink = ((mark: VectorMark) => void) | null | undefined;

/** Transformación vigente del contexto (en px del lienzo). */
export function ctxMatrix(ctx: CanvasRenderingContext2D): number[] {
  const t = ctx.getTransform();
  return [t.a, t.b, t.c, t.d, t.e, t.f];
}

/** Pasa una matriz en px del lienzo a mm (px cuadrados: un solo factor). */
export function matrixToMm(m: number[], mmPerPx: number): number[] {
  return m.map(v => v * mmPerPx);
}
