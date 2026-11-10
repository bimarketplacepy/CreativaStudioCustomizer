/**
 * Reglas del presupuesto antes de que el taller lo apruebe y se lo mande al
 * cliente. Sin dependencias: lo prueba quote-rules.test.ts.
 *
 * La pieza tiene que estar en el presupuesto con su precio. Con una forma
 * genérica (p. ej. la taza enlozada del diseño de AOPY) el checkout no puede
 * agregarla —no es un producto de la tienda—, así que el taller la carga a mano
 * en Odoo. Sin ella se cobraría solo el diseño y la impresión.
 */

export interface QuoteLine {
  /** false/null en una línea de producto; "line_note" o "line_section" en notas y secciones. */
  displayType: string | false | null;
  /** product.product.type en Odoo 19: "consu" (bienes), "service" o "combo". */
  productType: string | null;
  priceUnit: number;
  qty: number;
}

/** El presupuesto tiene al menos una pieza física (no servicio) con precio y cantidad. */
export function hasPricedPiece(lines: readonly QuoteLine[]): boolean {
  return lines.some(l => !l.displayType && l.productType !== null && l.productType !== "service" && l.priceUnit > 0 && l.qty > 0);
}

export const MISSING_PIECE_MESSAGE =
  "Falta la pieza en el presupuesto: agregá en Odoo la taza (o la pieza que corresponda) con su precio y después aprobá. " +
  "Sin ella el cliente pagaría solo el diseño y la impresión.";
