# RESULTADOS — Ejecución del plan de optimización (Etapa C)

**Fecha:** 2026-07-20. Todos los cambios de código están hechos, compilados y verificados localmente. **Falta un único paso manual** (corregir el run command del deployment en el panel de Replit + republicar) para que todo llegue a producción — ver "Paso pendiente" al final.

## Métricas

| Métrica | Antes | Después (esperado) | Medido post-publish |
|---|---|---|---|
| Performance móvil | 68 | ≥90 | ⬜ medir con PageSpeed Insights |
| FCP | 4,6 s | ~1,8-2,2 s | ⬜ |
| LCP | 5,6 s | ~2,2-2,8 s | ⬜ |
| TBT | 0 ms | ≤ hoy (GTM diferido lo mejora) | ⬜ |
| CLS | ~0 | ~0 (nada tocó layout) | ⬜ |
| Transfer crítico (HTML+JS+CSS) | ~458 KB sin comprimir | **~107 KB brotli** | ⬜ |
| Chunk customizer (1,11 MB) al load móvil | Sí (rootMargin 600px) | **No** (200px móvil) | ⬜ |
| Fuentes | 2,36 MB TTF/OTF | **973 KB woff2** (−59%) | ✓ en build |
| llms.txt | HTML de la app | text/plain según spec | ✓ local / ⬜ prod |
| Accesibilidad contraste | 4,3:1 (falla AA) | 4,9:1 ✓ | ✓ en código |

*(El "esperado" no reemplaza la medición: correr Lighthouse móvil tras republicar.)*

## Cambios realizados (archivo por archivo)

| Ítem | Cambio | Archivo |
|---|---|---|
| 1 | llms.txt estático de respaldo (spec llmstxt.org). Con server.mjs corriendo, la versión dinámica tiene precedencia; si el hosting vuelve a ser estático, este archivo mantiene la spec | `public/llms.txt` (nuevo) |
| 2 | rootMargin responsivo: 200px en <768px (el chunk de 1,11 MB ya no baja al load en móvil), 600px en desktop. El anchor `#customizer` no cambió | `src/components/defer-until-visible.tsx` |
| 4 | srcset 700w/900w + sizes en la galería (antes siempre bajaba el 900×900 para celdas de ~190px) | `src/components/gallery.tsx` |
| 5 | GTM diferido: dataLayer inmediato (no se pierden eventos), gtm.js (113 KB) carga en primera interacción o load+3s; preconnect agregado | `index.html` |
| 6 | 25 fuentes TTF/OTF → woff2 (2,36 MB → 973 KB); los 28 @font-face con `font-display: swap`; TTF/OTF originales eliminadas del build | `public/fonts/*`, `src/index.css` |
| 7 | `--muted-foreground` 50%→46% lightness: contraste 4,3:1 → 4,9:1 (pasa AA). Visualmente casi idéntico | `src/index.css` |
| 8 | Dots del carrusel: de 32 `<button>` de 6px (intocables; 32×24px no caben en el marco) a indicador visual no interactivo. La navegación táctil son las flechas de 36×36 ✓ | `src/components/hero-carousel.tsx` |
| 9-10 | `<link rel="canonical">`, og:url, og:image absoluta (WhatsApp la requiere), JSON-LD LocalBusiness | `index.html` |
| — | Gate anti-regresión ejecutable (ver abajo) | `scripts/check-prod.mjs`, `package.json` |

## Presupuestos de performance configurados

`pnpm run check:prod` (o `check:local` sin red) — **falla con exit 1** si se rompe cualquiera:

- JS inicial ≤ 150 KB brotli (hoy: 87,1 KB)
- CSS ≤ 40 KB brotli (hoy: 16,9 KB)
- Imagen más pesada ≤ 150 KB (hoy: copas.webp 127 KB)
- Cero TTF/OTF en el build
- llms.txt presente y con H1
- **Producción:** JS con `content-encoding` br/gzip · assets con `immutable` · llms.txt text/plain · `/noexiste.xyz` → 404 · `POST /api/design-preview` ≠ 404

Verificado en local contra `server.mjs`: **10/10 OK**. Contra la producción actual fallarían los 5 de red — esa es la señal de que el deployment sigue mal.

## Las 3 cosas que NO hay que tocar (candado anti-regresión)

1. **El run command del deployment.** Debe ser `pnpm --filter @workspace/termos-landing run start` (= `node server.mjs`). TODA la capa de performance de red (brotli, `Cache-Control: immutable`, llms.txt, la API de WhatsApp) vive en `server.mjs`; si el Publish vuelve a servir `dist/public` estático, se pierde compresión (455 KB crudos), caché, llms.txt y el envío de diseños — y Lighthouse cae ~20 puntos. Tras cada publish: `pnpm run check:prod` (10 ✓ o hay problema).
2. **El patrón de CSS async + preloads del `<head>`** (`asyncCssPlugin` en vite.config.ts, preload del hero con `imagesrcset` idéntico al `<img>`, preload de inter-latin). Es lo que mantiene render-blocking en cero y el LCP image en prioridad alta. No agregar `<link rel="stylesheet">` directos ni scripts síncronos al head.
3. **Los límites de carga diferida:** `React.lazy` por sección en `home.tsx` + `DeferUntilVisible` con rootMargin 200px móvil / 600px desktop. No importar el customizer (ni nada que dependa de three.js) de forma estática desde el entry, y no volver a subir el rootMargin móvil: con ~600px el chunk de 1,11 MB vuelve a bajar en el load inicial (así se generaban los "991 KiB sin usar").

## Paso pendiente (manual, panel de Replit)

1. Publishing → el deployment Autoscale → **Settings/Edit** → **Run command** = `pnpm --filter @workspace/termos-landing run start` (Build command: `pnpm --filter @workspace/termos-landing run build`).
2. **Republish**.
3. Verificar: `pnpm run check:prod` → deben pasar los 10 chequeos.
4. Medir con PageSpeed Insights (móvil) y completar la columna "Medido" de arriba.

## ITEM 11 — DNS de www (lo hace el dueño en el registrar)

En Replit: Publishing → Settings → **Domains** → agregar `www.creativastudiopy.com`. Replit va a mostrar los registros exactos (CNAME + TXT de verificación) — cargarlos en el registrar tal cual los muestre el panel. (No inventar el target: lo da Replit al agregar el dominio.)

## Ítem en espera

**ITEM 3 (SSG/pre-render):** solo si, con todo lo anterior publicado, FCP no baja de 2,5 s en la medición real.
