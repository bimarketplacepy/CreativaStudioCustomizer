/**
 * Catálogo de productos grabables sincronizado desde Odoo.
 *
 * Qué trae: plantillas de producto PUBLICADAS en el ecommerce y vendibles, con
 * sus variantes (color real con su hex, tamaño), precio público y stock. Además
 * los precios de grabado, leídos de productos de servicio por referencia
 * interna (ver ENGRAVING_CODES).
 *
 * Cómo se vincula con el personalizador: cada producto se clasifica en un
 * perfil 3D (termo, vaso, guampa…) y un material (acero pintado, inox, cuero,
 * cristal) a partir de su nombre — ver TYPE_RULES / MATERIAL_RULES. Los que no
 * encajan en ningún perfil se omiten y se listan en `unmatched` del log, para
 * ajustar las reglas.
 *
 * Caché en memoria (CACHE_MS). Si Odoo falla, se sigue sirviendo la última copia
 * buena marcada como `stale`; la landing nunca se rompe por Odoo.
 */
import type { Catalog, CatalogProduct, CatalogVariant } from "@workspace/api-zod";
import { OdooClient, odooConfig } from "./odoo";
import { logger } from "./logger";

const CACHE_MS = 10 * 60 * 1000;
const CURRENCY = process.env.ODOO_CURRENCY_LABEL || "Gs.";

/** Referencias internas de los servicios de grabado en Odoo (tipo Servicio). */
export const ENGRAVING_CODES = {
  names: "GRAB-NOMBRES",
  drawing: "GRAB-ICONO",
  logo: "GRAB-LOGO",
} as const;

/** Nombre del producto → perfil 3D. Gana la primera regla que coincide. */
const TYPE_RULES: [RegExp, string][] = [
  [/\bguampa|\bmate cup\b/, "guampa"],
  [/\bhopp?ie\b/, "hoppie"],
  [/\bchop(era|p)\b/, "chopera"],
  [/\bjug\b|\bbidon\b/, "jug"],
  [/\bcopa\b/, "copa"],
  [/\bvaso\b|\btumbler\b|\bpint\b|\bquencher\b/, "vaso"],
  [/\btermo\b|\bthermo|\bmate system\b/, "termo"],
  [/\bbotella\b|\bbottle\b/, "botella"],
];

/** Nombre del producto → material del personalizador. Por defecto: acero pintado. */
const MATERIAL_RULES: [RegExp, string][] = [
  [/\bcuero\b|\bforrad[oa]\b/, "cuero"],
  [/\binox|\binoxidable\b|\bstainless\b|\bacero natural\b/, "inox"],
  [/\bcristal\b|\bvidrio\b/, "cristal"],
];

const COLOR_ATTR = /\bcolou?r\b/;
const SIZE_ATTR = /tama|capacidad|medida|size|volumen|litro|\boz\b|\bml\b/;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function classifyProduct(name: string): { productType: string; material: string } | null {
  const n = norm(name);
  const type = TYPE_RULES.find(([re]) => re.test(n))?.[1];
  if (!type) return null;
  const material = MATERIAL_RULES.find(([re]) => re.test(n))?.[1] ?? "acero";
  return { productType: type, material };
}

type M2O = [number, string] | false;
interface OTemplate {
  id: number; name: string; website_url?: string | false; type?: string;
  allow_out_of_stock_order?: boolean;
}
interface OVariant {
  id: number; product_tmpl_id: M2O; default_code?: string | false; lst_price: number;
  product_template_attribute_value_ids: number[]; free_qty?: number; qty_available?: number;
  is_storable?: boolean; detailed_type?: string; type?: string;
}
interface OPtav {
  id: number; name: string; attribute_id: M2O; html_color?: string | false; display_type?: string;
}

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** Variante con stock controlado (la API cambió entre versiones de Odoo). */
const tracksStock = (v: OVariant) =>
  v.is_storable === true || v.detailed_type === "product" || v.type === "product";

