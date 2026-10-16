import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Check, ChevronRight, Contrast, HandCoins, ImagePlus, Layers, Loader2, MapPin,
  MessageCircle, Minus, Plus, RefreshCw, Sparkles, X,
} from "lucide-react";
import { useCreateOrder, type CreateOrderRequest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MobileDesignScreen, useVisualViewport } from "@/components/mobile-screen";
import { useIsMobile } from "@/hooks/use-mobile";
import { fileToProcessedSvg, type ProcessedImage } from "@/lib/image-processing";
import { buildArtMask, computeStickerShape, type StickerShape } from "@/lib/sticker-shape";
import {
  STICKER_BORDER_MM, STICKER_CUTS, STICKER_FINISHES, STICKER_MAX_CM, STICKER_MAX_QTY, STICKER_MIN_CM,
  STICKER_PRICES_ENABLED, STICKER_QTY_PRESETS, STICKER_SIZE_PRESETS, stickerQuote, type StickerCutId, type StickerFinishId,
} from "@/lib/sticker-pricing";
import { formatGs } from "@/lib/odoo-catalog";
import { ADDRESS, whatsappUrl } from "@/lib/contact";
import { dataUrlToJpeg } from "@/lib/share";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Sección "Stickers": stickers UV DTF con el diseño del cliente, impresos en la
 * eufyMake E1 (Roll-to-Film), con acabado brillante o con relieve 3D.
 *
 * Flujo: subir diseño (o un ejemplo) → tamaño, corte, acabado y cantidad →
 * precio al instante → POST /api/orders (mismo circuito que el personalizador)
 * → WhatsApp. En el celular, al cargar el diseño se abre una pantalla fija
 * (como la de Diseño del termo): sticker arriba, una fila por opción y el
 * pedido siempre abajo. En PC, dos columnas.
 * Precios: `sticker-pricing.ts`. Contorno de corte: `sticker-shape.ts`.
 */

const MAX_FILE_BYTES = 8 * 1024 * 1024;
/** Lado mayor del arte procesado: ~300 dpi a 17 cm, bajo el límite del POST. */
const ART_MAX_DIM = 2000;
/** Por debajo de esto la impresión se ve pixelada a ojo. */
const MIN_DPI = 150;
/** Tope del PNG de producción que viaja en el pedido (el JSON admite 6 MB). */
const MAX_PRODUCTION_DATAURL = 4_200_000;
/** Resoluciones del PNG de producción, de la ideal hacia abajo. */
const PRODUCTION_DPI_STEPS = [300, 240, 200, 150];
const ORDER_TIMEOUT_MS = 8000;

const cmLabel = (mm: number) => (mm / 10).toLocaleString("es-PY", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (d: number) => `${Math.round(d * 100)}%`;

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen."));
    img.src = src;
  });
}

/**
 * Archivo para la eufyMake E1: el sticker terminado (borde blanco + arte) en
 * PNG con fondo transparente, a tamaño real. Se intenta a 300 dpi y se baja si
 * el archivo no entra en el pedido. Lo transparente no se imprime.
 */
function stickerToPng(img: HTMLImageElement, shape: StickerShape): { dataUrl: string; dpi: number } | null {
  try {
    for (const dpi of PRODUCTION_DPI_STEPS) {
      const pxPerMm = dpi / 25.4;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(shape.widthMm * pxPerMm));
      canvas.height = Math.max(1, Math.round(shape.heightMm * pxPerMm));
      const ctx = canvas.getContext("2d")!;
      ctx.scale(pxPerMm, pxPerMm);
      const outline = new Path2D(shape.cutPath);
      ctx.fillStyle = "#ffffff";
      ctx.fill(outline);
      ctx.clip(outline);
      ctx.imageSmoothingQuality = "high";
      const { x, y, w, h } = shape.imageBox;
      ctx.drawImage(img, x, y, w, h);
      const dataUrl = canvas.toDataURL("image/png");
      if (dataUrl.length <= MAX_PRODUCTION_DATAURL) return { dataUrl, dpi };
    }
  } catch { /* sin archivo: el taller pide el diseño por WhatsApp */ }
  return null;
}

/** Rasteriza el SVG de la vista previa (con su cuadrícula) a PNG. */
function svgToPng(svg: SVGSVGElement, px: number): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      const vb = svg.viewBox.baseVal;
      const scale = px / Math.max(vb.width, vb.height);
      clone.setAttribute("width", String(Math.round(vb.width * scale)));
      clone.setAttribute("height", String(Math.round(vb.height * scale)));
      const xml = new XMLSerializer().serializeToString(clone);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(vb.width * scale);
        canvas.height = Math.round(vb.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        try { resolve(canvas.toDataURL("image/png")); } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    } catch {
      resolve(null);
    }
  });
}

// ── Ejemplos ─────────────────────────────────────────────────────────────────

