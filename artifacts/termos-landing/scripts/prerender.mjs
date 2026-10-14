// Inyecta el HTML del hero (SSR) dentro de #hero-root en dist/public/index.html.
//
// Corre después de los dos builds de Vite (cliente + `--ssr
// src/entry-prerender.tsx`). Sin esto la página es 100% client-side: el texto
// del hero (elemento LCP en móvil) recién pinta cuando el JS de entrada bajó,
// parseó y React montó. Con el pre-render pinta junto con el CSS y main.tsx
// solo hidrata.
//
// Falla el build (exit 1) si no encuentra el marcador, para que un cambio en
// index.html no deje el pre-render apagado en silencio.

import { readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const htmlPath = join(root, "dist", "public", "index.html");
const ssrDir = join(root, "dist", "prerender");
const MARKER = '<div id="hero-root" style="display:contents"></div>';

const { render } = await import(pathToFileURL(join(ssrDir, "entry-prerender.js")).href);
// React 19 antepone <link rel="preload" as="image"> de las <img> del hero. El
// <head> ya precarga la imagen LCP (con el mismo imagesrcset) y los logos se
// descubren igual con el HTML; dentro de la raíz solo estorbarían a la
// hidratación, así que se quitan.
const heroHtml = render().replace(/^(?:<link [^>]*\/>)+/, "");

const html = await readFile(htmlPath, "utf-8");
if (!html.includes(MARKER)) {
  console.error(`[prerender] no se encontró ${MARKER} en ${htmlPath}`);
  process.exit(1);
}
await writeFile(
  htmlPath,
  html.replace(MARKER, MARKER.replace("></div>", `>${heroHtml}</div>`)),
);
// El bundle SSR solo sirve para generar el HTML; no se publica.
await rm(ssrDir, { recursive: true, force: true });

console.log(`[prerender] hero inyectado (${(heroHtml.length / 1024).toFixed(1)} KB de HTML)`);
