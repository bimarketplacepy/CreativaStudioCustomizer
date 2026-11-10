// node --test artifacts/api-server/src/lib/payment-state.test.ts — «pago real» (sin red ni Odoo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { doneAmount, isPaid, paymentStateOf } from "./payment-state.ts";

const order = (amountTotal: number, txs: Array<{ state: string; amount: number }>, state = "sent") => {
  const amountDone = doneAmount(txs);
  return { state, amountTotal, amountDone, paid: isPaid({ amountTotal, amountDone }) };
};

test("pago done completo y firmado → pagado", () => {
  const o = order(220_000, [{ state: "done", amount: 220_000 }], "sale");
  assert.equal(paymentStateOf(o, true), "pagado");
});

test("pago done completo sin firma → pago_sin_firma", () => {
  const o = order(220_000, [{ state: "done", amount: 220_000 }], "sale");
  assert.equal(paymentStateOf(o, false), "pago_sin_firma");
});

test("pago solo autorizado (no capturado) → no cuenta, aunque esté firmado", () => {
  const o = order(220_000, [{ state: "authorized", amount: 220_000 }]);
  assert.equal(o.paid, false);
  assert.equal(paymentStateOf(o, true), "pendiente");
});

test("autorizado + confirmado por Odoo → confirmado_sin_pago", () => {
  const o = order(220_000, [{ state: "authorized", amount: 220_000 }], "sale");
  assert.equal(paymentStateOf(o, true), "confirmado_sin_pago");
});

test("confirmado sin ninguna transacción → confirmado_sin_pago", () => {
  assert.equal(paymentStateOf(order(220_000, [], "sale"), true), "confirmado_sin_pago");
});

test("pago parcial done → no es pagado", () => {
  const o = order(220_000, [{ state: "done", amount: 100_000 }, { state: "pending", amount: 120_000 }]);
  assert.equal(o.paid, false);
  assert.equal(paymentStateOf(o, true), "pendiente");
});

test("varias transacciones done que suman el total → pagado", () => {
  const o = order(220_000, [{ state: "done", amount: 120_000 }, { state: "done", amount: 100_000 }], "sale");
  assert.equal(paymentStateOf(o, true), "pagado");
});

test("canceladas y con error no suman", () => {
  const o = order(220_000, [{ state: "cancel", amount: 220_000 }, { state: "error", amount: 220_000 }]);
  assert.equal(o.paid, false);
});

test("reembolso done resta", () => {
  const o = order(220_000, [{ state: "done", amount: 220_000 }, { state: "done", amount: -220_000 }], "sale");
  assert.equal(o.paid, false);
  assert.equal(paymentStateOf(o, true), "confirmado_sin_pago");
});

test("total 0 nunca es pagado", () => {
  assert.equal(isPaid({ amountTotal: 0, amountDone: 0 }), false);
  assert.equal(paymentStateOf(order(0, [], "sale"), true), "confirmado_sin_pago");
});

test("tolerancia de redondeo de medio centavo", () => {
  assert.equal(isPaid({ amountTotal: 100.004, amountDone: 100 }), true);
  assert.equal(isPaid({ amountTotal: 100.01, amountDone: 100 }), false);
});
