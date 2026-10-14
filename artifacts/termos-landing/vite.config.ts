import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
// @ts-expect-error — plain .mjs helper shared with the production server.
import { handleServeRequest } from "./upload-store.mjs";

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;

const basePath = process.env.BASE_PATH ?? "/";

/**
 * Dev-server counterpart of server.mjs serving legacy design previews at
 * /u/<id>.png (read-only; see upload-store.mjs).
 */
function designPreviewApiPlugin(): Plugin {
  return {
    name: "design-preview-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || "/";
        const pathname = url.split("?")[0];
        if ((req.method === "GET" || req.method === "HEAD") && handleServeRequest(pathname, res)) {
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
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
    // CSS stays render-blocking on purpose (the old async-css media=print
    // trick is gone): the hero is pre-rendered into index.html
    // (scripts/prerender.mjs), so the stylesheet must be applied before that
    // markup paints. It is ~18 KB brotli and fetched in parallel with the LCP
    // image, so it no longer waits on the entry JS.
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
    // Todo /api va al
    // @workspace/api-server (pedidos, health). Mismo puerto interno que usa
    // server.mjs en producción.
    // Destino: el api-server del workflow de desarrollo (artifact "API Server",
    // puerto 8080). Antes apuntaba a 3101, que es el puerto interno que usa
    // server.mjs solo en producción: en dev no había nada ahí y /admin daba 500.
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080",
        changeOrigin: false,
      },
      // Panel interno del taller (vive en el api-server), igual que en
      // producción lo proxya server.mjs.
      "/admin": {
        target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080",
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
