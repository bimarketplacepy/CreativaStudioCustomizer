/**
 * Catálogo de productos grabables sincronizado desde Odoo.
 *
 * Cómo está cargado el Odoo de Marketplace (ver Mejoras.md §5c) y cómo se lee:
 * - Es el catálogo de TODAS las marcas → se filtra por marca con un campo de
 *   Studio (ODOO_BRAND_FIELD, por defecto `x_studio_marca`) = ODOO_BRAND
 *   (por defecto `HYDRATE`; admite varias separadas por coma).
 * - Solo productos CON STOCK (stock controlado y `free_qty` > 0), publicados en
 *   la web o no (ODOO_ONLY_PUBLISHED=true para exigir publicados).
 * - Cada color suele ser un producto aparte ("Hydrate 530ml Amarillo Sol", 1
 *   variante). Se AGRUPAN por modelo: el color sale del atributo "color" de
 *   Odoo o, si falta, del nombre; la capacidad del atributo "size" o del nombre.
 *   Si un producto sí tiene variantes, cada variante entra igual al grupo.
 * - Perfil 3D (hoppie, termo, vaso…) desde la categoría interna
 *   ("HIDRATACION / HOPPIE / …"), con el nombre como respaldo.
 * - Material: cuero / cristal por nombre o categoría; "inox" solo si el color es
 *   acero natural (la categoría "DOBLE PARED INOX" describe la construcción, no
 *   el acabado: un hoppie amarillo es acero pintado).
 *
 * Los productos de la marca que no encajan en ningún perfil se omiten y se
 * listan en el log ("sin perfil 3D") para ajustar las reglas.
 *
 * Caché en memoria (CACHE_MS). Si Odoo falla, se sigue sirviendo la última copia
 * buena marcada como `stale`; la landing nunca se rompe por Odoo.
 */
import type { Catalog, CatalogProduct, CatalogVariant } from "@workspace/api-zod";
import { OdooClient, odooConfig } from "./odoo";
import { logger } from "./logger";

const CACHE_MS = 10 * 60 * 1000;
const CURRENCY = process.env.ODOO_CURRENCY_LABEL || "Gs.";
const BRAND_FIELD = process.env.ODOO_BRAND_FIELD?.trim() || "x_studio_marca";
const BRANDS = (process.env.ODOO_BRAND ?? "HYDRATE").split(",").map(s => s.trim()).filter(Boolean);
const ONLY_PUBLISHED = process.env.ODOO_ONLY_PUBLISHED === "true";
const MAX_TEMPLATES = 2000;

/** Referencias internas de los servicios de grabado en Odoo (tipo Servicio). */
export const ENGRAVING_CODES = {
  names: "GRAB-NOMBRES",
  drawing: "GRAB-ICONO",
  logo: "GRAB-LOGO",
} as const;

/** Texto (categoría o nombre) → perfil 3D. Gana la primera regla que coincide. */
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
const TYPE_LABEL: Record<string, string> = {
  guampa: "Guampa", hoppie: "Hoppie", chopera: "Chopera", jug: "Jug",
  copa: "Copa", vaso: "Vaso", termo: "Termo", botella: "Botella",
};

const LEATHER = /\bcuero\b|\bforrad[oa]\b/;
const GLASS = /\bcristal\b|\bvidrio\b/;
/** Color que significa "acero sin pintar" → material inox del personalizador. */
const NATURAL_STEEL = /\binox|\bacero\b|\bplat[ae]|\bsilver\b|\bnatural\b|\bstainless\b|\bmetal/;

