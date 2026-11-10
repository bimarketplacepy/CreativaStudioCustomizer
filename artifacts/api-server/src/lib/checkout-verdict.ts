/**
 * Veredicto de factibilidad en el servidor (PROMPT-ODOO-TIENDA §1.2 y §3):
 * arma las líneas del presupuesto con precios de Odoo y aplica las mismas
 * reglas que el editor (`feasibility` de @workspace/print-specs) sobre el
 * designState recibido. Lo que dice el navegador sobre precios, máquina o
 * diseño de artista no se usa: se recalcula.
 */
import { feasibility, getArtistDesignById, normalizeTechnique, type FeasibilityResult } from "@workspace/print-specs";
import { getCatalog } from "./catalog";
import { COLOR_CODES, artistCode, planOrder, type CheckoutLines, type PlannedOrder } from "./odoo-checkout";
import type { OdooClient } from "./odoo";

type DS = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Escrituras extra que se cobran (GRAB-EXTRA) y cómo se nombran en el resumen. */
export function extraLabels(ds: DS): string[] {
  const extra = (ds.extraEngraving ?? null) as { lid?: unknown; base?: unknown } | null;
  return [
    str(ds.text2) ? `texto 2 «${str(ds.text2)}»` : null,
    extra && typeof extra.lid === "string" ? `tapa «${extra.lid}»` : null,
    extra && typeof extra.base === "string" ? `base «${extra.base}»` : null,
  ].filter((l): l is string => !!l);
}

/** Qué servicios lleva el diseño (sin precios: los pone Odoo). */
export function linesFor(ds: DS): CheckoutLines {
  const technique = normalizeTechnique(str(ds.technique));
  const plan = str(ds.plan) ?? "names";
  const artistId = str((ds.artistDesign as DS | undefined)?.id);
  const artist = artistId ? getArtistDesignById(artistId) : null;
  return {
    variantId: ds.ownProduct === true ? null : typeof ds.odooVariantId === "number" ? ds.odooVariantId : null,
    technique,
    plan,
    extraTexts: extraLabels(ds).length,
    colorCode: technique === "color"
      ? ds.coverage === "wrap" ? COLOR_CODES.wrap : plan === "logo" || ds.hasCustomImage === true ? COLOR_CODES.front : COLOR_CODES.small
      : null,
    artistCode: artist ? artistCode(artist.id) : null,
  };
}

/**
 * Nombre de la pieza en la tienda tal como lo ve el cliente, con la edición
 * ("Vaso Taza · River Plate"): contra él se compara el modelo 3D exacto.
 */
export async function shopNameFor(variantId: number): Promise<string | null> {
  const catalog = await getCatalog();
  for (const p of catalog.products) {
    const v = p.variants.find(x => x.id === variantId);
    if (v) return v.club ? `${p.name} · ${v.club}` : p.name;
  }
  return null;
}

export interface ServerVerdict {
  result: FeasibilityResult;
  plan: PlannedOrder;
}

/** Líneas con precio de Odoo + veredicto. Solo lee de Odoo. */
export async function serverVerdict(client: OdooClient, ds: DS): Promise<ServerVerdict> {
  const lines = linesFor(ds);
  const plan = await planOrder(client, lines);
  const shop = plan.piece
    ? {
        name: await shopNameFor(plan.piece.id),
        variantExists: plan.piece.exists,
        inStock: plan.piece.inStock,
        price: plan.piece.price,
      }
    : null;
  // La pieza sin variante (genérica o del cliente) ya cuenta en el veredicto:
  // no se repite como «línea sin precio».
  const unpricedLines = plan.unpriced.filter(l => l !== "Pieza");
  const result = feasibility(ds, { shop, unpricedLines });
  return { result, plan };
}

/** Nota interna con el veredicto, para el chatter del presupuesto. */
export function verdictNote(r: FeasibilityResult): string {
  if (r.verdict === "OK") return "Veredicto: OK (se cobra directo, con firma).";
  return `Veredicto: ${r.verdict}. ${r.reasons.map(x => `• ${x.message}`).join(" ")}`;
}
