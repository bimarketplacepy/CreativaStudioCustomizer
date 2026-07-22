import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
// @ts-expect-error — plain .mjs helper shared with the production server.
import { handleUploadRequest, handleServeRequest } from "./upload-store.mjs";

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
/**
 * Dev-server counterpart of the production `/api/design-preview` upload route
 * (see upload-store.mjs). Lets the customizer store a PNG of the finished piece
 * and serve it back at /u/<id>.png so it can go into the WhatsApp message while
 * running `vite dev`.
 */
function designPreviewApiPlugin(): Plugin {
  return {
    name: "design-preview-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || "/";
        const pathname = url.split("?")[0];
        if (req.method === "POST" && pathname === "/api/design-preview") {
          handleUploadRequest(req, res);
          return;
        }
        if ((req.method === "GET" || req.method === "HEAD") && handleServeRequest(pathname, res)) {
          return;
        }
        next();
      });
    },
  };
}

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
    designPreviewApiPlugin(),
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
    // The React.lazy boundaries in home.tsx are the primary split points: the
    // customizer (and Three.js with it) only downloads when its section nears
    // the viewport. On top of that, Three.js gets its own chunk so the two
    // download in parallel and — since the library never changes between
    // publishes while the customizer code changes constantly — returning
    // visitors keep the ~700 KB of Three.js cached (assets are served
    // immutable) and only re-fetch the app code. The function form matters:
    // only chunks that actually import three reference it, so the entry keeps
    // no static dependency on it and first paint stays untouched.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/")) return "three";
        },
      },
    },
    // The dedicated three chunk necessarily exceeds Rollup's 500 KB advisory
    // limit; it's a cached-forever vendor library, so the warning is noise.
    chunkSizeWarningLimit: 800,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    // Todo /api (salvo design-preview, atendido arriba por el plugin) va al
    // @workspace/api-server (pedidos, health). Mismo puerto interno que usa
    // server.mjs en producción.
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3101",
        changeOrigin: false,
      },
    },
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
