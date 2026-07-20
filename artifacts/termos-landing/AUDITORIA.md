# AUDITORÍA — creativastudiopy.com

**Fecha:** 2026-07-20 · **Método:** solo lectura (curl contra producción + análisis del repo y del build local, que coincide con producción: mismo hash `index-BrAX4W5U.js`). Sin cambios de código de optimización.

**Limitación declarada:** este entorno no tiene navegador headless, por lo que no se pudo re-ejecutar Lighthouse. Donde una sección pide datos que solo Lighthouse produce (LCP breakdown, audits exactos de contraste), se aporta el análisis estático equivalente con archivo:línea y cálculo, marcado como tal.

---

## A1. Infraestructura y deployment

### Hallazgo central de toda la auditoría

**Producción NO está corriendo `server.mjs`.** El repo tiene un servidor de producción completo (`artifacts/termos-landing/server.mjs`) que implementa brotli/gzip, `Cache-Control: immutable` para assets, `no-cache` para el HTML, y `robots.txt`/`sitemap.xml`/`llms.txt` dinámicos. **Nada de eso está activo en el dominio.** Pruebas concluyentes:

| Prueba | server.mjs haría | Producción devuelve |
|---|---|---|
| `POST /api/design-preview` | 200/400 (línea 177-180) | **404** |
| `GET /llms.txt` | `text/plain` generado (línea 130-147) | **HTML de la app** (fallback SPA) |
| `GET /noexiste.xyz` | `404 Not Found` text/plain (línea 220-224) | **200 con index.html** |
| Headers de assets | `immutable`, `Vary`, `nosniff`, brotli | `cache-control: private`, sin nada más |

- `.replit` declara `deploymentTarget = "autoscale"` con `run = pnpm --filter @workspace/termos-landing run start` (que ejecutaría `node server.mjs`). Pero la firma de la respuesta (`server: Google Frontend`, cookie `GAESA`, `accept-ranges: bytes`, catch-all a index.html, cero compresión) es la de un **hosting estático de `dist/public`**, no la de este proceso Node. Conclusión: el deployment publicado (botón "Publish" — los commits son todos "Published your App") no usa la config de `.replit` que está en el repo, o fue creado como Static Deployment antes de que existiera `server.mjs`. **Esto hay que confirmarlo en la pestaña Deployments de Replit (no es visible desde dentro del repl).**
- **Esta es la causa raíz de la "regresión recurrente":** los headers nunca se pierden "en cada build" — nunca estuvieron en producción, porque se configuraron en una capa (server.mjs) que producción no ejecuta.

### TTFB (3 mediciones, GET /)

```
Intento 1 - TTFB: 0.142s | Total: 0.142s | HTTP 200
Intento 2 - TTFB: 0.070s | Total: 0.070s | HTTP 200
Intento 3 - TTFB: 0.132s | Total: 0.132s | HTTP 200
```
TTFB excelente (70-140 ms) en caliente. No fue posible esperar 10 min entre intentos para forzar frío; con hosting estático no hay proceso que arrancar, así que **cold start no es el problema** (y no explica el FCP 4.6s).

### Compresión — **AUSENTE (crítico)**

```
curl -H "Accept-Encoding: br,gzip" .../assets/index-BrAX4W5U.js
→ size_download: 318735  (bytes crudos, sin content-encoding)
```
El JS de entrada viaja **318,7 KB sin comprimir** cuando en brotli son **89 KB** (3,6× menos). El CSS viaja 136,3 KB cuando en brotli son 17,3 KB (7,9× menos). Solo estos dos archivos regalan ~349 KB por visita en la ruta crítica del primer render.

### Otros
- Redirecciones: ninguna (`HTTP/2 200` directo).
- `www.creativastudiopy.com`: **no resuelve DNS** (`Could not resolve host`). Quien escriba `www.` no llega al sitio.
- Minificación: activa (vite build production, esbuild). NODE_ENV: el build es de producción; verificado por el output minificado y hasheado.

---

