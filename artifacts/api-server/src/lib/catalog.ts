/**
 * Catálogo de productos grabables sincronizado desde Odoo.
 *
 * Cómo está cargado el Odoo de Marketplace (ver Mejoras.md §5c) y cómo se lee:
 * - Es el catálogo de TODAS las marcas → se filtra por marca con un campo de
 *   Studio (ODOO_BRAND_FIELD, por defecto `x_studio_marca`) = ODOO_BRAND
 *   (por defecto `HYDRATE`; admite varias separadas por coma).
 * - Solo productos CON STOCK (stock controlado y `free_qty` > 0) y PUBLICADOS
 *   en el e-commerce (ODOO_ONLY_PUBLISHED=false para incluir los no publicados).
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
const ONLY_PUBLISHED = process.env.ODOO_ONLY_PUBLISHED !== "false";
const MAX_TEMPLATES = 2000;

/** Referencias internas de los servicios de grabado en Odoo (tipo Servicio). */
export const ENGRAVING_CODES = {
  names: "GRAB-NOMBRES",
  drawing: "GRAB-ICONO",
  logo: "GRAB-LOGO",
} as const;

/** Texto (categoría o nombre) → perfil 3D. Gana la primera regla que coincide. */
const TYPE_RULES: [RegExp, string][] = [
  [/\bfood flasks?\b/, "food-flask"],
  [/\bice buckets?\b|\bhieleras?\b/, "ice-bucket"],
  [/\bbowls?\b/, "bowl"],
  [/\bguampas?\b|\bmate cup\b/, "guampa"],
  [/\bhopp?ies?\b/, "hoppie"],
  [/\bchop(eras?|p)\b/, "chopera"],
  [/\bjugs?\b|\bbidon(es)?\b|\bgrowlers?\b|\bjarras?\b/, "jug"],
  [/\bcopas?\b/, "copa"],
  [/\bvasos?\b|\btumblers?\b|\bpint\b|\bquencher\b/, "vaso"],
  [/\btermos?\b|\bthermo|\bmate system\b/, "termo"],
  [/\bbotellas?\b|\bbottles?\b/, "botella"],
];
const TYPE_LABEL: Record<string, string> = {
  guampa: "Guampa", hoppie: "Hoppie", chopera: "Chopera", jug: "Jug",
  copa: "Copa", vaso: "Vaso", termo: "Termo", botella: "Botella",
  "food-flask": "Food Flask", "ice-bucket": "Ice Bucket", bowl: "Bowl",
  "vaso-manija": "Vaso", "botella-ancha": "Botella", "vaso-hydrate": "Vaso", "vaso-sunbeam": "Vaso",
  "termo-mate": "Termo", "termo-mate-forge": "Termo", "termo-kids": "Termo", "hoppie-hydrate": "Hoppie", "copa-hydrate": "Copa", "vaso-espresso": "Vaso", "taza-manija": "Vaso", "mini-coffee": "Vaso", "vaso-taza": "Vaso", "coffee-cup": "Vaso", "vaso-shaker": "Vaso", "vaso-whisky": "Vaso", "vaso-cafe": "Vaso", growler: "Growler", "termo-sleek": "Termo", "hoppie-kids": "Hoppie",
};

/**
 * Perfiles con modelo 3D real de UN producto concreto: los demás modelos del
 * mismo tipo pasan a la forma genérica. Hoy: Termogv2pro.glb (tapa con asa)
 * es el "Termo Frontier" (ver frontier); los demás hoppies caen a la botella de boca
 * ancha genérica, salvo los que tienen modelo propio en NAMED_MODEL (Hoppie,
 * Termo Kids).
 */
const EXACT_MODEL: Record<string, { name: string; fallback: string }> = {
  hoppie: { name: "Termo Frontier", fallback: "botella-ancha" },
};

/**
 * Modelos con .glb propio dentro de un tipo genérico: ese nombre exacto pasa a
 * su perfil; los demás del tipo siguen con la forma genérica.
 */
