export type EngravingPlanId = "names" | "drawing" | "logo";
export type EngravingImageSize = "none" | "small" | "large";

export interface EngravingPlan {
  id: EngravingPlanId;
  title: string;
  subtitle?: string;
  /** Compact name used on the plan picker buttons. */
  shortLabel: string;
  price: number;
  priceLabel: string;
  allowsImage: boolean;
  imageSize: EngravingImageSize;
}

export const ENGRAVING_PLANS: EngravingPlan[] = [
  {
    id: "names",
    title: "Grabado de Nombres y Apellidos",
    shortLabel: "Nombres",
    price: 35000,
    priceLabel: "35.000gs",
    allowsImage: false,
    imageSize: "none",
  },
  {
    id: "drawing",
    title: "Grabado de Nombres y Apellidos",
    subtitle: "mas un dibujo pequeño",
    shortLabel: "Nombres + un dibujo pequeño",
    price: 40000,
    priceLabel: "40.000gs",
    allowsImage: true,
    imageSize: "small",
  },
  {
    id: "logo",
    title: "Grabado de Nombres y Apellidos",
    subtitle: "mas un logo",
    shortLabel: "Nombres + un logo",
    price: 50000,
    priceLabel: "50.000gs",
    allowsImage: true,
    imageSize: "large",
  },
];
