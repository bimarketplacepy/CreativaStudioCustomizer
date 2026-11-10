/**
 * Cuándo un pedido está PAGADO de verdad (PROMPT-ODOO-TIENDA §3, «pago real»).
 *
 * Solo cuentan las transacciones de pago (payment.transaction) en estado
 * "done": plata capturada. NO se usa:
 *  - `sale.order.amount_paid`: en Odoo 19 suma también las `authorized`
 *    (reservadas, todavía sin capturar; sale/models/sale_order.py:673).
 *  - `state = "sale"`: un pedido se puede confirmar desde el backend sin
 *    ningún pago.
 *
 * Pagado = done ≥ total, con total > 0. Y para producir, además, firmado.
 * Sin dependencias: lo prueba payment-state.test.ts.
 */

export type PaymentState = "pendiente" | "pagado" | "pago_sin_firma" | "confirmado_sin_pago";

export interface PaymentTx { state: string; amount: number }

/** Suma de lo capturado: solo transacciones "done" (los reembolsos done vienen en negativo y restan). */
export function doneAmount(txs: readonly PaymentTx[]): number {
  return txs.reduce((sum, tx) => (tx.state === "done" && Number.isFinite(tx.amount) ? sum + tx.amount : sum), 0);
}

/** Pagado = lo capturado cubre el total (con total > 0). Tolerancia de medio centavo por redondeo. */
export function isPaid(o: { amountTotal: number; amountDone: number }): boolean {
  return o.amountTotal > 0 && o.amountDone + 0.005 >= o.amountTotal;
}

/**
 * Estado de pago de la landing:
 *  - pagado: pago real completo y presupuesto firmado → se produce.
 *  - pago_sin_firma: pago real completo sin firma → «Pago sin aceptación: revisar».
 *  - confirmado_sin_pago: Odoo lo confirmó (state=sale) sin pago real completo
 *    → «Confirmado sin pago: revisar».
 *  - pendiente: lo demás (incluye pagos solo autorizados).
 */
export function paymentStateOf(o: { paid: boolean; state: string }, signed: boolean): PaymentState {
  if (o.paid) return signed ? "pagado" : "pago_sin_firma";
  if (o.state === "sale") return "confirmado_sin_pago";
  return "pendiente";
}
