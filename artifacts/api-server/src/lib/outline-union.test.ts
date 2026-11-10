// node --test artifacts/api-server/src/lib/outline-union.test.ts — la láser no recibe contornos que se crucen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { unionOutlines, outlinesCross, type Pt } from "./outline-union.ts";

const square = (x: number, y: number, s: number): Pt[] => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];

test("dos letras que se montan → una sola silueta, sin cruces", () => {
  const input = [square(0, 0, 10), square(6, 2, 10)];
  assert.equal(outlinesCross(input), true);
  const out = unionOutlines(input);
  assert.equal(out.length, 1);
  assert.equal(outlinesCross(out), false);
});

test("el hueco de una letra (sentido contrario) se conserva", () => {
  const hole = square(3, 3, 4).reverse();
  const out = unionOutlines([square(0, 0, 10), hole]);
  assert.equal(out.length, 2);
});

test("letras separadas quedan separadas", () => {
  assert.equal(unionOutlines([square(0, 0, 5), square(20, 0, 5)]).length, 2);
});
