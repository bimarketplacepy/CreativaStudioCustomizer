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
  [/\bguampas?\b|\bmate cup\b/, "guampa"],
  [/\bhopp?ies?\b/, "hoppie"],
  [/\bchop(eras?|p)\b/, "chopera"],
  [/\bjugs?\b|\bbidon(es)?\b/, "jug"],
  [/\bcopas?\b/, "copa"],
  [/\bvasos?\b|\btumblers?\b|\bpint\b|\bquencher\b/, "vaso"],
  [/\btermos?\b|\bthermo|\bmate system\b/, "termo"],
  [/\bbotellas?\b|\bbottles?\b/, "botella"],
];
const TYPE_LABEL: Record<string, string> = {
  guampa: "Guampa", hoppie: "Hoppie", chopera: "Chopera", jug: "Jug",
  copa: "Copa", vaso: "Vaso", termo: "Termo", botella: "Botella",
};

const LEATHER = /\bcuero\b|\bforrad[oa]\b/;
const GLASS = /\bcristal\b|\bvidrio\b/;
/** Color que significa "acero sin pintar" → material inox del personalizador. */
const NATURAL_STEEL = /\binox|\bacero\b|\bplat[ae]|\bsilver\b|\bnatural\b|\bstainless\b|\bmetal/;

/**
 * Palabras con las que empieza un color. Incluye los nombres propios de la
 * paleta Hydrate (Aqua, Avena, Cherry, Lima, Jade, Peach Fuzz, Choco Mousse…).
 * "Café" NO está: en Hydrate es una línea de producto ("350ml Café - Coral").
 */
const COLOR_WORD = /^(negr[oa]|blanc[oa]|roj[oa]|azul|celeste|verde|rosa(do)?|gris|grafito|amarill[oa]|naranja|violeta|lila|lilac|lavanda|morad[oa]|marron|chocolate|choco|beige|avena|arena|crema|dorad[oa]|platead[oa]|plata|turquesa|aqua|menta|coral|fucsia|bordo|borgona|oliva|salmon|nude|champagne|cobre|cherry|lima|jade|peach|inox|acero|natural|black|white|red|blue|green|pink|soft|gr[ae]y|yellow|orange|purple|silver|gold|copper|teal|navy|lime|mint)$/;
const SIZE_IN_NAME = /(\d+(?:[.,]\d+)?)\s*(ml|cc|lts?|litros?|l|oz)\b/i;

/**
 * Productos de la marca que NO se ofrecen para personalizar: packs/kits/bolsos
 * y ediciones con diseño impreso (clubes, Albirroja). Ajustable acá.
 */
const EXCLUDE = /\bkit\b|\bcombo\b|backpack|mochila|\bbolso\b|\bbag\b|pouch|\btote\b|\+|\bedici[oó]n\b|\bedition\b|albirroja|olimpia|\bcerro\b|guarani|luque|\briver\b|palmeiras/i;

const COLOR_ATTR = /\bcolou?r\b/;
const SIZE_ATTR = /tama|capacidad|medida|size|volumen|litro|\boz\b|\bml\b/;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const SMALL = new Set(["y", "con", "de", "del", "la", "el", "c/"]);
/** "AZUL PACIFICO" / "Rojo." → "Azul Pacifico" / "Rojo". */
const titleCase = (s: string) =>
  s.toLowerCase().split(" ").map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
/** Solo pasa a "Título" lo que viene TODO EN MAYÚSCULAS (respeta "V2 PRO series"). */
const tidyModel = (s: string) => (s && s === s.toUpperCase() && /[A-Z]{3}/.test(s) ? titleCase(s) : s);

/** "1200ML" / "1 L" / "1,5 lts" / "20 oz" → "1200ml" / "1L" / "1.5L" / "20oz". */
export function normalizeSize(raw: string): string {
  const m = raw.match(/(\d+(?:[.,]\d+)?)\s*(ml|cc|lts?|litros?|l|oz)\b/i);
  if (!m) return raw.trim();
  const n = m[1].replace(",", ".");
  const u = m[2].toLowerCase();
  return u === "ml" || u === "cc" ? `${n}ml` : u === "oz" ? `${n}oz` : `${n}L`;
}

/** Tipo por texto: primera regla que coincide. */
const ruleType = (text: string) => {
  const n = norm(text);
  return TYPE_RULES.find(([re]) => re.test(n))?.[1] ?? null;
};
/** Señales del NOMBRE que mandan sobre la categoría (ej. "Termo Mate Forge" en una categoría de guampas). */
const STRONG_NAME: [RegExp, string][] = [
  [/\btermo mate\b|\bmate system\b/, "termo"],
  [/\bguampa\b/, "guampa"],
  [/\bvaso\b|\btumbler\b|\bshaker\b|\blowball\b/, "vaso"],
];
/**
 * Perfil 3D: 1) nombre con señal fuerte; 2) categoría si menciona UN solo tipo;
 * 3) el tipo del nombre si la categoría lo menciona; 4) primer tipo de la
 * categoría (ej. "Copa" en una categoría de guampas → guampa: en Hydrate la
 * copa es un mate); 5) el tipo del nombre.
 */
