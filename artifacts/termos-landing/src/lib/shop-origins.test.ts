// node --test src/lib/shop-origins.test.ts (Node 24 ejecuta el .ts tal cual)
import { test } from "node:test";
import assert from "node:assert/strict";
import { cspSources, isShopOrigin, parseShopOrigins } from "./shop-origins.ts";

const RAW = "https://marketplace-staging-261109-*.dev.odoo.com, https://www.marketplace.com.py https://marketplace.odoo.com/shop";

test("patrón de staging: cualquier build, nada más", () => {
  const r = parseShopOrigins(RAW);
  for (const ok of [
    "https://marketplace-staging-261109-41612773.dev.odoo.com",
    "https://marketplace-staging-261109-41700372.dev.odoo.com",
    "https://www.marketplace.com.py",
    "https://marketplace.odoo.com",
  ]) assert.ok(isShopOrigin(r, ok), ok);
  for (const bad of [
    "https://marketplace-staging-261109-.dev.odoo.com", // el * no puede ser vacío
    "https://otro-staging-1.dev.odoo.com",
    "https://marketplace-staging-261109-1.evil.dev.odoo.com", // no cruza subdominios
    "https://marketplace-staging-261109-1.dev.odoo.com.evil.com",
    "http://marketplace-staging-261109-1.dev.odoo.com",
    "https://marketplace-staging-261109-1.dev.odoo.com:8443",
    "https://marketplace.com.py",
    "null", "", undefined,
  ]) assert.ok(!isShopOrigin(r, bad as string), String(bad));
});

test("CSP: comodín como etiqueta entera; exactos tal cual; sin ruta", () => {
  assert.deepEqual(cspSources(parseShopOrigins(RAW)), [
    "https://*.dev.odoo.com", "https://www.marketplace.com.py", "https://marketplace.odoo.com",
  ]);
});

test("se descarta lo inválido o demasiado amplio", () => {
  for (const bad of ["https://*", "https://*.com", "https://a*b*.dev.odoo.com", "https://x.*.odoo.com",
    "http://*.dev.odoo.com", "https://*.dev.odoo.com:443", "http://tienda.com", "tienda.com", "https://bad host.com",
    "https://<n>.dev.odoo.com", "https://marketplace-staging-261109-<n>.dev.odoo.com"]) {
    assert.deepEqual(parseShopOrigins(bad), [], bad);
  }
  assert.deepEqual(parseShopOrigins("http://localhost:4000").map(r => r.source), ["http://localhost:4000"]);
});
