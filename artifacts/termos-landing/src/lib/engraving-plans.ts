export type EngravingPlanId = "names" | "drawing" | "logo";
export type EngravingImageSize = "none" | "small" | "large";

export interface EngravingPlan {
  id: EngravingPlanId;
  title: string;
  subtitle?: string;
  /** Name used on the pricing cards, e.g. "Nombres + un logo". */
  shortLabel: string;
  /** Two-word name for the narrow plan picker buttons. */
  pickerLabel: string;
  price: number;
  priceLabel: string;
  allowsImage: boolean;
  imageSize: EngravingImageSize;
}

/** Included in every plan — stated once instead of repeated on each card. */
export const ENGRAVING_BASE = "Grabado de nombres y apellidos";

export const ENGRAVING_PLANS: EngravingPlan[] = [
  {
    id: "names",
    title: "Grabado de Nombres y Apellidos",
    shortLabel: "Solo nombres",
    pickerLabel: "Nombres",
    price: 35000,
    priceLabel: "Gs. 35.000",
    allowsImage: false,
    imageSize: "none",
  },
  {
    id: "drawing",
    title: "Grabado de Nombres y Apellidos",
    subtitle: "más un dibujo pequeño",
    shortLabel: "Nombres + un dibujo pequeño",
    pickerLabel: "+ Dibujo",
    price: 40000,
    priceLabel: "Gs. 40.000",
    allowsImage: true,
    imageSize: "small",
  },
  {
    id: "logo",
    title: "Grabado de Nombres y Apellidos",
    subtitle: "más un logo",
    shortLabel: "Nombres + un logo",
    pickerLabel: "+ Logo",
    price: 50000,
    priceLabel: "Gs. 50.000",
    allowsImage: true,
    imageSize: "large",
  },
];
