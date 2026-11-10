/**
 * Veredicto de factibilidad (PROMPT-ODOO-TIENDA.md §1.2): ¿se puede cobrar
 * este diseño ya, después de que el taller apruebe una prueba, o no se puede
 * producir?
 *
 * La misma función corre en el editor (para avisar mientras se diseña) y en el
 * servidor antes de crear el presupuesto, donde se recalcula todo desde el
 * `designState` recibido: nada de lo que diga el navegador sobre precios,
 * máquinas o diseños de artistas se toma por cierto. Lo que sale de Odoo
 * (variante, stock, precios) lo pasa quien llama en `FeasibilityContext`.
 *
 * Límite conocido: el servidor no carga los .glb, así que las zonas sin grabado
 * se controlan por cara (`engraveFaces`: la de la manija, el logo o el escudo
 * no se ofrece). Los bordes finos de cada logo los frena el editor.
 */
import { ARTIST_DESIGNS, ARTIST_DESIGNS_ENABLED, type ArtistDesign } from "./artist-designs.ts";
import { dpiVerdict } from "./dpi.ts";
import { normalizeTechnique } from "./machines.ts";
import { faceAtU, isExactModel, pieceInfo, type PieceInfo } from "./pieces.ts";
import { fitsDacen, printSpecFor } from "./print-specs.ts";

export type Verdict = "OK" | "REVISION" | "IMPOSIBLE";

export interface FeasibilityReason {
  /** Código estable (pruebas, panel /admin). */
  code: string;
  /** Para el cliente, en español, con cómo arreglarlo. */
  message: string;
  verdict: Exclude<Verdict, "OK">;
}

export interface FeasibilityResult {
  verdict: Verdict;
  reasons: FeasibilityReason[];
}

/** La pieza de la tienda elegida, según Odoo (no según el navegador). */
export interface ShopPiece {
  /** Nombre que ve el cliente, con la edición ("Vaso Taza · River Plate"). */
  name: string | null;
  variantExists: boolean;
  inStock: boolean;
  /** Precio de la variante en Odoo; null = sin precio cargado. */
  price: number | null;
}

export interface FeasibilityContext {
  /**
   * Pieza de la tienda. `null`: el diseño no está sobre un producto de la
   * tienda (forma genérica o pieza del cliente).
   */
  shop: ShopPiece | null;
  /**
   * Sin pieza de la tienda: precio cargado de la pieza genérica (ej. la taza
   * enlozada de los diseños de artistas). null/ausente = se cotiza.
   */
  genericPrice?: number | null;
  /** Líneas del presupuesto sin precio en Odoo (ej. "Impresión a color"). */
  unpricedLines?: string[];
  /** Diseños de artistas habilitados (default: ARTIST_DESIGNS_ENABLED). */
  artistDesignsEnabled?: boolean;
  /** Catálogo de diseños de artistas (default: ARTIST_DESIGNS). */
  artistDesigns?: ArtistDesign[];
}

/** Tamaño mínimo del texto en el editor (TEXT_SCALE_MIN de customizer.tsx). */
export const TEXT_SCALE_MIN = 0.3;

/**
 * Lo que el veredicto lee del `designState` (customizer.tsx → orderPayload).
 * Todo opcional y sin confiar en los tipos: llega del navegador.
 */
export interface FeasibilityDesign {
  productId?: unknown;
  materialId?: unknown;
  materialProductId?: unknown;
  sizeId?: unknown;
  technique?: unknown;
  ownProduct?: unknown;
  text?: unknown;
  text2?: unknown;
  textPlacement?: unknown;
  text2Placement?: unknown;
  artPlacement?: unknown;
  iconId?: unknown;
  hasCustomImage?: unknown;
  coverage?: unknown;
  wrap?: unknown;
  artistDesign?: unknown;
  extraEngraving?: unknown;
}

