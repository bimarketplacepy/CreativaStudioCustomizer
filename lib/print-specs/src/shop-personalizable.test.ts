// node --test lib/print-specs/src/shop-personalizable.test.ts — qué se personaliza desde la tienda.
import { test } from "node:test";
import assert from "node:assert/strict";
import { shopPersonalizable, STYLE_EXCLUSIONS } from "./shop-personalizable.ts";
import { PIECES } from "./pieces.ts";

test("modelo exacto con su nombre → personalizable", () => {
  assert.equal(shopPersonalizable("vaso-hydrate", "Vaso", "108236").ok, true);
  assert.equal(shopPersonalizable("termo-mate", "Termo Mate", "220356").ok, true);
});

test("forma genérica aproximada (Stanley Termo Classic) → no", () => {
  const r = shopPersonalizable("termo", "Termo Classic", "X");
  assert.equal(r.ok, false);
});

test("edición de club sin modelo propio → no", () => {
  const r = shopPersonalizable("termo-mate", "Termo Mate · Guaraní", "X");
  assert.equal(r.ok, false);
  assert.match(r.reason, /edición/);
});

test("edición con modelo propio (Vaso Taza · River Plate) → sí", () => {
  assert.equal(shopPersonalizable("vaso-taza-river", "Vaso Taza · River Plate", "X").ok, true);
});

test("mismo nombre pero otro estilo (código excluido por la foto) → no", () => {
  for (const code of ["220973", "262972", "262978", "210202", "262960"]) {
    assert.equal(shopPersonalizable("vaso-hydrate", "Vaso", code).ok, false, code);
  }
});

test("tipo desconocido o sin nombre → no", () => {
  assert.equal(shopPersonalizable("no-existe", "Vaso", "1").ok, false);
  assert.equal(shopPersonalizable("vaso-hydrate", null, "1").ok, false);
});

test("cada exclusión tiene motivo y los tipos de los modelos existen", () => {
  for (const [code, why] of Object.entries(STYLE_EXCLUSIONS)) assert.ok(why.length > 10, code);
  for (const t of ["vaso-hydrate", "termo-mate", "hoppie-hydrate"]) assert.ok(PIECES[t]?.hasModel, t);
});
