/**
 * Lo que el veredicto de factibilidad sabe de cada pieza sin cargar el 3D.
 * Los datos salen de products.ts de la landing (pieces.generated.ts).
 */
import { PIECES } from "./pieces.generated.ts";

/** Cara de la pieza (face-area.ts de la landing). */
export type FaceId = "front" | "left" | "back" | "right";

export interface PieceInfo {
  /** Tiene modelo 3D propio (.glb); sin modelo, la vista es un perfil genérico. */
  hasModel: boolean;
  /** Productos de la tienda que el modelo representa tal cual (por nombre). */
  exactFor: string[];
  /** Caras donde se puede grabar (las demás tienen manija, logo o escudo). */
  engraveFaces: FaceId[];
  /** u del centro del frente en la vuelta (0.5 salvo excepciones). */
  uCenter: number;
  /** El dorso es el lado del logo de la marca. */
  logoBack: boolean;
  sizeIds: string[];
}

export { PIECES };

export function pieceInfo(productId: string | null | undefined): PieceInfo | null {
  return productId ? PIECES[productId] ?? null : null;
}

/** Desplazamiento de cada cara respecto del frente, en vueltas (face-area.ts). */
export const FACE_OFFSETS: Record<FaceId, number> = { front: 0, left: 0.25, back: 0.5, right: -0.25 };

/** El mismo punto de la vuelta (u ± vueltas enteras), lo más cerca posible de `center`. */
export function nearU(u: number, center: number): number {
  return u - Math.round(u - center);
}

/** Cara más cercana a un punto de la vuelta. */
export function faceAtU(piece: PieceInfo, u: number): FaceId {
  const d = (f: FaceId) => {
    const c = piece.uCenter + FACE_OFFSETS[f];
    return Math.abs(nearU(u, c) - c);
  };
  return (["front", "left", "back", "right"] as FaceId[]).reduce((a, b) => (d(b) < d(a) ? b : a));
}

/**
 * ¿El exacto 3D cubre este producto de la tienda? `shopName` es el nombre que
 * ve el cliente, con la edición ("Vaso Taza · River Plate").
 */
export function isExactModel(piece: PieceInfo | null, shopName: string | null | undefined): boolean {
  return !!piece && !!shopName && piece.exactFor.includes(shopName);
}