## A2. Headers y caché

`curl -sI` con `Accept-Encoding: br,gzip` contra cada tipo de recurso:

| Recurso | Cache-Control | Content-Encoding | Content-Type |
|---|---|---|---|
| `/` (HTML, 3.256 B) | `private` | — (sin comprimir) | text/html |
| `/assets/index-BrAX4W5U.js` (318.735 B) | `private` | — | text/javascript |
| `/assets/index-C-6XvvIb.css` (136.304 B) | `private` | — | text/css |
| `/galeria/termomate-700.webp` (27.180 B) | `private` | — | image/webp |
| `/fonts/inter-latin.woff2` (48.256 B) | `private` | — | font/woff2 |

- **`cache-control: private` en todo** = el navegador puede cachear en sesión pero nada es `immutable` ni tiene `max-age` largo; Lighthouse lo cuenta como "caché ausente" (los 2.233 KiB reportados).
- **Dónde se configuran hoy:** únicamente en `server.mjs:87-101` (`cacheControlFor`) — capa que producción no ejecuta (ver A1). No existe `[[deployment.responseHeaders]]` ni ninguna regla de headers en `.replit`. **Por eso "sobrevive al rebuild" es la pregunta equivocada: la capa correcta nunca estuvo conectada.**
- Assets con hash de contenido: **sí** — Vite emite `name-[hash].ext` para todos los JS/CSS (`index-BrAX4W5U.js`, etc.). Las imágenes de `/galeria/` y fuentes de `/fonts/` **no** llevan hash (nombres estables), lo cual es compatible con caché largo igual (cambian rara vez), pero conviene saberlo al elegir max-age.

---

## A3. HTML inicial

- **Peso:** 3.256 bytes. **Es un `<div id="root"></div>` vacío** (`servido.html:60`): client-side rendering puro. Nada pinta hasta descargar+parsear+ejecutar 318,7 KB de JS (455 KB con CSS, todo sin comprimir). **Este es el techo estructural del FCP.**
- **`<head>` en orden** (servido.html):
  1. `<meta charset>`, `<meta viewport>` ✓
  2. **Script inline de GTM** (`GTM-5T5V9NTQ`) — inline, ejecuta al parsear e inyecta `gtm.js` async. No bloquea render formalmente, pero es lo primero que compite por red/CPU (gtm.js = **113 KB comprimidos**, ver A4).
  3. `<title>` + meta description ✓ (correctos, es-PY)
  4. favicon.svg
  5. Open Graph + twitter:card (og:image **relativa** `/opengraph.jpg`, falta og:url; ver A8)
  6. `<link rel="preload" as="font" href="/fonts/inter-latin.woff2" crossorigin>` ✓
  7. **`<link rel="preload" as="image" fetchpriority="high">` del hero** ✓ con `imagesrcset`/`imagesizes` idénticos al `<img>` (hero-carousel.tsx:83-84) — bien hecho.
  8. `<script type="module" src="/assets/index-BrAX4W5U.js">` — módulo = deferred por spec, no bloquea parseo.
  9. CSS con patrón `preload as="style"` + `media="print" onload` + noscript (asyncCssPlugin en vite.config.ts:56-71) — **render-blocking CSS ya resuelto** ✓.
- Preconnect/dns-prefetch: **ninguno**. Falta `preconnect` a `https://www.googletagmanager.com` (único origen third-party).
- `lang="es-PY"` ✓. **Falta `<link rel="canonical">`** (ver A8).

---

## A4. JavaScript

### Inventario completo (build actual = producción)