const NAMED_MODEL: Record<string, Record<string, string>> = {
  vaso: { "vaso": "vaso-hydrate", "vaso sunbeam": "vaso-sunbeam", "vaso taza espresso": "vaso-espresso", "vaso manija": "taza-manija", "vaso mini coffee mug": "mini-coffee", "vaso taza": "vaso-taza", "vaso coffee cup": "coffee-cup", "vaso shaker": "vaso-shaker", "vaso whisky lowball": "vaso-whisky", "vaso cafe": "vaso-cafe" },
  termo: { "termo mate": "termo-mate", "termo mate forge": "termo-mate-forge" },
  "botella-ancha": { "hoppie": "hoppie-hydrate", "termo kids": "termo-kids", "hoppie kids": "hoppie-kids", "termo sleek line": "termo-sleek" },
  // La "Copa" de Hydrate (vaso de vino sin tallo) puede clasificarse como copa o
  // como guampa (Odoo la tiene en "ACCESORIOS DE TERMOS / GUAMPAS").
  jug: { "growler": "growler" },
  copa: { "copa": "copa-hydrate" },
  guampa: { "copa": "copa-hydrate" },
};

/**
 * Un mismo producto cargado en Odoo con dos nombres: se agrupa bajo el nombre
 * de la izquierda. "JARRA 1900 ML" es el "Growler 1.9lts" (la capacidad igual
 * la unifica mergeNearSizes).
 */
const MODEL_ALIAS: Record<string, string> = { jarra: "Growler" };

/**
 * Líneas que Odoo carga con el mismo nombre que otras (así las nombra la
 * descripción del e-commerce):
 * - Termo Frontier: "V2 PRO series 770 / Litro" y "TERMO 770 ML" / "TERMO 1060
 *   ML", que si no quedarían mezclados con el Termo 473. El "Litro" del V2 PRO
 *   es de 1060 ml.
 * - Termo Sleek Line: "620ml <color>" / "710ml <color>" (sin modelo, si no
 *   caen en el Hoppie) y "TERMO 710 ML". El Hoppie es el Wide Flow (530 ml, 1 L),
 *   y ahí va también el "TERMO 530 ML".
 * El "Termo" que queda (473 ml) no se ofrece: el Sleek Line lo reemplaza
 * (pedido del dueño, 2026-10-26).
 */
const FRONTIER = "Termo Frontier";
const FRONTIER_SIZES = new Set(["770ml", "1060ml"]);
const SLEEK = "Termo Sleek Line";
const SLEEK_SIZES = new Set(["620ml", "710ml"]);
/** Colores del Sleek Line que no se ofrecen (pedido del dueño, 2026-10-26). */
const SLEEK_HIDDEN_COLORS = new Set(["lima"]);
function productLine(model: string, size: string | null): { model: string; size: string | null } {
  const m = norm(model);
  if (m === "v2 pro series") return { model: FRONTIER, size: size === "1L" ? "1060ml" : size };
  if (m === "termo" && size && FRONTIER_SIZES.has(size)) return { model: FRONTIER, size };
  if (m === "" && size && SLEEK_SIZES.has(size)) return { model: SLEEK, size };
  if (m === "termo" && size === "710ml") return { model: SLEEK, size };
  if (m === "termo" && size === "530ml") return { model: "", size };
  return { model: MODEL_ALIAS[m] ?? model, size };
}

/**
 * Perfiles que la landing ya no ofrece (sacados del personalizador a pedido del
 * dueño, 2026-10-26): esos productos no se mandan. Las reglas de tipo siguen
 * para que no caigan en otro perfil (ej. un bidón como botella).
 */
const DROPPED_TYPES = new Set(["jug", "bowl"]);

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

/** Productos de la marca que NO se ofrecen para personalizar: packs, kits y bolsos. */
const EXCLUDE = /\bkit\b|\bcombo\b|backpack|mochila|\bbolso\b|\bbag\b|pouch|\btote\b|\+/i;
/**
 * Accesorios (tapas, straps, gomas/botas, fundas): Odoo los tiene bajo
 * "ACCESORIOS DE TERMOS", donde también están guampas y copas — por eso se
 * filtran por subcategoría y por nombre, no por toda la rama.
 */
const ACCESSORY_NAME = /^(tapa|strap|bota|funda|repuesto)\b/i;
const ACCESSORY_CATEGORY = /accesorios de termos \/ (tapas|strap|gomas|fundas)/i;

/**
 * Ediciones de clubes: entran como MODELO propio ("Termo Mate · Cerro
 * Porteño"), no como colores del modelo liso. Clave: palabra en el nombre.
 */
