import React, { useMemo, useState } from "react";
import { ARTIST_DESIGNS, ARTISTS, designPrice, getArtist, type ArtistDesign } from "@/lib/artist-designs";
import { getMaterial } from "@/lib/materials";
import { formatGs } from "@/lib/odoo-catalog";
import { requestDesignPreset } from "@/lib/design-preset";
import { scrollToSection } from "@/lib/section-reveal";
import { track } from "@/lib/analytics";

/** Nombre de la pieza del diseño, como la nombra el personalizador. */
function pieceName(d: ArtistDesign): string {
  return getMaterial(d.materialId).products.find(p => p.id === d.materialProductId)?.name ?? "";
}

/**
 * «Recomendados»: diseños hechos por artistas que el cliente copia tal cual.
 * "Copiar diseño" abre el personalizador con la pieza y el diseño ya puestos;
 * ahí puede sumarle su nombre o un texto.
 */
export default function ArtistDesigns() {
  // Filtro por artista: aparece solo cuando hay más de uno.
  const [artistId, setArtistId] = useState<string | null>(null);
  const designs = useMemo(
    () => ARTIST_DESIGNS.filter(d => !artistId || d.artistId === artistId),
    [artistId],
  );
  if (!ARTIST_DESIGNS.length) return null;

  const copy = (d: ArtistDesign) => {
    track("artist_design_copy", { design: d.id, artist: d.artistId });
    requestDesignPreset({ materialId: d.materialId, materialProductId: d.materialProductId, artistDesignId: d.id });
    scrollToSection("customizer");
  };

  return (
    <section id="recomendados" aria-labelledby="recomendados-title" className="scroll-mt-16 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 md:py-24">
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[var(--cs-bordo)]">Recomendados</p>
        <h2 id="recomendados-title" className="mt-2 font-serif font-light text-[var(--cs-ink)] text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05]">
          Diseños de artistas, listos para copiar
        </h2>
        <p className="mt-3 text-[var(--cs-grafito)] text-base md:text-lg max-w-[38rem]">
          Ilustraciones hechas por artistas para La Creativa. Copiás el diseño, le sumás tu nombre
          si querés, y lo producimos tal cual lo ves.
        </p>

        {ARTISTS.length > 1 && (
          <div role="group" aria-label="Filtrar por artista" className="mt-7 -mx-5 sm:mx-0 px-5 sm:px-0 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[{ id: null as string | null, name: "Todos" }, ...ARTISTS].map(a => (
              <button
                key={a.id ?? "todos"}
                type="button"
                aria-pressed={artistId === a.id}
                onClick={() => setArtistId(a.id)}
                className={`shrink-0 min-h-11 px-4 rounded-full border text-sm font-medium transition-colors ${
                  artistId === a.id
                    ? "bg-[var(--cs-ink)] border-[var(--cs-ink)] text-white"
                    : "bg-white border-[var(--cs-line)] text-[var(--cs-grafito)] hover:border-[var(--cs-ink)]"
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}

        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 list-none p-0">
          {designs.map(d => {
            const artist = getArtist(d.artistId);
            return (
              <li key={d.id} className="grid content-start rounded-[16px] border border-[var(--cs-line)] bg-white overflow-hidden">
                <div className="relative aspect-square bg-neutral-100">
                  <img
                    src={d.image}
                    srcSet={d.imageSmall ? `${d.imageSmall} 700w, ${d.image} 900w` : undefined}
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                    alt={`${d.title}, diseño de ${artist?.name ?? "artista"} sobre ${pieceName(d).toLowerCase()}`}
                    width={900}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {artist && (
                    <span className="absolute left-3 top-3 inline-flex items-center min-h-7 px-2.5 rounded-full bg-white/95 text-[12px] font-semibold text-[var(--cs-ink)] shadow-sm">
                      Diseño de {artist.name}
                    </span>
                  )}
                </div>
                <div className="p-4 md:p-5 grid gap-3">
                  <div>
                    {d.collection && <p className="text-xs text-[var(--cs-grafito)]">{d.collection}</p>}
                    <h3 className="text-lg font-semibold text-[var(--cs-ink)] leading-snug">{d.title}</h3>
                    <p className="text-sm text-[var(--cs-grafito)]">{pieceName(d)}</p>
                  </div>
                  <p className="text-sm text-[var(--cs-ink)]">
                    <strong className="font-semibold">Diseño {formatGs(designPrice(d))}</strong>
                    <span className="text-[var(--cs-grafito)]"> + pieza e impresión</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => copy(d)}
                    className="cs-btn-primary inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl text-sm font-semibold"
                  >
                    <svg aria-hidden className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                    Copiar diseño
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
