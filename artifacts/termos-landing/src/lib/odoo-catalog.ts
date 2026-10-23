/**
 * Catálogo real de Odoo (vía GET /api/catalog) aplicado al personalizador:
 * colores y tamaños que existen de verdad, con precio y stock por variante.
 *
 * Si Odoo no está configurado o no tiene un producto para la combinación
 * material + producto elegida, el personalizador sigue con su catálogo propio
 * (products.ts / paleta COLORS): esto solo se activa cuando hay datos reales.
 */
import { getGetCatalogQueryKey, useGetCatalog, type Catalog, type CatalogProduct, type CatalogVariant } from "@workspace/api-client-react";
import { ENGRAVING_PLANS, type EngravingPlanId } from "@/lib/engraving-plans";
import type { ProductDef } from "@/lib/products";

export type { Catalog, CatalogProduct, CatalogVariant };

/**
 * Interruptor del catálogo de Odoo en la landing. ENCENDIDO (2026-10-09, pedido
 * del dueño: colores reales con stock). Con `false` no se pide /api/catalog y
 * el personalizador usa su catálogo propio (paleta, tamaños y precios de
 * Tarifas). Si Odoo no responde, la landing cae sola a ese catálogo propio.
 */
export const ODOO_CATALOG_ENABLED = true;

/** Catálogo compartido por el personalizador y Tarifas (una sola request, 5 min de vida). */
export function useCatalog(): Catalog | undefined {
  const { data } = useGetCatalog({
    query: {
      queryKey: getGetCatalogQueryKey(),
      enabled: ODOO_CATALOG_ENABLED,
      staleTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false,
    },
  });
  return ODOO_CATALOG_ENABLED ? data : undefined;
}

/** Productos de Odoo que corresponden al perfil 3D + material elegidos. */
export function matchingProducts(catalog: Catalog | undefined, productType: string, material: string): CatalogProduct[] {
  return (catalog?.products ?? []).filter(p => p.productType === productType && p.material === material);
}

/**
 * Hex de respaldo cuando el valor de color en Odoo no tiene "html_color" (hoy
 * los productos Hydrate no lo tienen cargado). Lo más específico primero:
 * "Verde Militar" antes que "Verde". Incluye la paleta propia de Hydrate.
 */
const NAMED: [RegExp, string][] = [
  [/negro y naranja/, "#1d1d1d"],
  [/verde militar/, "#4b5320"], [/verde salvia|salvia/, "#9caf88"], [/verde menta|menta|mint/, "#98d7c2"],
  [/verde pastel/, "#b8e0b0"], [/verde oliva|oliva|olive/, "#6b7a3a"], [/jade/, "#4f8f7a"], [/lima|lime/, "#c5d94a"],
  [/amarillo pastel/, "#f6e3a1"], [/amarillo sol|amarill|yellow/, "#f2c230"],
  [/rosado flamenco|rosa flamenco|flamenco/, "#f08a9a"], [/rosado pastel|rosa pastel|soft pink/, "#f4c2c9"],
  [/peach/, "#f6b38f"], [/coral/, "#f0806b"], [/cherry/, "#9b1b30"],
  [/azul pacifico|pacific/, "#1f6fa8"], [/azul marino|navy/, "#1e3a5f"], [/celeste|sky/, "#8ecae6"], [/aqua/, "#7fd3d0"],
  [/lila pastel/, "#cdb4e3"], [/lila|lilac|lavanda/, "#b39ddb"], [/violeta|purple|morad/, "#7d4fa0"],
  [/choco|chocolate|marr|brown/, "#5a3a2e"], [/beige|avena|arena|crema|nude/, "#d9c6a5"],
  [/grafito/, "#3d3f42"], [/gris|gray|grey/, "#9a9da1"],
  [/naranja|orange/, "#f08a24"], [/dorad|gold/, "#c9a24b"], [/platead|silver|inox|acero/, "#c7c9cc"],
  [/negro|negra|black/, "#161616"], [/blanco|blanca|white|perla/, "#f2f2f0"],
  [/rojo|roja|red|bordo|borgo/, "#c62828"], [/azul|blue/, "#2f5fb3"], [/verde|green/, "#3f8f4f"], [/rosa|pink/, "#f2a7bb"],
];
export function colorHexOf(v: Pick<CatalogVariant, "colorHex" | "colorName">): string {
  if (v.colorHex) return v.colorHex;
  const n = (v.colorName ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return NAMED.find(([re]) => re.test(n))?.[1] ?? "#9aa0a6";
}

export interface ColorOption { name: string; hex: string; inStock: boolean }

/**
 * Colores distintos del producto (en el orden de Odoo); con stock si alguna
 * variante lo tiene. Con `size`, solo los que vienen en ese tamaño (si el
 * producto lo tiene).
 */
export function colorOptions(p: CatalogProduct, size?: string | null): ColorOption[] {
  const out = new Map<string, ColorOption>();
  const bySize = size !== undefined && p.variants.some(v => (v.size ?? null) === size);
  for (const v of p.variants) {
    if (bySize && (v.size ?? null) !== size) continue;
    if (!v.colorName) continue;
    const prev = out.get(v.colorName);
    out.set(v.colorName, { name: v.colorName, hex: prev?.hex ?? colorHexOf(v), inStock: (prev?.inStock ?? false) || v.inStock });
  }
  return [...out.values()];
}

/** "20 oz", "500 ml", "1.2 L", "1,5 litros" → ml (para ordenar y mapear al 3D). */
export function volumeMl(label: string): number | null {
  const m = label.toLowerCase().replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(oz|ml|cc|l\b|lt|litro)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] === "oz" ? n * 29.57 : m[2] === "ml" || m[2] === "cc" ? n : n * 1000;
}

