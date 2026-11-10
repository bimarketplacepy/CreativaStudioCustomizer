// node --test artifacts/api-server/src/lib/quote-rules.test.ts — la pieza tiene que estar en el presupuesto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hasPricedPiece, type QuoteLine } from "./quote-rules.ts";

const piece = (over: Partial<QuoteLine> = {}): QuoteLine => ({ displayType: false, productType: "consu", priceUnit: 45_000, qty: 1, ...over });
const service = (code: number): QuoteLine => ({ displayType: false, productType: "service", priceUnit: code, qty: 1 });
const note: QuoteLine = { displayType: "line_note", productType: null, priceUnit: 0, qty: 0 };

test("AOPY sin la taza (solo diseño + color + nota) → falta la pieza", () => {
  assert.equal(hasPricedPiece([note, service(12_500), service(45_000)]), false);
});

test("AOPY con la taza agregada con precio → ok", () => {
  assert.equal(hasPricedPiece([service(12_500), service(45_000), piece()]), true);
});

test("pieza en 0 no cuenta", () => {
  assert.equal(hasPricedPiece([service(12_500), piece({ priceUnit: 0 })]), false);
});

test("pieza con cantidad 0 no cuenta", () => {
  assert.equal(hasPricedPiece([piece({ qty: 0 })]), false);
});

test("una nota con el nombre de la pieza no cuenta", () => {
  assert.equal(hasPricedPiece([{ ...note, priceUnit: 45_000, qty: 1 }]), false);
});

test("pedido normal de la tienda (vaso + grabado) → ok", () => {
  assert.equal(hasPricedPiece([piece({ priceUnit: 185_000 }), service(35_000)]), true);
});

test("presupuesto vacío → falta la pieza", () => {
  assert.equal(hasPricedPiece([]), false);
});
