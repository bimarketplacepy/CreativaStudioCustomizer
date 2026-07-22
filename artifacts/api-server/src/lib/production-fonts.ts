// Carga server-side de las MISMAS fuentes que usa el customizer (los .woff2
// de artifacts/termos-landing/public/fonts). wawoff2 descomprime el WOFF2 a
// TTF y opentype.js lo parsea para convertir texto a curvas (<path>).
//
// El build (build.mjs) copia los .woff2 a dist/fonts, así el bundle es
// autosuficiente; en desarrollo cae al directorio del landing dentro del repo.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decompress } from "wawoff2";
import opentype from "opentype.js";
import { logger } from "./logger";

/**
 * Mapa fontId (designState.fontId del customizer) → archivo + ajustes.
 * MANTENER EN SINCRONÍA con `FONTS` en termos-landing/src/components/customizer.tsx.
 * letterSpacing va en em (opentype.js lo multiplica por el tamaño).
 */
const FONT_TABLE: Record<string, { name: string; file: string; letterSpacing?: number; uppercase?: boolean }> = {
  f1:  { name: "Abril Fatface",     file: "abril-latin.woff2", letterSpacing: 0.05 },
  f2:  { name: "Anthony Hunter",    file: "AnthonyHunter.woff2" },
  f3:  { name: "Billion Dreams",    file: "BillionDreams.woff2" },
  f4:  { name: "Blendaria",         file: "Blendaria.woff2" },
  f5:  { name: "Bree Serif",        file: "BreeSerif.woff2" },
  f6:  { name: "Cronos Pro",        file: "Cronos-Pro-Subhead.woff2" },
  f7:  { name: "Ellisha",           file: "Ellisha.woff2" },
  f8:  { name: "Freestyle Script",  file: "FreestyleScript.woff2" },
  f9:  { name: "Heavitas",          file: "Heavitas.woff2" },
  f10: { name: "Impacted",          file: "Impacted.woff2" },
  f11: { name: "KG Dark Side",      file: "KGDarkSide.woff2" },
  f12: { name: "Kissing Season",    file: "KissingSeason.woff2" },
  f13: { name: "Libre Baskerville", file: "LibreBaskerville.woff2" },
  f14: { name: "Milkshake",         file: "Milkshake.woff2" },
  f15: { name: "Pacifico",          file: "Pacifico.woff2" },
  f16: { name: "Party Confetti",    file: "PartyConfetti.woff2" },
  f17: { name: "Quimil",            file: "Quimil.woff2" },
  f18: { name: "Renogare",          file: "Renogare.woff2" },
  f19: { name: "Rimouski Sb",       file: "RimouskiSb.woff2" },
  f20: { name: "Square 721",        file: "Square721.woff2" },
  f21: { name: "TT Rounds Neue",    file: "TTRoundsNeue.woff2" },
  // "Versalita" en el front es Arial bold uppercase (fuente de sistema, sin
  // archivo). Aproximamos con Inter + mayúsculas. AJUSTAR si el taller quiere
  // otra fuente de producción para este estilo.
  f22: { name: "Versalita",         file: "inter-latin.woff2", letterSpacing: 0.15, uppercase: true },
  f23: { name: "Bulgatti",          file: "Bulgatti.woff2" },
};

/** Fuente de respaldo (también se usa para la capa de info de producción). */
const FALLBACK_ID = "f22";

const here = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR_CANDIDATES = [
  // dist/fonts — build.mjs copia los .woff2 acá.
  path.join(here, "fonts"),
  // Repo en desarrollo: artifacts/api-server/{dist,src/lib} → artifacts/termos-landing.
  path.resolve(here, "../../termos-landing/public/fonts"),
  path.resolve(here, "../../../termos-landing/public/fonts"),
];

function fontsDir(): string | null {
  for (const dir of FONT_DIR_CANDIDATES) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

export interface LoadedFont {
  font: opentype.Font;
  name: string;
  letterSpacing: number;
  uppercase: boolean;
}

// Entrada interna para la capa de metadatos: Inter sin tracking ni mayúsculas.
const INFO_ID = "__info";
const INFO_ENTRY = { name: "Inter", file: "inter-latin.woff2" } as const;

const cache = new Map<string, Promise<LoadedFont | null>>();

/** Carga (con caché) la fuente de producción para un fontId del customizer. */
export function loadProductionFont(fontId: string | null | undefined): Promise<LoadedFont | null> {
  const id = fontId && (FONT_TABLE[fontId] || fontId === INFO_ID) ? fontId : FALLBACK_ID;
  let p = cache.get(id);
  if (!p) {
    p = (async () => {
      const entry = id === INFO_ID ? INFO_ENTRY : FONT_TABLE[id]!;
      const dir = fontsDir();
      if (!dir) {
        logger.error({ candidates: FONT_DIR_CANDIDATES }, "production font: fonts dir not found");
        return null;
      }
      const file = path.join(dir, entry.file);
      try {
        const woff2 = readFileSync(file);
        const ttf = await decompress(woff2);
        // opentype.parse espera un ArrayBuffer alineado al inicio.
        const ab = ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength) as ArrayBuffer;
        const font = opentype.parse(ab);
        const spacing = "letterSpacing" in entry ? entry.letterSpacing ?? 0 : 0;
        const upper = "uppercase" in entry ? entry.uppercase ?? false : false;
        return {
          font,
          name: entry.name,
          letterSpacing: spacing,
          uppercase: upper,
        };
      } catch (err) {
        logger.error({ file, err }, "production font: load failed");
        return null;
      }
    })();
    cache.set(id, p);
  }
  return p;
}

/** Fuente para la capa de metadatos (Inter plano, sin tracking). */
export function loadInfoFont(): Promise<LoadedFont | null> {
  return loadProductionFont(INFO_ID);
}
