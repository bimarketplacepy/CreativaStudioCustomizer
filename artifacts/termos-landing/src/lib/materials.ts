import type { ProductId } from "./products";
import type { ObjectId } from "./objects";

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
      { id: "vaso",    name: "Vaso",    drinkwareProductId: "vaso" },
      { id: "hoppie",  name: "Hoppie",  drinkwareProductId: "hoppie" },
      { id: "guampa",  name: "Guampa",  drinkwareProductId: "guampa" },
      { id: "chopera", name: "Chopera", desc: "Chopera térmica de 710 ml con manija angular y tapa transparente.", drinkwareProductId: "chopera" },
    ],
  },
  {
    // Los mismos productos que "Acero con pintura recubierta", pero en su
    // acabado de acero natural sin pintar. Es una variante de acabado sobre los
    // mismos modelos 3D, no un catálogo aparte.
    id: "inox",
    name: "Acero inoxidable",
    icon: "steel",
    desc: "Acero inoxidable en su acabado natural cepillado, sin pintura: un estilo clásico y atemporal.",
    products: [
      { id: "termo",   name: "Termo",   drinkwareProductId: "termo" },
      { id: "vaso",    name: "Vaso",    drinkwareProductId: "vaso" },
      { id: "hoppie",  name: "Hoppie",  drinkwareProductId: "hoppie" },
      { id: "guampa",  name: "Guampa",  drinkwareProductId: "guampa" },
      { id: "chopera", name: "Chopera", desc: "Chopera térmica de 710 ml con manija angular y tapa transparente.", drinkwareProductId: "chopera" },
      { id: "abridor", name: "Abridor", desc: "Abridor de botellas de metal, plano y alargado.", objectId: "abridor" },
    ],
  },
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
  return (materialId === "acero" || materialId === "inox")
    && !!product?.drinkwareProductId
    && product.drinkwareProductId !== "guampa";
}
