// Tipos mínimos de clipper-lib (no trae los suyos): solo lo que usa outline-union.ts.
declare module "clipper-lib" {
  interface IntPoint { X: number; Y: number }
  class Clipper {
    AddPaths(paths: IntPoint[][], polyType: number, closed: boolean): boolean;
    Execute(clipType: number, solution: IntPoint[][], subjFillType: number, clipFillType: number): boolean;
    static CleanPolygons(polys: IntPoint[][], distance: number): IntPoint[][];
  }
  const ClipperLib: {
    Clipper: typeof Clipper;
    PolyType: { ptSubject: number; ptClip: number };
    ClipType: { ctIntersection: number; ctUnion: number; ctDifference: number; ctXor: number };
    PolyFillType: { pftEvenOdd: number; pftNonZero: number; pftPositive: number; pftNegative: number };
  };
  export default ClipperLib;
}
