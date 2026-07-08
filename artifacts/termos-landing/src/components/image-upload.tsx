import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { fileToProcessedSvg, type ProcessedImage } from "@/lib/image-processing";
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

  const previewBoxClass = imageSize === "large" ? "w-32 h-32" : "w-20 h-20";

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Subí un archivo de imagen valido (PNG o JPG).");
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
      setError("No se pudo procesar la imagen. Proba con otra.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        {imageSize === "large"
          ? "Subí tu logo o foto. Le sacamos el fondo automaticamente y lo grabamos en tamaño grande."
          : "Subí tu dibujo o foto. Le sacamos el fondo automaticamente y lo grabamos en tamaño chico."}
      </p>

      {!value ? (
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
              <span className="text-sm font-medium text-foreground">Arrastra una imagen o hace click para subir</span>
              <span className="text-xs text-muted-foreground">PNG o JPG, hasta 8MB</span>
            </>
          )}
        </div>
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
            <p className="text-xs text-muted-foreground">Fondo removido y lista para grabar ({imageSize === "large" ? "tamaño grande" : "tamaño chico"}).</p>
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
