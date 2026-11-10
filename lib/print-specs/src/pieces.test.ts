// node --test lib/print-specs/src/pieces.test.ts — datos de piezas consistentes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PIECES } from "./pieces.ts";
import { PRINT_SPECS } from "./print-specs.ts";
import { ARTIST_DESIGNS } from "./artist-designs.ts";

test("pieces.generated.ts está al día con products.ts", () => {
  const script = fileURLToPath(new URL("../scripts/gen-pieces.mjs", import.meta.url));
  execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" });
});

test("cada pieza tiene su regla de impresión y viceversa", () => {
  assert.deepEqual(Object.keys(PRINT_SPECS).sort(), Object.keys(PIECES).sort());
});

test("cada diseño de artista está atado a una pieza que existe", () => {
  for (const d of ARTIST_DESIGNS) assert.ok(PIECES[d.materialProductId], d.id);
});
