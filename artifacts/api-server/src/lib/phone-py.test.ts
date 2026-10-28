// node --test artifacts/api-server/src/lib/phone-py.test.ts  (Node 24, sin compilar)
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, normalizePhonePy, phoneSearchKey, phoneSearchPattern } from "./phone-py.ts";

test("formatos nacionales e internacionales dan el mismo número", () => {
  const want = "+595981123456";
  for (const raw of [
    "0981123456",
    "0981 123-456",
    "0981.123.456",
    "(0981) 123 456",
    "981123456",
    "595981123456",
    "+595981123456",
    "+595 981 123 456",
    "+595 (0)981 123456",
    "+595 (0) 981-123-456",
    "00595981123456",
    "  +595981123456  ",
  ]) {
    assert.equal(normalizePhonePy(raw), want, `raw=${JSON.stringify(raw)}`);
  }
});

test("lo que no es celular paraguayo es inválido", () => {
  for (const raw of [
    "",
    "   ",
    "abc",
    "021 123 456",          // línea fija de Asunción
    "+54 11 4444 5555",     // Argentina
    "+5959811234",          // corto
    "+59598112345678",      // largo
    "981",
    null,
    undefined,
    12345,
  ]) {
    assert.equal(normalizePhonePy(raw), null, `raw=${JSON.stringify(raw)}`);
  }
});

test("clave de búsqueda son los últimos 9 dígitos", () => {
  assert.equal(phoneSearchKey("+595981123456"), "981123456");
});

test("el patrón ilike tolera espacios, guiones y puntos guardados en Odoo", () => {
  const pat = phoneSearchPattern("+595982555444");
  assert.equal(pat, "9%8%2%5%5%5%4%4%4");
  // Simula el ilike de PostgreSQL: % = cualquier cosa.
  const re = new RegExp("^.*" + pat.split("%").join(".*") + ".*$", "i");
  for (const stored of ["0982 555-444", "+595 982 555 444", "0982.555.444", "(0982) 555444", "+595982555444"]) {
    assert.ok(re.test(stored), stored);
  }
});

test("email en minúsculas y sin espacios", () => {
  assert.equal(normalizeEmail("  Ana.Perez@Gmail.com "), "ana.perez@gmail.com");
  assert.equal(normalizeEmail("ana perez@gmail.com"), "anaperez@gmail.com");
  assert.equal(normalizeEmail("sin-arroba"), null);
  assert.equal(normalizeEmail(""), null);
  assert.equal(normalizeEmail(undefined), null);
});
