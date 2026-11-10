// node --test lib/print-specs/src/feasibility.test.ts — una prueba por regla
// de PROMPT-ODOO-TIENDA.md §1.2 (sin red ni Odoo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { feasibility, type FeasibilityContext, type FeasibilityDesign } from "./feasibility.ts";
import { ARTIST_DESIGNS, type ArtistDesign } from "./artist-designs.ts";

const SHOP_VASO: FeasibilityContext = {
  shop: { name: "Vaso", variantExists: true, inStock: true, price: 120_000 },
};
const NAME: FeasibilityDesign = {
  productId: "vaso-hydrate", materialId: "acero", materialProductId: "vaso-hydrate", sizeId: "vaso-hydrate-900",
  technique: "laser", text: "Mateo", textPlacement: { u: 0.5, v: 0.5, scale: 0.45 },
};
const codes = (r: ReturnType<typeof feasibility>) => r.reasons.map(x => x.code);

const AOPY = ARTIST_DESIGNS.find(d => d.id === "aopy-navidad-taza")!;
const aopyDesign = (over: Partial<FeasibilityDesign> = {}): FeasibilityDesign => ({
  productId: "taza-enlozada", materialId: AOPY.materialId, materialProductId: AOPY.materialProductId,
  technique: "color", coverage: "wrap", wrap: { mode: AOPY.artwork.mode, logos: [] },
  artistDesign: { id: AOPY.id }, ...over,
});
const aopyCtx = (design: ArtistDesign): FeasibilityContext => ({
  shop: null, genericPrice: 45_000, artistDesignsEnabled: true, artistDesigns: [design],
});

test("texto en zona libre de una pieza con modelo exacto y precio → OK", () => {
  const r = feasibility(NAME, SHOP_VASO);
  assert.equal(r.verdict, "OK", JSON.stringify(r.reasons));
  assert.deepEqual(r.reasons, []);
});

test("color en una pieza con manija → IMPOSIBLE", () => {
  const r = feasibility({ ...NAME, productId: "vaso-manija", materialProductId: "vaso-manija", sizeId: "vaso-manija-887", technique: "color" },
    { shop: { name: "Vaso con Pico y Agarre", variantExists: true, inStock: true, price: 150_000 } });
  assert.equal(r.verdict, "IMPOSIBLE");
  assert.ok(codes(r).includes("color_not_allowed"));
  assert.match(r.reasons[0].message, /Grabado láser/);
});

test("el id viejo de técnica «eufy» cuenta como color", () => {
  const r = feasibility({ ...NAME, productId: "termo-mate", materialProductId: "termo-mate", sizeId: undefined, technique: "eufy" },
    { shop: { name: "Termo Mate", variantExists: true, inStock: true, price: 1 } });
  assert.ok(codes(r).includes("color_not_allowed"));
});

test("diseño de AOPY en su taza → REVISION mientras sea provisional", () => {
  const r = feasibility(aopyDesign(), aopyCtx({ ...AOPY, provisional: true }));
  assert.equal(r.verdict, "REVISION");
  assert.ok(codes(r).includes("artist_provisional"));
  assert.ok(!codes(r).includes("color_not_allowed"), "el diseño de artista habilita el color en su pieza");
});

test("diseño de AOPY en su taza → OK cuando no es provisional (sin la regla de color 360°)", () => {
  const r = feasibility({ ...aopyDesign(), technique: "laser" }, aopyCtx({ ...AOPY, provisional: false }));
  assert.equal(r.verdict, "OK", JSON.stringify(r.reasons));
});

test("diseño de AOPY a color 360° no provisional → solo la revisión del color 360°", () => {
  const r = feasibility(aopyDesign(), aopyCtx({ ...AOPY, provisional: false }));
  assert.deepEqual(codes(r), ["color_360"]);
});

test("diseño de AOPY en otra pieza → IMPOSIBLE", () => {
  const r = feasibility(aopyDesign({ productId: "vaso-hydrate", materialProductId: "vaso-hydrate" }), aopyCtx(AOPY));
  assert.equal(r.verdict, "IMPOSIBLE");
  assert.ok(codes(r).includes("artist_other_piece"));
});

test("diseño de artista con los diseños apagados → IMPOSIBLE", () => {
  const r = feasibility(aopyDesign(), { ...aopyCtx(AOPY), artistDesignsEnabled: false });
  assert.ok(codes(r).includes("artist_unavailable"));
  assert.equal(r.verdict, "IMPOSIBLE");
});

