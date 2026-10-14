# RESULTADOS — Etapa D: pre-render del hero y carga diferida real

**Fecha:** 2026-10-13. Cambios hechos, compilados y verificados en local contra `server.mjs` (mismo server que producción, con `/api` reenviado a la API real). **Falta publicar** para que lleguen a producción; después correr `pnpm run check:prod` (incluye un chequeo nuevo de que el hero viene pre-renderizado).

## Diagnóstico (Lighthouse móvil sobre producción, antes)

Score **74** · FCP 2,5 s · LCP 3,3 s · TBT 570 ms · 4,9 s de trabajo en el hilo principal.

| Causa encontrada | Evidencia |
|---|---|
| **La página era 100% client-side.** El elemento LCP es texto del hero, pero no existía hasta que el JS de entrada (88 KB br) bajaba, parseaba y React montaba. | LCP: *render delay* 3,5 s, *load delay* 0 |
| **El entry cargaba cosas que el hero no usa:** react-query, tailwind-merge, Radix Toast + Tooltip + floating-ui. `<Toaster>` y `<TooltipProvider>` estaban montados pero ningún componente usa `toast()` ni Radix Tooltip. | Desglose por sourcemap del entry |
| **Todas las secciones bajo el fold se montaban al cargar** (solo el personalizador era diferido): Stickers, Precios, Galería, Footer… Con ellas bajaba framer-motion (34 KB br), el Slider de Radix (reflow forzado de 157 ms) y el fetch de `/api/catalog`. | Waterfall + `forced-reflow-insight` → `@radix-ui/react-use-size` |
| **`/api/catalog` viajaba sin comprimir** (38 KB de JSON). En producción `/api` va directo al api-server, que no comprimía. | `uses-text-compression` |
| **Logo de 640×640 px mostrado a 32×32** (23 KB) y logo de MarketPlace con 13 KB de metadata XMP. | `uses-responsive-images` |

## Cambios

| # | Cambio | Archivos |
|---|---|---|
| 1 | **Hero pre-renderizado en el build** (SSR con `renderToString`) e hidratado en su propia raíz. El texto y la foto del hero pintan con el HTML + CSS, sin esperar al JS. El CSS vuelve a ser render-blocking (se eliminó `asyncCssPlugin`): es necesario para pintar ese HTML con estilos. | `src/entry-prerender.tsx`, `scripts/prerender.mjs`, `src/main.tsx`, `index.html`, `vite.config.ts`, `package.json` (build) |
| 2 | **Router, providers y secciones en un chunk aparte** (`App`), cargado con `import()` después de hidratar el hero. Sacados `<Toaster>` y `<TooltipProvider>` (no se usaban). | `src/main.tsx`, `src/App.tsx` |
| 3 | **Secciones bajo el fold diferidas** (`LazySection` = `DeferUntilVisible` + `Suspense`): Personalizaciones, Stickers, A su medida, Precios, Galería, Footer. Se montan al acercarse al viewport. El menú y "Ver precios" usan `scrollToSection()`, que las monta y scrollea cuando el id existe (con una corrección al terminar si algo de arriba cambió de alto). Los deep links (`/#precios`) ahora funcionan; antes la página quedaba arriba. | `src/lib/section-reveal.ts`, `src/components/defer-until-visible.tsx`, `src/pages/home.tsx`, `src/components/hero.tsx` |
| 4 | **Cronos Pro Light/Italic subseteadas** (Latin + Latin-1 + Latin Ext-A + puntuación/monedas, con kern/liga/tnum/lnum): 63→34 KB y 78→36 KB, y precargadas (son las del `<h1>`). La Subhead (fuente de grabado, la usa la API) queda completa. | `public/fonts/*-latin.woff2`, `src/index.css`, `index.html` |
| 5 | **Respaldo de Inter con métricas ajustadas** (`size-adjust`/`ascent-override`… por rango de peso, calculado con fontTools contra Arial): al llegar Inter el texto del hero no se mueve. Sin esto el pre-render generaba CLS 0,015. | `src/index.css` |
| 6 | **Compresión brotli/gzip de `/api/catalog`** en el api-server (middleware propio con zlib, sin dependencias nuevas, solo en esa ruta): 39 KB → 4,6 KB. | `api-server/src/middlewares/compress-json.ts`, `api-server/src/routes/catalog.ts` |
| 7 | Logos: `la-creativa-logo-96.webp` (96 px, 2,3 KB) y `navbar-logo-v2.webp` (sin metadata, 2,8 KB); `width/height` corregidos a la proporción real. | `public/`, `src/components/hero.tsx` |
| 8 | Gate anti-regresión: `check:prod` / `check:local` verifican que el hero venga pre-renderizado. | `scripts/check-prod.mjs` |

## Medición (Lighthouse 12.6 móvil, local contra `server.mjs`, mediana de 5 corridas)

| Métrica | Antes | Después |
|---|---|---|
| Performance | 79 (72–81) | **97** (95–97) |
| FCP | 2,9 s | **1,4 s** |
| LCP | 4,0 s | **2,6 s** |
| TBT | 197 ms | **14 ms** |
| Speed Index | 2,9 s | **1,4 s** |
| TTI | 4,2 s | **2,6 s** |
| CLS | 0 | 0 (0,0003 con throttling real de red/CPU) |
| Bytes en la carga | 503 KB | **279 KB** |
| JS de entrada | 87 KB br | **53 KB br** |

Producción puede diferir unos puntos (latencia real, GTM). Medir con PageSpeed Insights después de publicar.

## Candado (además de los de `RESULTADOS.md`)

1. **`#hero-root` en `index.html`**: `scripts/prerender.mjs` reemplaza ese div exacto (`<div id="hero-root" style="display:contents"></div>`); si cambia, el build falla a propósito.
2. **El hero no puede usar `window`/`document` durante el render** (solo en efectos/handlers): se renderiza en Node durante el build y el HTML tiene que coincidir con el primer render del cliente para que la hidratación no falle.
3. **Secciones nuevas bajo el fold → `LazySection`**; links internos a ellas → `scrollToSection(id)`, no `getElementById(...).scrollIntoView`.
4. **Si se agrega texto al hero con un peso de Inter nuevo**, recalibrar el `Inter Fallback` de ese peso (ver comentario en `index.css`), o vuelve el CLS.

## Observado y no tocado

- **El header no queda fijo al hacer scroll** (pasa igual en producción hoy): `overflow-x: hidden` en el contenedor de página lo convierte en el contenedor de scroll del `sticky`. Arreglarlo cambia el diseño, así que queda a decisión.
- GTM (116 KB) sigue cargando en la primera interacción o load+3s; retrasarlo más mejoraría el lab pero arriesga perder datos de analítica.