/** Diseños de muestra para probar sin tener un archivo a mano. */
const EXAMPLES: { id: string; label: string; svg: string }[] = [
  {
    id: "logo",
    label: "Logo",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
      <circle cx="600" cy="600" r="560" fill="#8B1A2F"/>
      <circle cx="600" cy="600" r="490" fill="none" stroke="#f3e6d3" stroke-width="18"/>
      <text x="600" y="700" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="330" font-weight="700" fill="#f3e6d3">CS</text>
      <text x="600" y="860" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="78" letter-spacing="18" font-weight="700" fill="#f3e6d3">CREATIVA</text>
      <path d="M430 380 L600 300 L770 380" fill="none" stroke="#f3e6d3" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: "mascota",
    label: "Mascota",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
      <path d="M250 520 L300 150 L520 360 Z" fill="#e8913a" stroke="#3b2516" stroke-width="28" stroke-linejoin="round"/>
      <path d="M950 520 L900 150 L680 360 Z" fill="#e8913a" stroke="#3b2516" stroke-width="28" stroke-linejoin="round"/>
      <path d="M320 470 L330 260 L450 380 Z" fill="#f6c6a8"/>
      <path d="M880 470 L870 260 L750 380 Z" fill="#f6c6a8"/>
      <ellipse cx="600" cy="680" rx="430" ry="380" fill="#e8913a" stroke="#3b2516" stroke-width="28"/>
      <ellipse cx="600" cy="800" rx="230" ry="170" fill="#fbe7d3"/>
      <ellipse cx="440" cy="620" rx="62" ry="80" fill="#3b2516"/>
      <ellipse cx="760" cy="620" rx="62" ry="80" fill="#3b2516"/>
      <circle cx="460" cy="590" r="20" fill="#fff"/>
      <circle cx="780" cy="590" r="20" fill="#fff"/>
      <path d="M560 730 L640 730 L600 780 Z" fill="#d9536b" stroke="#3b2516" stroke-width="14" stroke-linejoin="round"/>
      <path d="M600 780 Q600 840 540 850 M600 780 Q600 840 660 850" fill="none" stroke="#3b2516" stroke-width="14" stroke-linecap="round"/>
      <path d="M380 760 L210 730 M380 800 L210 820 M820 760 L990 730 M820 800 L990 820" stroke="#3b2516" stroke-width="12" stroke-linecap="round"/>
      <ellipse cx="360" cy="760" rx="50" ry="28" fill="#f29aa8" opacity="0.7"/>
      <ellipse cx="840" cy="760" rx="50" ry="28" fill="#f29aa8" opacity="0.7"/>
    </svg>`,
  },
  {
    id: "frase",
    label: "Frase",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="760" viewBox="0 0 1400 760">
      <g font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif" font-weight="900" text-anchor="middle" stroke="#1d3b3a" stroke-width="34" stroke-linejoin="round" paint-order="stroke">
        <text x="700" y="330" font-size="270" fill="#f2c94c">MATE</text>
        <text x="700" y="640" font-size="270" fill="#56c2a6">Y VOS</text>
      </g>
      <path d="M1180 120 l26 54 58 8 -42 40 10 58 -52 -28 -52 28 10 -58 -42 -40 58 -8 z" fill="#ef6f6c" stroke="#1d3b3a" stroke-width="16" stroke-linejoin="round"/>
    </svg>`,
  },
];

const exampleUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** ¿El arte es casi todo blanco? Entonces se pierde sobre el sticker claro. */
function isMostlyLight(img: HTMLImageElement): boolean {
  try {
    const n = 64;
    const canvas = document.createElement("canvas");
    canvas.width = n; canvas.height = n;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, n, n);
    const d = ctx.getImageData(0, 0, n, n).data;
    let sum = 0, count = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      count++;
    }
    return count > 0 && sum / count > 0.86;
  } catch {
    return false;
  }
}

// ── Vista previa ─────────────────────────────────────────────────────────────