test("el navegador no puede declarar un diseño provisional como definitivo", () => {
  const r = feasibility(aopyDesign({ artistDesign: { id: AOPY.id, provisional: false } }), aopyCtx({ ...AOPY, provisional: true }));
  assert.ok(codes(r).includes("artist_provisional"));
});

test("logo subido → REVISION", () => {
  const r = feasibility({ ...NAME, hasCustomImage: true, artPlacement: { u: 0.5, v: 0.3, scale: 1 } }, SHOP_VASO);
  assert.equal(r.verdict, "REVISION");
  assert.deepEqual(codes(r), ["uploaded_image"]);
});

test("dpi bad → IMPOSIBLE", () => {
  const r = feasibility({ ...NAME, technique: "color", coverage: "wrap", wrap: { mode: "cover", effectiveDpi: 72, logos: [] } }, SHOP_VASO);
  assert.equal(r.verdict, "IMPOSIBLE");
  assert.ok(codes(r).includes("dpi_bad"));
});

test("dpi warn → REVISION", () => {
  const r = feasibility({ ...NAME, technique: "color", coverage: "wrap", wrap: { mode: "cover", effectiveDpi: 120, logos: [] } }, SHOP_VASO);
  assert.equal(r.verdict, "REVISION");
  assert.ok(codes(r).includes("dpi_warn"));
});

test("texto sobre la manija → IMPOSIBLE", () => {
  // Vaso Taza River: manija atrás, escudo y logo a los costados; solo se graba al frente.
  const r = feasibility({ ...NAME, productId: "vaso-taza-river", materialProductId: "vaso-taza-river", sizeId: "vaso-taza-river-355",
    textPlacement: { u: 0, v: 0.5, scale: 0.45 } },
  { shop: { name: "Vaso Taza · River Plate", variantExists: true, inStock: true, price: 1 } });
  assert.equal(r.verdict, "IMPOSIBLE");
  assert.ok(codes(r).includes("forbidden_zone"));
});

test("diseño fuera de la pieza → IMPOSIBLE", () => {
  const r = feasibility({ ...NAME, textPlacement: { u: 0.5, v: 1.4, scale: 0.45 } }, SHOP_VASO);
  assert.ok(codes(r).includes("outside_piece"));
});

test("variante inexistente o agotada → IMPOSIBLE", () => {
  assert.ok(codes(feasibility(NAME, { shop: { ...SHOP_VASO.shop!, variantExists: false } })).includes("variant_missing"));
  assert.ok(codes(feasibility(NAME, { shop: { ...SHOP_VASO.shop!, inStock: false } })).includes("out_of_stock"));
});

test("3D aproximado (producto sin modelo exacto) → REVISION", () => {
  const r = feasibility(NAME, { shop: { name: "Vaso Sunbeam Edición X", variantExists: true, inStock: true, price: 1 } });
  assert.deepEqual(codes(r), ["approx_3d"]);
});

test("línea sin precio en Odoo → REVISION", () => {
  const r = feasibility(NAME, { ...SHOP_VASO, unpricedLines: ["Impresión a color"] });
  assert.equal(r.verdict, "REVISION");
  assert.match(r.reasons[0].message, /Impresión a color/);
});

test("texto con emojis o muy chico → REVISION", () => {
  assert.ok(codes(feasibility({ ...NAME, text: "Mateo 🎉" }, SHOP_VASO)).includes("text_chars"));
  assert.ok(codes(feasibility({ ...NAME, text: "Ñandutí ¡Peñarol! 10%" }, SHOP_VASO)).length === 0);
  assert.ok(codes(feasibility({ ...NAME, textPlacement: { u: 0.5, v: 0.5, scale: 0.1 } }, SHOP_VASO)).includes("text_small"));
});

test("pieza desconocida o designState vacío → IMPOSIBLE", () => {
  assert.equal(feasibility({ productId: "no-existe" }, SHOP_VASO).verdict, "IMPOSIBLE");
  assert.equal(feasibility(null, SHOP_VASO).verdict, "IMPOSIBLE");
});

test("los motivos IMPOSIBLE van primero", () => {
  const r = feasibility({ ...NAME, hasCustomImage: true, artPlacement: { u: 0.5, v: 0.3, scale: 1 }, textPlacement: { u: 0.5, v: 2, scale: 0.45 } }, SHOP_VASO);
  assert.equal(r.reasons[0].verdict, "IMPOSIBLE");
});
