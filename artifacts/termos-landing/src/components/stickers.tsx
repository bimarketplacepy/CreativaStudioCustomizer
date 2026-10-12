import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, HandCoins, ImagePlus, Layers, Loader2, MapPin, MessageCircle, Minus, Plus,
  RefreshCw, Sparkles, X,
} from "lucide-react";
import { useCreateOrder, type CreateOrderRequest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { fileToProcessedSvg, type ProcessedImage } from "@/lib/image-processing";
import { buildArtMask, computeStickerShape, type StickerShape } from "@/lib/sticker-shape";
import {
  STICKER_BORDER_MM, STICKER_CUTS, STICKER_FINISHES, STICKER_MAX_CM, STICKER_MAX_QTY, STICKER_MIN_CM,
  STICKER_QTY_PRESETS, STICKER_SIZE_PRESETS, stickerQuote, type StickerCutId, type StickerFinishId,
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
 * Flujo: subir diseño → tamaño, corte, acabado y cantidad → precio al instante
 * → POST /api/orders (mismo circuito que el personalizador) → WhatsApp.
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

// ── Vista previa ─────────────────────────────────────────────────────────────

function StickerPreview({ art, shape, finish, svgRef }: {
  art: ProcessedImage;
  shape: StickerShape;
  finish: StickerFinishId;
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
          <path d="M10 0 L0 0 0 10" fill="none" stroke="#e7ddd0" strokeWidth={Math.max(0.15, frame / 900)} />
        </pattern>
        <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy={frame / 160} stdDeviation={frame / 140} floodColor="#3b2a1e" floodOpacity="0.22" />
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

      <rect width={frame} height={frame} fill="#faf7f2" />
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
        <path d={shape.cutPath} fill="none" stroke="#d8cdbf" strokeWidth={Math.max(0.15, frame / 700)} />
      </g>
    </svg>
  );
}

// ── Sección ──────────────────────────────────────────────────────────────────

export default function Stickers() {
  const inputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [art, setArt] = useState<ProcessedImage | null>(null);
  const [artImg, setArtImg] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [sizeCm, setSizeCm] = useState(7);
  const [cut, setCut] = useState<StickerCutId>("silueta");
  const [finish, setFinish] = useState<StickerFinishId>("brillo");
  const [quantity, setQuantity] = useState(10);

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

  // Sin diseño todavía: precio "desde" con un sticker cuadrado del tamaño elegido.
  const widthMm = shape?.widthMm ?? sizeCm * 10;
  const heightMm = shape?.heightMm ?? sizeCm * 10;
  const quote = stickerQuote({ widthCm: widthMm / 10, heightCm: heightMm / 10, quantity, finish });
  const finishDef = STICKER_FINISHES.find(f => f.id === finish)!;
  const cutDef = STICKER_CUTS.find(c => c.id === cut)!;

  // Resolución real de impresión del arte a este tamaño.
  const dpi = art && shape ? art.width / (shape.imageBox.w / 25.4) : null;
  const lowRes = dpi !== null && dpi < MIN_DPI;

  const sizeText = `${cmLabel(widthMm)} × ${cmLabel(heightMm)} cm`;
  const priceText = `${formatGs(quote.total)} (${formatGs(quote.unit)} c/u${quote.discount ? `, ${pct(quote.discount)} off por cantidad` : ""})`;

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
    setIsProcessing(true);
    try {
      const processed = await fileToProcessedSvg(file, ART_MAX_DIM);
      setArt(processed);
      // Una foto sin fondo recortable va mejor en rectángulo.
      setCut(processed.backgroundRemoved ? "silueta" : "rectangulo");
      track("sticker_upload", { background_removed: processed.backgroundRemoved });
    } catch {
      setUploadError("No pudimos leer esa imagen. Probá con otro archivo.");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  /** Alterna entre el recorte automático y la imagen original. */
  const swapBackground = () => {
    if (!art?.other) return;
    const next: ProcessedImage = { ...art.other, other: { ...art, other: undefined } };
    setArt(next);
    if (!next.backgroundRemoved) setCut("rectangulo");
  };

  const setQty = (n: number) => setQuantity(Math.min(STICKER_MAX_QTY, Math.max(1, Math.round(n) || 1)));

  const buildMessage = (orderNumber: string | null, imageUrl: string | null) => {
    const parts = ["¡Hola! Quiero pedir stickers con mi diseño."];
    if (orderNumber) parts.push(`Pedido: ${orderNumber}`);
    parts.push(
      "Producto: Stickers UV DTF",
      `Tamaño: ${sizeText}`,
      `Corte: ${cutDef.name}`,
      `Acabado: ${finishDef.name}`,
      `Cantidad: ${quantity}`,
      `Precio estimado: ${priceText}`,
    );
    if (imageUrl) parts.push(`Así quedó mi sticker:\n${imageUrl}`);
    else if (!art) parts.push("Te mando el diseño por acá.");
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
              unitPrice: quote.unit,
              total: quote.total,
              discount: quote.discount,
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

  const stepTitle = (n: number, title: string) => (
    <h3 className="flex items-center gap-2.5 text-sm font-semibold text-[#1A1614] mb-3">
      <span className="w-6 h-6 rounded-full bg-[#8B1A2F] text-white text-xs flex items-center justify-center tabular-nums">{n}</span>
      {title}
    </h3>
  );

  const chip = (active: boolean) => cn(
    "min-h-10 px-3.5 rounded-lg border text-sm font-medium transition-colors tabular-nums",
    active ? "border-[#8B1A2F] bg-[#8B1A2F] text-white" : "border-[#e2d8ca] bg-white text-[#1A1614] hover:border-[#8B1A2F]/60",
  );

  return (
    <section id="stickers" className="scroll-mt-20 py-12 md:py-24 px-4 sm:px-6 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto">
        <div className="mb-7 md:mb-12 max-w-2xl">
          <p className="text-[#8B1A2F] text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-2 md:mb-4">
            Stickers
          </p>
          <h2 className="font-serif font-light text-[1.6rem] leading-[1.15] md:text-5xl text-[#1A1614] mb-2.5 md:mb-5 md:leading-[1.1]">
            Stickers con tu diseño
          </h2>
          <p className="text-[#5f574d] leading-relaxed font-light text-sm sm:text-base md:text-lg">
            Impresos a todo color, con acabado brillante o con relieve que se siente al tacto. Se pegan
            en termos, botellas, notebooks, celulares o packaging, y resisten agua y roce.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-start">
          {/* Vista previa */}
          <div className="lg:sticky lg:top-24">
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-[#ece4d8] bg-[#faf7f2]">
              {art && shape ? (
                <StickerPreview art={art} shape={shape} finish={finish} svgRef={svgRef} />
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
              {art && shape && (
                <div className="absolute left-3 bottom-3 rounded-full bg-white/90 border border-[#ece4d8] px-3 py-1 text-xs text-[#1A1614] tabular-nums">
                  {sizeText} · cada cuadro = 1 cm
                </div>
              )}
              {finish === "relieve" && art && (
                <div className="absolute right-3 top-3 rounded-full bg-[#1A1614] text-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5">
                  <Layers className="w-3 h-3" /> Relieve 3D
                </div>
              )}
            </div>
          </div>

          {/* Pasos */}
          <div className="space-y-7">
            {/* 1. Diseño */}
            <div>
              {stepTitle(1, "Subí tu diseño")}
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={e => handleFile(e.target.files?.[0])}
              />
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
                  <Button type="button" variant="ghost" onClick={() => setArt(null)} className="min-h-10 text-[#5f574d]">
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
              {lowRes && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 flex gap-2" role="status">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Tu imagen tiene poca resolución para este tamaño y puede verse pixelada. Probá un tamaño menor o mandanos el archivo original.
                </p>
              )}
            </div>

            {/* 2. Tamaño y forma */}
            <div>
              {stepTitle(2, "Tamaño y forma")}
              <p className="text-xs text-[#6f685d] mb-2">Lado más largo del sticker</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {STICKER_SIZE_PRESETS.map(cm => (
                  <button key={cm} type="button" onClick={() => setSizeCm(cm)} className={chip(sizeCm === cm)}>
                    {cm} cm
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[sizeCm]}
                  min={STICKER_MIN_CM}
                  max={STICKER_MAX_CM}
                  step={0.5}
                  onValueChange={([v]) => setSizeCm(v)}
                  aria-label="Tamaño del sticker en centímetros"
                />
                <span className="w-24 shrink-0 text-right text-sm tabular-nums text-[#1A1614]">
                  {art ? sizeText : `${sizeCm.toLocaleString("es-PY")} cm`}
                </span>
              </div>

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
                    onClick={() => setFinish(f.id)}
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
              {quote.next && (
                <p className="text-xs text-[#6f685d] mt-2">
                  Desde {quote.next.min} unidades pagás {formatGs(quote.next.unit)} c/u ({pct(quote.next.discount)} off).
                </p>
              )}
            </div>

            {/* Precio + pedido */}
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{art ? "Precio estimado" : "Precio estimado desde"}</span>
                  <span className="font-serif text-xl text-foreground tabular-nums">{formatGs(quote.total)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {quantity} × {formatGs(quote.unit)}
                  {quote.discount > 0 && <> · {pct(quote.discount)} off por cantidad (ahorrás {formatGs(quote.savings)})</>}
                </p>
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
      </div>
    </section>
  );
}