| Chunk | Raw | Gzip | Brotli | Cuándo carga |
|---|---|---|---|---|
| `index` (entry) | 318,7 KB | 102,5 KB | 89,0 KB | Eager (module) |
| **`customizer`** | **1.110,5 KB** | 305,7 KB | 255,0 KB | Lazy… **pero en la práctica al load** (ver abajo) |
| `proxy` (= framer-motion) | 119,1 KB | 38,8 KB | 35,0 KB | Dep compartida de chunks lazy |
| `customizer-tutorial` | 11,5 KB | 3,9 KB | 3,4 KB | Lazy al montar Home |
| `footer` | 5,0 KB | 1,9 KB | 1,7 KB | Lazy al montar Home |
| `personalization-info` | 3,8 KB | 1,5 KB | 1,3 KB | Lazy al montar Home |
| `gallery` | 2,4 KB | 1,2 KB | 1,0 KB | Lazy al montar Home |
| `whatsapp-button` | 2,2 KB | 1,3 KB | 1,1 KB | Lazy al montar Home |
| resto (zap, contact, pricing, engraving-plans) | <1,4 KB c/u | — | — | Lazy |
| **Total JS** | **~1.576 KB** | ~460 KB | ~390 KB | |

### Los "991 KiB sin usar": explicación exacta

El chunk `customizer` (1,11 MB: Three.js + @react-three/fiber + drei + toda la UI del personalizador — marcadores verificados dentro del chunk) está gateado por `DeferUntilVisible` con **`rootMargin: "600px"`** (`defer-until-visible.tsx:16`). En un viewport móvil de 412×823:

- Hero `min-h-[92vh]` ≈ 757 px + PersonalizationInfo (fallback 40vh ≈ 330 px) → el wrapper `#customizer` arranca a ~1.090 px del top.
- Umbral de disparo al load: 823 px (viewport) + 600 px (rootMargin) = 1.423 px > 1.090 px → **el chunk de 1,11 MB se descarga inmediatamente al cargar la página, sin scroll**. Lighthouse lo mide y lo declara ~90 % sin usar. Además compite por ancho de banda con la imagen LCP y el CSS.

### Eager vs lazy
- Eager real: solo `index` (React, react-dom, wouter, radix usados, react-query, hero + carrusel custom).
- `import()` dinámico: todas las secciones bajo el hero (home.tsx:9-14, patrón `React.lazy`) ✓ — el diseño es correcto; el problema es solo el `rootMargin` demasiado generoso para móvil.

### Dependencias de package.json sin uso en `src` (fuera de `components/ui` boilerplate shadcn)

`embla-carousel-react` (el carrusel del hero es custom, no embla), `recharts`, `react-hook-form`, `react-day-picker`, `date-fns`, `vaul`, `input-otp`, `cmdk` — **0 referencias** fuera de `components/ui/`. Verificado además que no aparecen en ningún chunk del build (tree-shaking funciona). Impacto en runtime: **ninguno**. Candidatas a limpieza de package.json e instalación, no de performance.

### Forced reflow
Lecturas de layout en `src` (todas dentro de event handlers, ninguna intercalada con escrituras en loop — patrón benigno):
- `object-3d.tsx:414` y `thermos-3d.tsx:478` — `getBoundingClientRect` dentro de `pointermove` (drag del diseño). Se ejecuta solo durante drag activo.
- `use-mobile.tsx:11,14` — `window.innerWidth` en resize listener.
- `customizer-tutorial.tsx:244-245` — al posicionar el dedito (cada ~1,4 s dentro del modal).

**Ninguna de estas corre durante el load.** El candidato más probable del "forced reflow" que reporta Lighthouse es **GTM** (`gtm.js`, third-party, fuera de nuestro control) y/o el estilo recalculado al montar React de golpe sobre root vacío. A verificar en el trace de DevTools cuando se re-mida.

### Scripts de terceros
| Script | Peso | Cuándo |
|---|---|---|
| GTM `gtm.js?id=GTM-5T5V9NTQ` | **113,2 KB comprimidos** | Inyectado por inline script en `<head>` (async), primerísimo en el documento. Sin preconnect. Qué tags dispara dentro del contenedor no es visible desde el repo. |

Es el único third-party. 113 KB de JS de tag manager en una landing es un costo alto de TBT/main-thread en móvil.

---

## A5. CSS

