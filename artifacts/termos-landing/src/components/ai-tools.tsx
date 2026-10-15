import React, { useEffect, useState } from "react";
import { Loader2, Sparkles, Wand2, X } from "lucide-react";
import {
  fetchPhraseIdeas, generateAiImage, getAiStatus, type AiImageStyle, type AiStatus, type PhraseIdea,
} from "@/lib/ai";
import { track } from "@/lib/analytics";

/** Qué funciones de IA ofrece el servidor (null mientras se consulta). */
export function useAiStatus(): AiStatus | null {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    let alive = true;
    getAiStatus().then(s => { if (alive) setStatus(s); });
    return () => { alive = false; };
  }, []);
  return status;
}

const inputClass =
  // text-base en móvil: bajo 16px iOS fuerza zoom al enfocar el input.
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 disabled:opacity-60";

/**
 * "Ideas con IA" en la pestaña Texto: el cliente cuenta para qué es y elige una
 * de las frases propuestas. Las ideas de dos líneas llenan también el texto 2.
 */
export function AiPhraseIdeas({ product, twoLines, onPick, defaultOpen = false }: {
  /** Nombre del producto, para el contexto ("Termo Mate"). */
  product: string;
  /** Ya hay un texto 2 abierto: pedir ideas de dos líneas. */
  twoLines: boolean;
  onPick: (idea: PhraseIdea) => void;
  /** Abierto de entrada (se llegó desde "Ideas con IA" del editor). */
  defaultOpen?: boolean;
}) {
  const status = useAiStatus();
  const [open, setOpen] = useState(defaultOpen);
  const [occasion, setOccasion] = useState("");
  const [ideas, setIdeas] = useState<PhraseIdea[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!status?.phrases) return null;

  const ask = async () => {
    const o = occasion.trim();
    if (!o || loading) return;
    setLoading(true);
    setError(null);
    try {
      setIdeas(await fetchPhraseIdeas({ occasion: o, product, twoLines }));
      track("ai_phrases", { two_lines: twoLines });
    } catch (err) {
      setError(err instanceof Error ? err.message : "La IA no respondió. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 py-1 text-sm font-medium text-primary hover:opacity-80 active:opacity-80 transition-opacity"
      >
        <Sparkles className="w-4 h-4" /> ¿No sabés qué poner? Ideas con IA
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-primary/25 bg-[#f5eaec]/40 px-3 py-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" /> Ideas de texto con IA
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar las ideas"
          className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Contanos para qué es. Ej.: día del padre, cumpleaños de Ana, regalo para el equipo de la empresa Acme.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); ask(); }}
      >
        <input
          type="text"
          value={occasion}
          maxLength={200}
          onChange={(e) => setOccasion(e.target.value)}
          placeholder="¿Para qué es?"
          disabled={loading}
          className={`${inputClass} flex-1 min-w-0`}
        />
        <button
          type="submit"
          disabled={loading || !occasion.trim()}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : ideas ? "Otras" : "Sugerir"}
        </button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {ideas && (
        <div className="grid gap-1.5" role="list" aria-label="Ideas de texto">
          {ideas.map((idea, i) => (
            <button
              key={`${i}:${idea.text}`}
              type="button"
              role="listitem"
              onClick={() => { onPick(idea); track("ai_phrase_pick", { two_lines: !!idea.text2 }); }}
              className="text-left rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/50 hover:bg-secondary/50 active:scale-[0.99] transition-all"
            >
              <span className="font-medium">{idea.text}</span>
              {idea.text2 && <span className="block text-xs text-muted-foreground">{idea.text2}</span>}
            </button>
          ))}
          <p className="text-[11px] text-muted-foreground">Tocá una para usarla. Después la podés editar.</p>
        </div>
      )}
    </div>
  );
}

/**
 * "Crear con IA" en la pestaña Imagen: una imagen nueva a partir de una
 * descripción. Sale sobre fondo blanco, así que el recorte de fondo liso la
 * deja lista para el diseñador.
 */
export function AiImageCreator({ style, onImage, disabled }: {
  style: AiImageStyle;
  onImage: (blob: Blob) => Promise<void>;
  disabled?: boolean;
}) {
  const status = useAiStatus();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!status?.images) return null;

  const create = async () => {
    const p = prompt.trim();
    if (!p || loading) return;
    setLoading(true);
    setError(null);
    try {
      const blob = await generateAiImage({ prompt: p, style });
      await onImage(blob);
      track("ai_image", { style });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear la imagen. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-primary/25 bg-[#f5eaec]/40 px-3 py-3 space-y-2">
      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
        <Wand2 className="w-4 h-4 text-primary" /> ¿No tenés imagen? Creala con IA
      </p>
      <p className="text-xs text-muted-foreground">
        {style === "laser"
          ? "Describí el dibujo y lo hacemos en línea negra, ideal para el grabado. Ej.: un yaguareté de perfil, una guitarra con flores."
          : "Describí el dibujo y lo creamos a todo color. Ej.: un tucán con flores tropicales, un escudo de fútbol con un león."}
      </p>
      <textarea
        value={prompt}
        maxLength={400}
        rows={2}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="¿Qué querés que dibuje?"
        disabled={loading || disabled}
        className={`${inputClass} resize-none`}
      />
      <button
        type="button"
        onClick={create}
        disabled={loading || disabled || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando la imagen… (unos segundos)</> : <><Sparkles className="w-4 h-4" /> Crear imagen</>}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** "Convertir en dibujo": la foto subida pasada a línea negra para el láser. */
export function AiToDrawingButton({ photo, onImage, disabled }: {
  photo: Blob;
  onImage: (blob: Blob) => Promise<void>;
  disabled?: boolean;
}) {
  const status = useAiStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!status?.images) return null;

  const run = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await onImage(await generateAiImage({ prompt: "", style: "laser", photo }));
      track("ai_to_drawing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos convertir la foto. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={loading || disabled}
        className="mt-1.5 inline-flex items-center gap-1 py-1 text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80 active:opacity-80 transition-opacity disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        {loading ? "Convirtiendo en dibujo…" : "Convertir la foto en dibujo con IA (queda mejor grabada)"}
      </button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </>
  );
}