const CLUBS: [RegExp, string][] = [
  [/\bcerro\b/i, "Cerro Porteño"], [/\bolimpia\b/i, "Olimpia"], [/\bluque\b/i, "Sportivo Luqueño"],
  [/\bguarani\b/i, "Guaraní"], [/\briver\b/i, "River Plate"], [/\bpalmeiras?\b/i, "Palmeiras"],
  [/\balbirroja\b/i, "Albirroja"],
];

const COLOR_ATTR = /\bcolou?r\b/;
const SIZE_ATTR = /tama|capacidad|medida|size|volumen|litro|\boz\b|\bml\b/;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const SMALL = new Set(["y", "con", "de", "del", "la", "el", "en", "para", "c/"]);
/** "AZUL PACIFICO" / "Rojo." → "Azul Pacifico" / "Rojo". */
const titleCase = (s: string) =>
  s.toLowerCase().split(" ").map((w, i) =>
    /\d/.test(w) ? w.toUpperCase() // "v2" → "V2"
    : i > 0 && SMALL.has(w) ? w
    : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

/** "1200ML" / "1 L" / "1,5 lts" / "20 oz" → "1200ml" / "1L" / "1.5L" / "20oz". */
export function normalizeSize(raw: string): string {
  const m = raw.match(/(\d+(?:[.,]\d+)?)\s*(ml|cc|lts?|litros?|l|oz)\b/i);
  if (!m) return raw.trim();
  const n = m[1].replace(",", ".");
  const u = m[2].toLowerCase();
  return u === "ml" || u === "cc" ? `${n}ml` : u === "oz" ? `${n}oz` : `${n}L`;
}

/** "470ml" / "1.5L" / "20oz" → ml (null si no se puede leer). */
export function sizeMl(size: string): number | null {
  const m = size.match(/^(\d+(?:\.\d+)?)(ml|L|oz)$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] === "ml" ? n : m[2] === "oz" ? n * 29.57 : n * 1000;
}

/**
 * Odoo tiene la misma capacidad cargada con dos números: "Vaso 470ml" y
 * "VASO 473 ML" (16 oz), "900ml" y "887 ML" (30 oz), "600ml" y "591 ML"
 * (20 oz). Dentro de un modelo, los tamaños a menos de 2% de distancia son el
 * mismo y se muestran con la etiqueta más usada (a igualdad, la más redonda).
 */
export function mergeNearSizes(variants: CatalogVariant[]): CatalogVariant[] {
  const count = new Map<string, number>();
  for (const v of variants) if (v.size) count.set(v.size, (count.get(v.size) ?? 0) + 1);
  const sizes = [...count.keys()]
    .map(s => ({ s, ml: sizeMl(s), n: count.get(s)! }))
    .filter((x): x is { s: string; ml: number; n: number } => x.ml !== null)
    .sort((a, b) => b.n - a.n || (a.ml % 10) - (b.ml % 10));
  const alias = new Map<string, string>();
  const kept: { s: string; ml: number }[] = [];
  for (const x of sizes) {
    const twin = kept.find(k => Math.abs(k.ml - x.ml) / k.ml < 0.02);
    if (twin) alias.set(x.s, twin.s);
    else kept.push(x);
  }
  return alias.size ? variants.map(v => (v.size && alias.has(v.size) ? { ...v, size: alias.get(v.size)! } : v)) : variants;
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
  // Forma "vaso con manija" (forma-vaso-manija.glb): es SOLO el "Vaso con Pico
  // y Agarre". El Sunbeam (alto, con pajita) y el "Vaso Manija" (jarro) son
  // otros productos y siguen como vaso. Antes que la regla de "vaso".
  [/\bagarre\b/, "vaso-manija"],
  // "350ml Café - Coral": Odoo reparte los colores entre categorías de vasos y
  // de Hoppie; sin esto el nombre del modelo cambia según cuál gane la votación.
  [/^\d+ ?ml cafe\b/, "vaso"],
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

export interface ParsedName { model: string; size: string | null; color: string | null; club: string | null }

/**
 * Separa "Hydrate 530ml Amarillo Sol" / "530ml Negro" / "V2 PRO series 770 Blanco"
 * / "TERMO MATE 915 ML AZUL CERRO" / "TERMO 2 EN 1 ALBIRROJA FAN STRIPES EDITION"
 * en modelo, capacidad, color y club. La marca se quita del modelo (ya se sabe).
 * "Edición N" va al color ("Azul · Ed. 2"); una edición con nombre ("Fan
 * Stripes") es el color cuando no hay otro.
 */
export function parseProductName(name: string): ParsedName {
  let rest = name
    .replace(/(\S)[.*]+(?=\s|$)/g, "$1") // "Rojo." / "Pacifico*" → sin puntuación final
    .replace(/\bc\/\s*/gi, "con "); // "Vaso c/ pico" = "Vaso con pico"

  // Club + número de edición pegado ("Blanco Olimpia 2").
  let club: string | null = null;
  let edition: string | null = null;
  for (const [re, label] of CLUBS) {
    const m = rest.match(new RegExp(`${re.source}(?:\\s+(\\d))?(?=\\s|$)`, "i"));
    if (m) { club = label; if (m[1]) edition = m[1]; rest = rest.replace(m[0], " "); break; }
  }
  const ed = rest.match(/\bedici[oó]n\s+(\d+|uv)\b/i);
  if (ed) { edition = ed[1].toUpperCase(); rest = rest.replace(ed[0], " "); }
  let editionName: string | null = null;
  const named = rest.match(/\b((?:fan\s+)?[a-z]+)\s+edition\b/i);
  if (named) { editionName = titleCase(named[1]); rest = rest.replace(named[0], " "); }

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
  let color = idx >= 0 ? titleCase(words.slice(idx).join(" ").replace(/^[-–·,\s]+/, "")) : null;
  const model = (idx >= 0 ? words.slice(0, idx) : words).join(" ").replace(/[-–·,\s]+$/, "").trim();
  if (!color && editionName) color = editionName;
  else if (color && editionName) color = `${color} · ${editionName}`;
  if (edition) color = color ? `${color} · Ed. ${edition}` : `Edición ${edition}`;
  return { model: titleCase(model), size, color: color || null, club };
}

type M2O = [number, string] | false;
interface OTemplate {
  id: number; name: string; website_url?: string | false; type?: string;
  categ_id?: M2O; is_published?: boolean; [brandField: string]: unknown;
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
  /** Productos de la marca omitidos: packs, kits, bolsos y accesorios. */
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
    ["id", "name", "website_url", "type", "categ_id", "is_published", BRAND_FIELD],
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
  // 1) Analizar cada variante con stock. 2) Agrupar por modelo + club + material
  // (no por tipo: Odoo a veces tiene el mismo modelo en dos categorías, ej. un
  // "Termo 473ml" en Hoppie y otro en Vasos). 3) El tipo del grupo se decide por
  // mayoría.
  interface Entry {
    t: OTemplate; v: OVariant; category: string; type: string;
    model: string; club: string | null; material: string; variant: CatalogVariant;
  }
  const entries: Entry[] = [];
  for (const v of stocked) {
    const t = tById.get(v.product_tmpl_id ? v.product_tmpl_id[0] : 0);
    if (!t) continue;
    const category = t.categ_id ? t.categ_id[1] : "";
    if (EXCLUDE.test(t.name) || ACCESSORY_NAME.test(t.name) || ACCESSORY_CATEGORY.test(category)) {
      excluded.add(t.name);
      continue;
    }
    // Ediciones de clubes: fuera por ahora (decisión del dueño, 2026-10-09).
    if (parseProductName(t.name).club) { excluded.add(t.name); continue; }
    const type = productTypeOf(t.name, category);
    if (!type) { unmatched.add(t.name); continue; }

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
    const named = productLine(parsed.model, attrSize ? normalizeSize(attrSize) : parsed.size);
    const size = named.size;
    if (norm(named.model) === "termo"
      || (named.model === SLEEK && colorName && SLEEK_HIDDEN_COLORS.has(norm(colorName)))) {
      excluded.add(t.name);
      continue;
    }

    // Cristal solo por el NOMBRE: Odoo tiene el Whisky Lowball de acero también
    // en una categoría de cristalería.
    const n = norm(`${t.name} ${category}`);
    const material = LEATHER.test(n) ? "cuero" : GLASS.test(norm(t.name)) ? "cristal"
      : colorName && NATURAL_STEEL.test(norm(colorName)) ? "inox"
      : !colorName && /\binox/.test(norm(t.name)) ? "inox" : "acero";

    entries.push({
      t, v, category, type, model: named.model, club: parsed.club, material,
      variant: {
        id: v.id, sku: v.default_code || null, colorName, colorHex, size,
        price: v.lst_price, available: v.free_qty ?? v.qty_available ?? 0, inStock: true,
      },
    });
  }

  const byKey = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = `${norm(String(e.t[BRAND_FIELD] ?? ""))}|${e.material}|${norm(e.model)}|${e.club ?? ""}`;
    byKey.set(key, [...(byKey.get(key) ?? []), e]);
  }

  // Fotos: cada color es una plantilla aparte y no todas tienen imagen cargada
  // (Odoo devuelve un ícono gris). Para cada modelo se usa una que sí tenga.
  const withImage = new Set(
    entries.length
      ? (await client.searchRead<{ id: number }>(
          "product.template",
          [["id", "in", [...new Set(entries.map(e => e.t.id))]], ["image_1920", "!=", false]],
          ["id"],
        )).map(r => r.id)
      : [],
  );

  const categories: Record<string, string[]> = {};
  const products: CatalogProduct[] = [...byKey.values()].map(list => {
    const votes = new Map<string, number>();
    for (const e of list) votes.set(e.type, (votes.get(e.type) ?? 0) + 1);
    let productType = [...votes].sort((a, b) => b[1] - a[1])[0][0];
    const first = list[0];
    // Nombre visible: si el modelo no nombra ningún tipo ("" o "Kids"), se
    // antepone el del perfil ("Hoppie", "Hoppie Kids").
    let name = first.model;
    if (!ruleType(name)) name = `${TYPE_LABEL[productType]} ${name}`.trim();
    const exact = EXACT_MODEL[productType];
    if (exact && norm(name) !== norm(exact.name)) productType = exact.fallback;
    productType = NAMED_MODEL[productType]?.[norm(name)] ?? productType;
    categories[name] = [...new Set(list.map(e => e.category))];
    const published = list.find(e => e.t.is_published && e.t.website_url);
    const rawBrand = first.t[BRAND_FIELD];
    const brand = typeof rawBrand === "string" && rawBrand.trim() ? titleCase(rawBrand.trim()) : (BRANDS[0] ? titleCase(BRANDS[0]) : "");
    // Foto: preferir una plantilla publicada con imagen. Sin ninguna: null (la
    // landing muestra la silueta, no el ícono gris de Odoo).
    const pictured = list.find(e => withImage.has(e.t.id) && e.t.is_published) ?? list.find(e => withImage.has(e.t.id));
    return {
      id: first.t.id, name, brand, productType, material: first.material,
      url: published ? `${client.baseUrl}${published.t.website_url}` : null,
      // Servida por /api/catalog/image: la tienda solo publica la foto de los
      // productos publicados (al resto le muestra un ícono gris).
      imageUrl: pictured ? `/api/catalog/image/${pictured.t.id}` : null,
      variants: mergeNearSizes(list.map(e => e.variant)),
    };
  })
    .filter(p => {
      if (!DROPPED_TYPES.has(p.productType)) return true;
      excluded.add(p.name);
      return false;
    })
    // Más variantes primero: la línea principal encabeza el selector de modelo.
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
    categories,
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

// ── Fotos de producto ────────────────────────────────────────────────────────
const IMAGE_TTL_MS = 24 * 60 * 60_000;
const imageCache = new Map<number, { at: number; data: Buffer | null }>();

/**
 * Foto (256 px) de una plantilla del catálogo actual, leída de Odoo con la API
 * (funciona aunque el producto no esté publicado). Solo ids del catálogo: no
 * es un proxy abierto a cualquier producto de Odoo. Caché en memoria 24 h.
 */
export async function getCatalogImage(templateId: number): Promise<Buffer | null> {
  const known = lastGood?.products.some(p => p.imageUrl === `/api/catalog/image/${templateId}`);
  if (!known) return null;
  const hit = imageCache.get(templateId);
  if (hit && Date.now() - hit.at < IMAGE_TTL_MS) return hit.data;
  const cfg = odooConfig();
  if (!cfg) return null;
  client ??= new OdooClient(cfg);
  try {
    const rows = await client.call<{ image_256?: string | false }[]>(
      "product.template", "read", [[templateId], ["image_256"]],
    );
    const b64 = rows[0]?.image_256;
    const data = typeof b64 === "string" && b64 ? Buffer.from(b64, "base64") : null;
    imageCache.set(templateId, { at: Date.now(), data });
    return data;
  } catch (err) {
    logger.warn({ err: String(err), templateId }, "catalog: no se pudo leer la foto");
    return null;
  }
}