- **Un solo archivo:** `index-C-6XvvIb.css` — 136,3 KB raw / 21,0 KB gzip / **17,3 KB brotli**. Sin comprimir en producción (regalo de ~115 KB, ver A1).
- Carga **async** con el patrón preload + `media="print"` (vite.config.ts:56-71) + noscript ✓ — no hay CSS render-blocking. No hay CSS crítico inline, pero al ser CSR (root vacío) el CSS siempre llega antes que el primer commit de React, así que no produce FOUC ni CLS (razonado en el propio comentario del plugin, verificado en el HTML transformado).
- Tailwind v4 (`@tailwindcss/vite`): purga automática por diseño — no hay framework entero embarcado. De los 136 KB raw, el grueso son utilidades usadas + **29 bloques `@font-face`** + tokens shadcn. Sin `data:` URIs (verificado: 0).

---

## A6. Imágenes

### Inventario

- **Galería `/galeria/`:** 63 archivos, todos **WebP** ✓, en pares `-700.webp` (700×700) y `.webp` (900×900). Rango 17-130 KB. Los más pesados: `copas.webp` 130 KB, `billeteras.webp` 129 KB, `guampaforrada.webp` 114 KB, `termoforrado.webp` 110 KB.
- **Raíz:** `la-creativa-logo-new.webp` 23,6 KB, `marketplace-logo.webp`/`navbar-logo.webp` 15,5 KB, `opengraph.jpg` 60,3 KB, `favicon.svg` 163 B.

### Elemento LCP
En móvil, candidatos: el `<h1>` del hero (pinta con el commit de React) o la primera imagen del carrusel (`termomate-700.webp`, 27,2 KB). El comentario en hero.tsx:93-95 indica que el h1 es el LCP en móvil. **El breakdown exacto (TTFB/load delay/load time/render delay) requiere Lighthouse — no ejecutable aquí.** Análisis derivado con los datos medidos: TTFB 0,14 s es despreciable; con throttle móvil de Lighthouse (~1,6 Mbps), solo bajar 455 KB sin comprimir de JS+CSS ≈ 2,3 s de red, más parse/execute de 1,4 MB de JS (entry + customizer que baja al load), más el commit de React = los ~5,6 s de LCP son casi todos **render delay por CSR sin compresión + contención del chunk de 1,11 MB**. La imagen en sí está bien servida (preload + fetchpriority high + srcset correcto).

### Calidad de atributos

| Dónde | Formato | srcset/sizes | width/height | loading | decoding | fetchpriority |
|---|---|---|---|---|---|---|
| Hero carrusel (hero-carousel.tsx:80-95) | WebP | ✓ 700w/900w + sizes | ✓ 900×900 | eager ✓ | async ✓ | high en frame 0 ✓ |
| Fondo hero blur (hero.tsx:73-83) | WebP (variante 700) | n/a (decorativa, reusa archivo ya bajado) ✓ | — | — | — | — |
| **Galería (gallery.tsx:41-48)** | WebP | **✗ sin srcset — sirve SIEMPRE el 900×900** | ✓ | lazy ✓ | async ✓ | — |

### Los ~222 KiB de "properly size images"
La grilla de galería renderiza a 2 columnas en móvil (~190 px de ancho real) pero descarga el archivo **900×900** (`src={img.src}`, gallery.tsx:41 — sin `srcSet`). Con ~12 imágenes curadas × diferencia media de ~25-60 KB entre 900 y 700 (y de hecho bastaría un 400px), ahí están los KiB que Lighthouse reclama. Fix trivial y sin riesgo (añadir srcset como ya hace el hero).

---

## A7. Fuentes