/** Palabras que inician el color al final del nombre ("… Amarillo Sol"). */
const COLOR_WORD = /^(negr[oa]|blanc[oa]|roj[oa]|azul|celeste|verde|rosa(do)?|gris|grafito|amarill[oa]|naranja|violeta|lila|lavanda|morad[oa]|marron|cafe|beige|arena|crema|dorad[oa]|platead[oa]|plata|turquesa|menta|coral|fucsia|bordo|borgona|oliva|salmon|nude|champagne|cobre|inox|acero|natural|black|white|red|blue|green|pink|gr[ae]y|yellow|orange|purple|silver|gold|copper|teal|navy|lime|mint)$/;
const SIZE_IN_NAME = /(\d+(?:[.,]\d+)?)\s*(ml|cc|lts?|litros?|l|oz)\b/i;

const COLOR_ATTR = /\bcolou?r\b/;
const SIZE_ATTR = /tama|capacidad|medida|size|volumen|litro|\boz\b|\bml\b/;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const typeOf = (...texts: string[]) => {
  for (const t of texts) {
    const n = norm(t);
    const hit = TYPE_RULES.find(([re]) => re.test(n))?.[1];
    if (hit) return hit;
  }
  return null;
};

/** Separa "Hydrate 530ml Amarillo Sol" en modelo / capacidad / color. */
export function parseProductName(name: string): { model: string; size: string | null; color: string | null } {
  const sizeMatch = name.match(SIZE_IN_NAME);
  const size = sizeMatch ? sizeMatch[0].replace(/\s+/g, "") : null;
  const rest = (sizeMatch ? name.replace(sizeMatch[0], " ") : name).replace(/\s+/g, " ").trim();
  const words = rest.split(" ");
  const idx = words.findIndex((w, i) => i > 0 && COLOR_WORD.test(norm(w).replace(/[^a-z]/g, "")));
  const color = idx > 0 ? words.slice(idx).join(" ").replace(/^[-–·,\s]+/, "") : null;
  const model = (idx > 0 ? words.slice(0, idx) : words).join(" ").replace(/[-–·,\s]+$/, "").trim();
  return { model, size, color: color || null };
}