/** Tamaños distintos, de menor a mayor (los que no se pueden leer quedan al final, en su orden). */
export function sizeOptions(p: CatalogProduct): string[] {
  const sizes = [...new Set(p.variants.map(v => v.size).filter((s): s is string => !!s))];
  return sizes
    .map((s, i) => ({ s, i, ml: volumeMl(s) }))
    .sort((a, b) => (a.ml ?? Infinity) - (b.ml ?? Infinity) || a.i - b.i)
    .map(x => x.s);
}

/**
 * Tamaño de Odoo → tamaño del perfil 3D. Primero por volumen (el perfil con la
 * capacidad más cercana: "20 oz" → vaso 20oz); si no se puede leer el volumen,
 * por posición (el más chico al más chico).
 */
export function viewSizeId(product: ProductDef, sizes: string[], selected: string | null): string {
  const list = product.sizes;
  const middle = (list[1] ?? list[0]).id;
  if (!selected) return middle;
  const want = volumeMl(selected);
  const known = list.map(s => ({ id: s.id, ml: volumeMl(s.name) ?? volumeMl(s.label) }));
  if (want !== null && known.every(k => k.ml !== null)) {
    return known.reduce((a, b) => (Math.abs(b.ml! - want) < Math.abs(a.ml! - want) ? b : a)).id;
  }
  const n = sizes.length;
  if (n <= 1) return middle;
  const i = Math.max(0, sizes.indexOf(selected));
  return list[Math.round((i * (list.length - 1)) / (n - 1))].id;
}

/** Variante exacta para color + tamaño (null si esa combinación no existe). */
export function findVariant(p: CatalogProduct, color: string | null, size: string | null): CatalogVariant | null {
  return p.variants.find(v => (v.colorName ?? null) === color && (v.size ?? null) === size) ?? null;
}

/** Primera variante vendible (o la primera, si ninguna tiene stock). */
export function defaultVariant(p: CatalogProduct): CatalogVariant | null {
  return p.variants.find(v => v.inStock) ?? p.variants[0] ?? null;
}

export const formatGs = (n: number) => `Gs. ${Math.round(n).toLocaleString("es-PY")}`;

/** Precio del plan de grabado: el de Odoo si existe el servicio, si no el publicado en Tarifas. */
export function engravingPrice(catalog: Catalog | undefined, plan: EngravingPlanId): number {
  const fromOdoo = catalog?.engraving?.[plan];
  return typeof fromOdoo === "number" ? fromOdoo : (ENGRAVING_PLANS.find(p => p.id === plan)?.price ?? 0);
}

