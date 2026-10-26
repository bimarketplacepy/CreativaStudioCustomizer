import React, { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Loader2, Maximize2, Trash2, X } from "lucide-react";
import {
  artworkDistortion, dpiVerdict, DPI_VERDICT_TEXT, MAX_WRAP_LOGOS, readWrapImage, wrapEffectiveDpi,
  WRAP_LOGO_SPOTS, WRAP_MODES, type WrapDesign, type WrapLogo, type WrapMode,
} from "@/lib/wrap-design";

/**
 * "Todo el vaso (360°)" (DACEN.md §12): fondo que llena la vuelta completa,
 * debajo del texto, ícono y logo. Solo impresión a color en piezas que entran
 * en la Dacen F5. Lo usan la hoja del celular y la pestaña Imagen de escritorio.
 */

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export interface WrapPrintSize {
  /** La vuelta completa (π × Ø) y el alto imprimible, en mm. */
  circumferenceMm: number;
  heightMm: number;
  /** Medidas del modelo 3D, no de calibre. */
  approx: boolean;
}

const fmtMm = (v: number) => `${Math.round(v)}`;

const VERDICT_CLASS = {
  ideal: "bg-[#E9F4EC] text-[#24603B]",
  ok: "bg-[#E9F4EC] text-[#24603B]",
  warn: "bg-[#FBF0DC] text-[#8A560A]",
  bad: "bg-[#FBE4E1] text-[#9B231A]",
} as const;