function StickerPreview({ art, shape, finish, dark, svgRef }: {
  art: ProcessedImage;
  shape: StickerShape;
  finish: StickerFinishId;
  /** Fondo oscuro: para que un diseño blanco se distinga del sticker. */
  dark: boolean;
  svgRef: React.Ref<SVGSVGElement>;
}) {
  const uid = useId().replace(/:/g, "");
  const { widthMm: W, heightMm: H } = shape;
  // Marco cuadrado con aire alrededor; la cuadrícula es de 1 cm real.
  const frame = Math.max(W, H) * 1.3 + 10;
  const ox = (frame - W) / 2;
  const oy = (frame - H) / 2;
  const relief = finish === "relieve";
  const { x, y, w, h } = shape.imageBox;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${frame} ${frame}`}
      className="w-full h-full"
      role="img"
      aria-label={`Vista previa del sticker, ${cmLabel(W)} × ${cmLabel(H)} cm`}
    >
      <defs>
        <pattern id={`grid-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse" x={ox} y={oy}>
          <path d="M10 0 L0 0 0 10" fill="none" stroke={dark ? "#3a322c" : "#e7ddd0"} strokeWidth={Math.max(0.15, frame / 900)} />
        </pattern>
        <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy={frame / 160} stdDeviation={frame / 140} floodColor={dark ? "#000" : "#3b2a1e"} floodOpacity={dark ? 0.5 : 0.22} />
        </filter>
        {/* Relieve: la tinta con volumen se ilumina en sus bordes. */}
        <filter id={`relief-${uid}`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={Math.max(0.2, w / 320)} result="blur" />
          {/* Luz rasante: las caras planas casi no brillan, los bordes del volumen sí. */}
          <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1" specularExponent="28" lightingColor="#ffffff" result="spec">
            <feDistantLight azimuth="225" elevation="38" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.85" k4="0" result="lit" />
          <feDropShadow in="lit" dx={w / 400} dy={w / 300} stdDeviation={w / 500} floodColor="#000" floodOpacity="0.28" />
        </filter>
        <linearGradient id={`gloss-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.18" />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <path d={shape.cutPath} />
        </clipPath>
      </defs>

      <rect width={frame} height={frame} fill={dark ? PREVIEW_BG_DARK : PREVIEW_BG_LIGHT} />
      <rect width={frame} height={frame} fill={`url(#grid-${uid})`} />

      <g transform={`translate(${ox} ${oy})`}>
        <path d={shape.cutPath} fill="#ffffff" filter={`url(#shadow-${uid})`} />
        <g clipPath={`url(#clip-${uid})`}>
          <image
            href={art.svgDataUrl}
            x={x} y={y} width={w} height={h}
            preserveAspectRatio="none"
            filter={relief ? `url(#relief-${uid})` : undefined}
          />
          {/* Barniz: un brillo diagonal suave sobre todo el sticker. */}
          <rect x="0" y="0" width={W} height={H} fill={`url(#gloss-${uid})`} />
        </g>
        <path d={shape.cutPath} fill="none" stroke={dark ? "#ffffff" : "#d8cdbf"} strokeOpacity={dark ? 0.35 : 1} strokeWidth={Math.max(0.15, frame / 700)} />
      </g>
    </svg>
  );
}

const PREVIEW_BG_LIGHT = "#faf7f2";
const PREVIEW_BG_DARK = "#2a2420";

// ── Sección ──────────────────────────────────────────────────────────────────

export default function Stickers() {
  const isMobile = useIsMobile();
  const vp = useVisualViewport();
  const inputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [art, setArt] = useState<ProcessedImage | null>(null);
  const [artImg, setArtImg] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  /** Celular: la pantalla fija del sticker (se abre al cargar un diseño). */
  const [editorOpen, setEditorOpen] = useState(false);

  const [sizeCm, setSizeCm] = useState(7);
  /** "Otro": el control deslizante para un tamaño a medida. */
  const [customSize, setCustomSize] = useState(false);
  const [cut, setCut] = useState<StickerCutId>("silueta");
  const [finish, setFinish] = useState<StickerFinishId>("brillo");
  const [quantity, setQuantity] = useState(10);
  /** Fondo de la vista elegido por el cliente; null = automático según el diseño. */
  const [bgChoice, setBgChoice] = useState<"light" | "dark" | null>(null);

  const [isPreparing, setIsPreparing] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [orderFallback, setOrderFallback] = useState(false);
  const { mutateAsync: createOrderAsync } = useCreateOrder();

  // La imagen del arte (para la máscara y el PNG de producción).
  useEffect(() => {
    if (!art) { setArtImg(null); return; }
    let alive = true;
    loadImg(art.svgDataUrl).then(img => { if (alive) setArtImg(img); }).catch(() => {});
    return () => { alive = false; };
  }, [art]);

  const mask = useMemo(() => (artImg ? buildArtMask(artImg) : null), [artImg]);
  const shape = useMemo(
    () => (mask ? computeStickerShape(mask, sizeCm * 10, STICKER_BORDER_MM, cut) : null),
    [mask, sizeCm, cut],
  );
  const autoDark = useMemo(() => (artImg ? isMostlyLight(artImg) : false), [artImg]);
  const dark = bgChoice ? bgChoice === "dark" : autoDark;

  // Sin diseño todavía: precio "desde" con un sticker cuadrado del tamaño elegido.
  const widthMm = shape?.widthMm ?? sizeCm * 10;
  const heightMm = shape?.heightMm ?? sizeCm * 10;
  const quote = stickerQuote({ widthCm: widthMm / 10, heightCm: heightMm / 10, quantity, finish });
  const finishDef = STICKER_FINISHES.find(f => f.id === finish)!;
  const cutDef = STICKER_CUTS.find(c => c.id === cut)!;

  // Resolución real de impresión del arte a este tamaño.
  const dpi = art && shape ? art.width / (shape.imageBox.w / 25.4) : null;
  const lowRes = dpi !== null && dpi < MIN_DPI;
  // Los dpi bajan en proporción al tamaño: hasta acá se ve bien.
  const maxGoodCm = dpi ? Math.max(STICKER_MIN_CM, Math.floor((sizeCm * dpi / MIN_DPI) * 2) / 2) : null;

  const sizeText = `${cmLabel(widthMm)} × ${cmLabel(heightMm)} cm`;
  // Sin precios definidos (STICKER_PRICES_ENABLED = false): se cotiza por WhatsApp.
  const priceText = STICKER_PRICES_ENABLED
    ? `${formatGs(quote.total)} (${formatGs(quote.unit)} c/u${quote.discount ? `, ${pct(quote.discount)} off por cantidad` : ""})`
    : "A cotizar";

  const loadDesign = async (blob: Blob, source: "upload" | "example") => {
    setIsProcessing(true);
    try {
      const processed = await fileToProcessedSvg(blob, ART_MAX_DIM);
      setArt(processed);
      setBgChoice(null);
      // Una foto sin fondo recortable va mejor en rectángulo.
      setCut(processed.backgroundRemoved ? "silueta" : "rectangulo");
      setEditorOpen(true);
      track(source === "example" ? "sticker_example" : "sticker_upload", { background_removed: processed.backgroundRemoved });
    } catch {
      setUploadError("No pudimos leer esa imagen. Probá con otro archivo.");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Subí un archivo de imagen (PNG, JPG, WebP o SVG).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError("La imagen no puede superar los 8 MB.");
      return;
    }
    await loadDesign(file, "upload");
  };

  const loadExample = (svg: string) => {
    setUploadError(null);
    void loadDesign(new Blob([svg], { type: "image/svg+xml" }), "example");
  };

  /** Alterna entre el recorte automático y la imagen original. */
  const swapBackground = () => {
    if (!art?.other) return;
    const next: ProcessedImage = { ...art.other, other: { ...art, other: undefined } };
    setArt(next);
    if (!next.backgroundRemoved) setCut("rectangulo");
  };

  const removeDesign = () => {
    setArt(null);
    setEditorOpen(false);
  };

  const setQty = (n: number) => setQuantity(Math.min(STICKER_MAX_QTY, Math.max(1, Math.round(n) || 1)));
  const pickFinish = (id: StickerFinishId) => {
    if (id === finish) return;
    setFinish(id);
    track("sticker_finish_select", { finish: id, has_image: !!art });
  };
  const pickPresetSize = (cm: number) => { setSizeCm(cm); setCustomSize(false); };
  const isPresetSize = STICKER_SIZE_PRESETS.includes(sizeCm);
  const toggleBg = () => setBgChoice(dark ? "light" : "dark");

  const buildMessage = (orderNumber: string | null, imageUrl: string | null) => {
    // Corto a propósito: el detalle completo queda guardado en el pedido
    // (panel /admin). *negrita* es el formato de WhatsApp.
    const parts = [
      "Hola, Creativa Studio. Quiero pedir estos stickers:",
      [
        orderNumber ? `*Pedido ${orderNumber}*` : null,
        `${quantity} u. · ${sizeText} · ${cutDef.name} · ${finishDef.name}`,
        STICKER_PRICES_ENABLED ? `Precio estimado: ${formatGs(quote.total)}` : "Precio: a cotizar",
      ].filter(Boolean).join("\n"),
      imageUrl ? `Diseño (PNG): ${imageUrl}` : "Les envío el diseño por este chat.",
    ];
    return parts.join("\n\n");
  };

  const handleOrder = async () => {
    if (isPreparing || isOrdered) return;
    setIsPreparing(true);
    setOrderFallback(false);
    setLastOrderNumber(null);
    track("sticker_order_submit", { size_mm: Math.round(Math.max(widthMm, heightMm)), quantity, finish, cut, has_image: !!art });

    // Pestaña abierta en el mismo click (si no, el bloqueador de pop-ups la mata).
    const win = window.open("", "_blank");
    if (win) {
      try {
        win.document.write('<title>Creando tu pedido…</title><body style="margin:0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#5f574d">Creando tu pedido…</body>');
      } catch { /* pestaña en blanco un instante */ }
    }

    try {
      let orderNumber: string | null = null;
      let imageUrl: string | null = null;
      if (art && shape && artImg) {
        try {
          const png = svgRef.current ? await svgToPng(svgRef.current, 1080) : null;
          const preview = png ? await dataUrlToJpeg(png, 1080) : null;
          const production = stickerToPng(artImg, shape);
          const payload: CreateOrderRequest = {
            product: "Sticker",
            material: "Film UV DTF",
            technique: "Sticker UV DTF",
            hasUploadedImage: true,
            designState: {
              kind: "sticker",
              // Máquina de producción (DACEN.md §4.1): los stickers van a la eufyMake E1.
              machine: "eufy",
              widthMm: Math.round(shape.widthMm * 10) / 10,
              heightMm: Math.round(shape.heightMm * 10) / 10,
              borderMm: STICKER_BORDER_MM,
              cut,
              finish,
              quantity,
              cutPath: shape.cutPath,
              imageBox: shape.imageBox,
              backgroundRemoved: art.backgroundRemoved,
              dpi: dpi ? Math.round(dpi) : null,
              productionDpi: production?.dpi ?? null,
              unitPrice: STICKER_PRICES_ENABLED ? quote.unit : null,
              total: STICKER_PRICES_ENABLED ? quote.total : null,
              discount: STICKER_PRICES_ENABLED ? quote.discount : null,
              // Legibles para el panel /admin.
              sizeLabel: `${sizeText} · ${quantity} u. · ${finishDef.name} · ${cutDef.name}`,
              engravingEstimate: priceText,
            },
            previewImage: preview ?? undefined,
            // PNG listo para la eufyMake E1 (el server lo guarda como archivo de producción).
            customImage: production?.dataUrl ?? undefined,
          };
          const created = await Promise.race([
            createOrderAsync({ data: payload }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("order timeout")), ORDER_TIMEOUT_MS)),
          ]);
          orderNumber = created.orderNumber;
          imageUrl = created.previewImageUrl ?? null;
          track("order_created", { order_number: orderNumber, product: "Sticker" });
        } catch {
          setOrderFallback(true);
          track("order_fallback", { product: "Sticker" });
        }
      }

      setLastOrderNumber(orderNumber);
      const url = whatsappUrl(buildMessage(orderNumber, imageUrl));
      if (win && !win.closed) win.location.replace(url);
      else window.open(url, "_blank", "noopener");
      setIsOrdered(true);
      setTimeout(() => setIsOrdered(false), 5000);
    } finally {
      setIsPreparing(false);
    }
  };

  const orderLabel = isPreparing ? (
    <><Loader2 className="w-4 h-4 animate-spin" /> Creando…</>
  ) : isOrdered ? (
    lastOrderNumber ? `Pedido ${lastOrderNumber} ✓` : "Abriendo WhatsApp…"
  ) : null;

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/svg+xml"
      className="sr-only"
      onChange={e => handleFile(e.target.files?.[0])}
    />
  );

  const examplesRow = (
    <div>
      <p className="text-xs text-[#6f685d] mb-2">O probá con un ejemplo</p>
      <div className="flex gap-2">
        {EXAMPLES.map(ex => (
          <button
            key={ex.id}
            type="button"
            onClick={() => loadExample(ex.svg)}
            disabled={isProcessing}
            className="flex-1 max-w-28 rounded-xl border border-[#e2d8ca] bg-white p-2 flex flex-col items-center gap-1 hover:border-[#8B1A2F]/60 active:scale-[0.97] transition disabled:opacity-60"
          >
            <img src={exampleUrl(ex.svg)} alt="" className="h-12 w-auto max-w-full object-contain" />
            <span className="text-xs font-medium text-[#1A1614]">{ex.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Chips del celular: fila con scroll horizontal, una por opción.
  const pill = (active: boolean) => cn(
    "shrink-0 h-9 px-3.5 rounded-full border text-sm font-medium transition-colors tabular-nums whitespace-nowrap inline-flex items-center gap-1.5",
    active ? "border-[#8B1A2F] bg-[#8B1A2F] text-white" : "border-[#e2d8ca] bg-white text-[#1A1614] active:border-[#8B1A2F]/60",
  );

  const chip = (active: boolean) => cn(
    "min-h-10 px-3.5 rounded-lg border text-sm font-medium transition-colors tabular-nums",
    active ? "border-[#8B1A2F] bg-[#8B1A2F] text-white" : "border-[#e2d8ca] bg-white text-[#1A1614] hover:border-[#8B1A2F]/60",
  );

  const sizeSlider = (
    <Slider
      value={[sizeCm]}
      min={STICKER_MIN_CM}
      max={STICKER_MAX_CM}
      step={0.5}
      onValueChange={([v]) => setSizeCm(v)}
      aria-label="Tamaño del sticker en centímetros"
    />
  );

  /** Marcas sobre la vista: medida, relieve y resolución. */
  const previewOverlays = art && shape && (
    <>
      <div className="absolute left-3 bottom-3 rounded-full bg-white/90 border border-[#ece4d8] px-3 py-1 text-xs text-[#1A1614] tabular-nums">
        {sizeText} · cada cuadro = 1 cm
      </div>
      {finish === "relieve" && (
        <div className="absolute right-3 top-3 rounded-full bg-[#1A1614] text-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5">
          <Layers className="w-3 h-3" /> Relieve 3D
        </div>
      )}
      {lowRes && (
        <div role="status" className="absolute left-3 right-3 bottom-11 flex">
          <span className="rounded-full bg-amber-50/95 border border-amber-200 px-3 py-1 text-xs text-amber-900 inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Se puede ver pixelado{maxGoodCm && maxGoodCm < sizeCm ? ` · ideal hasta ${maxGoodCm.toLocaleString("es-PY")} cm` : ""}
          </span>
        </div>
      )}
    </>
  );

  const bgButton = (className: string) => (
    <button
      type="button"
      onClick={toggleBg}
      aria-label={dark ? "Ver sobre fondo claro" : "Ver sobre fondo oscuro"}
      aria-pressed={dark}
      className={className}
    >
      <Contrast className="w-5 h-5" />
    </button>
  );

  // ── Celular ────────────────────────────────────────────────────────────────

  if (isMobile) {
    const row = (label: string, children: React.ReactNode) => (
      <div className="flex items-center gap-3 min-h-11">
        <span className="w-[4.25rem] shrink-0 text-xs text-[#6f685d]">{label}</span>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    );

    if (art && shape && editorOpen) {
      return (
        <>
          {fileInput}
          <MobileDesignScreen
            title="Tu sticker"
            subtitle={sizeText}
            right={bgButton("w-11 h-11 grid place-items-center rounded-full text-muted-foreground active:bg-secondary aria-pressed:text-[#8B1A2F]")}
            top={vp.top}
            height={vp.height}
            onBack={() => setEditorOpen(false)}
            nav={null}
          >
            <div
              className="relative flex-1 min-h-0 overflow-hidden transition-colors"
              style={{ backgroundColor: dark ? PREVIEW_BG_DARK : PREVIEW_BG_LIGHT }}
            >
              <StickerPreview art={art} shape={shape} finish={finish} dark={dark} svgRef={svgRef} />
              {previewOverlays}
              <div className="absolute left-3 top-3 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={isProcessing}
                  className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-[#ece4d8] text-xs font-medium text-[#1A1614] active:scale-95 transition"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Cambiar
                </button>
                {art.other && (
                  <button
                    type="button"
                    onClick={swapBackground}
                    className="h-9 px-3 inline-flex items-center rounded-full bg-white/90 border border-[#ece4d8] text-xs font-medium text-[#1A1614] active:scale-95 transition"
                  >
                    {art.backgroundRemoved ? "Con fondo" : "Sin fondo"}
                  </button>
                )}
              </div>
            </div>

            <div className="shrink-0 bg-white border-t border-border px-4 py-1.5">
              {row("Tamaño", customSize ? (
                <>
                  <div className="flex-1 min-w-[8rem] px-1">{sizeSlider}</div>
                  <span className="shrink-0 w-14 text-right text-sm tabular-nums">{sizeCm.toLocaleString("es-PY")} cm</span>
                  <button type="button" onClick={() => setCustomSize(false)} aria-label="Listo" className="shrink-0 w-9 h-9 grid place-items-center rounded-full bg-[#8B1A2F] text-white">
                    <Check className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  {STICKER_SIZE_PRESETS.map(cm => (
                    <button key={cm} type="button" onClick={() => pickPresetSize(cm)} className={pill(sizeCm === cm)}>{cm}</button>
                  ))}
                  <button type="button" onClick={() => setCustomSize(true)} className={pill(!isPresetSize)}>
                    {isPresetSize ? "Otro" : `${sizeCm.toLocaleString("es-PY")} cm`}
                  </button>
                </>
              ))}
              {row("Forma", STICKER_CUTS.map(c => (
                <button key={c.id} type="button" onClick={() => setCut(c.id)} aria-pressed={cut === c.id} className={pill(cut === c.id)}>{c.name}</button>
              )))}
              {row("Acabado", STICKER_FINISHES.map(f => (
                <button key={f.id} type="button" onClick={() => pickFinish(f.id)} aria-pressed={finish === f.id} className={pill(finish === f.id)}>
                  {f.id === "relieve" ? <Layers className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {f.name}
                </button>
              )))}
              {row("Cantidad", (
                <>
                  <div className="shrink-0 inline-flex items-center h-9 rounded-full border border-[#e2d8ca] bg-white">
                    <button type="button" onClick={() => setQty(quantity - 1)} className="w-9 h-9 grid place-items-center text-[#1A1614]" aria-label="Menos">
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={STICKER_MAX_QTY}
                      value={quantity}
                      onChange={e => setQty(Number(e.target.value))}
                      className="w-11 h-9 text-center text-base tabular-nums bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      aria-label="Cantidad de stickers"
                    />
                    <button type="button" onClick={() => setQty(quantity + 1)} className="w-9 h-9 grid place-items-center text-[#1A1614]" aria-label="Más">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {STICKER_QTY_PRESETS.filter(n => n > 10).map(n => (
                    <button key={n} type="button" onClick={() => setQty(n)} className={pill(quantity === n)}>{n}</button>
                  ))}
                </>
              ))}
            </div>

            {!vp.keyboard && (
              <div className="shrink-0 bg-white border-t border-border px-4 pt-2.5" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                {orderFallback && (
                  <p className="text-xs text-amber-700 mb-2 leading-snug">
                    No pudimos registrar tu pedido online, pero los datos salen igual por WhatsApp. Mandanos tu diseño en el chat.
                  </p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate tabular-nums">
                      {quantity} {quantity === 1 ? "sticker" : "stickers"} · {finishDef.name.toLowerCase()}
                    </p>
                    <p className="text-base font-semibold text-foreground tabular-nums leading-tight">
                      {STICKER_PRICES_ENABLED ? formatGs(quote.total) : "A cotizar"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOrder}
                    disabled={isPreparing || isOrdered}
                    className="shrink-0 h-12 px-6 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-base font-semibold shadow-sm active:scale-[0.98] transition disabled:opacity-70"
                  >
                    {orderLabel ?? <>Pedir <ChevronRight className="w-5 h-5" /></>}
                  </button>
                </div>
              </div>
            )}
          </MobileDesignScreen>
        </>
      );
    }

    // Sin diseño (o al volver de la pantalla del sticker).
    return (
      <div className="space-y-4">
        {fileInput}
        {art && shape ? (
          <div className="rounded-2xl border border-[#ece4d8] bg-white p-4 flex items-center gap-4">
            <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden" style={{ backgroundColor: dark ? PREVIEW_BG_DARK : PREVIEW_BG_LIGHT }}>
              <StickerPreview art={art} shape={shape} finish={finish} dark={dark} svgRef={svgRef} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold text-[#1A1614]">Tu sticker · {sizeText}</p>
              <Button type="button" onClick={() => setEditorOpen(true)} className="min-h-11 w-full">
                Seguir con tu sticker <ChevronRight className="w-4 h-4" />
              </Button>
              <button type="button" onClick={removeDesign} className="text-xs text-[#5f574d] underline underline-offset-4">
                Empezar con otro diseño
              </button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl border border-[#ece4d8] bg-[#faf7f2] px-5 py-7 text-center"
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isProcessing}
              aria-label="Subir tu diseño"
              className="mx-auto w-16 h-16 rounded-full bg-[#8B1A2F] text-white grid place-items-center shadow-lg shadow-[#8B1A2F]/25 active:scale-95 transition"
            >
              {isProcessing ? <Loader2 className="w-7 h-7 animate-spin" /> : <Plus className="w-8 h-8" />}
            </button>
            <p className="font-serif text-xl text-[#1A1614] mt-4">{isProcessing ? "Preparando tu diseño…" : "Subí tu logo, dibujo o foto"}</p>
            <p className="text-sm text-[#6f685d] mt-1">Si tiene fondo liso, lo recortamos solos.</p>
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={isProcessing} className="min-h-12 w-full mt-5 text-base">
              <ImagePlus className="w-4 h-4" /> Elegir imagen
            </Button>
            <p className="text-xs text-[#6f685d] mt-2">PNG, JPG, WebP o SVG, hasta 8 MB.</p>
            {uploadError && <p className="text-xs text-red-700 mt-2" role="alert">{uploadError}</p>}
            <div className="mt-6 text-left">{examplesRow}</div>
          </div>
        )}
        <ul className="space-y-1.5 text-xs text-muted-foreground px-1">
          <li className="flex items-start gap-2">
            <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            Revisamos el diseño final con vos por WhatsApp antes de imprimir.
          </li>
          <li className="flex items-start gap-2">
            <HandCoins className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            Pagás recién cuando confirmás el diseño.
          </li>
        </ul>
      </div>
    );
  }

  // ── PC: dos columnas ───────────────────────────────────────────────────────

  const stepTitle = (n: number, title: string) => (
    <h3 className="flex items-center gap-2.5 text-sm font-semibold text-[#1A1614] mb-3">
      <span className="w-6 h-6 rounded-full bg-[#8B1A2F] text-white text-xs flex items-center justify-center tabular-nums">{n}</span>
      {title}
    </h3>
  );

  // Vive dentro del personalizador (modo "Stickers"): solo el creador, sin
  // encabezado de sección propio.
  return (
    <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-start">
      {/* Vista previa */}
      <div className="lg:sticky lg:top-24">
        <div
          className="relative aspect-square rounded-2xl overflow-hidden border border-[#ece4d8] transition-colors"
          style={{ backgroundColor: art && dark ? PREVIEW_BG_DARK : PREVIEW_BG_LIGHT }}
        >
          {art && shape ? (
            <StickerPreview art={art} shape={shape} finish={finish} dark={dark} svgRef={svgRef} />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
              className={cn(
                "absolute inset-6 sm:inset-10 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-3 text-center px-6 transition-colors",
                isDragging ? "border-[#8B1A2F] bg-[#f5eaec]" : "border-[#d8cdbf] hover:border-[#8B1A2F]/60",
              )}
            >
              {isProcessing
                ? <Loader2 className="w-8 h-8 text-[#8B1A2F] animate-spin" />
                : <ImagePlus className="w-8 h-8 text-[#8B1A2F]" strokeWidth={1.5} />}
              <span className="font-serif text-xl text-[#1A1614]">{isProcessing ? "Preparando tu diseño…" : "Tu sticker aparece acá"}</span>
              <span className="text-xs text-[#6f685d] max-w-xs">Subí tu logo, dibujo o foto. Si tiene fondo liso, lo recortamos solos.</span>
            </button>
          )}
          {previewOverlays}
          {art && shape && bgButton(cn(
            "absolute left-3 top-3 w-10 h-10 grid place-items-center rounded-full border transition-colors",
            dark ? "bg-white text-[#1A1614] border-white" : "bg-white/90 text-[#5f574d] border-[#ece4d8] hover:text-[#8B1A2F]",
          ))}
        </div>
      </div>

      {/* Pasos */}
      <div className="space-y-7">
        {/* 1. Diseño */}
        <div>
          {stepTitle(1, "Subí tu diseño")}
          {fileInput}
          {art ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isProcessing} className="min-h-10">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Cambiar imagen
              </Button>
              {art.other && (
                <Button type="button" variant="ghost" onClick={swapBackground} className="min-h-10 text-[#5f574d]">
                  {art.backgroundRemoved ? "Usar con el fondo original" : "Quitar el fondo"}
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={removeDesign} className="min-h-10 text-[#5f574d]">
                <X className="w-4 h-4" /> Quitar
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={isProcessing} className="min-h-11">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} Elegir imagen
            </Button>
          )}
          <p className="text-xs text-[#6f685d] mt-2">PNG, JPG, WebP o SVG, hasta 8 MB. Mejor si es PNG con fondo transparente.</p>
          {uploadError && <p className="text-xs text-red-700 mt-2" role="alert">{uploadError}</p>}
          {!art && <div className="mt-4">{examplesRow}</div>}
        </div>

        {/* 2. Tamaño y forma */}
        <div>
          {stepTitle(2, "Tamaño y forma")}
          <p className="text-xs text-[#6f685d] mb-2">Lado más largo del sticker</p>
          <div className="flex flex-wrap gap-2">
            {STICKER_SIZE_PRESETS.map(cm => (
              <button key={cm} type="button" onClick={() => pickPresetSize(cm)} className={chip(sizeCm === cm && !customSize)}>
                {cm} cm
              </button>
            ))}
            <button type="button" onClick={() => setCustomSize(true)} className={chip(customSize || !isPresetSize)}>
              {isPresetSize || customSize ? "Otro" : `${sizeCm.toLocaleString("es-PY")} cm`}
            </button>
          </div>
          {customSize && (
            <div className="flex items-center gap-4 mt-3">
              {sizeSlider}
              <span className="w-24 shrink-0 text-right text-sm tabular-nums text-[#1A1614]">
                {art ? sizeText : `${sizeCm.toLocaleString("es-PY")} cm`}
              </span>
            </div>
          )}

          <p className="text-xs text-[#6f685d] mt-5 mb-2">Corte</p>
          <div className="grid grid-cols-2 gap-2">
            {STICKER_CUTS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCut(c.id)}
                aria-pressed={cut === c.id}
                className={cn(
                  "text-left rounded-xl border p-3 transition-colors",
                  cut === c.id ? "border-[#8B1A2F] bg-[#f5eaec]" : "border-[#e2d8ca] bg-white hover:border-[#8B1A2F]/60",
                )}
              >
                <span className="block text-sm font-semibold text-[#1A1614]">{c.name}</span>
                <span className="block text-xs text-[#6f685d] mt-0.5 leading-snug">{c.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Acabado */}
        <div>
          {stepTitle(3, "Acabado")}
          <div className="grid grid-cols-2 gap-2">
            {STICKER_FINISHES.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => pickFinish(f.id)}
                aria-pressed={finish === f.id}
                className={cn(
                  "text-left rounded-xl border p-3 transition-colors",
                  finish === f.id ? "border-[#8B1A2F] bg-[#f5eaec]" : "border-[#e2d8ca] bg-white hover:border-[#8B1A2F]/60",
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#1A1614]">
                  {f.id === "relieve" ? <Layers className="w-3.5 h-3.5 text-[#8B1A2F]" /> : <Sparkles className="w-3.5 h-3.5 text-[#8B1A2F]" />}
                  {f.name}
                </span>
                <span className="block text-xs text-[#6f685d] mt-0.5 leading-snug">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Cantidad */}
        <div>
          {stepTitle(4, "Cantidad")}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-[#e2d8ca] bg-white">
              <button type="button" onClick={() => setQty(quantity - 1)} className="w-10 h-10 flex items-center justify-center text-[#1A1614]" aria-label="Menos">
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={STICKER_MAX_QTY}
                value={quantity}
                onChange={e => setQty(Number(e.target.value))}
                className="w-16 h-10 text-center text-base tabular-nums bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Cantidad de stickers"
              />
              <button type="button" onClick={() => setQty(quantity + 1)} className="w-10 h-10 flex items-center justify-center text-[#1A1614]" aria-label="Más">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {STICKER_QTY_PRESETS.filter(n => n > 1).map(n => (
              <button key={n} type="button" onClick={() => setQty(n)} className={chip(quantity === n)}>
                {n}
              </button>
            ))}
          </div>
          {STICKER_PRICES_ENABLED && quote.next && (
            <p className="text-xs text-[#6f685d] mt-2">
              Desde {quote.next.min} unidades pagás {formatGs(quote.next.unit)} c/u ({pct(quote.next.discount)} off).
            </p>
          )}
        </div>

        {/* Precio + pedido */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
            {STICKER_PRICES_ENABLED ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{art ? "Precio estimado" : "Precio estimado desde"}</span>
                  <span className="font-serif text-xl text-foreground tabular-nums">{formatGs(quote.total)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {quantity} × {formatGs(quote.unit)}
                  {quote.discount > 0 && <> · {pct(quote.discount)} off por cantidad (ahorrás {formatGs(quote.savings)})</>}
                </p>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-foreground">A cotizar por WhatsApp</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Te pasamos el precio según el tamaño, el acabado y la cantidad.
                </p>
              </>
            )}
          </div>

          <Button
            onClick={handleOrder}
            disabled={isPreparing || isOrdered}
            size="lg"
            className="w-full h-auto min-h-12 py-2.5 text-sm sm:text-base font-semibold leading-tight whitespace-normal"
          >
            {isPreparing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creando tu pedido...</>
            ) : isOrdered ? (
              lastOrderNumber ? `Pedido ${lastOrderNumber} creado ✓` : "Abriendo WhatsApp..."
            ) : art ? "Pedir por WhatsApp" : "Consultar por WhatsApp"}
          </Button>

          {orderFallback && (
            <p className="text-xs text-amber-700 text-center leading-relaxed">
              No pudimos registrar tu pedido online, pero los datos salen igual por WhatsApp. Mandanos tu diseño en el chat.
            </p>
          )}

          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              Revisamos el diseño final con vos por WhatsApp antes de imprimir.
            </li>
            <li className="flex items-start gap-2">
              <HandCoins className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              Pagás recién cuando confirmás el diseño.
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              Retirás en nuestro local: {ADDRESS}.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
