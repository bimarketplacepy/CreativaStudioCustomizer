// node --test artifacts/api-server/src/lib/odoo-guard.test.ts — freno anti-producción, sin red.
import { test } from "node:test";
import assert from "node:assert/strict";
import { OdooClient, OdooProductionWriteBlocked, assertWriteAllowed, isProductionConfig } from "./odoo.ts";

const PROD_HOST = { url: "https://marketplace.odoo.com", db: "otra-base" };
const PROD_DB = { url: "https://cualquier.host", db: "marketplace-main-33409600" };
const TEST = { url: "https://marketplace-staging.odoo.com", db: "marketplace-staging-1" };

test("detecta producción por host o por base", () => {
  assert.equal(isProductionConfig(PROD_HOST), true);
  assert.equal(isProductionConfig(PROD_DB), true);
  assert.equal(isProductionConfig({ url: "https://MARKETPLACE.odoo.com/odoo", db: "x" }), true);
  assert.equal(isProductionConfig(TEST), false);
});

test("las escrituras contra producción se rechazan sin la variable", () => {
  for (const m of ["create", "write", "unlink", "action_confirm", "get_portal_url", "message_post"]) {
    assert.throws(() => assertWriteAllowed(PROD_HOST, "sale.order", m, {}), OdooProductionWriteBlocked, m);
    assert.throws(() => assertWriteAllowed(PROD_DB, "res.partner", m, {}), OdooProductionWriteBlocked, m);
  }
});

test("las lecturas contra producción pasan", () => {
  for (const m of ["search_read", "read", "fields_get", "search_count"]) {
    assert.doesNotThrow(() => assertWriteAllowed(PROD_HOST, "sale.order", m, {}), m);
  }
});

test("solo ODOO_ALLOW_PRODUCTION_WRITES=si habilita", () => {
  assert.throws(() => assertWriteAllowed(PROD_HOST, "sale.order", "create", { ODOO_ALLOW_PRODUCTION_WRITES: "true" }));
  assert.throws(() => assertWriteAllowed(PROD_HOST, "sale.order", "create", { ODOO_ALLOW_PRODUCTION_WRITES: "SI" }));
  assert.doesNotThrow(() => assertWriteAllowed(PROD_HOST, "sale.order", "create", { ODOO_ALLOW_PRODUCTION_WRITES: "si" }));
});

test("la base de pruebas escribe normal", () => {
  assert.doesNotThrow(() => assertWriteAllowed(TEST, "sale.order", "create", {}));
});

test("OdooClient.call corta antes de tocar la red", async () => {
  delete process.env.ODOO_ALLOW_PRODUCTION_WRITES;
  const client = new OdooClient({ ...PROD_HOST, user: "u", apiKey: "k" });
  await assert.rejects(client.call("sale.order", "create", [{}]), OdooProductionWriteBlocked);
});