async function fetchFromOdoo(client: OdooClient): Promise<{ products: CatalogProduct[]; engraving: Catalog["engraving"]; unmatched: string[] }> {
  const tmplFields = await client.fields("product.template");
  const domain: unknown[] = [["sale_ok", "=", true], ["type", "!=", "service"]];
  if (tmplFields.has("is_published")) domain.push(["is_published", "=", true]);
  else if (tmplFields.has("website_published")) domain.push(["website_published", "=", true]);

  const templates = await client.searchRead<OTemplate>(
    "product.template", domain,
    ["id", "name", "website_url", "type", "allow_out_of_stock_order"],
    { limit: 500 },
  );

  const unmatched: string[] = [];
  const classified = new Map<number, { t: OTemplate; productType: string; material: string }>();
  for (const t of templates) {
    if (t.type === "combo") continue;
    const c = classifyProduct(t.name);
    if (c) classified.set(t.id, { t, ...c });
    else unmatched.push(t.name);
  }

  const variants = classified.size
    ? await client.searchRead<OVariant>(
        "product.product",
        [["product_tmpl_id", "in", [...classified.keys()]]],
        ["id", "product_tmpl_id", "default_code", "lst_price", "product_template_attribute_value_ids",
          "free_qty", "qty_available", "is_storable", "detailed_type", "type"],
      )
    : [];

  const ptavIds = [...new Set(variants.flatMap(v => v.product_template_attribute_value_ids))];
  const ptavs = ptavIds.length
    ? await client.searchRead<OPtav>(
        "product.template.attribute.value", [["id", "in", ptavIds]],
        ["id", "name", "attribute_id", "html_color", "display_type"],
      )
    : [];
  const ptavById = new Map(ptavs.map(p => [p.id, p]));

  const byTemplate = new Map<number, CatalogVariant[]>();
  for (const v of variants) {
    const tid = v.product_tmpl_id ? v.product_tmpl_id[0] : 0;
    const t = classified.get(tid);
    if (!t) continue;
    let colorName: string | null = null;
    let colorHex: string | null = null;
    let size: string | null = null;
    for (const id of v.product_template_attribute_value_ids) {
      const p = ptavById.get(id);
      if (!p) continue;
      const attr = norm(p.attribute_id ? p.attribute_id[1] : "");
      if (p.display_type === "color" || COLOR_ATTR.test(attr)) {
        colorName = p.name;
        colorHex = isHex(p.html_color) ? p.html_color.toLowerCase() : null;
      } else if (SIZE_ATTR.test(attr)) {
        size = p.name;
      }
    }
    const tracked = tracksStock(v);
    const available = tracked ? (v.free_qty ?? v.qty_available ?? 0) : null;
    const inStock = !tracked || (available ?? 0) > 0 || t.t.allow_out_of_stock_order === true;
    const list = byTemplate.get(tid) ?? [];
    list.push({
      id: v.id,
      sku: v.default_code || null,
      colorName,
      colorHex,
      size,
      price: v.lst_price,
      available,
      inStock,
    });
    byTemplate.set(tid, list);
  }

  const products: CatalogProduct[] = [...classified.values()]
    .filter(({ t }) => byTemplate.has(t.id))
    .map(({ t, productType, material }) => ({
      id: t.id,
      name: t.name,
      productType,
      material,
      url: t.website_url ? `${client.baseUrl}${t.website_url}` : null,
      imageUrl: `${client.baseUrl}/web/image/product.template/${t.id}/image_512`,
      variants: byTemplate.get(t.id)!,
    }));

  // Precios de grabado (productos de servicio por referencia interna).
  const codes = Object.values(ENGRAVING_CODES);
  const services = await client.searchRead<{ default_code: string | false; lst_price: number }>(
    "product.product", [["default_code", "in", codes]], ["default_code", "lst_price"],
  );
  const priceOf = (code: string) => services.find(s => s.default_code === code)?.lst_price ?? null;
  const engraving = {
    names: priceOf(ENGRAVING_CODES.names),
    drawing: priceOf(ENGRAVING_CODES.drawing),
    logo: priceOf(ENGRAVING_CODES.logo),
  };

  return { products, engraving, unmatched };
}

const EMPTY_ENGRAVING = { names: null, drawing: null, logo: null };

let lastGood: Catalog | null = null;
let lastAttempt = 0;
let inflight: Promise<Catalog> | null = null;
let client: OdooClient | null = null;

export async function getCatalog(): Promise<Catalog> {
  const cfg = odooConfig();
  if (!cfg) {
    return { source: "none", updatedAt: null, stale: false, currency: CURRENCY, products: [], engraving: EMPTY_ENGRAVING };
  }
  if (lastGood && Date.now() - lastAttempt < CACHE_MS) return lastGood;
  if (inflight) return inflight;

  client ??= new OdooClient(cfg);
  lastAttempt = Date.now();
  inflight = (async () => {
    try {
      const { products, engraving, unmatched } = await fetchFromOdoo(client!);
      if (unmatched.length) {
        logger.info({ unmatched: unmatched.slice(0, 50), count: unmatched.length }, "catalog: productos de Odoo sin perfil 3D (omitidos)");
      }
      logger.info({ products: products.length }, "catalog: sincronizado desde Odoo");
      lastGood = {
        source: "odoo", updatedAt: new Date().toISOString(), stale: false,
        currency: CURRENCY, products, engraving,
      };
      return lastGood;
    } catch (err) {
      logger.error({ err: String(err) }, "catalog: falló la sincronización con Odoo");
      // Reintentar antes que el TTL completo, pero sin martillar a Odoo.
      lastAttempt = Date.now() - CACHE_MS + 60_000;
      return lastGood
        ? { ...lastGood, stale: true }
        : { source: "odoo", updatedAt: null, stale: true, currency: CURRENCY, products: [], engraving: EMPTY_ENGRAVING };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
