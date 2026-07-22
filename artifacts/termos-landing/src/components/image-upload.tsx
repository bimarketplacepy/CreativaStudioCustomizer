import React, { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, X } from "lucide-react";
import { fetchImageBlob, fileToProcessedSvg, type ProcessedImage } from "@/lib/image-processing";
import type { EngravingImageSize } from "@/lib/engraving-plans";

interface ImageUploadProps {
  imageSize: Exclude<EngravingImageSize, "none">;
  value: ProcessedImage | null;
  onChange: (image: ProcessedImage | null) => void;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export default function ImageUpload({ imageSize, value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const previewBoxClass = imageSize === "large" ? "w-32 h-32" : "w-20 h-20";

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Suba un archivo de imagen válido (PNG o JPG).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("La imagen no puede superar los 8MB.");
      return;
    }

    setIsProcessing(true);
    try {
      const processed = await fileToProcessedSvg(file);
      onChange(processed);
    } catch {
      setError("No se pudo procesar la imagen. Pruebe con otra.");
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
      onChange(processed);
      setUrlInput("");
    } catch {
      setError("No se pudo cargar la imagen desde esa URL. Verificá el enlace, o descargala y subila desde tu dispositivo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        {imageSize === "large"
          ? "Suba su logo o foto: va a todo color (impresión UV) en tamaño grande. Si tiene un fondo liso se lo quitamos automáticamente."
          : "Suba su dibujo o foto: va a todo color (impresión UV) en tamaño chico. Si tiene un fondo liso se lo quitamos automáticamente."}
      </p>

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
        </>
      ) : (
        <div className="flex items-center gap-4 border border-border rounded-xl p-4 bg-secondary/30">
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
              {value.backgroundRemoved
                ? `Fondo removido, va a todo color (${imageSize === "large" ? "tamaño grande" : "tamaño chico"}).`
                : value.other
                  ? `Imagen original completa, a todo color (${imageSize === "large" ? "tamaño grande" : "tamaño chico"}).`
                  : `No encontramos un fondo liso, así que usamos la imagen completa a todo color (${imageSize === "large" ? "tamaño grande" : "tamaño chico"}).`}
            </p>
            {value.other && (
              <button
                type="button"
                onClick={() => {
                  const { other, ...current } = value;
                  onChange({ ...other!, other: current });
                }}
                className="mt-1.5 inline-block py-1.5 text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80 active:opacity-80 transition-opacity"
              >
                {value.backgroundRemoved
                  ? "¿El recorte quedó raro? Usar la imagen original"
                  : "Quitar el fondo automáticamente"}
              </button>
            )}
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
      )}

      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
