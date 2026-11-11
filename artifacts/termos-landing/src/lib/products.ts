import type { FaceId } from "./placement";
import type { KeepOutZone } from "./keep-out";

export type ProductId = "vaso" | "termo" | "hoppie" | "guampa" | "copa" | "botella" | "chopera" | "vaso-manija" | "botella-ancha" | "vaso-hydrate" | "vaso-sunbeam" | "termo-mate" | "termo-mate-forge" | "termo-kids" | "hoppie-hydrate" | "copa-hydrate" | "vaso-espresso" | "taza-manija" | "mini-coffee" | "vaso-taza" | "coffee-cup" | "vaso-shaker" | "food-flask" | "ice-bucket" | "vaso-whisky" | "growler" | "vaso-cafe" | "termo-sleek" | "hoppie-kids" | "termo-terere" | "vaso-guarani" | "guampa-terere" | "vaso-quencher" | "vaso-flip" | "vaso-pint" | "vaso-protour" | "taza-manija-palmeiras" | "termo-hydrate-palmeiras" | "matero-messi" | "vaso-luqueno" | "vaso-olimpia" | "vaso-manija-cerro" | "vaso-manija-luqueno" | "vaso-taza-river" | "vaso-taza-palmeiras" | "taza-enlozada";

export type CapStyle = "screw" | "lid" | "flip" | "none";
export type HandleStyle = "cap-d" | "cap-arch" | "body" | "body-d" | "body-square" | "none";

export interface ProductSize {
  id: string;
  /** Short label shown on the size button, e.g. "20oz". */
  name: string;
  /** Secondary line, e.g. "Estándar". */
  label: string;
  /** Uniform scale applied to the product profile. */
  scale: number;
  /**
   * Modelo 3D propio de ESTE tamaño (otro .glb, con su perfil medido): pisa el
   * del producto. Va con scale 1, el .glb ya tiene la medida real. Ver
   * productForSize.
   */
  shape?: Pick<ProductDef, "profile" | "band" | "model" | "frontFace">;
}

export interface ProductDef {
  id: ProductId;
  /** Plural name used for the product tab, e.g. "Termos". */
  name: string;
  singular: string;
  desc: string;
  cap: CapStyle;
  handle: HandleStyle;
  /** Silhouette as [radius, y] pairs, bottom → top, at scale 1. */
  profile: [number, number][];
  /**
   * Engravable band as [bottomY, topY] at scale 1 — the outer faces only.
   * Excludes the cap/lid and the rounded base, which we never engrave.
   */
  band: [number, number];
  /**
   * Per-product override of the single-face editable area (defaults live in
   * face-area.ts FRONT_FACE). Use it when the body is far from cylindrical and
   * the default rectangle would wedge its margins into a narrowing part of the
   * silhouette (e.g. the copa's bowl curving down into the stem).
   */
  frontFace?: { uHalfWidth?: number; vCenter?: number; vHeightFrac?: number };
  /**
   * Caras donde se puede grabar el texto (ver FACES en face-area.ts). Se sacan
   * las que caen sobre la manija (u 0.75 = "left", u 0.25 = "right"). El dorso
   * ("back") es el lado del logo de la marca en los modelos .glb (ver logoBack).
   * Default: las cuatro.
   */
  engraveFaces?: FaceId[];
  /**
   * El logo de la marca del .glb (piezas "logo*") cae en el dorso: esa cara se
   * ofrece como "Lado del logo" y, con un diseño encima, el 3D oculta el logo
   * (el diseño va en su lugar).
   */
  logoBack?: boolean;
  /**
   * Zonas sin grabado cargadas a mano (ver lib/keep-out.ts): relieves u otras
   * partes que el .glb no trae como pieza aparte. El logo, la manija y las
   * piezas "label*" / "relieve*" del modelo se detectan solas.
   */
  keepOut?: KeepOutZone[];
  sizes: ProductSize[];
  /**
   * Modelo 3D real (.glb, ver GUIA-MODELOS-3D.md) en lugar del lathe generado.
   * El `profile` describe solo el cuerpo pintable, medido sobre el propio .glb:
   * así el grabado, las guías y el fallback 2D siguen usando el mismo sistema.
   */
  model?: ProductModel;
}

export interface ProductModel {
  url: string;
  /** Unidades de perfil por metro del .glb (el .glb viene en metros). */
  unitsPerMeter: number;
  /** Altura (m, en el .glb) que queda en y = 0 del perfil. */
  centerYm: number;
  /** Alto total del .glb con tapa (m). */
  heightM: number;
  /** Distancia máxima al eje, manija incluida (m): encuadre por ancho. */
  reachM: number;
  /**
   * Productos de la tienda que ESTE modelo representa tal cual (por nombre). Los
   * demás que usan la misma forma la ven como aproximación (y se avisa).
   */
  exactFor?: string[];
  /**
   * Marca del producto del .glb, que trae su logo (default "Hydrate"): sobre
   * una pieza de otra marca el logo se oculta.
   */
  brand?: string;
  /**
   * Otro .glb según el color de la variante de Odoo (misma forma y medidas;
   * cambian tapa, manija o logo, que no se pintan): `match` es una parte del
   * nombre del color, sin mayúsculas ni tildes ("cherry blossom"). Sin
   * coincidencia, `url`. Ver productForColor.
   */
  colorModels?: { match: string; url: string }[];
  /**
   * Giro extra (grados, eje Y) para que el FRENTE del personalizador (donde se
   * graba) no caiga sobre el logo que el modelo trae en su +Z: con 180 el logo
   * queda atrás y la cara libre adelante.
   */
  yawDeg?: number;
  /** Piezas del .glb que se pintan con el color elegido (funda, boquilla…). */
  paint?: string[];
  /** Piezas pintadas con el color elegido, un poco más claro (texto en relieve). */
  paintLight?: string[];
  /** Piezas pintadas con el color elegido, más oscuro (ranuras, huecos). */
  paintDark?: string[];
  /**
   * Estampado de fábrica del cuerpo (la textura del .glb exportada a PNG): va
   * de base en lugar del color liso y el grabado se dibuja encima. Mapeo
   * cilíndrico del .glb: ancho = vuelta entera (u 0 en −Z), alto = cuerpo
   * entero de arriba a abajo (el perfil tiene que cubrir todo el "body").
   */
  bodyPrint?: string;
}

