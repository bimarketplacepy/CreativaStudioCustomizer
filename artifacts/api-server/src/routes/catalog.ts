import { Router, type IRouter } from "express";
import { getCatalog, getCatalogImage } from "../lib/catalog";
import { getDisabledProducts } from "../lib/product-settings";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /api/catalog — productos grabables de Odoo (precios, variantes, stock).
// Público: es la misma información que muestra el ecommerce.
router.get("/catalog", async (_req, res) => {
  const catalog = await getCatalog();
  // Sin los productos deshabilitados en el panel interno. Si la base no
  // responde, se muestra el catálogo completo antes que dejar la tienda vacía.
  const disabled = await getDisabledProducts().catch(err => {
    logger.error({ err }, "catalog: no se pudieron leer los productos deshabilitados");
    return new Set<string>();
  });
  // Caché corta en el navegador/CDN; el server ya cachea 10 min contra Odoo.
  res.setHeader("Cache-Control", "public, max-age=120");
  res.json(disabled.size ? { ...catalog, products: catalog.products.filter(p => !disabled.has(p.name)) } : catalog);
});

// GET /api/catalog/image/:id — foto del producto (solo productos del catálogo).
router.get("/catalog/image/:id", async (req, res) => {
  const id = Number(req.params.id);
  const data = Number.isInteger(id) && id > 0 ? await getCatalogImage(id) : null;
  if (!data) {
    res.status(404).end();
    return;
  }
  // Odoo guarda PNG o JPEG: se detecta por la firma.
  res.setHeader("Content-Type", data[0] === 0x89 ? "image/png" : data[0] === 0xff ? "image/jpeg" : "image/webp");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(data);
});

export default router;