- **29 `@font-face`**, todas self-hosted ✓ (cero third-party). Total en disco: **~2,2 MB**.
- **Con `font-display: swap`: solo 7** (Inter ×2, Abril Fatface ×2, Cronos Pro ×3 — las fuentes de UI/titulares). **Las otras 22 — las tipografías del personalizador — no declaran `font-display`** → default `auto` = FOIT de hasta 3 s en el carrusel de fuentes.
- Formatos: Inter y Abril en **woff2 subseteado** (latin/latin-ext, 7-85 KB) ✓. **Cronos Pro y las 22 del personalizador en TTF/OTF crudos** (12-198 KB cada una; Ellisha 197 KB, Amertha 169 KB, LibreBaskerville 160 KB…). TTF/OTF sin comprimir + hosting sin brotli = se sirven a peso completo. En woff2 pesarían ~50 % menos.
- Preload: solo `inter-latin.woff2` ✓ (decisión correcta y comentada en el HTML).
- Cuándo cargan las 22 del personalizador: al montar el `FontCarousel` (customizer.tsx) que renderiza texto de muestra en cada familia → el navegador pide **todas** al entrar el customizer en viewport. Como el chunk entra al load (A4), las fuentes también pueden empezar a bajar temprano. No afectan el primer render, pero sí el peso total de página (>2 MB solo de fuentes) y el TBT del scroll temprano.

---

## A8. SEO técnico y archivos de rastreo

- **robots.txt** (output completo):
  ```
  User-agent: *
  Allow: /

  Sitemap: https://creativastudiopy.com/sitemap.xml
  ```
  `content-type: text/plain` ✓. **Válido hoy.** (Los "46 errores" históricos corresponden al estado previo en que el fallback SPA devolvía HTML; el archivo estático en `dist/public/robots.txt` lo resolvió. El riesgo de reaparición existe para cualquier ruta que NO tenga archivo físico — exactamente lo que le pasa hoy a llms.txt.)
- **sitemap.xml**: válido, 1 URL (`https://creativastudiopy.com/`), referenciado desde robots ✓.
- **llms.txt**: **devuelve el HTML completo de la app** (fallback SPA) — fuera de spec llmstxt.org por completo. Causa: el archivo no existe en `dist/public/` y la versión dinámica vive en `server.mjs:130-147`, que no corre en producción (A1). El contenido correcto ya está escrito ahí (H1 + blockquote + secciones H2 con links markdown ✓ según spec); solo hay que materializarlo como archivo estático.
- **Datos estructurados: no hay ningún JSON-LD** (ni Organization ni Product ni LocalBusiness — para un taller físico dentro de MarketPlace, LocalBusiness es la pieza que falta).
- **Canonical: ausente.** Con el fallback SPA respondiendo 200 en cualquier ruta (`/noexiste` → 200), cada URL basura es indexable como duplicado del home. Canonical + (idealmente) 404 reales lo mitigan.
- **Open Graph:** og:image es **relativa** (`/opengraph.jpg`) — varios scrapers (WhatsApp incluido, clave para este negocio) exigen URL absoluta. Falta `og:url`. `opengraph.jpg` pesa 60 KB ✓.

---

## A9. Accesibilidad y UX de conversión

(Análisis estático — los audits exactos de Lighthouse no son re-ejecutables aquí; los cálculos de ratio son matemáticos sobre los colores del código.)

### Contraste
- `--muted-foreground: 220 10% 50%` (index.css:284) ≈ `#737b87` sobre blanco → **ratio ≈ 4,3:1 — FALLA AA (4,5:1) para texto normal**. Se usa masivamente en texto pequeño (`text-xs text-muted-foreground`): captions del visor ("Vista en vivo · arrastre para girar", customizer.tsx:1620), contadores de caracteres, labels del wizard, footer, etc. Fix de bajo riesgo: bajar lightness a ~46 % (≈ 4,9:1) — visualmente casi idéntico.
- Sobre fondos `--secondary` (96 % lightness) el mismo color queda en ≈ 4,0:1 — también falla.
- Hero: `text-white/55` sobre negro ≈ 5,9:1 ✓; `text-white/70` ✓. El kicker de 11 px pasa.

### Touch targets
- **Dots del carrusel del hero: `h-1.5` = 6 px de alto** (hero-carousel.tsx:144-145), muy por debajo de 24×24, y contiguos. Son el touch-target fail principal. Fix estándar: mantener el dot visual y ampliar el área tocable con padding en el `<button>`.
- Flechas prev/next del carrusel: 36×36 px ✓.

