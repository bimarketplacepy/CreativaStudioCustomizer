import type { ProductId } from "./products";
import type { ObjectId } from "./objects";
import { printSpecFor } from "./print-specs";

export type MaterialId = "acero" | "inox" | "cuero" | "madera" | "boligrafos" | "cristal" | "plastico";

export interface MaterialProduct {
  id: string;
  name: string;
  desc?: string;
  /**
   * When set, this product runs the full drinkware flow (3D preview, tamaños,
   * color, técnica de grabado) using this base profile. Otherwise it uses the
   * simplified "a consultar" flow.
   */
  drinkwareProductId?: ProductId;
  /**
   * When set, this product renders a modelled 3D "blank" (box/flat shape) with
   * a laser-engraving-only preview. See `objects.ts` and `object-3d.tsx`.
   */
  objectId?: ObjectId;
}

export interface MaterialDef {
  id: MaterialId;
  name: string;
  /** Short helper line shown under the active material. */
  desc: string;
  /** Icon key resolved to a Lucide component in the customizer. */
  icon: string;
  /** Pen engraving: a bring-your-own vs shop-pen price toggle instead of products. */
  pens?: boolean;
  products: MaterialProduct[];
}

export const MATERIALS: MaterialDef[] = [
  {
    id: "acero",
    name: "Acero con pintura recubierta",
    icon: "cup",
    desc: "Drinkware de acero con recubrimiento de pintura electroestática de alta durabilidad: termos, vasos, hoppies, guampas y choperas.",
    products: [
      { id: "termo",   name: "Termo",   drinkwareProductId: "termo" },
      { id: "termo-mate", name: "Termo Mate", desc: "Termo para mate con manija de correa y tapa cebadora.", drinkwareProductId: "termo-mate" },
      { id: "termo-mate-forge", name: "Termo Mate Forge", desc: "Termo para mate de 1200 ml con manija lateral.", drinkwareProductId: "termo-mate-forge" },
      { id: "termo-kids", name: "Termo Kids", desc: "Termo infantil de 355 ml con tapa de pico y asa.", drinkwareProductId: "termo-kids" },
      { id: "hoppie-kids", name: "Hoppie Kids", desc: "Termo infantil de 350 ml con tapa de pico rebatible.", drinkwareProductId: "hoppie-kids" },
      { id: "vaso",    name: "Vaso",    drinkwareProductId: "vaso" },
      { id: "vaso-hydrate", name: "Vaso Hydrate", desc: "Vaso térmico con tapa transparente deslizable.", drinkwareProductId: "vaso-hydrate" },
      { id: "vaso-sunbeam", name: "Vaso Sunbeam", desc: "Vaso térmico con funda de silicona, tapa y pajita.", drinkwareProductId: "vaso-sunbeam" },
      { id: "vaso-espresso", name: "Vaso Taza Espresso", desc: "Taza térmica para espresso, sin tapa.", drinkwareProductId: "vaso-espresso" },
      { id: "taza-manija", name: "Vaso Manija", desc: "Jarro térmico con manija lateral y tapa transparente.", drinkwareProductId: "taza-manija" },
      { id: "mini-coffee", name: "Vaso Mini Coffee Mug", desc: "Taza térmica chica con manija lateral y tapa.", drinkwareProductId: "mini-coffee" },
      { id: "vaso-taza", name: "Vaso Taza", desc: "Jarro térmico con manija lateral y tapa.", drinkwareProductId: "vaso-taza" },
      { id: "coffee-cup", name: "Vaso Coffee Cup", desc: "Vaso térmico para café con tapa deslizable.", drinkwareProductId: "coffee-cup" },
      { id: "vaso-shaker", name: "Vaso Shaker", desc: "Vaso térmico shaker con tapa de pico y asa.", drinkwareProductId: "vaso-shaker" },
      { id: "vaso-cafe", name: "Vaso Café", desc: "Vaso térmico para café de 350 ml con tapa.", drinkwareProductId: "vaso-cafe" },
      { id: "vaso-whisky", name: "Vaso Whisky", desc: "Vaso térmico bajo para whisky, sin tapa.", drinkwareProductId: "vaso-whisky" },
      { id: "vaso-manija", name: "Vaso con manija", desc: "Vaso térmico de 887 ml con manija lateral y tapa transparente.", drinkwareProductId: "vaso-manija" },
      { id: "hoppie-hydrate", name: "Hoppie", desc: "Botella térmica con tapa de pico y asa.", drinkwareProductId: "hoppie-hydrate" },
      { id: "hoppie",  name: "Termo Frontier",  drinkwareProductId: "hoppie" },
      { id: "botella-ancha", name: "Botella", desc: "Botella térmica de boca ancha.", drinkwareProductId: "botella-ancha" },
      { id: "guampa",  name: "Guampa",  drinkwareProductId: "guampa" },
      { id: "copa-hydrate", name: "Copa", desc: "Copa térmica de vino sin tallo con tapa transparente.", drinkwareProductId: "copa-hydrate" },
      { id: "chopera", name: "Chopera", desc: "Chopera térmica de 710 ml con manija angular y tapa transparente.", drinkwareProductId: "chopera" },
      { id: "growler", name: "Growler", desc: "Growler térmico de 1,9 L con tapa con asa.", drinkwareProductId: "growler" },
      { id: "food-flask", name: "Food Flask", desc: "Termo de comida con tapa a rosca.", drinkwareProductId: "food-flask" },
      { id: "ice-bucket", name: "Ice Bucket", desc: "Hielera de acero con tapa.", drinkwareProductId: "ice-bucket" },
    ],
  },
  // "Acero inoxidable" (acabado natural cepillado) se quitó del selector por
  // pedido del dueño (2026-10-09). El código de acabado "inox" sigue en el
  // visor por si vuelve; los links compartidos con ese material abren en el
  // primero de la lista.
  {
    id: "cuero",
    name: "Cuero",
    icon: "wallet",
    desc: "Billeteras, guampas y termos forrados en cuero.",
    products: [
      { id: "guampa-cuero", name: "Guampa forrada",  desc: "Guampa forrada en cuero.", drinkwareProductId: "guampa" },
      { id: "termo-cuero",  name: "Termo forrado",    desc: "Termo forrado en cuero.",  drinkwareProductId: "termo" },
      { id: "billetera",    name: "Billetera",        desc: "Billetera de cuero tipo bifold.", objectId: "billetera" },
    ],
  },
  {
    id: "madera",
    name: "Madera",
    icon: "tree",
    desc: "Tablas y cajas de madera personalizadas.",
    products: [
      { id: "tabla",  name: "Tabla", desc: "Tabla de cortar de madera, plana y ancha.", objectId: "tabla" },
      { id: "cajita", name: "Caja",  desc: "Caja de madera rectangular con tapa.", objectId: "cajita" },
    ],
  },
  {
    id: "boligrafos",
    name: "Bolígrafos",
    icon: "pen",
    pens: true,
    desc: "Grabado de bolígrafos. El precio depende de quién pone el bolígrafo.",
    products: [],
  },
  {
    id: "cristal",
    name: "Cristal",
    icon: "wine",
    desc: "Copas de cristal personalizadas.",
    products: [
      { id: "copa", name: "Copa", desc: "Copa de cristal con pie y tallo.", drinkwareProductId: "copa" },
    ],
  },
  {
    id: "plastico",
    name: "Plástico",
    icon: "cooler",
    desc: "Productos plásticos personalizados con plotter de corte (vinilo), aplicable también a conservadoras y paredes.",
    products: [
      { id: "conservadora", name: "Conservadora", desc: "Conservadora de plástico rectangular con tapa.", objectId: "conservadora" },
    ],
  },
];