/** Letras latinas (con tildes y ñ), números, espacios y la puntuación de las fuentes. */
const SAFE_TEXT = /^[\p{Script=Latin}\p{N}\s.,;:!?¡¿'"“”‘’()\-–—&@#/+*%$°ºª·_]*$/u;

const RANK: Record<Verdict, number> = { OK: 0, REVISION: 1, IMPOSIBLE: 2 };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

export function feasibility(design: FeasibilityDesign | null | undefined, ctx: FeasibilityContext): FeasibilityResult {
  const ds = (design ?? {}) as FeasibilityDesign;
  const reasons: FeasibilityReason[] = [];
  const add = (verdict: FeasibilityReason["verdict"], code: string, message: string) => {
    if (!reasons.some(r => r.code === code)) reasons.push({ code, message, verdict });
  };

  // ── Pieza ────────────────────────────────────────────────────────────────
  const productId = str(ds.productId);
  const piece = pieceInfo(productId);
  const spec = productId ? printSpecFor(productId, str(ds.sizeId)) : null;
  if (!piece || !spec) {
    add("IMPOSIBLE", "unknown_piece", "No reconocemos la pieza elegida. Volvé a elegirla en el personalizador.");
    return finish(reasons);
  }
  const sizeId = str(ds.sizeId);
  if (sizeId && !piece.sizeIds.includes(sizeId)) {
    add("IMPOSIBLE", "unknown_size", "Ese tamaño no existe para esta pieza. Elegí uno de los tamaños disponibles.");
  }

  if (ds.ownProduct === true) {
    add("REVISION", "own_product", "Traés tu propia pieza: el taller la revisa antes de cobrarte.");
  } else if (!ctx.shop) {
    if (ctx.genericPrice == null) {
      add("REVISION", "generic_piece", "Elegiste una forma genérica: te confirmamos la pieza y el precio antes de cobrarte.");
    }
  } else {
    if (!ctx.shop.variantExists) {
      add("IMPOSIBLE", "variant_missing", "Esa combinación de color y tamaño no existe. Elegí otra en «Tu producto».");
    } else if (!ctx.shop.inStock) {
      add("IMPOSIBLE", "out_of_stock", "Ese color y tamaño está agotado. Elegí otro color o tamaño.");
    }
    if (ctx.shop.price === null) {
      add("REVISION", "piece_unpriced", "La pieza no tiene precio cargado: te lo confirmamos antes de cobrarte.");
    }
    // Lo que vio es la forma real solo si el modelo 3D es el de ese producto.
    if (!isExactModel(piece, ctx.shop.name)) {
      add("REVISION", "approx_3d", "La vista 3D de esta pieza es aproximada: te mandamos una prueba para aprobar antes de pagar.");
    }
  }

  // ── Diseño de artista ────────────────────────────────────────────────────
  const artist = checkArtist(ds, ctx, add);

  // ── Técnica ──────────────────────────────────────────────────────────────
  const technique = normalizeTechnique(str(ds.technique));
  const colorAllowed = fitsDacen(spec) || !!artist;
  if (technique === "color" && !colorAllowed) {
    add("IMPOSIBLE", "color_not_allowed",
      spec.consult === "handle"
        ? "Esta pieza tiene manija y no se puede imprimir a color. Cambiá a «Grabado láser» o elegí un vaso sin manija para imprimir a color."
        : "Esta pieza no se puede imprimir a color. Cambiá a «Grabado láser» o elegí otra pieza para imprimir a color.");
  }

  // ── Textos ───────────────────────────────────────────────────────────────
  const text = str(ds.text);
  const text2 = str(ds.text2);
  const extra = obj(ds.extraEngraving);
  const texts = [text, text2, str(extra?.lid), str(extra?.base)].filter((t): t is string => !!t);
  if (texts.some(t => !SAFE_TEXT.test(t))) {
    add("REVISION", "text_chars", "Tu texto tiene caracteres especiales (emojis o símbolos) que el taller tiene que revisar. Si querés pagar ya, dejá solo letras, números y puntuación.");
  }
  for (const [t, p] of [[text, ds.textPlacement], [text2, ds.text2Placement]] as const) {
    const scale = num(obj(p)?.scale);
    if (t && scale !== null && scale < TEXT_SCALE_MIN) {
      add("REVISION", "text_small", "El texto es muy chico para grabarse nítido. Agrandalo con el control de tamaño.");
    }
  }

  // ── Ubicación: dentro de la pieza y fuera de manija, logo o escudo ───────
  const hasArt = !!str(ds.iconId) || ds.hasCustomImage === true;
  const marks: [string | null | boolean, unknown, string][] = [
    [text, ds.textPlacement, "el texto"],
    [text2, ds.text2Placement, "el texto 2"],
    [hasArt, ds.artPlacement, ds.hasCustomImage === true ? "la imagen" : "el ícono"],
  ];
  for (const [present, placement, label] of marks) {
    if (present) checkPlacement(piece, placement, label, add);
  }

  // ── Imágenes subidas y fondo 360° ────────────────────────────────────────
  if (ds.hasCustomImage === true) {
    add("REVISION", "uploaded_image", "Subiste un logo o una foto: el taller revisa el recorte y el contraste y te manda una prueba para aprobar antes de pagar.");
  }
  const wrap = ds.coverage === "wrap" ? obj(ds.wrap) ?? {} : null;
  if (wrap) {
    if (technique === "color") {
      add("REVISION", "color_360", "La impresión a color de toda la vuelta la revisa el taller: te mandamos una prueba para aprobar antes de pagar.");
    }
    const logos = Array.isArray(wrap.logos) ? wrap.logos : [];
    if (!artist || logos.length) {
      add("REVISION", "uploaded_image", "Subiste un logo o una foto: el taller revisa el recorte y el contraste y te manda una prueba para aprobar antes de pagar.");
    }
    if (!artist) {
      const dpi = num(wrap.effectiveDpi);
      const v = dpi === null ? null : dpiVerdict(dpi);
      if (v === "bad") {
        add("IMPOSIBLE", "dpi_bad", "La imagen tiene muy poca resolución y se va a ver pixelada. Subí una imagen más grande (idealmente 300 dpi a tamaño real).");
      } else if (v === "warn" || v === null) {
        add("REVISION", "dpi_warn", "La imagen puede verse borrosa de cerca: el taller la revisa. Si tenés una versión más grande, subila.");
      }
    }
  }

  // ── Precios que Odoo no tiene ────────────────────────────────────────────
  for (const line of ctx.unpricedLines ?? []) {
    add("REVISION", `unpriced:${line}`, `${line}: el precio lo confirma el taller antes de cobrarte.`);
  }

  return finish(reasons);
}

function finish(reasons: FeasibilityReason[]): FeasibilityResult {
  const verdict = reasons.reduce<Verdict>((v, r) => (RANK[r.verdict] > RANK[v] ? r.verdict : v), "OK");
  // Primero lo que impide comprar.
  reasons.sort((a, b) => RANK[b.verdict] - RANK[a.verdict]);
  return { verdict, reasons };
}

type Add = (verdict: FeasibilityReason["verdict"], code: string, message: string) => void;

/** El diseño de artista válido para esta pieza, o null (y el motivo si no vale). */
function checkArtist(ds: FeasibilityDesign, ctx: FeasibilityContext, add: Add): ArtistDesign | null {
  const ref = obj(ds.artistDesign);
  const id = str(ref?.id);
  if (!ref) return null;
  const enabled = ctx.artistDesignsEnabled ?? ARTIST_DESIGNS_ENABLED;
  const design = id ? (ctx.artistDesigns ?? ARTIST_DESIGNS).find(d => d.id === id.toLowerCase()) : undefined;
  if (!enabled || !design) {
    add("IMPOSIBLE", "artist_unavailable", "Ese diseño de artista no está disponible. Elegí otro en «Recomendados» o armá tu propio diseño.");
    return null;
  }
  // Atado a la pieza para la que el taller lo probó (y no a lo que diga el navegador).
  if (str(ds.materialProductId) !== design.materialProductId || (str(ds.materialId) ?? design.materialId) !== design.materialId) {
    add("IMPOSIBLE", "artist_other_piece", "Este diseño de artista solo se produce en la pieza para la que se probó. Elegí esa pieza o sacá el diseño.");
    return null;
  }
  if (design.provisional) {
    add("REVISION", "artist_provisional", "El archivo final de este diseño todavía lo está preparando el artista: te mandamos la prueba para aprobar antes de pagar.");
  }
  return design;
}

function checkPlacement(piece: PieceInfo, placement: unknown, label: string, add: Add) {
  const p = obj(placement);
  const u = num(p?.u);
  const v = num(p?.v);
  if (u === null || v === null || v < 0 || v > 1) {
    add("IMPOSIBLE", "outside_piece", `${cap(label)} queda fuera de la zona grabable. Movelo dentro del recuadro de la pieza.`);
    return;
  }
  // Texto que da toda la vuelta: no tiene una cara.
  if (p?.layout === "wrap360") return;
  const face = faceAtU(piece, u);
  if (!piece.engraveFaces.includes(face)) {
    add("IMPOSIBLE", "forbidden_zone", `${cap(label)} queda sobre la manija o el logo de la pieza. Movelo al frente${piece.engraveFaces.length > 1 ? " o a otra cara libre" : ""}.`);
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