type M2O = [number, string] | false;
interface OTemplate {
  id: number; name: string; website_url?: string | false; type?: string;
  categ_id?: M2O; is_published?: boolean;
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

/** Dominio OR de Odoo (notación polaca) para varias marcas. */
function brandDomain(field: string): unknown[] {
  const leaves = BRANDS.map(b => [field, "=ilike", b]);
  return [...Array(Math.max(0, leaves.length - 1)).fill("|"), ...leaves];
}

export interface SyncReport {
  products: CatalogProduct[];
  engraving: Catalog["engraving"];
  unmatched: string[];
  stats: { templates: number; withoutStock: number; variants: number; models: number };
}

export async function fetchFromOdoo(client: OdooClient): Promise<SyncReport> {
  const tmplFields = await client.fields("product.template");
  const domain: unknown[] = [["sale_ok", "=", true], ["type", "!=", "service"]];
  if (tmplFields.has(BRAND_FIELD)) domain.push(...brandDomain(BRAND_FIELD));
  else {
    // Sin el campo de marca (otra base): filtrar por nombre.
    logger.warn({ field: BRAND_FIELD }, "catalog: campo de marca inexistente, filtro por nombre");
    domain.push(...brandDomain("name").map(x => (Array.isArray(x) ? [x[0], "ilike", x[2]] : x)));
  }
  if (ONLY_PUBLISHED && tmplFields.has("is_published")) domain.push(["is_published", "=", true]);

  const templates = await client.searchRead<OTemplate>(
    "product.template", domain,
    ["id", "name", "website_url", "type", "categ_id", "is_published"],
    { limit: MAX_TEMPLATES, order: "name" },
  );
  const tById = new Map(templates.filter(t => t.type !== "combo").map(t => [t.id, t]));

  const variants = tById.size
    ? await client.searchRead<OVariant>(
        "product.product",
        [["product_tmpl_id", "in", [...tById.keys()]]],
        ["id", "product_tmpl_id", "default_code", "lst_price", "product_template_attribute_value_ids",
          "free_qty", "qty_available", "is_storable", "detailed_type", "type"],
      )
    : [];

  // Solo con stock real: stock controlado y unidades libres > 0.
  const stocked = variants.filter(v => tracksStock(v) && (v.free_qty ?? v.qty_available ?? 0) > 0);

  const ptavIds = [...new Set(stocked.flatMap(v => v.product_template_attribute_value_ids))];
  const ptavs = ptavIds.length
    ? await client.searchRead<OPtav>(
        "product.template.attribute.value", [["id", "in", ptavIds]],
        ["id", "name", "attribute_id", "html_color", "display_type"],
      )
    : [];
  const ptavById = new Map(ptavs.map(p => [p.id, p]));

  const unmatched = new Set<string>();
  const groups = new Map<string, CatalogProduct & { _published: string | null }>();
  for (const v of stocked) {
    const t = tById.get(v.product_tmpl_id ? v.product_tmpl_id[0] : 0);
    if (!t) continue;
    const category = t.categ_id ? t.categ_id[1] : "";
    const productType = typeOf(category, t.name);
    if (!productType) { unmatched.add(t.name); continue; }

    let attrColor: string | null = null;
    let colorHex: string | null = null;
    let attrSize: string | null = null;
    for (const id of v.product_template_attribute_value_ids) {
      const p = ptavById.get(id);
      if (!p) continue;
      const attr = norm(p.attribute_id ? p.attribute_id[1] : "");
      if (p.display_type === "color" || COLOR_ATTR.test(attr)) {
        attrColor = p.name;
        colorHex = isHex(p.html_color) ? p.html_color.toLowerCase() : null;
      } else if (SIZE_ATTR.test(attr)) {
        attrSize = p.name;
      }
    }
    const parsed = parseProductName(t.name);
    const colorName = attrColor ?? parsed.color;
    const size = attrSize ?? parsed.size;
    // Modelo: el nombre sin color ni capacidad (si el color vino del atributo,
    // también se lo saca del nombre por si lo repite).
    let model = parsed.model;
    if (attrColor) model = model.replace(new RegExp(`\\s*${attrColor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "").trim();
    if (!norm(model).includes(norm(TYPE_LABEL[productType]))) model = `${TYPE_LABEL[productType]} ${model}`.trim();

    const n = norm(`${t.name} ${category}`);
    const material = LEATHER.test(n) ? "cuero" : GLASS.test(n) ? "cristal"
      : colorName && NATURAL_STEEL.test(norm(colorName)) ? "inox"
      : !colorName && /\binox/.test(norm(t.name)) ? "inox" : "acero";

    const key = `${productType}|${material}|${norm(model)}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        id: t.id, name: model, productType, material, url: null,
        imageUrl: `${client.baseUrl}/web/image/product.template/${t.id}/image_512`,
        variants: [], _published: null,
      };
      groups.set(key, g);
    }
    if (!g._published && t.is_published && t.website_url) g._published = `${client.baseUrl}${t.website_url}`;
    const available = v.free_qty ?? v.qty_available ?? 0;
    const variant: CatalogVariant = {
      id: v.id, sku: v.default_code || null, colorName, colorHex, size,
      price: v.lst_price, available, inStock: true,
    };
    g.variants.push(variant);
  }

  const products: CatalogProduct[] = [...groups.values()].map(({ _published, ...p }) => ({ ...p, url: _published }));

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

  return {
    products, engraving, unmatched: [...unmatched],
    stats: { templates: tById.size, withoutStock: variants.length - stocked.length, variants: stocked.length, models: products.length },
  };
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
      const { products, engraving, unmatched, stats } = await fetchFromOdoo(client!);
      if (unmatched.length) {
        logger.info({ unmatched: unmatched.slice(0, 50), count: unmatched.length }, "catalog: productos de la marca sin perfil 3D (omitidos)");
      }
      logger.info(stats, "catalog: sincronizado desde Odoo");
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