export interface PenOption {
  id: "own" | "shop";
  label: string;
  price: number;
  priceLabel: string;
}

/** Pen engraving price depends on whose pen it is. */
export const PEN_OPTIONS: PenOption[] = [
  { id: "shop", label: "Bolígrafo de la tienda", price: 20000, priceLabel: "Gs. 20.000" },
  { id: "own",  label: "Traigo mis bolígrafos",  price: 35000, priceLabel: "Gs. 35.000" },
];

export const DEFAULT_MATERIAL_ID: MaterialId = "acero";

export function getMaterial(id: string): MaterialDef {
  return MATERIALS.find(m => m.id === id) ?? MATERIALS[0];
}

/**
 * UV print (full colour) is offered on steel drinkware — both the powder-coated
 * pieces and the bare stainless (inox) finish. Bare-steel openers (abridores),
 * lined pieces (forrados), glass (copas, botellas), wood, leather, acrylic,
 * plastic and pens are all laser-engraving only. The guampa is engraving-only too.
 */
export function allowsColorPrint(materialId: string, product?: MaterialProduct): boolean {
  // Qué pieza entra en la Dacen F5 lo dice print-specs.ts (flag `dacen`).
  return (materialId === "acero" || materialId === "inox")
    && !!product?.drinkwareProductId
    && printSpecFor(product.drinkwareProductId)?.dacen === true;
}
