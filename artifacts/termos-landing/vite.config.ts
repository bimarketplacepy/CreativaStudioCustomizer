import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;

const basePath = process.env.BASE_PATH ?? "/";

/**
 * Load the built CSS bundle without blocking render.
 *
 * Vite injects `<link rel="stylesheet">` into <head>, which Lighthouse flags as
 * a render-blocking request. We rewrite each one to the media-toggle pattern
 * (`media="print"` until `onload` flips it to `all`) so it downloads without
 * gating the first paint, plus a `<noscript>` fallback for no-JS clients.
 *
 * A matching `<link rel="preload" as="style">` is added so the sheet is still
 * fetched at high priority. Because the page is client-rendered — nothing is
 * visible until the (larger) entry JS parses and React commits — the smaller
 * CSS is virtually always applied before the hero paints, so this does NOT
 * introduce a flash of unstyled content or any layout shift (CLS stays 0).
 *
 * Only affects the production HTML transform; no effect on chunking/splitting.
 */
function asyncCssPlugin(): Plugin {
  return {
    name: "async-css",
    enforce: "post",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"([^>]*?)\shref="([^"]+)"([^>]*)>/g,
        (_m, pre, href, post) =>
          `<link rel="preload" as="style"${pre} href="${href}"${post}>` +
          `<link rel="stylesheet"${pre} href="${href}"${post} media="print" onload="this.media='all'">` +
          `<noscript><link rel="stylesheet"${pre} href="${href}"${post}></noscript>`,
      );
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    asyncCssPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // No manualChunks on purpose: the React.lazy boundaries in home.tsx are the
    // split points. Rollup naturally moves Three.js (and the whole customizer)
    // into an async chunk that only downloads when the customizer mounts, and
    // keeps the shared runtime helpers in the always-loaded entry. Forcing a
    // dedicated "three" vendor chunk made the entry statically depend on it and
    // pulled ~200 KB into first paint — the opposite of what we want.
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    headers: process.env.NODE_ENV !== "production" ? {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    } : {},
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
