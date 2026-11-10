/**
 * Entrada de servidor (build `--ssr`, ver package.json): server.mjs la usa para
 * saber qué .glb va a pedir el personalizador embebido (?embed=odoo&product=<id>)
 * y precargarlo desde el HTML, en paralelo con el JS. Usa las mismas funciones
 * que customizer.tsx (pieza fija desde la tienda + Thermos3D), así no hay una
 * segunda tabla de modelos que mantener.
 */
import type { Catalog } from "@workspace/api-client-react";
import { MATERIALS } from "@/lib/materials";
import { getProduct, productForColor, productForSize } from "@/lib/products";
import { editionModelType, productForEdition, sizeOptions, viewSizeId } from "@/lib/odoo-catalog";

/**
 * URL del .glb (con su ?v=) de la variante de la tienda, o null si el
 * personalizador no la va a mostrar en 3D (sin perfil o agotada, como la pieza
 * fija de customizer.tsx).
 */
export function embedModelUrl(catalog: Catalog, variantId: number): string | null {
  for (const p of catalog.products ?? []) {
    const v = p.variants.find(x => x.id === variantId);
    if (!v) continue;
    const edition = v.club ?? null;
    const type = editionModelType(p, edition);
    const mp = MATERIALS.find(m => m.id === p.material)?.products.find(x => x.drinkwareProductId === type);
    if (!mp?.drinkwareProductId || !v.inStock) return null;
    const base = getProduct(mp.drinkwareProductId);
    const sizeId = viewSizeId(base, sizeOptions(productForEdition(p, edition)), v.size ?? null);
    return productForColor(productForSize(base, sizeId), v.colorName ?? null).model?.url ?? null;
  }
  return null;
}