export function productTypeOf(name: string, category: string): string | null {
  const n = norm(name);
  const strong = STRONG_NAME.find(([re]) => re.test(n))?.[1];
  if (strong) return strong;
  const nc = norm(category);
  const inCat = [...new Set(TYPE_RULES.filter(([re]) => re.test(nc)).map(([, t]) => t))];
  if (inCat.length === 1) return inCat[0];
  const byName = ruleType(name);
  if (byName && inCat.includes(byName)) return byName;
  return inCat[0] ?? byName ?? null;
}

/**
 * Separa "Hydrate 530ml Amarillo Sol" / "530ml Negro" / "V2 PRO series 770 Blanco"
 * en modelo, capacidad y color. La marca se quita del modelo (ya se sabe).
 */
export function parseProductName(name: string): { model: string; size: string | null; color: string | null } {
  let rest = name
    .replace(/(\S)[.*]+(?=\s|$)/g, "$1") // "Rojo." / "Pacifico*" → sin puntuación final
    .replace(/\bc\/\s*/gi, "con "); // "Vaso c/ pico" = "Vaso con pico"
  let size: string | null = null;
  const sm = rest.match(SIZE_IN_NAME);
  if (sm) { size = normalizeSize(sm[0]); rest = rest.replace(sm[0], " "); }
  else if (/\blitro\b/i.test(rest)) { size = "1L"; rest = rest.replace(/\blitro\b/i, " "); }
  else {
    // Capacidad sin unidad ("V2 PRO series 770 Blanco", "710 Amarillo Pastel").
    const bare = rest.match(/(?:^|\s)(\d{3,4})(?=\s|$)/);
    if (bare && +bare[1] >= 150 && +bare[1] <= 2500) { size = `${bare[1]}ml`; rest = rest.replace(bare[1], " "); }
  }
  const brands = new Set(BRANDS.map(norm));
  const words = rest.split(/\s+/).filter(w => w && !/^[-–·,/]+$/.test(w) && !brands.has(norm(w)));
  const idx = words.findIndex(w => COLOR_WORD.test(norm(w).replace(/[^a-z]/g, "")));
  const color = idx >= 0 ? titleCase(words.slice(idx).join(" ").replace(/^[-–·,\s]+/, "")) : null;
  const model = (idx >= 0 ? words.slice(0, idx) : words).join(" ").replace(/[-–·,\s]+$/, "").trim();
  return { model: tidyModel(model), size, color: color || null };
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
  /** Productos de la marca omitidos por la regla EXCLUDE (packs, ediciones…). */
  excluded: string[];
  /** Categorías internas de cada modelo (para el diagnóstico). */
  categories: Record<string, string[]>;
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
  const excluded = new Set<string>();
  const categories = new Map<string, Set<string>>();
  const groups = new Map<string, CatalogProduct & { _published: string | null }>();
  for (const v of stocked) {
    const t = tById.get(v.product_tmpl_id ? v.product_tmpl_id[0] : 0);
    if (!t) continue;
    const category = t.categ_id ? t.categ_id[1] : "";
    if (EXCLUDE.test(t.name)) { excluded.add(t.name); continue; }
    const productType = productTypeOf(t.name, category);
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
    const colorName = attrColor ? titleCase(attrColor) : parsed.color;
    const size = attrSize ? normalizeSize(attrSize) : parsed.size;
    // Modelo: el nombre sin marca, color ni capacidad. Si no nombra ningún tipo
    // ("" o "Kids"), se antepone el del perfil: "Hoppie", "Hoppie Kids".
    let model = parsed.model;
    if (!ruleType(model)) model = `${TYPE_LABEL[productType]} ${model}`.trim();

    const n = norm(`${t.name} ${category}`);
    const material = LEATHER.test(n) ? "cuero" : GLASS.test(n) ? "cristal"
      : colorName && NATURAL_STEEL.test(norm(colorName)) ? "inox"
      : !colorName && /\binox/.test(norm(t.name)) ? "inox" : "acero";

    const key = `${productType}|${material}|${norm(model)}`;
    if (!categories.has(model)) categories.set(model, new Set());
    categories.get(model)!.add(category);
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

  // Más variantes primero: la línea principal encabeza el selector de modelo.
  const products: CatalogProduct[] = [...groups.values()]
    .map(({ _published, ...p }) => ({ ...p, url: _published }))
    .sort((a, b) => b.variants.length - a.variants.length);

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
    products, engraving, unmatched: [...unmatched], excluded: [...excluded],
    categories: Object.fromEntries([...categories].map(([k, v]) => [k, [...v]])),
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
