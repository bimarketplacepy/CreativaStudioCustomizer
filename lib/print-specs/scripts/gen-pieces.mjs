#!/usr/bin/env node
/**
 * Genera src/pieces.generated.ts a partir de products.ts de la landing (la
 * fuente única de las piezas): lo que el veredicto de factibilidad necesita
 * saber de cada pieza sin cargar el 3D (modelo exacto, caras grabables,
 * tamaños).
 *
 *   node lib/print-specs/scripts/gen-pieces.mjs          → escribe el archivo
 *   node lib/print-specs/scripts/gen-pieces.mjs --check  → falla si está desactualizado
 */
import { createRequire } from "node:module";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const landing = path.join(root, "artifacts/termos-landing");
const out = path.resolve(here, "../src/pieces.generated.ts");

// esbuild es dependencia del api-server (su build).
const require = createRequire(path.join(root, "artifacts/api-server/package.json"));
const { build } = require("esbuild");

const tmp = await mkdtemp(path.join(tmpdir(), "gen-pieces-"));
try {
  const bundle = path.join(tmp, "products.mjs");
  await build({
    entryPoints: [path.join(landing, "src/lib/products.ts")],
    bundle: true, format: "esm", platform: "node", outfile: bundle, logLevel: "error",
  });
  const { PRODUCTS } = await import(pathToFileURL(bundle).href);

  const pieces = Object.fromEntries(PRODUCTS.map(p => [p.id, {
    hasModel: !!p.model,
    exactFor: p.model?.exactFor ?? [],
    engraveFaces: p.engraveFaces ?? ["front", "left", "back", "right"],
    uCenter: p.frontFace?.uCenter ?? 0.5,
    logoBack: !!p.logoBack,
    sizeIds: p.sizes.map(s => s.id),
  }]));

  const text = `// GENERADO por lib/print-specs/scripts/gen-pieces.mjs desde
// artifacts/termos-landing/src/lib/products.ts. No editar a mano: correr
// \`pnpm --filter @workspace/print-specs run gen\` después de tocar products.ts.
import type { PieceInfo } from "./pieces.ts";

export const PIECES: Record<string, PieceInfo> = ${JSON.stringify(pieces, null, 2)};
`;

  if (process.argv.includes("--check")) {
    const current = await readFile(out, "utf8").catch(() => "");
    if (current !== text) {
      console.error("pieces.generated.ts está desactualizado: correr `pnpm --filter @workspace/print-specs run gen`.");
      process.exit(1);
    }
    console.log("pieces.generated.ts al día.");
  } else {
    await writeFile(out, text);
    console.log(`Escrito ${path.relative(root, out)} (${PRODUCTS.length} piezas).`);
  }
} finally {
  await rm(tmp, { recursive: true, force: true });
}