export function WrapDesignPanel({ value, onChange, size, productName, onShowUnwrapped }: {
  value: WrapDesign | null;
  onChange: (next: WrapDesign | null) => void;
  size: WrapPrintSize;
  /** Para el nombre de la plantilla ("Vaso 20oz"). */
  productName: string;
  onShowUnwrapped: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ratio = size.heightMm / size.circumferenceMm;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) { setError("Elegí una imagen (JPG o PNG)."); return; }
    if (file.size > MAX_FILE_BYTES) { setError("La imagen pesa más de 25 MB. Probá con una versión más liviana."); return; }
    setBusy(true);
    try {
      const img = await readWrapImage(file);
      // Con la proporción exacta de la plantilla (±1,5 %), es un arte completo.
      const looksLikeArtwork = artworkDistortion(img, ratio) < 0.015;
      onChange({
        url: img.url, width: img.width, height: img.height,
        mode: looksLikeArtwork ? "artwork" : value?.mode === "artwork" ? "cover" : value?.mode ?? "cover",
        scale: 1, offsetU: 0, offsetV: 0,
        // Cambiar el fondo no borra los logos de encima.
        logos: value?.logos ?? [],
      });
    } catch {
      setError("No pudimos abrir la imagen. Probá con otra.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const set = (patch: Partial<WrapDesign>) => value && onChange({ ...value, ...patch });
  const dpi = value ? wrapEffectiveDpi(value, size.circumferenceMm, ratio) : 0;
  const verdict = dpiVerdict(dpi);
  const distortion = value?.mode === "artwork" ? artworkDistortion(value, ratio) : 0;
  const needPx = Math.ceil((size.circumferenceMm / 25.4) * 300);
  const approx = size.approx ? "≈ " : "";

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Una foto, un patrón o tu arte completo que da la vuelta entera ({approx}{fmtMm(size.circumferenceMm)} × {fmtMm(size.heightMm)} mm).
        El texto, el ícono y el logo van encima.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label="Subir imagen para todo el vaso"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {!value ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full min-h-28 rounded-2xl border-2 border-dashed border-primary/40 bg-[#f5eaec]/60 flex flex-col items-center justify-center gap-1.5 text-primary active:scale-[0.99] transition"
        >
          {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
          <span className="text-sm font-semibold">Subí tu foto o tu arte</span>
          <span className="text-xs text-primary/80">JPG o PNG · ideal {needPx} px de ancho</span>
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <img src={value.url} alt="" className="w-20 h-12 rounded-lg object-cover border border-border bg-secondary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{value.width} × {value.height} px</p>
            <button type="button" onClick={() => inputRef.current?.click()} className="text-xs font-medium text-primary">
              Cambiar imagen
            </button>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Quitar el fondo 360°"
            className="w-10 h-10 grid place-items-center rounded-full text-muted-foreground active:bg-secondary"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

      {value && (
        <>
          <div role="radiogroup" aria-label="Cómo llena la vuelta" className="grid grid-cols-2 gap-2">
            {WRAP_MODES.map(m => {
              const on = value.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ mode: m.id as WrapMode })}
                  className={`min-h-11 px-3 rounded-xl border text-sm font-medium transition-all ${on
                    ? "border-primary bg-[#f5eaec] text-primary ring-1 ring-primary/30"
                    : "border-border text-foreground hover:border-primary/40"}`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground -mt-1">{WRAP_MODES.find(m => m.id === value.mode)?.hint}</p>

          {value.mode === "cover" && (
            <div className="space-y-3">
              <RangeRow id="wrap-scale" label="Tamaño" min={1} max={3} step={0.05} value={value.scale} onChange={(v) => set({ scale: v })} />
              <RangeRow id="wrap-x" label="Mover a los lados" min={-0.5} max={0.5} step={0.01} value={value.offsetU} onChange={(v) => set({ offsetU: v })} />
              <RangeRow id="wrap-y" label="Mover arriba / abajo" min={-0.5} max={0.5} step={0.01} value={value.offsetV} onChange={(v) => set({ offsetV: v })} />
            </div>
          )}

          <p role="status" className={`text-xs font-medium rounded-lg px-3 py-2 ${VERDICT_CLASS[verdict]}`}>
            {DPI_VERDICT_TEXT[verdict]} · {dpi} dpi sobre el vaso
            {verdict === "warn" || verdict === "bad" ? ` (ideal: ${needPx} px de ancho)` : ""}
          </p>
          {distortion >= 0.04 && (
            <p className="text-xs font-medium rounded-lg px-3 py-2 bg-[#FBF0DC] text-[#8A560A]">
              Tu arte no tiene la proporción de la plantilla: se va a estirar {Math.round(distortion * 100)} %. Usá «Ajustar» o armalo con la plantilla.
            </p>
          )}

          <WrapLogosEditor logos={value.logos ?? []} onChange={(logos) => set({ logos })} />

          <button
            type="button"
            onClick={onShowUnwrapped}
            className="w-full min-h-11 rounded-full border border-border text-sm font-semibold text-foreground flex items-center justify-center gap-2 active:bg-secondary"
          >
            <Maximize2 className="w-4 h-4" /> Ver desplegado
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => downloadWrapTemplate(size, productName)}
        className="w-full flex items-center gap-2 text-sm font-medium text-primary min-h-10"
      >
        <Download className="w-4 h-4" /> Descargar plantilla para tu diseñador
      </button>
    </div>
  );
}

/** El SVG va en vector al archivo de la Dacen; muy pesado, se usa como imagen. */
const MAX_SVG_CHARS = 400_000;
const nearSpot = (u: number, target: number) => {
  const d = Math.abs((((u - target) % 1) + 1.5) % 1 - 0.5);
  return d < 0.02;
};

/**
 * Logos encima del fondo 360° (fase 4): hasta MAX_WRAP_LOGOS, cada uno en una
 * cara (frente, costados, atrás), con su alto y su tamaño.
 */
function WrapLogosEditor({ logos, onChange }: { logos: WrapLogo[]; onChange: (logos: WrapLogo[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) { setError("Elegí un logo en SVG, PNG o JPG."); return; }
    if (file.size > MAX_FILE_BYTES) { setError("El logo pesa más de 25 MB."); return; }
    setBusy(true);
    try {
      const img = await readWrapImage(file);
      // Cada logo nuevo va a la próxima cara libre (frente, izquierda, atrás…).
      const spot = WRAP_LOGO_SPOTS.find(sp => !logos.some(l => nearSpot(l.u, sp.u))) ?? WRAP_LOGO_SPOTS[0]!;
      onChange([...logos, {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        url: img.url, width: img.width, height: img.height,
        svg: img.svg && img.svg.length <= MAX_SVG_CHARS ? img.svg : null,
        u: spot.u, v: 0.5, widthFrac: 0.18,
      }]);
    } catch {
      setError("No pudimos abrir el logo. Probá con otro archivo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  const update = (id: string, patch: Partial<WrapLogo>) => onChange(logos.map(l => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) => {
    const gone = logos.find(l => l.id === id);
    if (gone?.url.startsWith("blob:")) URL.revokeObjectURL(gone.url);
    onChange(logos.filter(l => l.id !== id));
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Logos encima del fondo</p>
        <p className="text-xs text-muted-foreground">Hasta {MAX_WRAP_LOGOS}. En SVG salen en vector, más nítidos; PNG o JPG también sirven.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/svg+xml,image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label="Subir un logo para encima del fondo"
        onChange={(e) => add(e.target.files?.[0])}
      />
      {logos.map((l, i) => (
        <div key={l.id} className="rounded-xl border border-border p-3 space-y-3">
          <div className="flex items-center gap-3">
            <img src={l.url} alt="" className="w-12 h-12 rounded-lg object-contain border border-border bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:12px_12px]" />
            <p className="flex-1 min-w-0 text-sm font-medium text-foreground">
              Logo {i + 1} <span className="text-xs font-normal text-muted-foreground">· {l.svg ? "vector" : `${l.width} × ${l.height} px`}</span>
            </p>
            <button
              type="button"
              onClick={() => remove(l.id)}
              aria-label={`Quitar el logo ${i + 1}`}
              className="w-10 h-10 grid place-items-center rounded-full text-muted-foreground active:bg-secondary"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>
          <div role="radiogroup" aria-label={`Dónde va el logo ${i + 1}`} className="grid grid-cols-4 gap-1.5">
            {WRAP_LOGO_SPOTS.map(sp => {
              const on = nearSpot(l.u, sp.u);
              return (
                <button
                  key={sp.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => update(l.id, { u: sp.u })}
                  className={`min-h-10 rounded-lg border text-xs font-medium transition-all ${on
                    ? "border-primary bg-[#f5eaec] text-primary"
                    : "border-border text-foreground"}`}
                >
                  {sp.label}
                </button>
              );
            })}
          </div>
          <RangeRow id={`logo-size-${l.id}`} label="Tamaño" min={0.05} max={0.4} step={0.01} value={l.widthFrac} onChange={(v) => update(l.id, { widthFrac: v })} />
          <RangeRow id={`logo-v-${l.id}`} label="Más arriba / abajo" min={0} max={1} step={0.01} value={l.v} onChange={(v) => update(l.id, { v })} />
        </div>
      ))}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {logos.length < MAX_WRAP_LOGOS && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full min-h-11 rounded-full border border-dashed border-primary/50 text-sm font-semibold text-primary flex items-center justify-center gap-2 active:bg-[#f5eaec]"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {logos.length ? "Agregar otro logo" : "Agregar un logo"}
        </button>
      )}
    </div>
  );
}

function RangeRow({ id, label, min, max, step, value, onChange }: {
  id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="w-32 shrink-0">{label}</span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-primary"
      />
    </label>
  );
}

/**
 * Plantilla a tamaño real, 300 dpi: la vuelta completa con el frente al centro,
 * la costura en los bordes y la zona segura. Es una guía para armar el diseño
 * encima en una capa aparte (las guías no se suben).
 */
export function downloadWrapTemplate(size: WrapPrintSize, productName: string) {
  const dpi = 300;
  const px = (mm: number) => Math.round((mm / 25.4) * dpi);
  const W = px(size.circumferenceMm), H = px(size.heightMm);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  if (!x) return;
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  // Cuadrícula de 10 mm.
  x.strokeStyle = "#e6e0d6"; x.lineWidth = 2;
  for (let mm = 10; mm < size.circumferenceMm; mm += 10) { x.beginPath(); x.moveTo(px(mm), 0); x.lineTo(px(mm), H); x.stroke(); }
  for (let mm = 10; mm < size.heightMm; mm += 10) { x.beginPath(); x.moveTo(0, px(mm)); x.lineTo(W, px(mm)); x.stroke(); }
  // Zona segura (3 mm) y frente.
  x.setLineDash([24, 16]);
  x.strokeStyle = "#7b726b"; x.lineWidth = 4;
  x.strokeRect(px(3), px(3), W - 2 * px(3), H - 2 * px(3));
  x.strokeStyle = "#9e1b3e";
  x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke();
  for (const q of [0.25, 0.75]) { x.strokeStyle = "#c9c1b8"; x.beginPath(); x.moveTo(W * q, 0); x.lineTo(W * q, H); x.stroke(); }
  x.setLineDash([]);
  // Costura en los dos bordes.
  x.fillStyle = "#9e1b3e";
  x.fillRect(0, 0, 8, H); x.fillRect(W - 8, 0, 8, H);
  x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `700 ${px(4)}px Inter, system-ui, sans-serif`;
  x.fillText("FRENTE", W / 2, px(8));
  x.fillStyle = "#7b726b";
  x.font = `600 ${px(3)}px Inter, system-ui, sans-serif`;
  // Mismas caras que el editor (face-area.ts): izquierda en u = 0,75.
  x.fillText("DERECHA", W * 0.25, px(8));
  x.fillText("IZQUIERDA", W * 0.75, px(8));
  x.fillText("COSTURA · ATRÁS", px(18), px(8));
  x.fillText("ATRÁS · COSTURA", W - px(18), px(8));
  x.fillStyle = "#1e1a18";
  x.font = `700 ${px(5)}px Inter, system-ui, sans-serif`;
  x.fillText(`${productName} · vuelta completa`, W / 2, H / 2 - px(5));
  x.font = `500 ${px(3.2)}px Inter, system-ui, sans-serif`;
  x.fillText(
    `${fmtMm(size.circumferenceMm)} × ${fmtMm(size.heightMm)} mm · ${W} × ${H} px · 300 dpi${size.approx ? " · medidas aproximadas" : ""}`,
    W / 2, H / 2 + px(2),
  );
  x.fillText("Armá tu diseño en una capa aparte y exportá solo tu diseño a este mismo tamaño.", W / 2, H / 2 + px(7));
  x.fillText("Texto y logos dentro de la línea punteada. El frente es la línea del centro.", W / 2, H / 2 + px(11));
  c.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantilla-360-${productName.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${fmtMm(size.circumferenceMm)}x${fmtMm(size.heightMm)}mm.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, "image/png");
}

/**
 * "Ver desplegado": la vuelta plana, con la costura y el frente marcados. Lo
 * que se ve es el mismo dibujo que el archivo de la Dacen.
 */
export function UnwrappedDialog({ open, onClose, render, size }: {
  open: boolean;
  onClose: () => void;
  render: () => Promise<string | null>;
  size: WrapPrintSize;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const renderRef = useRef(render);
  renderRef.current = render;

  useEffect(() => {
    if (!open) { setSrc(null); setFailed(false); return; }
    let alive = true;
    renderRef.current().then(url => { if (alive) { setSrc(url); setFailed(!url); } }).catch(() => alive && setFailed(true));
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { alive = false; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!open) return null;
  const approx = size.approx ? "≈ " : "";
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <div role="dialog" aria-modal="true" aria-labelledby="unwrapped-title" className="relative w-full max-w-3xl bg-white rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p id="unwrapped-title" className="text-base font-semibold text-foreground">La vuelta, desplegada</p>
            <p className="text-xs text-muted-foreground">{approx}{fmtMm(size.circumferenceMm)} × {fmtMm(size.heightMm)} mm · así sale el archivo de impresión</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar" className="w-10 h-10 grid place-items-center rounded-full text-muted-foreground active:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative rounded-lg overflow-hidden bg-secondary border border-border" style={{ aspectRatio: `${size.circumferenceMm} / ${size.heightMm}` }}>
          {src ? <img src={src} alt="Diseño desplegado: la vuelta completa del vaso" className="absolute inset-0 w-full h-full" />
            : <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">{failed ? "No pudimos armar la vista." : <Loader2 className="w-5 h-5 animate-spin" />}</div>}
          <span aria-hidden className="absolute inset-y-0 left-0 border-l-2 border-dashed border-primary" />
          <span aria-hidden className="absolute inset-y-0 right-0 border-r-2 border-dashed border-primary" />
          <span aria-hidden className="absolute inset-y-0 left-1/2 border-l border-dashed border-white/80" />
        </div>
        <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
          <span>atrás</span><span>derecha</span><span className="text-primary">frente</span><span>izquierda</span><span>atrás</span>
        </div>
        <p className="text-xs text-foreground rounded-lg bg-[#f5eaec] px-3 py-2">
          <b className="text-primary">Costura:</b> en los bordes empieza y termina la impresión, atrás del vaso. Evitá poner texto justo ahí.
        </p>
      </div>
    </div>
  );
}
