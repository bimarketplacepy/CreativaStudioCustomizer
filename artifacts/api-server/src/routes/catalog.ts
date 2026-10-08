import { Router, type IRouter } from "express";
import { getCatalog } from "../lib/catalog";

const router: IRouter = Router();

// GET /api/catalog — productos grabables de Odoo (precios, variantes, stock).
// Público: es la misma información que muestra el ecommerce.
router.get("/catalog", async (_req, res) => {
  const catalog = await getCatalog();
  // Caché corta en el navegador/CDN; el server ya cachea 10 min contra Odoo.
  res.setHeader("Cache-Control", "public, max-age=120");
  res.json(catalog);
});

export default router;