### Above the fold móvil
- El CTA "Comenzar" (bordó `#8B1A2F`) está en la columna de copy, antes del carrusel, dentro de un hero `min-h-[92vh]`: **visible sin scroll** en ~823 px de alto ✓ (h1 con `clamp(2.6rem…)` deja espacio). Legibilidad sobre imagen: hay overlay `from-black/85 via-black/65` + fondo blur — correcta.

---

## A10. Resumen ejecutivo

| # | Problema | Evidencia | Impacto | Esfuerzo | Riesgo regresión |
|---|---|---|---|---|---|
| 1 | **Producción no ejecuta server.mjs**: sin compresión (455 KB crudos en ruta crítica), sin cache immutable, llms.txt roto, API 404 | A1/A2 | **ALTO** (es la mayor parte de FCP 4.6→ y LCP 5.6→, el "caché ausente" y llms.txt) | Bajo-Medio (conectar el deployment correcto: autoscale+server.mjs o static+responseHeaders) | Bajo si se verifica con curl post-deploy; **este ítem ES el anti-regresión** |
| 2 | Chunk customizer de **1,11 MB baja al load** por `rootMargin: 600px` en móvil | A4 | **ALTO** (991 KiB unused, contención de red en LCP) | Bajo (bajar rootMargin / gatear por interacción en móvil) | Medio: no romper el anchor `#customizer` ni el TBT=0 (hoy el chunk baja temprano pero ejecuta poco; si se difiere, cuidar que el 3D no ejecute de golpe en scroll) |
| 3 | CSR puro: HTML de 3,2 KB con root vacío | A3 | ALTO para FCP<1.8 (con #1 y #2 quizá alcance; pre-render/SSG del hero es el paso estructural) | Alto | Alto (tocaría arquitectura; solo si #1+#2 no alcanzan) |
| 4 | Galería sin srcset: 900px para slots de ~190px | A6 | MEDIO (~222 KiB) | Bajo | Nulo |
| 5 | GTM 113 KB en `<head>` sin preconnect | A4 | MEDIO (TBT/main thread) | Bajo (preconnect; evaluar carga diferida o server-side GTM) | Bajo |
| 6 | 22 fuentes del personalizador en TTF/OTF sin `font-display` (~2 MB) | A7 | MEDIO (peso total >1,5 MB, FOIT en carrusel de fuentes) | Medio (convertir a woff2 + swap) | Bajo (solo afecta al customizer) |
| 7 | Contraste `--muted-foreground` 4,3:1 | A9 | MEDIO (Accessibility ≥95) | Bajo (un token CSS) | Nulo (cambio visual mínimo, mostrar antes/después) |
| 8 | Touch targets: dots del carrusel 6 px | A9 | MEDIO (Accessibility) | Bajo | Nulo |
| 9 | Sin canonical, sin JSON-LD, og:image relativa, SPA 200 en toda ruta | A8 | MEDIO (SEO ≥95) | Bajo | Nulo |
| 10 | llms.txt sirve HTML (fuera de spec) | A8 | MEDIO (Agentic 3/3) | Bajo (emitir archivo estático en el build o resolver #1) | Nulo |
| 11 | `www.` sin DNS | A1 | BAJO | Bajo (registro CNAME) | Nulo |
| 12 | Deps muertas en package.json (embla, recharts, RHF…) | A4 | NULO en runtime | Bajo | Nulo |

**Lectura clave:** los ítems 1 y 2 son ~todo el gap entre 68 y 90. El 1 además es el candado anti-regresión que pediste: mientras los headers vivan solo en `server.mjs` y producción sea un hosting estático, cada "Publish" seguirá saliendo sin caché y sin compresión, sin importar cuántas veces se arregle en el código.

---

*Fin de la Etapa A. No se modificó código de la landing para esta auditoría.*