export const PRODUCTS: ProductDef[] = [
  {
    id: "vaso",
    name: "Vasos",
    singular: "Vaso",
    // Vaso GENÉRICO (artifacts/3D/forma-vaso.glb): vaso térmico cónico tipo
    // pinta, sin tapa, con aros de acero arriba y abajo. Perfil = radio del
    // cuerpo medido sobre el .glb (m × 14, centrado en 0,0775 m).
    desc: "Vaso térmico cónico, más ancho arriba.",
    cap: "none",
    handle: "none",
    profile: [
      [0.456, -0.822], [0.508, -0.175], [0.595, 0.904],
    ],
    band: [-0.70, 0.80],
    model: {
      url: "/models/forma-vaso.glb?v=1",
      unitsPerMeter: 14,
      centerYm: 0.0775,
      heightM: 0.155,
      reachM: 0.0435,
    },
    sizes: [
      { id: "vaso-12", name: "12oz", label: "Chico",   scale: 0.84 },
      { id: "vaso-20", name: "20oz", label: "Clásico", scale: 1.00 },
      { id: "vaso-30", name: "30oz", label: "Grande",  scale: 1.16 },
    ],
  },
  {
    id: "termo",
    name: "Termos",
    singular: "Termo",
    // Stanley Mate System 1.2 L — tall slim vacuum bottle for mate: ~10.2 cm
    // diameter × 30 cm tall (height:diameter ≈ 2.9:1), long straight body, screw
    // cap and a rigid side D-handle proportioned to the slim body.
    desc: "Termo alto y esbelto, con cuello, tapa a rosca y mango lateral.",
    cap: "screw",
    handle: "body-d",
    profile: [
      [0.00, -1.45], [0.11, -1.45],
      [0.43, -1.41], [0.51, -1.31],
      [0.51, -1.15], [0.51,  0.80],
      [0.50,  0.95], [0.45,  1.05],
      [0.38,  1.12], [0.35,  1.15],
    ],
    band: [-1.10, 0.72],
    // Caras de grabado: la manija del lathe está en +X = u 0.25 (derecha).
    engraveFaces: ["front", "back", "left"],
    sizes: [
      { id: "termo-20", name: "20oz", label: "Estándar", scale: 0.88 },
      { id: "termo-32", name: "32oz", label: "Grande",   scale: 1.00 },
      { id: "termo-40", name: "40oz", label: "XL",       scale: 1.14 },
    ],
  },
  {
    id: "termo-mate",
    name: "Termos Mate",
    singular: "Termo Mate",
    // Hydrate Termo Mate (artifacts/3D/termo-hydrate-amarillo-landing.glb):
    // cuerpo recto, tapa del color del cuerpo y manija de correa con remaches y
    // etiqueta. Perfil = radio del cuerpo medido sobre el .glb (m × 9, centrado
    // en 0,1675 m). El .glb es el de 1200 ml; los otros tamaños se escalan por
    // volumen. Logo atrás (yawDeg 180); con ese giro la manija (−X en el .glb)
    // queda en u 0.75.
    desc: "Termo para mate con manija de correa y tapa cebadora.",
    cap: "none",
    handle: "none",
    profile: [
      [0.387, -1.372], [0.387, 0.432], [0.384, 0.482],
      [0.374, 0.534], [0.357, 0.559], [0.354, 0.661],
    ],
    band: [-1.27, 0.38],
    // Cara frontal a 90° de la manija, sin llegar a ella.
    frontFace: { uHalfWidth: 0.16 },
    model: {
      url: "/models/termo-mate.glb?v=1",
      exactFor: ["Termo Mate"],
      unitsPerMeter: 9,
      centerYm: 0.1675,
      heightM: 0.335,
      reachM: 0.0605,
      yawDeg: 180,
      paint: ["lid", "lid_relieve", "label_text"],
      paintLight: ["label"],
      paintDark: ["handle_slot", "handle_hole"],
    },
    // Caras de grabado: manija a la izquierda (u 0.75); el dorso es el lado del logo.
    engraveFaces: ["front", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "termo-mate-800",  name: "800ml",  label: "Chico",   scale: 0.87 },
      { id: "termo-mate-915",  name: "915ml",  label: "Mediano", scale: 0.91 },
      { id: "termo-mate-1200", name: "1200ml", label: "Grande",  scale: 1.00 },
    ],
  },
  {
    id: "termo-mate-forge",
    name: "Termos Mate Forge",
    singular: "Termo Mate Forge",
    // Hydrate Termo Mate Forge 1200 ml (artifacts/3D/termo-hydrate-azul-landing.glb):
    // más ancho que el Termo Mate, tapa del color del cuerpo y manija rígida.
    // Perfil = radio del cuerpo medido sobre el .glb (m × 9, centrado en 0,16 m).
    // Logo atrás (yawDeg 180); con ese giro la manija (+X en el .glb) queda en u 0.25.
    desc: "Termo para mate de 1200 ml con manija lateral.",
    cap: "none",
    handle: "none",
    profile: [
      [0.450, -1.162], [0.450, 0.393], [0.443, 0.439],
      [0.365, 0.619], [0.364, 0.642],
    ],
    band: [-1.06, 0.34],
    frontFace: { uHalfWidth: 0.16 },
    model: {
      url: "/models/termo-mate-forge.glb?v=1",
      exactFor: ["Termo Mate Forge"],
      unitsPerMeter: 9,
      centerYm: 0.16,
      heightM: 0.32,
      reachM: 0.0965,
      yawDeg: 180,
      paint: ["lid"],
    },
    // Caras de grabado: manija a la derecha (u 0.25); el dorso es el lado del logo.
    engraveFaces: ["front", "left", "back"],
    logoBack: true,
    sizes: [
      { id: "termo-mate-forge-1200", name: "1200ml", label: "Clásico", scale: 1.00 },
    ],
  },
  {
    id: "termo-kids",
    name: "Termos Kids",
    singular: "Termo Kids",
    // Hydrate Termo Kids 355 ml (artifacts/3D/botella-kids-hydrate-negra-landing.glb):
    // cuerpo cilíndrico recto, aro de acero y tapa con pico rebatible y asa de
    // correa. Perfil = radio del cuerpo medido sobre el .glb (m × 11, centrado
    // en 0,1204 m). Logo atrás (yawDeg 180); el asa va sobre la tapa, así que
    // el cuerpo no tiene manija.
    desc: "Termo infantil de 355 ml con tapa de pico y asa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.382, -1.324], [0.402, -1.269], [0.402, 0.161],
      [0.398, 0.216], [0.381, 0.260],
    ],
    band: [-1.22, 0.12],
    frontFace: { uHalfWidth: 0.15 },
    model: {
      url: "/models/termo-kids.glb?v=1",
      exactFor: ["Termo Kids"],
      unitsPerMeter: 11,
      centerYm: 0.1204,
      heightM: 0.2408,
      reachM: 0.0417,
      yawDeg: 180,
      paint: ["lid", "strap"],
      paintLight: ["strap_text"],
      paintDark: ["lid_spout"],
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "termo-kids-355", name: "355ml", label: "Kids", scale: 1.00 },
    ],
  },
  {
    id: "hoppie",
    name: "Termos Frontier",
    singular: "Termo Frontier",
    // Hydrate Termo Frontier (en Odoo "V2 PRO series" y "TERMO 770/1060 ML"),
    // con tapa de asa (artifacts/3D/Termogv2pro.glb).
    // El Hoppie común tiene otra tapa: usa la botella de boca ancha genérica.
    // Perfil = radio del cuerpo medido sobre el .glb (m × 10, centrado en
    // 0,1299 m): cilindro recto que cierra en un hombro corto bajo el aro de
    // acero. Logo atrás (yawDeg 180): adelante, la cara libre.
    desc: "Botella térmica de boca ancha con tapa con asa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.381, -1.162], [0.383, -1.089], [0.383, 0.388],
      [0.382, 0.532], [0.345, 0.606],
    ],
    band: [-1.0, 0.45],
    frontFace: { uHalfWidth: 0.15 },
    model: {
      url: "/models/hoppie-v2-pro.glb?v=1",
      exactFor: ["Termo Frontier"],
      unitsPerMeter: 10,
      centerYm: 0.1299,
      heightM: 0.2598,
      reachM: 0.042,
      yawDeg: 180,
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "hoppie-770",  name: "770ml", label: "Clásico", scale: 1.00 },
      { id: "hoppie-1000", name: "1060ml", label: "Grande", scale: 1.11 },
    ],
  },
  {
    id: "hoppie-hydrate",
    // En la tienda: "Termo Hydrate 530 Ml" (el termito) y "Termo Hydrate Litro"
    // (946 ml). El id queda "hoppie-hydrate" para no romper links ni pedidos.
    name: "Termos Hydrate",
    singular: "Termo Hydrate",
    // Hydrate Hoppie (artifacts/3D/hoppie.glb, 2026-11-04): cuerpo recto de
    // 188 mm × Ø 74 mm, aro de acero y tapa negra con asa rebatible (lid_strap);
    // 219 mm de alto con tapa. Perfil = radio del cuerpo medido sobre el .glb
    // (m × 10, centrado en 0,1097 m). El .glb es el termito de 530 ml
    // (escala 1); el Litro (946 ml) se escala por volumen: ∛(946/530) ≈ 1,21.
    // Logo atrás (yawDeg 180). Solo el cuerpo lleva el color elegido: tapa y
    // asa son las del .glb.
    desc: "Botella térmica con tapa con asa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.355, -1.097], [0.370, -1.067], [0.370, 0.743],
      [0.366, 0.763], [0.348, 0.783],
    ],
    band: [-0.98, 0.62],
    frontFace: { uHalfWidth: 0.15 },
    model: {
      url: "/models/hoppie.glb?v=1",
      exactFor: ["Termo Hydrate"],
      unitsPerMeter: 10,
      centerYm: 0.1097,
      heightM: 0.2194,
      reachM: 0.0405,
      yawDeg: 180,
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "hoppie-hydrate-530",  name: "530ml", label: "Termito", scale: 1.00 },
      // "1L" es como Odoo nombra el Litro; mide 946 ml.
      { id: "hoppie-hydrate-1000", name: "1L",    label: "Litro",   scale: 1.21 },
    ],
  },
  {
    id: "termo-hydrate-palmeiras",
    name: "Termos Hydrate Palmeiras",
    singular: "Termo Hydrate Palmeiras",
    // Hydrate "Termo Hydrate Litro" de la edición de Palmeiras (artifacts/3D/
    // HYDRATE/CLUBES/botella-hydrate-palmeiras-h1.glb): cuerpo recto de 176 mm
    // × Ø 73 mm, aro de acero, tapa negra con pico y correa (strap) que sube
    // hasta 273 mm. En el .glb el logo Hydrate va adelante (+Z) y el escudo del
    // club atrás (−Z); las franjas blancas dan toda la vuelta abajo (8–38 mm).
    // Con yawDeg 90 el logo queda a la izquierda y el escudo a la derecha:
    // adelante y atrás, las caras libres. La banda arranca arriba de las
    // franjas. Perfil = radio del cuerpo medido sobre el .glb (m × 10, centrado
    // en 0,1364 m: la correa lo hace más alto). El .glb tiene la proporción del
    // termito; el Litro (946 ml) se escala como el Termo Hydrate liso: 1,21.
    // Edición 1 (258910, "Verde Militar · Ed. 1"): termo-palmeiras-edicion1.glb,
    // el mismo cuerpo, tapa y correa; logo arriba y escudo abajo en +Z, leyenda
    // de licencia y nombre del club abajo en −Z (hasta 29 mm), sin franjas.
    // Edición 2 (258911): el H1 de arriba.
    desc: "Botella térmica de 1 litro de la edición oficial de Palmeiras.",
    cap: "none",
    handle: "none",
    profile: [
      [0.347, -1.364], [0.364, -1.324], [0.365, -1.284], [0.365, 0.316],
      [0.360, 0.356], [0.346, 0.396],
    ],
    band: [-0.914, 0.236],
    frontFace: { uHalfWidth: 0.12 },
    model: {
      url: "/models/botella-hydrate-palmeiras-h1.glb?v=1",
      colorModels: [
        { match: "ed. 1", url: "/models/termo-palmeiras-edicion1.glb?v=1" },
        { match: "ed. 2", url: "/models/botella-hydrate-palmeiras-h1.glb?v=1" },
      ],
      exactFor: ["Termo Hydrate · Palmeiras"],
      unitsPerMeter: 10,
      centerYm: 0.1364,
      heightM: 0.2728,
      reachM: 0.0422,
      yawDeg: 90,
    },
    // A los costados van el logo y el escudo: se graba adelante y atrás.
    engraveFaces: ["front", "back"],
    sizes: [
      // "1L" es como Odoo nombra el Litro; mide 946 ml.
      { id: "termo-hydrate-palmeiras-1000", name: "1L", label: "Litro", scale: 1.21 },
    ],
  },
  {
    id: "hoppie-kids",
    name: "Hoppies Kids",
    singular: "Hoppie Kids",
    // Hydrate Kids 350 ml (en Odoo "Kids <color>"; artifacts/3D/hoppie-kids.glb):
    // cuerpo recto bajo, tapa con pico rebatible y aro para colgar. Perfil =
    // radio del cuerpo medido sobre el .glb (m × 12, centrado en 0,0876 m).
    // Logo atrás (yawDeg 180).
    desc: "Termo infantil de 350 ml con tapa de pico rebatible.",
    cap: "none",
    handle: "none",
    profile: [
      [0.412, -1.051], [0.437, -1.027], [0.438, -1.015], [0.438, 0.419],
      [0.426, 0.467], [0.403, 0.497], [0.389, 0.515], [0.403, 0.545],
      [0.414, 0.563], [0.391, 0.587], [0.348, 0.611],
    ],
    band: [-0.90, 0.38],
    frontFace: { uHalfWidth: 0.15 },
    model: {
      url: "/models/hoppie-kids.glb?v=1",
      exactFor: ["Hoppie Kids"],
      unitsPerMeter: 12,
      centerYm: 0.0876,
      heightM: 0.1752,
      reachM: 0.062,
      yawDeg: 180,
    },
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "hoppie-kids-350", name: "350ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "termo-sleek",
    name: "Termos Sleek Line",
    singular: "Termo Sleek Line",
    // Hydrate Termo Sleek Line (en Odoo "620ml / 710ml <color>" y "TERMO 710
    // ML"; artifacts/3D/sleek.glb): cuerpo delgado que entra en el portavasos,
    // hombro que cierra en un cuello angosto, tapa negra a rosca con correa.
    // Perfil = radio del cuerpo medido sobre el .glb (m × 10, centrado en
    // 0,1113 m). Se toma como el de 620 ml; el de 710 se escala. Logo atrás
    // (yawDeg 180).
    desc: "Termo de cuerpo delgado con tapa a rosca y asa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.338, -1.113], [0.359, -1.093], [0.360, -1.083], [0.360, 0.547],
      [0.354, 0.597], [0.326, 0.647], [0.266, 0.692], [0.232, 0.727],
      [0.232, 0.827],
    ],
    band: [-0.98, 0.52],
    frontFace: { uHalfWidth: 0.15 },
    model: {
      url: "/models/termo-sleek.glb?v=1",
      exactFor: ["Termo Sleek Line"],
      unitsPerMeter: 10,
      centerYm: 0.1113,
      heightM: 0.2226,
      reachM: 0.036,
      yawDeg: 180,
    },
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "termo-sleek-620", name: "620ml", label: "Clásico", scale: 1.00 },
      { id: "termo-sleek-710", name: "710ml", label: "Grande",  scale: 1.05 },
    ],
  },
  {
    id: "termo-terere",
    name: "Termos forrados",
    singular: "Termo forrado",
    // Termo de tereré forrado en cuero (artifacts/3D/termo-terere.glb): funda
    // de cuero cosida con la costura atrás (−Z), bolsillo con tira en el
    // costado (−X del .glb = u 0.25, «Costado der.»), tapa negra de jarra con
    // pico al frente y asa que baja hasta 0,146 m a los costados. Perfil =
    // radio de la funda medido sobre el .glb (m × 10, centrado en 0,1358 m).
    // Se graba al frente y en el costado izquierdo: atrás está la costura y
    // del otro lado el bolsillo. La banda corta en 0,14 m, debajo del asa.
    desc: "Termo de tereré forrado en cuero, con bolsillo lateral y tapa con pico.",
    cap: "none",
    handle: "none",
    profile: [
      [0.645, -1.358], [0.650, -1.308], [0.650, 0.242],
      [0.656, 0.342], [0.656, 0.482],
    ],
    band: [-1.13, 0.04],
    model: {
      url: "/models/termo-terere.glb?v=1",
      unitsPerMeter: 10,
      centerYm: 0.1358,
      heightM: 0.2716,
      reachM: 0.097,
      // Piezas de la funda (mismo material «body» en el .glb): del color elegido.
      paint: ["sleeve_seam", "pocket", "pocket_tie", "lid_grip"],
    },
    engraveFaces: ["front", "left"],
    sizes: [
      { id: "termo-terere-unico", name: "Único", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "botella-ancha",
    name: "Botellas",
    singular: "Botella",
    // Botella de boca ancha GENÉRICA (lathe): Termo y Hoppie Kids de Odoo, sin
    // modelo 3D propio.
    // Botella de boca ancha (h:d ≈ 2.6:1): fondo plano con fillet suave, cuerpo
    // cilíndrico perfecto con una junta horizontal muy sutil a ~12% de la altura
    // (unión del fondo aislante), hombro convexo tipo domo y cuello ANCHO
    // (~63% del diámetro del cuerpo). La pintura termina donde arranca el
    // cuello roscado de acero pulido, que se modela aparte (HoppieNeck).
    desc: "Botella de boca ancha: cuerpo cilíndrico recto, hombro tipo domo y cuello roscado de acero, sin tapa.",
    cap: "screw",
    handle: "none",
    profile: [
      [0.00, -1.35], [0.46, -1.35],
      [0.52, -1.29],
      [0.52, -1.08], [0.513, -1.03], [0.52, -0.98],
      [0.52,  0.59],
      [0.518,  0.66], [0.510,  0.72], [0.495,  0.78],
      [0.470,  0.83], [0.435,  0.875], [0.390,  0.915],
      [0.350,  0.940], [0.330,  0.950],
    ],
    band: [-0.94, 0.40],
    // El área editable queda solo en la zona cilíndrica (15–65% de la altura) y
    // abarca ~55% del arco visible, así el decal nunca se distorsiona en el domo.
    frontFace: { uHalfWidth: 0.14 },
    sizes: [
      { id: "botella-ancha-20", name: "20oz", label: "Chico",   scale: 0.86 },
      { id: "botella-ancha-30", name: "30oz", label: "Clásico", scale: 1.00 },
      { id: "botella-ancha-40", name: "40oz", label: "Grande",  scale: 1.14 },
    ],
  },
  {
    id: "growler",
    name: "Growlers",
    singular: "Growler",
    // Hydrate "Growler 1.9lts" (= "JARRA 1900 ML" en Odoo; artifacts/3D/
    // growler-hydrate-oliva.glb): cilindro ancho con hombro que cierra en la
    // boca, tapa con asa del color del cuerpo. Perfil = radio del cuerpo medido
    // sobre el .glb (m × 8, centrado en 0,14265 m). Logo atrás (yawDeg 180).
    desc: "Growler térmico de 1,9 L con tapa con asa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.479, -1.141], [0.480, -1.081], [0.480, 0.359], [0.470, 0.419],
      [0.425, 0.479], [0.326, 0.539], [0.275, 0.599], [0.267, 0.659],
    ],
    band: [-1.0, 0.33],
    model: {
      url: "/models/growler.glb?v=1",
      exactFor: ["Growler"],
      unitsPerMeter: 8,
      centerYm: 0.14265,
      heightM: 0.2853,
      reachM: 0.06,
      yawDeg: 180,
      paint: ["lid", "lid_handle"],
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "growler-1900", name: "1.9L", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "food-flask",
    name: "Food Flasks",
    singular: "Food Flask",
    // Hydrate Food Flask (artifacts/3D/flask-830ml.glb, el de 830 ml): cilindro
    // ancho de base redondeada, aro de acero y tapa a rosca del color del
    // cuerpo. Perfil = radio del cuerpo medido sobre el .glb (m × 14, centrado
    // en 0,06645 m). El de 355 y el de 591 ml tienen modelo propio (shape del
    // tamaño), en la misma escala. Logo atrás (yawDeg 180).
    desc: "Termo de comida: cilindro ancho y bajo con tapa a rosca.",
    cap: "none",
    handle: "none",
    profile: [
      [0.531, -0.930], [0.605, -0.895], [0.644, -0.853], [0.664, -0.797],
      [0.665, -0.776], [0.665,  0.442], [0.659,  0.456],
    ],
    band: [-0.75, 0.41],
    model: {
      url: "/models/food-flask-830.glb?v=1",
      exactFor: ["Food Flask"],
      unitsPerMeter: 14,
      centerYm: 0.06645,
      heightM: 0.1329,
      reachM: 0.0475,
      yawDeg: 180,
      paint: ["lid"],
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      {
        id: "food-flask-355", name: "355ml", label: "Chico", scale: 1.00,
        // artifacts/3D/flask-355ml.glb: mismo cuerpo, más bajo. Perfil medido
        // sobre el .glb (m × 14, centrado en 0,03935 m).
        shape: {
          profile: [
            [0.531, -0.551], [0.605, -0.516], [0.644, -0.474], [0.664, -0.418],
            [0.665, -0.397], [0.665,  0.041], [0.659,  0.055],
          ],
          band: [-0.37, 0.01],
          model: {
            url: "/models/food-flask-355.glb?v=1",
            exactFor: ["Food Flask"],
            unitsPerMeter: 14,
            centerYm: 0.03935,
            heightM: 0.0787,
            reachM: 0.0475,
            yawDeg: 180,
            paint: ["lid"],
          },
        },
      },
      {
        id: "food-flask-591", name: "591ml", label: "Mediano", scale: 1.00,
        // artifacts/3D/flask-591ml.glb: perfil medido sobre el .glb (m × 14,
        // centrado en 0,0515 m).
        shape: {
          profile: [
            [0.531, -0.721], [0.605, -0.686], [0.644, -0.644], [0.664, -0.588],
            [0.665, -0.567], [0.665,  0.258], [0.659,  0.272],
          ],
          band: [-0.54, 0.23],
          model: {
            url: "/models/food-flask-591.glb?v=1",
            exactFor: ["Food Flask"],
            unitsPerMeter: 14,
            centerYm: 0.0515,
            heightM: 0.103,
            reachM: 0.0475,
            yawDeg: 180,
            paint: ["lid"],
          },
        },
      },
      { id: "food-flask-830", name: "830ml", label: "Grande", scale: 1.00 },
    ],
  },
  {
    id: "ice-bucket",
    name: "Ice Buckets",
    singular: "Ice Bucket",
    // Hydrate "Ice Bucket" 3250 ml (artifacts/3D/hielera-hydrate-coral.glb):
    // balde que se abre hacia arriba, aro de acero y tapa con perilla del color
    // del cuerpo. Perfil = radio del cuerpo medido sobre el .glb (m × 12,
    // centrado en 0,08215 m). Logo atrás (yawDeg 180).
    desc: "Hielera de acero con tapa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.689, -0.986], [0.692, -0.878], [0.709, -0.771], [0.740, -0.341],
      [0.773, -0.018], [0.805,  0.304], [0.840,  0.734],
    ],
    band: [-0.80, 0.66],
    model: {
      url: "/models/ice-bucket.glb?v=1",
      exactFor: ["Ice Bucket"],
      unitsPerMeter: 12,
      centerYm: 0.08215,
      heightM: 0.1643,
      reachM: 0.0702,
      yawDeg: 180,
      paint: ["lid", "lid_knob"],
    },
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "ice-bucket-3250", name: "3250ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "guampa",
    name: "Guampas",
    singular: "Guampa",
    // Guampa Hydrate (artifacts/3D/Guampa.glb, 2026-10-14): vaso bajo y ancho
    // con cuerpo apenas abarrilado (más ancho a un tercio de la altura), base
    // y aro superior de acero, y tapa con pico. Perfil = radio del cuerpo
    // pintable medido sobre el .glb (m × 14, centrado en 0,05565 m, la mitad
    // del alto con tapa). Logo atrás (yawDeg 180).
    desc: "Guampa térmica baja y ancha, con tapa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.535, -0.540], [0.552, -0.484], [0.578, -0.426], [0.585, -0.370],
      [0.588, -0.313], [0.587, -0.257], [0.581, -0.199], [0.575, -0.143],
      [0.571, -0.029], [0.567,  0.027], [0.563,  0.085], [0.559,  0.198],
      [0.556,  0.254], [0.553,  0.311], [0.552,  0.368],
    ],
    // Zona grabable: el cuerpo pintado (17–82 mm) menos ~3 mm arriba y abajo.
    band: [-0.492, 0.320],
    model: {
      url: "/models/guampa.glb?v=3",
      unitsPerMeter: 14,
      centerYm: 0.05565,
      heightM: 0.1113,
      reachM: 0.0555,
      yawDeg: 180,
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "guampa-sm", name: "Chica",   label: "300ml", scale: 0.84 },
      { id: "guampa-md", name: "Mediana", label: "500ml", scale: 1.00 },
      { id: "guampa-lg", name: "Grande",  label: "750ml", scale: 1.16 },
    ],
  },
  {
    id: "matero-messi",
    name: "Materos Classic Messi",
    singular: "Matero Classic Messi",
    // Stanley Matero Classic 236 ml, edición "GOAT" de Messi (Odoo: "MATERO/
    // GUAMPA CLASSIC 236 ML ROSA MESSI", artifacts/3D/STANLEY/mate-stanley-goat-
    // rosa-v2.glb): cuerpo de 101 mm que se angosta hacia arriba (Ø 79 mm a
    // 22 mm del piso, Ø 69 mm a 87 mm) y abre en el labio, con aro de acero y
    // leyenda arriba. Logo Stanley y "logo_since" adelante (+Z); "GOAT" vertical
    // y la "M" atrás (−Z). Con yawDeg 90 los logos quedan a los costados y
    // adelante y atrás, las caras libres. Perfil = radio del cuerpo medido sobre
    // el .glb (m × 14, centrado en 0,0535 m, la mitad del alto con el aro).
    desc: "Matero térmico Stanley de 236 ml, edición GOAT de Messi.",
    cap: "none",
    handle: "none",
    profile: [
      [0.454, -0.749], [0.476, -0.679], [0.510, -0.609], [0.533, -0.539],
      [0.549, -0.469], [0.552, -0.399], [0.547, -0.329], [0.540, -0.231],
      [0.533, -0.147], [0.526, -0.049], [0.518,  0.021], [0.511,  0.133],
      [0.504,  0.203], [0.497,  0.301], [0.490,  0.371], [0.484,  0.469],
      [0.497,  0.539], [0.517,  0.581], [0.540,  0.623], [0.552,  0.651],
    ],
    // Zona grabable: el tramo cónico del cuerpo (18–83 mm), sin la base ni el labio.
    band: [-0.497, 0.413],
    frontFace: { uHalfWidth: 0.14 },
    model: {
      url: "/models/mate-stanley-goat-rosa.glb?v=1",
      exactFor: ["Matero Classic · Messi"],
      brand: "Stanley",
      unitsPerMeter: 14,
      centerYm: 0.0535,
      heightM: 0.107,
      reachM: 0.0401,
      yawDeg: 90,
    },
    // A los costados van los logos de fábrica: se graba adelante y atrás.
    engraveFaces: ["front", "back"],
    sizes: [
      { id: "matero-messi-236", name: "236ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "guampa-terere",
    name: "Guampas forradas",
    singular: "Guampa forrada",
    // Guampa de tereré forrada en cuero (artifacts/3D/guampa-terere.glb):
    // funda cónica (más angosta abajo) entre dos bandas de cuero, con la
    // costura y el cordón atrás (−Z) y pespunte arriba y abajo. Perfil = radio
    // de la funda medido sobre el .glb (m × 14, centrado en 0,057 m). Se graba
    // al frente y a los costados: atrás va el cordón.
    desc: "Guampa de tereré forrada en cuero, con cordón y pespunte.",
    cap: "none",
    handle: "none",
    profile: [
      [0.357, -0.525], [0.382, -0.378], [0.406, -0.238], [0.430, -0.098],
      [0.454,  0.042], [0.477,  0.182], [0.501,  0.322], [0.528,  0.476],
    ],
    // Zona grabable: la funda (19,5–91 mm) menos ~4 mm de pespunte arriba y abajo.
    band: [-0.47, 0.42],
    model: {
      url: "/models/guampa-terere.glb?v=1",
      unitsPerMeter: 14,
      centerYm: 0.057,
      heightM: 0.114,
      reachM: 0.0435,
      // Bandas de cuero de arriba y abajo (material «body» en el .glb): del color elegido.
      paint: ["band_top", "band_bottom"],
    },
    engraveFaces: ["front", "left", "right"],
    sizes: [
      { id: "guampa-terere-unico", name: "Único", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "copa-hydrate",
    name: "Copas Hydrate",
    singular: "Copa",
    // Hydrate "Copa" 267 ml (artifacts/3D/vaso-vino-hydrate-aqua-landing.glb):
    // vaso de vino sin tallo, cuerpo tipo huevo, aro de acero y tapa
    // transparente. Perfil = radio del cuerpo medido sobre el .glb (m × 20,
    // centrado en 0,058 m). Logo atrás (yawDeg 180).
    desc: "Copa térmica de vino sin tallo con tapa transparente.",
    cap: "none",
    handle: "none",
    profile: [
      [0.562, -1.16], [0.632, -1.06], [0.680, -0.96], [0.716, -0.86],
      [0.752, -0.76], [0.782, -0.66], [0.800, -0.56], [0.832, -0.46],
      [0.848, -0.36], [0.862, -0.26], [0.872, -0.16], [0.878, -0.06],
      [0.880,  0.04], [0.880,  0.14], [0.874,  0.24], [0.870,  0.34],
      [0.862,  0.44], [0.854,  0.54], [0.846,  0.64], [0.836,  0.746],
    ],
    band: [-0.70, 0.64],
    // Cuerpo curvo: el área se queda en la panza (radio casi constante) y con
    // un arco más corto para que los bordes no se vean torcidos.
    frontFace: { uHalfWidth: 0.17, vCenter: 0.55, vHeightFrac: 0.7 },
    model: {
      url: "/models/copa-hydrate.glb?v=1",
      exactFor: ["Copa"],
      unitsPerMeter: 20,
      centerYm: 0.058,
      heightM: 0.116,
      reachM: 0.0492,
      yawDeg: 180,
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "copa-hydrate-267", name: "267ml", label: "Clásica", scale: 1.00 },
    ],
  },
  {
    id: "copa",
    name: "Copas",
    singular: "Copa",
    // Copa de cristal tipo pilsner — pie ancho, tallo fino y bombé acampanado (ref. copas.jpeg)
    desc: "Copa de cristal con pie, tallo fino y bombé acampanado.",
    cap: "none",
    handle: "none",
    profile: [
      [0.00, -1.30], [0.52, -1.30],
      [0.52, -1.26], [0.30, -1.22],
      [0.09, -1.14], [0.07, -0.95],
      [0.07, -0.66], [0.14, -0.55],
      [0.28, -0.34], [0.40, -0.06],
      [0.47,  0.24], [0.48,  0.50],
      [0.46,  0.80], [0.43,  1.05],
      [0.41,  1.20],
    ],
    band: [-0.20, 1.02],
    // El bombé no es cilíndrico: el radio pasa de 0.28 (abajo, camino al tallo)
    // a 0.48 (panza) y 0.41 (borde). Con el área default, el margen inferior
    // caía en la zona cónica que se estrecha → esquinas "pellizcadas". Se centra
    // el área en la parte alta del bombé (radio casi constante 0.43-0.48) y se
    // acorta el arco horizontal para que los bordes laterales se vean rectos
    // de frente en la superficie curva.
    frontFace: { uHalfWidth: 0.18, vCenter: 0.43, vHeightFrac: 0.72 },
    sizes: [
      { id: "copa-sm", name: "Chica",   label: "300ml", scale: 0.88 },
      { id: "copa-md", name: "Mediana", label: "450ml", scale: 1.00 },
      { id: "copa-lg", name: "Grande",  label: "600ml", scale: 1.12 },
    ],
  },
  {
    id: "botella",
    name: "Botellas",
    singular: "Botella",
    // Botella de vidrio tipo decanter (aprox. redonda del Johnnie Walker Swing, ref. botella.jpeg)
    desc: "Botella de vidrio, cuerpo bombé con cuello corto y tapa.",
    cap: "screw",
    handle: "none",
    profile: [
      [0.00, -1.25], [0.34, -1.23],
      [0.56, -1.10], [0.66, -0.84],
      [0.68, -0.52], [0.66, -0.22],
      [0.58,  0.06], [0.45,  0.30],
      [0.30,  0.48], [0.19,  0.60],
      [0.16,  0.82], [0.18,  0.90],
    ],
    band: [-0.80, 0.16],
    sizes: [
      { id: "botella-sm", name: "Chica",   label: "500ml", scale: 0.90 },
      { id: "botella-md", name: "Clásica", label: "750ml", scale: 1.00 },
      { id: "botella-lg", name: "Grande",  label: "1L",    scale: 1.12 },
    ],
  },
  {
    id: "chopera",
    name: "Choperas",
    singular: "Chopera",
    // Chopera térmica 710 ml (h:d ≈ 1.75:1): vaso cilíndrico PERFECTAMENTE
    // recto, bajo y ancho tipo jarro cervecero. El lathe cubre solo la zona
    // pintada (0–86% de la altura); la banda de acero cepillado (86–96%), la
    // tapa transparente y la manija cuadrada se modelan aparte (ChoperaTop y
    // el handle "body-square" en thermos-3d).
    desc: "Chopera térmica de 710 ml: cilindro recto con banda de acero, tapa transparente y manija angular.",
    cap: "flip",
    handle: "body-square",
    profile: [
      [0.00, -1.05], [0.54, -1.05],
      [0.60, -0.99],
      [0.60,  0.756],
    ],
    band: [-0.80, 0.52],
    // Cara frontal a 90° de la manija; ~55% del arco visible (12–75% de altura).
    frontFace: { uHalfWidth: 0.14 },
    // Caras de grabado: la manija del lathe está en +X = u 0.25 (derecha).
    engraveFaces: ["front", "back", "left"],
    sizes: [
      { id: "chopera-710", name: "710ml", label: "Clásica", scale: 1.00 },
    ],
  },
  {
    id: "vaso-manija",
    name: "Vasos con manija",
    singular: "Vaso con manija",
    // Hydrate "Vaso con Pico y Agarre" 887 ml — primera forma con modelo real
    // (artifacts/3D/forma-vaso-manijaV4.glb). Perfil = radio del cuerpo medido
    // sobre el .glb (m × 12, centrado en 0,1015 m). Cuerpo cónico abajo, escalón
    // a ~45% de la altura y parte superior casi recta, donde va la manija. La V4
    // suma el logo Hydrate, que en el .glb ya está atrás (−Z): sin giro extra.
    desc: "Vaso térmico de 887 ml con manija lateral y tapa transparente.",
    cap: "none",
    handle: "none",
    profile: [
      [0.438, -0.994], [0.446, -0.871], [0.452, -0.748], [0.458, -0.625],
      [0.466, -0.502], [0.473, -0.379], [0.481, -0.256], [0.532, -0.133],
      [0.572, -0.010], [0.576,  0.113], [0.578,  0.236], [0.582,  0.359],
      [0.586,  0.482], [0.588,  0.605], [0.590,  0.727], [0.594,  0.850],
      [0.596,  0.973],
    ],
    band: [-0.92, 0.90],
    // Cara frontal a 90° de la manija (u 0.75), en la parte superior recta:
    // el área no baja al escalón del cuerpo ni toca la manija.
    frontFace: { uHalfWidth: 0.16, vCenter: 0.27, vHeightFrac: 0.46 },
    model: {
      url: "/models/forma-vaso-manija.glb?v=4",
      exactFor: ["Vaso con Pico y Agarre"],
      unitsPerMeter: 12,
      centerYm: 0.1015,
      heightM: 0.203,
      reachM: 0.0842,
    },
    // Caras de grabado: manija a la izquierda (u 0.75); el dorso es el lado del logo.
    engraveFaces: ["front", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "vaso-manija-887",  name: "887ml",  label: "Clásico", scale: 1.00 },
      { id: "vaso-manija-1183", name: "1183ml", label: "Grande",  scale: 1.10 },
    ],
  },
  {
    id: "vaso-quencher",
    name: "Vasos Quencher",
    singular: "Vaso Quencher",
    // Stanley Quencher H2.0 FlowState 1183 ml (artifacts/3D/STANLEY/
    // vaso-stanley-quencher-rosa-v3.glb; el de 591 y el de 887 ml tienen
    // modelo propio, ver sizes): cuerpo cónico abajo (entra en el
    // portavasos), parte superior recta con la manija, tapa giratoria y pajita.
    // El logo Stanley viene al frente del .glb (+Z): yawDeg 180 lo deja atrás
    // y la manija (+X del .glb) pasa a u 0.25. Cuerpo, manija y tapón de la
    // tapa van del color elegido. Perfil medido sobre el .glb (m × 12,
    // centrado en 0,156 m, la mitad del alto con pajita).
    desc: "Vaso térmico Stanley de 1183 ml con manija, tapa giratoria y pajita.",
    cap: "none",
    handle: "none",
    profile: [
      [0.410, -1.836], [0.413, -1.770], [0.432, -1.326], [0.446, -1.008],
      [0.451, -0.852], [0.473, -0.798], [0.502, -0.744], [0.534, -0.690],
      [0.560, -0.642], [0.575, -0.588], [0.578, -0.558], [0.578, -0.200],
      [0.578,  0.160], [0.578,  0.520], [0.578,  0.930],
    ],
    band: [-1.75, 0.88],
    // Cara frontal a 90° de la manija, en la parte superior recta: el área no
    // baja al cono del portavasos ni toca la manija.
    frontFace: { uHalfWidth: 0.16, vCenter: 0.27, vHeightFrac: 0.46 },
    model: {
      url: "/models/vaso-stanley-quencher.glb?v=1",
      exactFor: ["Quencher H2.0"],
      brand: "Stanley",
      unitsPerMeter: 12,
      centerYm: 0.156,
      heightM: 0.312,
      reachM: 0.0933,
      yawDeg: 180,
      paint: ["handle", "lid_stopper"],
    },
    // Caras de grabado: manija a la derecha (u 0.25); el dorso es el lado del logo.
    engraveFaces: ["front", "back", "left"],
    logoBack: true,
    sizes: [
      {
        id: "vaso-quencher-591", name: "591ml", label: "Chico", scale: 1.00,
        // artifacts/3D/STANLEY/quancher591ml.glb: misma forma, más bajo y
        // angosto. Perfil medido sobre el .glb (m × 12, centrado en 0,1138 m,
        // la mitad del alto con pajita).
        shape: {
          profile: [
            [0.428, -1.330], [0.438, -1.198], [0.448, -1.036], [0.460, -0.880],
            [0.472, -0.700], [0.480, -0.544], [0.490, -0.484], [0.510, -0.442],
            [0.529, -0.400], [0.539, -0.364], [0.540, -0.346], [0.540, -0.166],
            [0.540,  0.074], [0.540,  0.314], [0.540,  0.518],
          ],
          band: [-1.25, 0.47],
          frontFace: { uHalfWidth: 0.16, vCenter: 0.25, vHeightFrac: 0.42 },
          model: {
            url: "/models/vaso-stanley-quencher-591.glb?v=1",
            exactFor: ["Quencher H2.0"],
            brand: "Stanley",
            unitsPerMeter: 12,
            centerYm: 0.1138,
            heightM: 0.2276,
            reachM: 0.0888,
            yawDeg: 180,
            paint: ["handle", "lid_stopper"],
          },
        },
      },
      {
        id: "vaso-quencher-887", name: "887ml", label: "Clásico", scale: 1.00,
        // artifacts/3D/STANLEY/quancher887ml.glb: perfil medido sobre el .glb
        // (m × 12, centrado en 0,14 m, la mitad del alto con pajita).
        shape: {
          profile: [
            [0.412, -1.644], [0.426, -1.470], [0.443, -1.278], [0.458, -1.080],
            [0.470, -0.888], [0.481, -0.864], [0.496, -0.834], [0.510, -0.810],
            [0.523, -0.786], [0.532, -0.762], [0.538, -0.738], [0.540, -0.714],
            [0.540, -0.360], [0.540,  0.000], [0.540,  0.360], [0.540,  0.786],
          ],
          band: [-1.56, 0.74],
          frontFace: { uHalfWidth: 0.16, vCenter: 0.32, vHeightFrac: 0.54 },
          model: {
            url: "/models/vaso-stanley-quencher-887.glb?v=1",
            exactFor: ["Quencher H2.0"],
            brand: "Stanley",
            unitsPerMeter: 12,
            centerYm: 0.14,
            heightM: 0.28,
            reachM: 0.0924,
            yawDeg: 180,
            paint: ["handle", "lid_stopper"],
          },
        },
      },
      { id: "vaso-quencher-1183", name: "1183ml", label: "Grande",  scale: 1.00 },
    ],
  },
  {
    id: "vaso-flip",
    name: "Tumblers Flip",
    singular: "Tumbler Flip",
    // Stanley Tumbler Flip 887 ml: cuerpo cónico abajo, tapa con pajita
    // rebatible y asa arriba. Un .glb por color (artifacts/3D/STANLEY/
    // tumbler_flip_cherry.glb y tumbler_flip_plum.glb, misma forma): tapa,
    // asa y logo traen el color de esa variante; el cuerpo se pinta con el
    // color elegido. Logo Stanley al frente del .glb (+Z): yawDeg 180 lo deja
    // atrás. Perfil medido sobre el .glb (m × 12, centrado en 0,14705 m, la
    // mitad del alto con el asa).
    desc: "Vaso térmico Stanley de 887 ml con tapa de pajita rebatible y asa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.439, -1.729], [0.443, -1.699], [0.451, -1.465], [0.457, -1.255],
      [0.462, -1.051], [0.470, -0.871], [0.481, -0.817], [0.497, -0.769],
      [0.511, -0.715], [0.524, -0.667], [0.533, -0.613], [0.535, -0.325],
      [0.538,  0.155], [0.540,  0.659],
    ],
    band: [-1.64, 0.62],
    // Cara frontal en la parte superior recta, sin bajar al cono.
    frontFace: { uHalfWidth: 0.2, vCenter: 0.28, vHeightFrac: 0.48 },
    model: {
      url: "/models/tumbler-flip-cherry.glb?v=1",
      colorModels: [
        { match: "cherry", url: "/models/tumbler-flip-cherry.glb?v=1" },
        { match: "plum", url: "/models/tumbler-flip-plum.glb?v=1" },
      ],
      exactFor: ["Tumbler Flip"],
      brand: "Stanley",
      unitsPerMeter: 12,
      centerYm: 0.14705,
      heightM: 0.2941,
      reachM: 0.0509,
      yawDeg: 180,
    },
    // El asa va en la tapa: se graba en las cuatro caras; el dorso es el del logo.
    logoBack: true,
    sizes: [
      { id: "vaso-flip-887", name: "887ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "vaso-pint",
    name: "Vasos Everyday Pint",
    singular: "Vaso Everyday Pint",
    // Stanley Everyday Pint 470 ml (Odoo: "VASO EVERYDAY PINT 470ML PARAGUAY
    // 1", artifacts/3D/STANLEY/vaso-stanley-pinta-blanco.glb): vaso cónico tipo
    // pinta de 146 mm, sin tapa, Ø 57 mm abajo y Ø 86 mm arriba, con aro de
    // acero. Al frente del .glb (+Z) van las franjas azul y roja de arriba a
    // abajo ("rayas_*"), el logo Stanley vertical y el oso; con yawDeg 180
    // quedan atrás y la cara libre adelante. El cuerpo se pinta con el color
    // de la variante (blanco en "Paraguay 1"); franjas y logos traen el suyo.
    // El azul (vaso-stanley-pinta-azul.glb, "Paraguay 2"): misma forma, cuerpo
    // azul marino con franjas roja y blanca y logos en rojo.
    // Perfil = radio del cuerpo medido sobre el .glb (m × 12, centrado en
    // 0,073 m, la mitad del alto con el aro).
    desc: "Vaso térmico Stanley de 470 ml tipo pinta, sin tapa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.340, -0.876], [0.349, -0.840], [0.354, -0.805], [0.384, -0.516],
      [0.422, -0.156], [0.459,  0.204], [0.497,  0.564], [0.514,  0.727],
    ],
    // Zona grabable: de 10 a 124 mm, sin el borde de la base ni el labio.
    band: [-0.756, 0.612],
    frontFace: { uHalfWidth: 0.2 },
    // Las franjas no cuentan como logo por nombre: todo el alto del dorso es
    // zona sin grabado (±17° del eje, más margen).
    keepOut: [{ kind: "logo", u: 0, halfU: 0.06, v0: 0, v1: 1 }],
    model: {
      url: "/models/vaso-stanley-pint.glb?v=1",
      colorModels: [
        { match: "paraguay 1", url: "/models/vaso-stanley-pint.glb?v=1" },
        { match: "paraguay 2", url: "/models/vaso-stanley-pint-azul.glb?v=1" },
        { match: "azul", url: "/models/vaso-stanley-pint-azul.glb?v=1" },
        { match: "blue", url: "/models/vaso-stanley-pint-azul.glb?v=1" },
        { match: "navy", url: "/models/vaso-stanley-pint-azul.glb?v=1" },
      ],
      exactFor: ["Vaso Everyday Pint"],
      brand: "Stanley",
      unitsPerMeter: 12,
      centerYm: 0.073,
      heightM: 0.146,
      reachM: 0.0437,
      yawDeg: 180,
    },
    // Atrás van las franjas y los logos de fábrica: se graba adelante y a los costados.
    engraveFaces: ["front", "left", "right"],
    sizes: [
      { id: "vaso-pint-470", name: "470ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "vaso-protour",
    name: "Vasos Quencher ProTour",
    singular: "Quencher ProTour",
    // Stanley Quencher ProTour 1,18 L, edición Messi Striker Blue
    // (artifacts/3D/STANLEY/vaso_ messi.glb): aro dorado arriba, tapa
    // transparente con tapita, manija en el cuerpo y dos franjas doradas de la
    // edición: una ancha al frente del .glb (+Z, "logo") y una fina atrás
    // ("logo_back"); las dos son zona sin grabado. La manija está en +X: con
    // yawDeg 90 la cara opuesta a la manija (−X, libre) queda al frente, la
    // manija atrás (u 0), la franja ancha a la izquierda (u 0.75) y la fina a
    // la derecha (u 0.25). Cuerpo, manija y tapita van del color elegido.
    // Perfil medido sobre el .glb (m × 12, centrado en 0,12895 m, la mitad
    // del alto con la tapa).
    desc: "Vaso térmico Stanley de 1,18 L con manija y tapa ProTour.",
    cap: "none",
    handle: "none",
    profile: [
      [0.430, -1.511], [0.438, -1.295], [0.448, -1.061], [0.455, -0.833],
      [0.461, -0.695], [0.466, -0.647], [0.493, -0.599], [0.521, -0.557],
      [0.551, -0.509], [0.576, -0.461], [0.586, -0.419], [0.587, -0.371],
      [0.588,  0.373], [0.592,  1.153],
    ],
    band: [-1.43, 1.10],
    // Cara frontal en la parte superior recta, entre las dos franjas doradas.
    frontFace: { uHalfWidth: 0.16, vCenter: 0.29, vHeightFrac: 0.5 },
    model: {
      url: "/models/vaso-protour-messi.glb?v=1",
      exactFor: ["Quencher ProTour"],
      brand: "Stanley",
      unitsPerMeter: 12,
      centerYm: 0.12895,
      heightM: 0.2579,
      reachM: 0.0958,
      yawDeg: 90,
      paint: ["handle", "lid_cover"],
    },
    // Atrás va la manija y a la izquierda la franja ancha: se graba al frente
    // y a la derecha (la franja fina se esquiva sola).
    engraveFaces: ["front", "right"],
    sizes: [
      { id: "vaso-protour-1183", name: "1183ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "vaso-hydrate",
    name: "Vasos Hydrate",
    singular: "Vaso",
    // Hydrate "Vaso" con tapa transparente deslizable (artifacts/3D/
    // vaso-hydrate-verde-landing.glb, el de 900 ml). Mismo cuerpo que el vaso
    // con manija, sin manija. El logo del modelo queda atrás (yawDeg 180):
    // adelante, la cara libre. El de 470 y el de 600 ml tienen modelo propio
    // (shape del tamaño), en la misma escala (m × 12).
    desc: "Vaso térmico con tapa transparente deslizable.",
    cap: "none",
    handle: "none",
    profile: [
      [0.438, -0.994], [0.446, -0.871], [0.452, -0.748], [0.458, -0.625],
      [0.466, -0.502], [0.473, -0.379], [0.481, -0.256], [0.532, -0.133],
      [0.572, -0.010], [0.576,  0.113], [0.578,  0.236], [0.582,  0.359],
      [0.586,  0.482], [0.588,  0.605], [0.590,  0.727], [0.594,  0.850],
      [0.596,  0.973],
    ],
    band: [-0.92, 0.90],
    frontFace: { uHalfWidth: 0.2, vCenter: 0.27, vHeightFrac: 0.46 },
    model: {
      url: "/models/vaso-hydrate.glb?v=1",
      unitsPerMeter: 12,
      centerYm: 0.1015,
      heightM: 0.203,
      reachM: 0.0582,
      exactFor: ["Vaso"],
      yawDeg: 180,
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      {
        id: "vaso-hydrate-470", name: "470ml", label: "Chico", scale: 1.00,
        // artifacts/3D/vaso-470ml.glb: vaso cónico sin tapa, aro de acero arriba.
        // Perfil medido sobre el .glb (m × 12, centrado en 0,0811 m).
        shape: {
          profile: [
            [0.379, -0.973], [0.390, -0.820], [0.399, -0.667], [0.412, -0.514],
            [0.424, -0.361], [0.433, -0.208], [0.446, -0.055], [0.455,  0.098],
            [0.467,  0.251], [0.476,  0.403], [0.489,  0.556], [0.502,  0.709],
            [0.510,  0.862],
          ],
          band: [-0.90, 0.79],
          frontFace: { uHalfWidth: 0.2 },
          model: {
            url: "/models/vaso-470ml.glb?v=1",
            unitsPerMeter: 12,
            centerYm: 0.0811,
            heightM: 0.1621,
            reachM: 0.0435,
            exactFor: ["Vaso"],
            yawDeg: 180,
          },
        },
      },
      {
        id: "vaso-hydrate-600", name: "600ml", label: "Mediano", scale: 1.00,
        // artifacts/3D/vaso-600ml.glb: vaso cónico con base de acero, aro y tapa
        // con deslizador. Perfil medido sobre el .glb (m × 12, centrado en 0,088 m).
        shape: {
          profile: [
            [0.437, -0.929], [0.456, -0.779], [0.471, -0.630], [0.483, -0.480],
            [0.493, -0.331], [0.501, -0.181], [0.508, -0.032], [0.513,  0.118],
            [0.517,  0.267], [0.521,  0.417], [0.525,  0.566], [0.529,  0.716],
            [0.530,  0.767],
          ],
          band: [-0.86, 0.70],
          frontFace: { uHalfWidth: 0.2 },
          model: {
            url: "/models/vaso-600ml.glb?v=1",
            unitsPerMeter: 12,
            centerYm: 0.088,
            heightM: 0.176,
            reachM: 0.0442,
            exactFor: ["Vaso"],
            yawDeg: 180,
          },
        },
      },
      { id: "vaso-hydrate-900", name: "900ml", label: "Grande",  scale: 1.00 },
    ],
  },
  {
    id: "vaso-guarani",
    name: "Vasos Guaraní",
    singular: "Vaso Guaraní",
    // Hydrate "VASO 473 ML EDICION 2 GUARANI" (artifacts/3D/vaso-guarani.glb):
    // vaso cónico sin tapa, aro de acero arriba, con el estampado del club
    // (franjas amarillas y negras, escudo al frente del .glb y "Licencia
    // oficial" en la costura) y el logo Hydrate en blanco. El estampado va de
    // base (bodyPrint) y el grabado encima. Escudo y logo quedan atrás
    // (yawDeg 180): se graba adelante y a los costados, no sobre el escudo.
    // Perfil medido sobre el .glb (m × 12, centrado en 0,0775 m).
    desc: "Vaso térmico de la edición oficial del Club Guaraní.",
    cap: "none",
    handle: "none",
    profile: [
      [0.371, -0.930], [0.394, -0.690], [0.412, -0.450], [0.430, -0.210],
      [0.452,  0.030], [0.470,  0.270], [0.488,  0.510], [0.510,  0.774],
    ],
    band: [-0.86, 0.71],
    frontFace: { uHalfWidth: 0.2 },
    // El escudo es parte del estampado, no una pieza del .glb: se marca a mano.
    keepOut: [{ kind: "logo", u: 0, halfU: 0.075, v0: 0.48, v1: 0.80 }],
    model: {
      url: "/models/vaso-guarani.glb?v=1",
      unitsPerMeter: 12,
      centerYm: 0.0775,
      heightM: 0.155,
      reachM: 0.0435,
      exactFor: ["Vaso · Guaraní"],
      yawDeg: 180,
      bodyPrint: "/models/vaso-guarani-print.png?v=1",
    },
    engraveFaces: ["front", "left", "right"],
    sizes: [
      { id: "vaso-guarani-473", name: "473ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "taza-manija-palmeiras",
    name: "Vasos Manija Palmeiras",
    singular: "Vaso Manija Palmeiras",
    // Hydrate "MANIJA 710 ML VERDE MILITAR EDICION 1 PALMEIRAS"
    // (artifacts/3D/HYDRATE/CLUBES/taza-hydrate-palmeiras.glb): el mismo
    // jarro que el Vaso Manija (mismo perfil y medidas), con la manija en −X
    // del .glb y los grabados del club: logo Hydrate, escudo y "logo_texto" al
    // frente del .glb (+Z), "texto_licencia" y "texto_club" abajo atrás. Con
    // yawDeg 180 escudo y logo quedan atrás, la manija a la izquierda (u 0.75)
    // y los textos chicos abajo al frente (zona sin grabado, como el escudo).
    desc: "Jarro térmico de 710 ml de la edición oficial de Palmeiras.",
    cap: "none",
    handle: "none",
    profile: [
      [0.427, -1.140], [0.479, -1.116], [0.515, -1.074], [0.527, -1.038],
      [0.528, -1.020], [0.528,  0.792],
    ],
    band: [-1.00, 0.77],
    // Cara frontal a 90° de la manija: el área no toca la manija.
    frontFace: { uHalfWidth: 0.16 },
    model: {
      url: "/models/taza-hydrate-palmeiras.glb?v=1",
      exactFor: ["Vaso Manija · Palmeiras"],
      unitsPerMeter: 12,
      centerYm: 0.095,
      heightM: 0.19,
      reachM: 0.079,
      yawDeg: 180,
      paint: ["handle"],
    },
    // Atrás van el escudo y el logo (no se graba encima); la manija a la izquierda.
    engraveFaces: ["front", "right"],
    sizes: [
      { id: "taza-manija-palmeiras-710", name: "710ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "vaso-luqueno",
    name: "Vasos Luqueño",
    singular: "Vaso Luqueño",
    // Hydrate "VASO 600ML AMARILLO SOL LUQUE" (artifacts/3D/HYDRATE/CLUBES/
    // vaso-hydrate-luqueno.glb): el Vaso de 600 ml (base de acero, aro y tapa
    // con deslizador) con logo Hydrate, escudo de Sportivo Luqueño y
    // "logo_texto" al frente del .glb (+Z). Con yawDeg 180 quedan atrás:
    // adelante y a los costados, la cara libre. Perfil medido sobre el .glb
    // (m × 12, centrado en 0,088 m).
    desc: "Vaso térmico de 600 ml de la edición oficial de Sportivo Luqueño.",
    cap: "none",
    handle: "none",
    profile: [
      [0.422, -0.924], [0.440, -0.882], [0.456, -0.756], [0.470, -0.606],
      [0.482, -0.456], [0.493, -0.306], [0.500, -0.156], [0.508, -0.006],
      [0.512,  0.144], [0.517,  0.294], [0.521,  0.444], [0.524,  0.594],
      [0.529,  0.750], [0.530,  0.822],
    ],
    band: [-0.86, 0.70],
    frontFace: { uHalfWidth: 0.2 },
    model: {
      url: "/models/vaso-hydrate-luqueno.glb?v=1",
      exactFor: ["Vaso · Sportivo Luqueño"],
      unitsPerMeter: 12,
      centerYm: 0.088,
      heightM: 0.176,
      reachM: 0.0442,
      yawDeg: 180,
    },
    // Atrás van el escudo y el logo: se graba adelante y a los costados.
    engraveFaces: ["front", "left", "right"],
    sizes: [
      { id: "vaso-luqueno-600", name: "600ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "vaso-olimpia",
    name: "Vasos Olimpia",
    singular: "Vaso Olimpia",
    // Hydrate Vaso de 900 ml de la edición de Olimpia (artifacts/3D/HYDRATE/
    // CLUBES/vaso-hydrate-olimpia.glb): el mismo cuerpo del Vaso Hydrate de
    // 900 ml (vaso-hydrate.glb: base angosta, escalón y tapa con deslizador)
    // más pajita, con logo Hydrate, escudo de Olimpia y "logo_texto" al frente
    // del .glb (+Z). Con yawDeg 180 quedan atrás: adelante y a los costados, la
    // cara libre. Perfil = el del Vaso Hydrate, medido sobre el .glb (m × 12),
    // corrido al centro de este modelo (0,1248 m: la pajita lo hace más alto).
    desc: "Vaso térmico de 900 ml de la edición oficial de Olimpia.",
    cap: "none",
    handle: "none",
    profile: [
      [0.438, -1.274], [0.446, -1.151], [0.452, -1.028], [0.458, -0.905],
      [0.466, -0.782], [0.473, -0.659], [0.481, -0.536], [0.532, -0.413],
      [0.572, -0.290], [0.576, -0.167], [0.578, -0.044], [0.582,  0.079],
      [0.586,  0.202], [0.588,  0.325], [0.590,  0.447], [0.594,  0.570],
      [0.596,  0.693],
    ],
    band: [-1.20, 0.62],
    frontFace: { uHalfWidth: 0.2, vCenter: 0.27, vHeightFrac: 0.46 },
    model: {
      url: "/models/vaso-hydrate-olimpia.glb?v=1",
      exactFor: ["Vaso · Olimpia"],
      unitsPerMeter: 12,
      centerYm: 0.1248,
      heightM: 0.2496,
      reachM: 0.0582,
      yawDeg: 180,
    },
    // Atrás van el escudo y el logo: se graba adelante y a los costados.
    engraveFaces: ["front", "left", "right"],
    sizes: [
      { id: "vaso-olimpia-900", name: "900ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "vaso-manija-cerro",
    name: "Vasos con manija Cerro Porteño",
    singular: "Vaso con manija Cerro Porteño",
    // Hydrate "Vaso con Pico y Agarre" 887 ml de la edición de Cerro Porteño
    // (artifacts/3D/HYDRATE/CLUBES/vaso-manija-hydrate-cerro.glb): el mismo
    // cuerpo y manija que forma-vaso-manija.glb más pajita, con logo Hydrate,
    // escudo de Cerro y "logo_texto" atrás (−Z, como el liso: sin giro). Perfil
    // = el del vaso con manija, corrido al centro de este modelo (0,1195 m: la
    // pajita lo hace más alto).
    desc: "Vaso térmico de 887 ml con manija, de la edición oficial de Cerro Porteño.",
    cap: "none",
    handle: "none",
    profile: [
      [0.438, -1.210], [0.446, -1.087], [0.452, -0.964], [0.458, -0.841],
      [0.466, -0.718], [0.473, -0.595], [0.481, -0.472], [0.532, -0.349],
      [0.572, -0.226], [0.576, -0.103], [0.578,  0.020], [0.582,  0.143],
      [0.586,  0.266], [0.588,  0.389], [0.590,  0.511], [0.594,  0.634],
      [0.596,  0.757],
    ],
    band: [-1.136, 0.684],
    frontFace: { uHalfWidth: 0.16, vCenter: 0.27, vHeightFrac: 0.46 },
    model: {
      url: "/models/vaso-manija-hydrate-cerro.glb?v=1",
      exactFor: ["Vaso con Pico y Agarre · Cerro Porteño"],
      unitsPerMeter: 12,
      centerYm: 0.1195,
      heightM: 0.239,
      reachM: 0.0842,
    },
    // Atrás van el escudo y el logo; la manija a la izquierda (u 0.75).
    engraveFaces: ["front", "right"],
    sizes: [
      { id: "vaso-manija-cerro-887", name: "887ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "vaso-manija-luqueno",
    name: "Vasos con manija Luqueño",
    singular: "Vaso con manija Luqueño",
    // Hydrate "Vaso con Pico y Agarre" 887 ml de la edición de Sportivo
    // Luqueño (artifacts/3D/HYDRATE/CLUBES/vaso-manija-hydrate-luqueno.glb):
    // el mismo cuerpo y manija que forma-vaso-manija.glb más pajita, con logo
    // Hydrate, escudo y "logo_texto" atrás (−Z, como el liso: sin giro). Perfil
    // = el del vaso con manija, corrido al centro de este modelo (0,1275 m: la
    // pajita lo hace más alto).
    desc: "Vaso térmico de 887 ml con manija, de la edición oficial de Sportivo Luqueño.",
    cap: "none",
    handle: "none",
    profile: [
      [0.438, -1.306], [0.446, -1.183], [0.452, -1.060], [0.458, -0.937],
      [0.466, -0.814], [0.473, -0.691], [0.481, -0.568], [0.532, -0.445],
      [0.572, -0.322], [0.576, -0.199], [0.578, -0.076], [0.582,  0.047],
      [0.586,  0.170], [0.588,  0.293], [0.590,  0.415], [0.594,  0.538],
      [0.596,  0.661],
    ],
    band: [-1.232, 0.588],
    frontFace: { uHalfWidth: 0.16, vCenter: 0.27, vHeightFrac: 0.46 },
    model: {
      url: "/models/vaso-manija-hydrate-luqueno.glb?v=1",
      exactFor: ["Vaso con Pico y Agarre · Sportivo Luqueño"],
      unitsPerMeter: 12,
      centerYm: 0.1275,
      heightM: 0.255,
      reachM: 0.0842,
    },
    // Atrás van el escudo y el logo; la manija a la izquierda (u 0.75).
    engraveFaces: ["front", "right"],
    sizes: [
      { id: "vaso-manija-luqueno-887", name: "887ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "vaso-espresso",
    name: "Vasos Taza Espresso",
    singular: "Vaso Taza Espresso",
    // Hydrate Vaso Taza Espresso (artifacts/3D/vaso-espresso-hydrate-azul-landing.glb):
    // taza cónica sin manija ni tapa, con aro de acero arriba. Perfil = radio
    // del cuerpo medido sobre el .glb (m × 30, centrado en 0,0443 m). Se toma
    // como el de 160 ml; el de 80 ml se escala por volumen. Logo atrás (yawDeg 180).
    desc: "Taza térmica para espresso, sin tapa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.618, -1.329], [0.696, -1.179], [0.756, -1.029], [0.780, -0.879],
      [0.807, -0.729], [0.843, -0.579], [0.858, -0.429], [0.876, -0.279],
      [0.900, -0.129], [0.918,  0.021], [0.945,  0.171], [0.963,  0.321],
      [0.981,  0.471], [1.008,  0.621], [1.029,  0.771], [1.029,  0.831],
    ],
    band: [-0.95, 0.75],
    // Cuerpo cónico: área un poco más alta que el centro (donde es más ancho)
    // y con arco corto para que los bordes no se vean torcidos.
    frontFace: { uHalfWidth: 0.18, vCenter: 0.55, vHeightFrac: 0.7 },
    model: {
      url: "/models/vaso-espresso.glb?v=1",
      exactFor: ["Vaso Taza Espresso"],
      unitsPerMeter: 30,
      centerYm: 0.0443,
      heightM: 0.0886,
      reachM: 0.036,
      yawDeg: 180,
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "vaso-espresso-80",  name: "80ml",  label: "Chico",   scale: 0.79 },
      { id: "vaso-espresso-160", name: "160ml", label: "Clásico", scale: 1.00 },
    ],
  },
  {
    id: "taza-manija",
    name: "Vasos Manija",
    singular: "Vaso Manija",
    // Hydrate "Vaso Manija" (artifacts/3D/taza-hydrate-coral-landing.glb): jarro
    // cilíndrico recto Ø 88 mm con base redondeada, aro de acero arriba, tapa
    // transparente y manija lateral. Perfil = radio del cuerpo medido sobre el
    // .glb (m × 12, centrado en 0,095 m). Logo atrás (yawDeg 180); con ese giro
    // la manija (+X en el .glb) queda en u 0.25.
    desc: "Jarro térmico con manija lateral y tapa transparente.",
    cap: "none",
    handle: "none",
    profile: [
      [0.445, -1.140], [0.479, -1.116], [0.515, -1.080], [0.527, -1.044],
      [0.528, -1.020], [0.528,  0.792],
    ],
    band: [-1.00, 0.77],
    // Cara frontal a 90° de la manija (u 0.25): el área no toca la manija.
    frontFace: { uHalfWidth: 0.16 },
    model: {
      url: "/models/taza-hydrate-coral.glb?v=1",
      exactFor: ["Vaso Manija"],
      unitsPerMeter: 12,
      centerYm: 0.095,
      heightM: 0.19,
      reachM: 0.079,
      yawDeg: 180,
    },
    // Caras de grabado: manija a la derecha (u 0.25); el dorso es el lado del logo.
    engraveFaces: ["front", "left", "back"],
    logoBack: true,
    sizes: [
      { id: "taza-manija-unico", name: "Único", label: "Clásico", scale: 1.00 },
    ],
  },
  {
    id: "taza-enlozada",
    name: "Tazas enlozadas",
    singular: "Taza enlozada",
    // Taza enlozada blanca GENÉRICA (artifacts/3D/GENERICOS/taza-enlozada-
    // blanca.glb): cuerpo casi recto Ø 85 mm × 77 mm, aro de acero y manija
    // en +X del .glb. Con yawDeg 180 la manija queda en u 0.25: mirando el
    // frente, a la izquierda, como en las fotos de producto. Sin logo. Perfil
    // medido sobre el .glb (m × 20, centrado en 0,0392 m).
    desc: "Taza enlozada blanca de 350 ml con aro de acero.",
    cap: "none",
    handle: "none",
    profile: [
      [0.710, -0.784], [0.782, -0.744], [0.812, -0.694], [0.822, -0.643],
      [0.830, -0.304], [0.838,  0.176], [0.848,  0.616], [0.850,  0.752],
    ],
    band: [-0.62, 0.70],
    // Cara frontal a 90° de la manija: el área no toca la manija.
    frontFace: { uHalfWidth: 0.16 },
    model: {
      url: "/models/taza-enlozada-blanca.glb?v=1",
      unitsPerMeter: 20,
      centerYm: 0.0392,
      heightM: 0.0784,
      reachM: 0.0707,
      yawDeg: 180,
    },
    // Manija en u 0.25 (cara "right").
    engraveFaces: ["front", "back", "left"],
    sizes: [
      { id: "taza-enlozada-350", name: "350ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "mini-coffee",
    name: "Vasos Mini Coffee Mug",
    singular: "Vaso Mini Coffee Mug",
    // Hydrate "Vaso Mini Coffee Mug" (artifacts/3D/mini-coffee.glb): taza baja
    // con cuerpo cónico abajo y recto arriba, aro de acero, tapa con deslizador
    // y manija lateral. Perfil = radio del cuerpo medido sobre el .glb (m × 20,
    // centrado en 0,0568 m). Logo atrás (yawDeg 180); con ese giro la manija
    // (−X en el .glb) queda en u 0.75.
    desc: "Taza térmica chica con manija lateral y tapa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.540, -1.136], [0.612, -1.114], [0.654, -1.068], [0.686, -0.962],
      [0.714, -0.818], [0.756, -0.676], [0.786, -0.536], [0.802, -0.434],
      [0.840, -0.362], [0.856, -0.312], [0.866, -0.204], [0.876, -0.032],
      [0.884,  0.126], [0.888,  0.268], [0.894,  0.450], [0.900,  0.644],
    ],
    band: [-0.95, 0.60],
    // Cara frontal a 90° de la manija (u 0.75), en la parte superior recta:
    // el área no baja a la zona cónica ni toca la manija.
    frontFace: { uHalfWidth: 0.16, vCenter: 0.32, vHeightFrac: 0.55 },
    model: {
      url: "/models/mini-coffee.glb?v=1",
      exactFor: ["Vaso Mini Coffee Mug"],
      unitsPerMeter: 20,
      centerYm: 0.0568,
      heightM: 0.1136,
      reachM: 0.0752,
      yawDeg: 180,
    },
    // Caras de grabado: manija a la izquierda (u 0.75); el dorso es el lado del logo.
    engraveFaces: ["front", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "mini-coffee-unico", name: "Único", label: "Clásico", scale: 1.00 },
    ],
  },
  {
    id: "vaso-taza",
    name: "Vasos Taza",
    singular: "Vaso Taza",
    // Hydrate "Vaso Taza" (artifacts/3D/Vaso-Taza.glb): jarro cilíndrico recto
    // Ø 84 mm con base redondeada, aro de acero arriba, tapa y manija lateral.
    // Perfil = radio del cuerpo medido sobre el .glb (m × 20, centrado en
    // 0,0566 m). Logo atrás (yawDeg 180); con ese giro la manija (+X en el
    // .glb) queda en u 0.25.
    desc: "Jarro térmico con manija lateral y tapa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.742, -1.132], [0.787, -1.100], [0.806, -1.069], [0.831, -1.037],
      [0.838, -1.005], [0.840, -0.973], [0.840,  0.772],
    ],
    band: [-0.95, 0.70],
    // Cara frontal a 90° de la manija (u 0.25): el área no toca la manija.
    frontFace: { uHalfWidth: 0.16 },
    model: {
      url: "/models/vaso-taza.glb?v=1",
      exactFor: ["Vaso Taza"],
      unitsPerMeter: 20,
      centerYm: 0.0566,
      heightM: 0.1132,
      reachM: 0.0725,
      yawDeg: 180,
    },
    // Caras de grabado: manija a la derecha (u 0.25); el dorso es el lado del logo.
    engraveFaces: ["front", "left", "back"],
    logoBack: true,
    sizes: [
      { id: "vaso-taza-unico", name: "Único", label: "Clásico", scale: 1.00 },
    ],
  },
  {
    id: "vaso-taza-river",
    name: "Vasos Taza River",
    singular: "Vaso Taza River",
    // Hydrate "Vaso Taza" de la edición de River Plate (artifacts/3D/HYDRATE/
    // CLUBES/taza-hydrate-river-v2.glb): el mismo cuerpo, aro, tapa y manija que vaso-taza.glb,
    // con el logo Hydrate atrás (−Z) y el escudo del club adelante (+Z) en el
    // .glb. Con yawDeg 90 la manija (+X) queda atrás, el escudo a la izquierda
    // y el logo a la derecha: adelante, la cara libre. Perfil = el del Vaso
    // Taza (mismo .glb de base: m × 20, centrado en 0,0566 m).
    desc: "Jarro térmico con manija y tapa, de la edición oficial de River Plate.",
    cap: "none",
    handle: "none",
    profile: [
      [0.742, -1.132], [0.787, -1.100], [0.806, -1.069], [0.831, -1.037],
      [0.838, -1.005], [0.840, -0.973], [0.840,  0.772],
    ],
    band: [-0.95, 0.70],
    frontFace: { uHalfWidth: 0.16 },
    model: {
      url: "/models/taza-hydrate-river-v2.glb?v=1",
      exactFor: ["Vaso Taza · River Plate"],
      unitsPerMeter: 20,
      centerYm: 0.0566,
      heightM: 0.1132,
      reachM: 0.0725,
      yawDeg: 90,
    },
    // Atrás la manija; a los costados el escudo y el logo: se graba adelante.
    engraveFaces: ["front"],
    sizes: [
      { id: "vaso-taza-river-355", name: "355ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "vaso-taza-palmeiras",
    name: "Vasos Taza Palmeiras",
    singular: "Vaso Taza Palmeiras",
    // Hydrate "Vaso Taza" de la edición de Palmeiras (artifacts/3D/HYDRATE/
    // CLUBES/taza-hydrate-palmeiras-verde.glb): el mismo cuerpo, aro, tapa y manija que vaso-taza.glb,
    // con el logo Hydrate atrás (−Z) y el escudo del club adelante (+Z) en el
    // .glb. Con yawDeg 90 la manija (+X) queda atrás, el escudo a la izquierda
    // y el logo a la derecha: adelante, la cara libre. Perfil = el del Vaso
    // Taza (mismo .glb de base: m × 20, centrado en 0,0566 m).
    desc: "Jarro térmico con manija y tapa, de la edición oficial de Palmeiras.",
    cap: "none",
    handle: "none",
    profile: [
      [0.742, -1.132], [0.787, -1.100], [0.806, -1.069], [0.831, -1.037],
      [0.838, -1.005], [0.840, -0.973], [0.840,  0.772],
    ],
    band: [-0.95, 0.70],
    frontFace: { uHalfWidth: 0.16 },
    model: {
      url: "/models/taza-hydrate-palmeiras-verde.glb?v=1",
      exactFor: ["Vaso Taza · Palmeiras"],
      unitsPerMeter: 20,
      centerYm: 0.0566,
      heightM: 0.1132,
      reachM: 0.0725,
      yawDeg: 90,
    },
    // Atrás la manija; a los costados el escudo y el logo: se graba adelante.
    engraveFaces: ["front"],
    sizes: [
      { id: "vaso-taza-palmeiras-355", name: "355ml", label: "Único", scale: 1.00 },
    ],
  },
  {
    id: "vaso-cafe",
    name: "Vasos Café",
    singular: "Vaso Café",
    // Hydrate "350ml Café" (artifacts/3D/vaso-cafe.glb): vaso recto con aro de
    // acero y tapa con pestaña. Perfil = radio del cuerpo medido sobre el .glb
    // (m × 14, centrado en 0,08725 m). Logo atrás (yawDeg 180).
    desc: "Vaso térmico para café de 350 ml con tapa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.519, -1.222], [0.525, -1.128], [0.525, 0.565], [0.486, 0.659],
    ],
    band: [-1.05, 0.50],
    model: {
      url: "/models/vaso-cafe.glb?v=1",
      exactFor: ["Vaso Café"],
      unitsPerMeter: 14,
      centerYm: 0.08725,
      heightM: 0.1745,
      reachM: 0.0375,
      yawDeg: 180,
    },
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "vaso-cafe-350", name: "350ml", label: "Clásico", scale: 1.00 },
    ],
  },
  {
    id: "vaso-whisky",
    name: "Vasos Whisky",
    singular: "Vaso Whisky",
    // Hydrate "Vaso Whisky Lowball" (artifacts/3D/vaso-whiskey-hydrate-negro.glb):
    // vaso bajo y recto sin tapa, base y aro de acero. Perfil = radio del cuerpo
    // medido sobre el .glb (m × 20, centrado en 0,05225 m). Logo atrás (yawDeg 180).
    desc: "Vaso térmico bajo para whisky, sin tapa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.860, -0.893], [0.862, -0.369], [0.866, 0.413],
      [0.868, 0.775], [0.866, 0.861],
    ],
    band: [-0.82, 0.80],
    model: {
      url: "/models/vaso-whisky.glb?v=1",
      exactFor: ["Vaso Whisky Lowball"],
      unitsPerMeter: 20,
      centerYm: 0.05225,
      heightM: 0.1045,
      reachM: 0.0435,
      yawDeg: 180,
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "vaso-whisky-295", name: "295ml", label: "Clásico", scale: 1.00 },
    ],
  },
  {
    id: "coffee-cup",
    name: "Vasos Coffee Cup",
    singular: "Vaso Coffee Cup",
    // Hydrate "Vaso Coffee Cup" (artifacts/3D/vaso-coffee-cup.glb): vaso de café
    // sin manija, cónico abajo con un escalón a media altura, aro de acero y
    // tapa con deslizador. Perfil = radio del cuerpo medido sobre el .glb
    // (m × 16, centrado en 0,0687 m). Logo atrás (yawDeg 180).
    desc: "Vaso térmico para café con tapa deslizable.",
    cap: "none",
    handle: "none",
    profile: [
      [0.326, -1.100], [0.434, -1.055], [0.471, -1.011], [0.485, -0.967],
      [0.511, -0.879], [0.526, -0.747], [0.542, -0.615], [0.558, -0.439],
      [0.571, -0.219], [0.582, -0.043], [0.623,  0.001], [0.627,  0.134],
      [0.634,  0.354], [0.639,  0.574], [0.640,  0.662],
    ],
    band: [-0.95, 0.60],
    // Área en la parte de arriba (sobre el escalón), donde el cuerpo es casi
    // recto: así el diseño no baja a la zona cónica.
    frontFace: { uHalfWidth: 0.18, vCenter: 0.3, vHeightFrac: 0.5 },
    model: {
      url: "/models/vaso-coffee-cup.glb?v=1",
      exactFor: ["Vaso Coffee Cup"],
      unitsPerMeter: 16,
      centerYm: 0.0687,
      heightM: 0.1374,
      reachM: 0.0475,
      yawDeg: 180,
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "coffee-cup-236", name: "236ml", label: "Clásico", scale: 1.00 },
    ],
  },
  {
    id: "vaso-shaker",
    name: "Vasos Shaker",
    singular: "Vaso Shaker",
    // Hydrate "Vaso Shaker" (artifacts/3D/shaker.glb): vaso cónico (se
    // abre hacia arriba), junta de goma, tapa con pico, tapita y asa sobre la
    // tapa. El cuerpo no tiene manija. Perfil = radio del cuerpo medido sobre
    // el .glb (m × 10, centrado en 0,1124 m). Logo atrás (yawDeg 180).
    desc: "Vaso térmico shaker con tapa de pico y asa.",
    cap: "none",
    handle: "none",
    profile: [
      [0.295, -1.124], [0.315, -1.084], [0.320, -1.002], [0.336, -0.797],
      [0.352, -0.592], [0.368, -0.387], [0.384, -0.183], [0.401,  0.022],
      [0.417,  0.268], [0.433,  0.473], [0.437,  0.514],
    ],
    band: [-1.00, 0.45],
    model: {
      url: "/models/vaso-shaker.glb?v=3",
      exactFor: ["Vaso Shaker"],
      unitsPerMeter: 10,
      centerYm: 0.1124,
      heightM: 0.2249,
      reachM: 0.0595,
      yawDeg: 180,
      // La tapa va del color elegido, como el cuerpo (el asa ya se pinta sola).
      paint: ["lid", "lid_top", "spout", "cap", "hinge"],
    },
    // Caras de grabado: las cuatro (el dorso es el lado del logo).
    engraveFaces: ["front", "left", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "vaso-shaker-591", name: "591ml", label: "Clásico", scale: 1.00 },
    ],
  },
  {
    id: "vaso-sunbeam",
    name: "Vasos Sunbeam",
    singular: "Vaso Sunbeam",
    // Hydrate Sunbeam con funda de silicona, tapa gris, pajita y manija
    // (artifacts/3D/vaso-hydrate-petroleo-manija.glb). Funda, boquilla y manija
    // van del color elegido. Logo atrás (yawDeg 180); con ese giro la manija
    // (−X en el .glb) queda en u 0.75, como la del vaso con pico.
    desc: "Vaso térmico con funda de silicona, tapa y pajita.",
    cap: "none",
    handle: "none",
    profile: [
      [0.444, -1.258], [0.455, -1.020], [0.468, -0.781], [0.474, -0.661],
      [0.493, -0.542], [0.550, -0.424], [0.574, -0.304], [0.580, -0.066],
      [0.586, 0.173], [0.592, 0.412], [0.596, 0.650],
    ],
    band: [-1.10, 0.55],
    // Cara frontal a 90° de la manija: mismo ancho que el vaso con pico, para
    // que el diseño no llegue hasta la manija.
    frontFace: { uHalfWidth: 0.16, vCenter: 0.26, vHeightFrac: 0.48 },
    model: {
      url: "/models/vaso-sunbeam.glb?v=2",
      unitsPerMeter: 12,
      centerYm: 0.13,
      heightM: 0.2605,
      reachM: 0.0842,
      exactFor: ["Vaso Sunbeam"],
      yawDeg: 180,
      paint: ["boot", "straw_tip"],
      paintLight: ["logo_funda"],
    },
    // Caras de grabado: manija a la izquierda (u 0.75); el dorso es el lado del logo.
    engraveFaces: ["front", "back", "right"],
    logoBack: true,
    sizes: [
      { id: "vaso-sunbeam-887",  name: "887ml",  label: "Clásico", scale: 1.00 },
      { id: "vaso-sunbeam-1183", name: "1183ml", label: "Grande",  scale: 1.10 },
    ],
  },
];

export const DEFAULT_PRODUCT_ID: ProductId = "termo";

export function getProduct(id: string): ProductDef {
  return PRODUCTS.find(p => p.id === id) ?? PRODUCTS[1];
}

export function getSize(product: ProductDef, sizeId: string): ProductSize {
  return product.sizes.find(s => s.id === sizeId) ?? product.sizes[1] ?? product.sizes[0];
}

const sizedCache = new WeakMap<ProductSize, ProductDef>();

/**
 * El producto tal como se ve en ese tamaño: si el tamaño tiene modelo propio
 * (`shape`), su perfil, banda y .glb pisan los del producto. Sin `shape`, el
 * mismo producto. Siempre el mismo objeto por tamaño (sirve de clave de caché).
 */
const colorCache = new WeakMap<ProductDef, Map<string, ProductDef>>();
const foldColor = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * El producto con el .glb del color de la variante (model.colorModels), si
 * tiene uno propio para ese color; si no, el mismo producto.
 */
export function productForColor(product: ProductDef, colorName: string | null | undefined): ProductDef {
  const options = product.model?.colorModels;
  if (!options?.length || !colorName) return product;
  const c = foldColor(colorName);
  const hit = options.find(o => c.includes(o.match));
  if (!hit || hit.url === product.model!.url) return product;
  let byUrl = colorCache.get(product);
  if (!byUrl) { byUrl = new Map(); colorCache.set(product, byUrl); }
  let out = byUrl.get(hit.url);
  if (!out) {
    out = { ...product, model: { ...product.model!, url: hit.url } };
    byUrl.set(hit.url, out);
  }
  return out;
}

export function productForSize(product: ProductDef, sizeId: string): ProductDef {
  const size = getSize(product, sizeId);
  if (!size.shape) return product;
  let sized = sizedCache.get(size);
  if (!sized) {
    sized = { ...product, ...size.shape };
    sizedCache.set(size, sized);
  }
  return sized;
}

const RESAMPLE_POINTS = 64;
// Por objeto, no por id: un tamaño con modelo propio tiene otro perfil.
const resampleCache = new WeakMap<ProductDef, [number, number][]>();

/**
 * The same silhouette, resampled at even arc-length steps.
 *
 * LatheGeometry parametrises `v` by point index, so a profile whose long
 * straight body spans only two points squeezes most of the surface into a
 * sliver of the texture. Even spacing keeps the engraved area sharp and its
 * proportions close to the real product.
 */
export function resampledProfile(product: ProductDef): [number, number][] {
  const cached = resampleCache.get(product);
  if (cached) return cached;

  const pts = product.profile;
  const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = seg[seg.length - 1];

  const out: [number, number][] = [];
  let i = 0;
  for (let k = 0; k < RESAMPLE_POINTS; k++) {
    const d = (k / (RESAMPLE_POINTS - 1)) * total;
    while (i < pts.length - 2 && seg[i + 1] < d) i++;
    const span = seg[i + 1] - seg[i];
    const t = span === 0 ? 0 : (d - seg[i]) / span;
    out.push([
      pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
      pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
    ]);
  }

  resampleCache.set(product, out);
  return out;
}
