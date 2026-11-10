/**
 * Qué productos de la tienda se pueden personalizar (botón «Personalizar» del
 * módulo website_creativa_studio, campo cs_personalizable).
 *
 * Solo los MISMOS estilos que tiene el personalizador, no todo lo que cae en
 * la categoría (termos, vasos…): hay piezas que no se pueden personalizar por
 * su tamaño, su forma o un escudo de fábrica. Personalizable =
 *  1. el nombre de la tienda (con la edición: "Vaso Taza · River Plate") está
 *     en `exactFor` de un modelo 3D del personalizador (nada de formas
 *     genéricas aproximadas ni de ediciones de clubes sin modelo propio), y
 *  2. el código (default_code) no está en STYLE_EXCLUSIONS: productos con ese
 *     mismo nombre pero otro estilo, detectados cruzando las fotos de Odoo con
 *     el modelo (auditoría del 2026-11-10 en staging).
 *
 * Lo usan scripts/odoo-personalizables.mjs (marca en Odoo) y la landing (la
 * ficha no abre el editor para un producto que no corresponde).
 */
import { PIECES, type PieceInfo } from "./pieces.ts";

/** Código → por qué ese producto NO es el estilo del modelo 3D con su nombre. */
export const STYLE_EXCLUSIONS: Readonly<Record<string, string>> = {
  // «Vaso» 470/473 ml: vaso tipo pint recto, sin tapa ni escalón; el modelo
  // vaso-hydrate es el vaso escalonado de 600/900 ml.
  "220973": "Vaso 470 ml Beige: vaso pint recto, no el vaso escalonado del 3D",
  "262972": "Vaso 473 ml Cherry: vaso pint recto, no el vaso escalonado del 3D",
  "262978": "Vaso 473 ml Naranja: vaso pint recto, no el vaso escalonado del 3D",
  // Termo Mate 1,2 L: manija en el cuerpo y taza; el modelo termo-mate no tiene manija.
  "210202": "Termo Mate 1200 ml Amarillo Sol: manija en el cuerpo y taza, otro modelo",
  // Termo 530 ml Naranja: tapa con pajita y funda en la base (estilo kids);
  // el modelo hoppie-hydrate es el de tapa a rosca.
  "262960": "Termo 530 ml Naranja: tapa con pajita y funda, otro modelo",
};

export interface ShopPersonalizable {
  ok: boolean;
  /** Por qué no (vacío si ok). */
  reason: string;
}

/**
 * ¿Se personaliza este producto de la tienda?
 * @param productType perfil 3D de la variante (modelType de la edición o el del producto)
 * @param shopName nombre que ve el cliente, con la edición ("Termo Mate · Guaraní")
 * @param code default_code de la variante
 */
export function shopPersonalizable(productType: string | null | undefined, shopName: string | null | undefined, code: string | null | undefined): ShopPersonalizable {
  const piece: PieceInfo | null = productType ? PIECES[productType] ?? null : null;
  if (!piece || !piece.hasModel) return { ok: false, reason: "sin modelo 3D en el personalizador" };
  if (!shopName || !piece.exactFor.includes(shopName)) {
    return { ok: false, reason: shopName?.includes(" · ")
      ? "edición sin modelo propio (escudo o forma distinta)"
      : "forma genérica aproximada, no es un modelo del personalizador" };
  }
  const excluded = code ? STYLE_EXCLUSIONS[code.trim()] : undefined;
  if (excluded) return { ok: false, reason: excluded };
  return { ok: true, reason: "" };
}