/** Secciones del catálogo de la tienda en el personalizador, en este orden. */
const CATALOG_SECTIONS: { title: string; types: string[] }[] = [
  { title: "Termos", types: ["termo-mate", "termo-mate-forge", "termo"] },
  { title: "Botellas", types: ["hoppie-hydrate", "hoppie", "termo-kids", "botella-ancha", "jug"] },
  { title: "Vasos", types: ["vaso-hydrate", "vaso-sunbeam", "vaso-espresso", "taza-manija", "mini-coffee", "vaso-taza", "coffee-cup", "vaso-shaker", "vaso-whisky", "vaso-manija", "vaso", "chopera"] },
  { title: "Guampas y copas", types: ["guampa", "copa-hydrate"] },
  { title: "Comida y bar", types: ["food-flask", "bowl", "ice-bucket"] },
];

/** Marca de las formas propias de la landing (sin producto de Odoo detrás). */
export const GENERIC_BRAND = "Genéricos";

/**
 * Un producto elegible en el catálogo del personalizador: uno de Odoo (con
 * foto, precio y stock) o una forma genérica propia (se cotiza aparte).
 */
export interface ShopItem {
  key: string;
  name: string;
  brand: string;
  /** Perfil 3D (ProductId de la landing). */
  type: string;
  thumb: string | null;
  from: number | null;
  /** Colores con stock (null en los genéricos: usan la paleta propia). */
  colors: number | null;
  odooId: number | null;
}

export interface CatalogSection { title: string; items: ShopItem[] }

/** Productos de Odoo de un material como ShopItem; los tipos sin perfil 3D en la landing no entran. */
export function odooShopItems(catalog: Catalog | undefined, material: string, known: (type: string) => boolean): ShopItem[] {
  return (catalog?.products ?? [])
    .filter(p => p.material === material && known(p.productType))
    .map(p => ({
      key: `odoo:${p.id}`,
      name: p.name,
      brand: p.brand || "Tienda",
      type: p.productType,
      thumb: catalogThumb(p),
      from: priceFrom(p),
      colors: new Set(p.variants.filter(v => v.inStock).map(v => v.colorName)).size,
      odooId: p.id,
    }));
}

/** Marcas presentes, en el orden de los ítems (las de Odoo primero, genéricos al final). */
export function shopBrands(items: ShopItem[]): string[] {
  const out = [...new Set(items.map(i => i.brand))];
  return [...out.filter(b => b !== GENERIC_BRAND), ...out.filter(b => b === GENERIC_BRAND)];
}

const fold = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Ítems agrupados por sección (Termos, Botellas…), filtrados por marca,
 * sección y texto (sin acentos ni mayúsculas). Con texto se busca en TODAS
 * las marcas: quien escribe "hoppie" quiere encontrarlo esté donde esté.
 */
export function shopSections(items: ShopItem[], opts: { brand?: string | null; section?: string | null; query?: string }): CatalogSection[] {
  const q = fold(opts.query?.trim() ?? "");
  const list = items.filter(i => (q ? fold(i.name).includes(q) : !opts.brand || i.brand === opts.brand));
  return CATALOG_SECTIONS
    .filter(s => !opts.section || s.title === opts.section)
    .map(s => ({ title: s.title, items: list.filter(i => s.types.includes(i.type)) }))
    .filter(s => s.items.length > 0);
}

/** Títulos de sección con algo para una marca (para los chips de categoría). */
export function sectionTitles(items: ShopItem[], brand: string | null): string[] {
  return shopSections(items, { brand }).map(s => s.title);
}

/** Foto chica del producto (la de 512 px pesa ~20 KB; para la tarjeta alcanza 256). */
export function catalogThumb(p: CatalogProduct): string | null {
  return p.imageUrl ? p.imageUrl.replace(/\/image_\d+$/, "/image_256") : null;
}

/** Precio más bajo con stock (o el más bajo, si ninguno tiene). */
export function priceFrom(p: CatalogProduct): number | null {
  const prices = (p.variants.some(v => v.inStock) ? p.variants.filter(v => v.inStock) : p.variants).map(v => v.price);
  return prices.length ? Math.min(...prices) : null;
}
