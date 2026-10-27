import React, { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Sparkles, X } from "lucide-react";
import { fetchImageBlob, fileToProcessedSvg, type ProcessedImage } from "@/lib/image-processing";
import type { EngravingImageSize } from "@/lib/engraving-plans";
import type { RemovalProgress } from "@/lib/background-removal";
import type { AiImageStyle } from "@/lib/ai";
import { AiImageCreator } from "./ai-tools";

/** Pasa a la otra versión (con/sin fondo) sin perder el archivo original. */
function swapVersion(value: ProcessedImage): ProcessedImage {
  const { other, source, ...current } = value;
  return { ...other!, source, other: { ...current, other: undefined } };
}

interface ImageUploadProps {
  imageSize: Exclude<EngravingImageSize, "none">;
  value: ProcessedImage | null;
  onChange: (image: ProcessedImage | null) => void;
  /** Estilo de las imágenes creadas con IA: línea negra (láser) o a color (UV). */
  aiStyle?: AiImageStyle;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export default function ImageUpload({ imageSize, value, onChange, aiStyle = "laser" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  // Recorte con IA en curso (descarga del modelo la primera vez, después el cálculo).
  const [aiProgress, setAiProgress] = useState<RemovalProgress | null>(null);
  // La imagen actual, para que un recorte con IA que termina tarde (20-60 s)
  // no reviva una imagen que el cliente ya quitó o reemplazó mientras tanto.
  const valueRef = useRef(value);
  valueRef.current = value;

  const previewBoxClass = imageSize === "large" ? "w-32 h-32" : "w-20 h-20";

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Subí un archivo de imagen válido (PNG o JPG).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("La imagen no puede superar los 8MB.");
      return;
    }

    setIsProcessing(true);
    try {
      const processed = await fileToProcessedSvg(file);
      onChange({ ...processed, source: file });
    } catch {
      setError("No se pudo procesar la imagen. Probá con otra.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrl = async () => {
    const raw = urlInput.trim();
    if (!raw || isProcessing) return;
    setError(null);

    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      setError("Ingresá una URL válida (por ejemplo https://ejemplo.com/logo.png).");
      return;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      setError("La URL debe empezar con http:// o https://.");
      return;
    }

    setIsProcessing(true);
    try {
      const blob = await fetchImageBlob(raw);
      if (blob.size > MAX_FILE_BYTES) {
        setError("La imagen no puede superar los 8MB.");
        return;
      }
      const processed = await fileToProcessedSvg(blob);
      onChange({ ...processed, source: blob });
      setUrlInput("");
    } catch {
      setError("No se pudo cargar la imagen desde esa URL. Verificá el enlace, o descargala y subila desde tu dispositivo.");
    } finally {
      setIsProcessing(false);
    }
  };

  /** Imagen hecha por la IA (fondo blanco): entra como una subida, ya sin fondo. */
  const handleAiImage = async (blob: Blob) => {
    setError(null);
    const processed = await fileToProcessedSvg(blob);
    onChange({ ...processed, source: blob });
  };

  /** Recorta con IA. `withBackground`: la versión con fondo a la que se puede volver. */
  const runAiCut = async (current: ProcessedImage, withBackground: ProcessedImage) => {
    if (!current.source || aiProgress) return;
    setError(null);
    setAiProgress({ stage: "download", fraction: 0 });
    try {
      const { removeBackgroundAI } = await import("@/lib/background-removal");
      const cut = await removeBackgroundAI(current.source, withBackground, { onProgress: setAiProgress });
      if (valueRef.current?.source !== current.source) return;
      onChange(cut);
    } catch {
      if (valueRef.current?.source !== current.source) return;
      setError("No pudimos quitar el fondo de esta imagen. Probá de nuevo o subí otra foto.");
    } finally {
      setAiProgress(null);
    }
  };

  /** "Sin fondo": usa el recorte que ya haya; si no hay, lo hace la IA. */
  const pickNoBackground = () => {
    if (!value || value.backgroundRemoved) return;
    if (value.other?.backgroundRemoved) onChange(swapVersion(value));
    else runAiCut(value, value);
  };
  const pickWithBackground = () => {
    if (!value || !value.backgroundRemoved || !value.other) return;
    onChange(swapVersion(value));
  };
  /** El recorte de fondo liso quedó raro: rehacerlo con IA sobre la foto completa. */
  const improveWithAi = () => {
    if (!value?.backgroundRemoved || !value.other) return;
    runAiCut(value, value.other);
  };

  // La imagen ya venía sin fondo (PNG transparente): no hay otra versión.
  const ownCutOut = !!value && value.backgroundRemoved && !value.other;
  const canAiCut = !!value?.source;

  return (
    <div>
      {!value ? (
        <>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-[#f5eaec]" : "border-border hover:border-primary/40 hover:bg-secondary/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {isProcessing ? (
            <>
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Procesando imagen...</span>
            </>
          ) : (
            <>
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Arrastrá una imagen o hacé clic para subir</span>
              <span className="text-xs text-muted-foreground">PNG o JPG, hasta 8MB</span>
            </>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          <span>o pegá el enlace de una imagen</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="url"
              inputMode="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleUrl();
                }
              }}
              placeholder="https://ejemplo.com/logo.png"
              disabled={isProcessing}
              // text-base en móvil: bajo 16px iOS fuerza zoom al enfocar el input.
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 disabled:opacity-60"
            />
          </div>
          <button
            type="button"
            onClick={handleUrl}
            disabled={isProcessing || !urlInput.trim()}
            className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Usar URL"}
          </button>
        </div>

        <AiImageCreator style={aiStyle} onImage={handleAiImage} disabled={isProcessing} />
        </>
      ) : (
        <div className="border border-border rounded-xl p-4 bg-secondary/30">
          <div className="flex items-center gap-4">
            <div
              className={`relative shrink-0 rounded-lg overflow-hidden border border-border ${previewBoxClass}`}
              style={{
                backgroundImage:
                  "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
                backgroundSize: "10px 10px",
                backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
              }}
            >
              <img src={value.svgDataUrl} alt="Imagen subida" className="w-full h-full object-contain p-1" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Imagen lista</p>
              <p className="text-xs text-muted-foreground">
                {ownCutOut
                  ? `Tu imagen ya viene sin fondo. Va a todo color (${imageSize === "large" ? "tamaño grande" : "tamaño chico"}).`
                  : value.backgroundRemoved
                    ? `Sin fondo, a todo color (${imageSize === "large" ? "tamaño grande" : "tamaño chico"}).`
                    : `Con fondo: va la imagen completa, a todo color (${imageSize === "large" ? "tamaño grande" : "tamaño chico"}).`}
              </p>
  
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              aria-label="Quitar imagen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {!ownCutOut && (value.other || canAiCut) && (
            <div className="mt-3 flex w-full rounded-lg border border-border bg-background p-0.5" role="group" aria-label="Fondo de la imagen">
              {([
                ["Con fondo", !value.backgroundRemoved, pickWithBackground],
                ["Sin fondo", value.backgroundRemoved, pickNoBackground],
              ] as const).map(([label, on, pick]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  disabled={!!aiProgress}
                  onClick={pick}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-60 ${
                    on ? "bg-[#f5eaec] text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {aiProgress ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-primary" role="status">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              {aiProgress.stage === "download"
                ? `Preparando el recortador${aiProgress.fraction !== null ? ` · ${Math.round(aiProgress.fraction * 100)}%` : "…"} (solo la primera vez)`
                : "Quitando el fondo…"}
            </p>
          ) : value.backgroundRemoved && !value.aiCut && value.other && canAiCut ? (
            <button
              type="button"
              onClick={improveWithAi}
              className="mt-1.5 inline-flex items-center gap-1 py-1 text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80 active:opacity-80 transition-opacity"
            >
              <Sparkles className="w-3.5 h-3.5" /> ¿El recorte no quedó bien? Recortar con IA
            </button>
          ) : null}
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
