# AUDITORÍA MÓVIL — Landing de termos personalizados (creativastudiopy.com)

**Fecha:** 2026-07-22 · **Etapa A** del plan Auditoría → Plan → Ejecución.

## Metodología

- **Análisis estático exhaustivo del código** (React + Vite + Tailwind v4). En este entorno no hay Chromium/Playwright disponible, por lo que **no hay screenshots**: todas las medidas en px están calculadas a mano desde las clases Tailwind (`h-16`=64px, `py-4`=32px vertical, etc.) y de los assets en disco (`dist/`). Cada hallazgo queda marcado como *medición estática*.
- Viewports de referencia usados en los cálculos: **360×800** (Android chico) y **320 / 390 / 412 / 430 px** de ancho.
- Se leyeron completos: `index.html`, `src/index.css`, `vite.config.ts`, `src/pages/home.tsx` y los 16 componentes de `src/components/`, más `dist/public/assets` para pesos reales.
- Convención por hallazgo: `[ID] hallazgo | archivo:línea | impacto | esfuerzo | riesgo de regresión`. Los `[OK]` son cosas que están bien resueltas y **no hay que romper**.

---

## A1 — Fundamentos del viewport

- **[A1.1] [OK] Meta viewport correcto, zoom permitido** | `index.html:5` | `width=device-width, initial-scale=1.0`, sin `user-scalable=no` ni `maximum-scale`. Cumple WCAG 1.4.4. **No tocar.**
- **[A1.2] [OK] Sin overflow horizontal estructural** | `home.tsx:29` | El wrapper raíz lleva `overflow-x-hidden` + `min-h-[100dvh]`. Inventario completo de anchos fijos auditado: todos acotados (el `w-[104px]` de los chips de fuente vive en un carrusel `overflow-x-auto` deliberado; los `width:768px` etc. son strings de `matchMedia`/`sizes`, no cajas CSS). Único punto a verificar en 320px: el `whitespace-nowrap` del texto "Creativa Studio" en el header (`hero.tsx:40`), mitigado por `min-w-0` — riesgo bajo.
- **[A1.3] Hero usa `min-h-[92vh]` (vh, no svh/dvh)** | `hero.tsx:65` | Con barra de URL dinámica de iOS/Android, `92vh` se calcula contra el viewport grande: el hero puede "saltar" al scrollear o dejar contenido más abajo de lo esperado. El wrapper raíz ya usa `dvh` correctamente; migrar el hero a `min-h-[92svh]` (con fallback vh). | impacto: **medio** | esfuerzo: bajo | riesgo: bajo.
- **[A1.4a] [OK] La barra fija inferior del wizard respeta safe-area iOS** | `customizer.tsx:241` | `paddingBottom: max(0.75rem, env(safe-area-inset-bottom))`. Único uso de safe-area del proyecto — **no romper**.
- **[A1.4b] El FAB de WhatsApp NO respeta safe-area** | `whatsapp-button.tsx:21` | `fixed bottom-5 right-5` (20px fijos). En iPhone con home indicator queda pegado al borde. Recomendado: `bottom-[calc(1.25rem+env(safe-area-inset-bottom))]`. | impacto: **medio** | esfuerzo: bajo | riesgo: bajo.
- **[A1.5] Breakpoints** | `src/index.css` (`@theme inline`) | Sin override: rigen los de Tailwind v4 — sm 640 / md 768 / lg 1024 / xl 1280. Uso: `sm:`×99, `md:`×67, `lg:`×24. Saltos a vigilar: la nav del header aparece recién en `md` (768px) y el hero pasa a fila recién en `lg` (1024px) — tablets 768–1023 ven layout apilado (aceptable, sin estado intermedio).

## A2 — Navbar / header móvil

- **[A2.1] Header sticky de 64px constantes** | `hero.tsx:20-21` | `sticky top-0 z-50`, `h-16` en todos los tamaños (no se reduce en móvil). Consume 64px de cada pantalla. | impacto: medio (por A2.4) | medición estática.
- **[A2.2] En móvil no hay menú (ni hamburguesa)** | `hero.tsx:44` | La nav (`Inicio/Personalizar/Precios/Contacto`) es `hidden md:flex`: bajo 768px solo hay logos; el usuario navega con los CTA del hero y el FAB. Válido para una landing one-page, pero se pierde acceso directo a Precios/Contacto. Además los `<a>` de la nav desktop son texto `text-xs` sin padding (~18px tocables, afecta tablets). | impacto: medio | esfuerzo: medio | riesgo: bajo.
- **[A2.3] Logos raster WebP sin variante 2x** | `hero.tsx:23-39` | Se pintan a `h-5` (20px) con `brightness-0 invert`; sin `srcset` 2x ni SVG → posible blandura leve en retina. | impacto: bajo | esfuerzo: bajo | riesgo: bajo.
- **[A2.4] Sin `scroll-margin-top`: el header tapa los títulos al navegar a anchors** | `hero.tsx:12-14` + secciones | `scrollIntoView` alinea el target al tope del viewport, pero el header sticky de 64px cubre los primeros ~64px de `#customizer`, `#precios`, `#galeria`, `#contacto`, `#personalizaciones`. No existe ningún `scroll-mt-*` en el proyecto. Fix: `scroll-mt-16/20` en cada sección anclada. | impacto: **medio** | esfuerzo: **bajo** | riesgo: bajo.
- **[A2.5] [OK] CTAs del hero con área tocable holgada** (ver A3.9 para el matiz de altura) y **[A2.6] [OK]** header con `min-w-0`/`shrink-0` que evita overflow en 320px.

## A3 — Hero + carrusel (primera pantalla)

Layout clave: en móvil el hero es columna (`flex-col`); el carrusel va **debajo** de todo el copy (`lg:flex-row` recién en 1024px).

- **[A3.2] El carrusel (la prueba visual del producto) queda bajo el fold en 360×800** | `hero.tsx:91-135` | Suma estática: `py-24` (96) + eyebrow (~55) + h1 (~119) + subcopy (~128) + párrafo (~148) + botones (~106) + `gap-14` (56) ≈ el carrusel arranca en y≈712px con ~736px visibles bajo el navbar → **la primera pantalla es puro texto, la foto del producto apenas asoma**. | impacto: **alto** (conversión) | esfuerzo: medio (recortar `py`/`mb` móviles o reordenar) | riesgo: visual medio | medición estática.
- **[A3.3] Espaciado desktop aplicado en móvil** | `hero.tsx:91,96,109` | `py-24` (96px), `mb-10`, `mb-12` sin variante móvil — espacio muerto que empuja el fold. | impacto: medio | esfuerzo: bajo | riesgo: visual bajo.
- **[A3.4] [OK] h1 con clamp queda en 41.6px en todos los teléfonos** (el término `6vw` solo supera al mínimo sobre ~693px de ancho) — tamaño adecuado. **[A3.5] [OK]** subcopy 16px / párrafo 14px, ambos ≥14px.
- **[A3.7] Eyebrow 11px a `white/55`** | `hero.tsx:96` | Tamaño y contraste al límite sobre las zonas claras de la imagen borrosa. Subir a `white/70`. | impacto: medio | esfuerzo: bajo.
- **[A3.8] [OK] Overlay `from-black/85` protege el contraste del copy** en la mitad izquierda; el punto más débil es el párrafo cita `white/55` a 14px.
- **[A3.9] CTA primario ~45px de alto (<48px objetivo)** | `hero.tsx:117` | `px-9 py-4 text-[11px]` → ~45px. Borderline con 44px; el objetivo para CTA primario es ≥48px. | impacto: medio | esfuerzo: bajo | riesgo: visual bajo.
- **[A3.10] [OK]** En móvil ambos CTAs apilan a ancho completo, en zona media-baja alcanzable con el pulgar.
- **[A3.11] Copy del CTA: "Comenzar" (recomendación, NO aplicar sin aprobación)** | `hero.tsx:119` | Genérico; alternativa tipo "Personalizar mi termo" comunica la acción. Secundario: "Ver precios". | impacto: medio (conversión) | esfuerzo: bajo.
- **[A3.13] El carrusel NO soporta swipe táctil** | `hero-carousel.tsx:33-133` | Implementación propia con `setInterval` + flechas `onClick`; no hay ningún handler touch/pointer de gesto. En móvil no se puede deslizar — el patrón esperado. (Reverso positivo: al no haber gesto horizontal, no hay conflicto con el scroll vertical.) | impacto: **alto** | esfuerzo: medio | riesgo: bajo.
- **[A3.15] Flechas de 36×36px, único control manual** | `hero-carousel.tsx:121,129` | Bajo 44px, y centradas a `top-1/2` (zona alta de la pantalla). | impacto: medio | esfuerzo: bajo.
- **[A3.16] [OK] Dots no interactivos por decisión documentada** (31 targets de 24px no caben — WCAG 2.5.8); **[A3.17]** como indicador, 31 segmentos de 6px son ruido — considerar contador "n/31" o limitar puntos. | impacto: bajo.
- **[A3.18] Autoplay (3.5s) sin pausa táctil y que ignora `prefers-reduced-motion`** | `hero-carousel.tsx:45-51,71-72` + `index.css:482-489` | Solo pausa con `onMouseEnter` (desktop). El media query reduce los fades pero **el `setInterval` sigue avanzando** el contenido cada 3.5s (WCAG 2.2.2). | impacto: **alto** (accesibilidad) | esfuerzo: medio | riesgo: bajo.
- **[A3.19–A3.22] [OK] Pipeline de imágenes del hero muy bien resuelto**: preload del LCP con `imagesrcset`/`imagesizes` idénticos al `<img>` (móvil baja la variante 700w), `width/height` + `aspect-square` (CLS 0), `fetchpriority=high` solo en el frame 0, fondo borroso reutiliza la 700. **No romper.** Único detalle: **[A3.21]** el prefetch de la siguiente imagen usa `src` 900w en vez de la variante 700 (`hero-carousel.tsx:54-57`) — descarga de más en móvil cada 3.5s. | impacto: bajo | esfuerzo: bajo.

## A4 — Personalizador 3D en touch (sección crítica)

- **[A4.1] `touch-action:none` en todo el canvas 3D: la banda del visor atrapa el scroll vertical** | `thermos-3d.tsx:1104` (+ `object-3d.tsx:566`, fallback `thermos-3d.tsx:1075`) | Comentario explícito en el código: para scrollear, el dedo debe empezar fuera del canvas. El visor ocupa el **100% del ancho** en móvil (`customizer.tsx:2113-2133`, alto ~300px+): un pulgar que aterriza ahí para bajar la página **rota la pieza en vez de scrollear**. No hay carril lateral de escape. Mitigación existente: el preview es `max-lg:sticky top-0` y los controles de abajo sí scrollean. Alternativa clásica: `touch-action: pan-y` (rotar solo con drag horizontal, scroll vertical libre). | impacto: **alto** (el killer clásico de conversión móvil) | esfuerzo: medio | riesgo: **alto** (cambia la sensación de rotación; probar con cuidado) | medición estática.
- **[A4.3] [OK]** Rotación manual por Pointer Events con `setPointerCapture` (sin OrbitControls); el drag no se pierde al salir del canvas.
- **[A4.5] El pinch-zoom del navegador queda anulado sobre el visor** | `thermos-3d.tsx:558-600` | No hay pinch en el 3D (mono-puntero) y `touch-action:none` inhibe también el zoom de accesibilidad dentro de la banda. | impacto: medio (baja visión) | esfuerzo: bajo | riesgo: bajo.
- **[A4.6] Hint "Arrastre para girar": 12px, `text-muted-foreground`, fuera del canvas, persistente** | `customizer.tsx:2174-2181` | Poco descubrible y de bajo contraste; nunca se convierte en gesto animado sobre la pieza. (Sí adapta el texto por contexto — OK parcial.) | impacto: medio | esfuerzo: bajo.
- **[A4.7] [OK]** Tabs segmentadas del editor con icono+label, ~44px, sin scroll. **[A4.9] [OK]** chips de material/producto con `gap-2` (8px) y scroll-x deliberado con snap.
- **[A4.8] Botones Atrás/Siguiente de la barra fija ≈40px de alto** | `customizer.tsx:243-259` | `py-2.5`; son la acción primaria del wizard — objetivo ≥44-48px. (La barra sí respeta safe-area.) | impacto: medio | esfuerzo: bajo.
- **[A4.10] Toggles de alineación/disposición/interlineado: 36px con `gap-1` (4px <8px)** | `customizer.tsx:556-560,598-602,640-642` | Atenuante: viven en "Opciones avanzadas" colapsadas. | impacto: medio | esfuerzo: bajo.
- **[A4.13] [OK]** Carrusel de fuentes con chips de 104px y muestra en la tipografía real. **[A4.14]** la muestra es 18px fija con `truncate` (no WYSIWYG del grabado) — impacto bajo.
- **[A4.15/16] [OK] Inputs de grabado a 16px en móvil** (`ui/textarea.tsx:12` `text-base md:text-sm`; input simple `h-12 text-base`) — **no disparan el zoom forzado de iOS**; maxlength con contador visible ("X/30", "X/40"). **No romper.**
- **[A4.17] Input de URL de imagen a 14px → iOS hace zoom al enfocar** | `image-upload.tsx:147` | `text-sm`; subir a `text-base`. | impacto: medio | esfuerzo: trivial.
- **[A4.18] [OK]** El teclado no tapa el preview: el visor es sticky arriba y el input queda abajo.
- **[A4.19] [OK]** Tutorial con `max-height: calc(100dvh - 24px)` — cabe en 360×800; cierre por X, tap fuera y Escape; respeta reduced-motion. **[A4.20]** la X es de 30×30px (<44) | esfuerzo: trivial. **[A4.21]** botón de replay `text-xs` sin altura mínima — target chico.
- **[A4.22/24] [OK] Carga diferida del chunk 3D bien resuelta**: `DeferUntilVisible minHeight="90vh"` + `Suspense` + chunk `three` separado (732KB fuera del camino crítico) + `rootMargin` responsivo. **Intocable (guardrail de performance).**
- **[A4.23] El placeholder del chunk es un div vacío de 90vh** | `home.tsx:23-25` | Reserva altura (CLS 0) pero no muestra señal de carga — pantalla en blanco hasta que resuelve. Un skeleton ligero mejoraría la percepción sin tocar el lazy-load. | impacto: bajo/medio | esfuerzo: bajo.
- **[A4.26] `dpr={[1.5, 2]}`: piso 1.5 en vez de 1** | `thermos-3d.tsx:1090` | En gama baja renderiza 2.25× más píxeles que dpr 1. Bajar el piso a 1 mejora fluidez donde más cuesta. | impacto: medio | esfuerzo: trivial | riesgo: visual bajo (probar nitidez).
- **[A4.27] Render continuo: sin `frameloop="demand"`, `antialias:true`, `preserveDrawingBuffer:true`** | `thermos-3d.tsx:1093-1104` | Auto-spin idle + `ContactShadows frames={Infinity}` repintan cada frame → batería/calor en móvil. `preserveDrawingBuffer` es necesario para la captura PNG del pedido. | impacto: medio | esfuerzo: medio | riesgo: **alto** (`demand` rompería auto-spin y captura si no se invalida a mano).
- **[A4.28] [OK]** Fallback móvil del vidrio (sin `transmission` real), error boundary WebGL, manejo de `webglcontextlost`. **[A4.29/30] [OK]** feedback `active:scale` sistemático y cero dependencias críticas de hover en el customizer.
- **[A4.31] D-pad de posición flotante: flechas de 28px con `gap-0.5` (2px) y botón "ocultar" de ~14px** | `customizer.tsx:404,423-435` | El grupo táctil más frágil del proyecto (ver también A9.2a/b). | impacto: **alto** | esfuerzo: bajo | riesgo: medio (layout del popover).
- **[A4.32] Thumb del slider de tamaño: 16px; botones −/+ de 28px** | `ui/slider.tsx:21`, `customizer.tsx:481,497` | Difícil de agarrar con el dedo. | impacto: medio | esfuerzo: bajo.
- Nota: no existe selector de tamaño (oz) en la UI — `size` se fija programáticamente (`customizer.tsx:1037`).

## A5 — Secciones de contenido

- **[A5.1] Nota de cierre: 10px a `#9c9488` sobre `#faf7f2` ≈ 2.75:1 → FALLA AA** | `personalization-info.tsx:84` | El peor contraste de la página combinado con el tamaño más chico y `max-w-3xl`. Oscurecer (~`#6f685d` o el token `--muted-foreground`) y subir a 12px. | impacto: **alto** (accesibilidad) | esfuerzo: bajo | riesgo: nulo.
- **[A5.1b] Caption del funnel-demo: 11px a `#9c9488` ≈ 2.75:1 → FALLA AA** | `funnel-demo.tsx` CSS `.fd-caption` (~línea 76) | Es la única explicación textual de la animación. | impacto: medio | esfuerzo: bajo.
- **[A5.1c] Eyebrow de precios `text-white/40` a 11px ≈ 3.97:1 → falla AA** | `pricing-engraving.tsx:16` | impacto: medio | esfuerzo: bajo.
- **[A5.1d] Cuerpo de las cards de PersonalizationInfo a 11px** | `personalization-info.tsx:48,62,77` | Contraste pasa justo (4.75:1) pero 11px es el texto explicativo real de la sección. | impacto: medio | esfuerzo: bajo.
- **[A5.2] [OK] Precios como filas label/precio con `justify-between`**: intrínsecamente responsive, sin scroll horizontal ni riesgo en 360px.
- **[A5.3] Ritmo vertical inconsistente entre secciones** | móvil: 40→48→56→**96**→80px de `py`; PricingEngraving (`py-24`) casi duplica al resto sin razón jerárquica. Sugerido: `py-16 md:py-24`. | impacto: medio | esfuerzo: bajo | riesgo: visual bajo.
- **[OK]** `--muted-foreground` calibrado a 4.9:1 (`index.css:314`) — los grises que fallan son valores sueltos (`#9c9488`) que no usan el token; conviene migrarlos.

## A6 — Galería

- **[A6.1] [OK]** Grilla `grid-cols-2` en móvil, `gap-3`, `rounded-xl` uniforme, `aspect-square` + `width/height` → CLS ≈ 0 con lazy-load.
- **[A6.2] Sin lightbox/zoom al tocar + captions solo-hover invisibles en táctil** | `gallery.tsx:31-60` | Miniaturas de ~174px reales en 360px; **el producto ES el detalle del grabado** y a ese tamaño no se aprecia. El `figcaption` se revela solo con `group-hover` → en móvil las leyendas no existen. Recomendación: lightbox on-tap que muestre la variante 900w + caption. | impacto: **alto** (conversión) | esfuerzo: medio | riesgo: bajo.
- **[A6.3] [OK] `sizes` refleja las 2 columnas (`50vw`)**: en 360px con DPR 2–3 se sirve la variante `-700.webp` (las 31 existen en `public/galeria/`). **Guardrail: no romper el srcset.**

## A7 — Contacto, WhatsApp y footer

- **[A7.1] FAB de WhatsApp: ~50×54px (objetivo ≥56px) y sin safe-area** | `whatsapp-button.tsx:21-24` | En móvil es solo ícono (label `hidden sm:block`). Subir a `py-4` + glifo 24px y añadir `env(safe-area-inset-bottom)` (ver A1.4b). | impacto: medio | esfuerzo: bajo.
- **[A7.1b] [OK]** `aria-label` presente, focus ring visible, y el customizer lo oculta en el paso de diseño (`body.wa-fab-hidden`) — no tapa los controles. **[A7.1c]** puede montarse sobre los íconos sociales del footer al llegar al final (sin padding de reserva) | impacto: bajo.
- **[A7.2] Links del footer: ~20px de alto tocable; íconos sociales 36px** | `footer.tsx:57-89,109` | Bajo 44px. Fix barato: `inline-block py-1.5` en links y `h-11 w-11` en sociales. | impacto: medio | esfuerzo: bajo.
- **[A7.2b] [OK]** Texto del footer ≥12px con token AA; datos de contacto centralizados en `contact.ts` con `mailto:`/`tel:` y `aria-label`.

## A9 — Ejes transversales

- **[A9.1] Texto <12px: 29 nodos** | 9px: label "Posición" (`customizer.tsx:422`). 10px ×6: label del carrusel, badge de paso, nombre de fuente en chip, kickers (`hero-carousel.tsx:103`, `customizer.tsx:367,678`, `personalization-info.tsx:28,84`, `funnel-demo.tsx:451`). 11px ×22: **incluye el texto de los CTA principales** ("Comenzar"/"Ver precios", galería, custom-requests) con tracking 0.25–0.4em. Casi todos son etiquetas uppercase decorativas, no párrafos [OK parcial], pero los CTA a 11px son un caso medio-alto. | esfuerzo: bajo.
- **[A9.2] Touch targets bajo umbral** — los críticos: **d-pad 28px/gap 2px** (`customizer.tsx:404,427`), **botón "ocultar controles" ~14px** (`customizer.tsx:423-425`); medios: toggles 36px/gap 4px, botones ± 28px, links de texto `text-xs` sin altura mínima (`customizer.tsx:1746,2560`, `image-upload.tsx:189`). [OK]: swatches 32px, flechas carrusel 36px, nav del wizard, FAB.
- **[A9.3] [OK]** Feedback `active:` sistemático; sin dependencias críticas de hover en el customizer. **Fallas hover-only**: captions de galería (ver A6.2) y ~17 tooltips `title=` — algunos explican por qué una opción está deshabilitada (`customizer.tsx:552,594`) → información inaccesible en táctil. | impacto: medio | esfuerzo: medio.
- **[A9.4] [OK]** Animaciones solo `opacity/transform`; `prefers-reduced-motion` respetado en hero-CSS, funnel-demo (frame final estático) y tutorial. **Excepción**: el autoplay del carrusel (ver A3.18). Menor: `transition-[max-width]` del FAB dispara layout (solo hover desktop) | impacto: bajo.
- **[A9.4d] `whileInView` de framer-motion sin reduced-motion** | `gallery.tsx:32-35`, `pricing-engraving.tsx:8-30` | Animaciones de entrada (opacity + translateY, propiedades baratas) pero no existe `MotionConfig reducedMotion="user"` ni `useReducedMotion` en el proyecto: con `prefers-reduced-motion` activo igual animan. Fix de una línea envolviendo en `<MotionConfig reducedMotion="user">` (verificado: hallazgo cruzado por un segundo auditor independiente). | impacto: bajo/medio (a11y) | esfuerzo: bajo | riesgo: bajo | medición estática.
- **[A9.5] Landscape 800×360**: el hero no se rompe (`min-h` crece con scroll). Los paneles del customizer con `min-h-[280-520px]` exceden el alto — UX degradada pero sin clipping | impacto: medio | esfuerzo: medio (basta con no romperse: cumple).
- **[A9.6] Peso above-the-fold móvil (medido en `dist/`)**: entry JS **~320KB** + CSS **~138KB async** (no bloquea) + Inter 48KB (preload) + LCP `-700.webp`. `three` (**732KB**) y `customizer` (**397KB**) correctamente diferidos. GTM diferido a interacción/load+3s. **Arquitectura de splitting sólida — guardrail intocable.** Detalle: **[A9.6a]** Cronos Pro (h1) no está preloaded → FOUT del titular; el comentario del código lo justifica para no competir con la imagen LCP (tradeoff defendible; revisar solo si sobra presupuesto de red).
- **[A9.7] Zona del pulgar**: [OK] FAB y barra del wizard abajo (con safe-area en la barra); el botón primario "Siguiente" es `flex-1`. Difíciles: flechas del carrusel a `top-1/2` del hero (zona alta), CTA del hero en zona media-alta en 6"+, y el d-pad flotante dentro del panel (posición variable) — el punto ergonómico más frágil junto a A9.2a/b.

---

## A10 — Resumen ejecutivo

Ordenado por impacto en conversión/UX. Esf. = esfuerzo, Riesgo = riesgo de regresión (visual o de performance).

| # | Hallazgo | Sección | Impacto | Esf. | Riesgo |
|---|----------|---------|---------|------|--------|
| 1 | [A4.1] Canvas 3D con `touch-action:none` a ancho completo atrapa el scroll vertical | Customizer | **Alto** | Medio | **Alto** (sensación de rotación) |
| 2 | [A3.2+A3.3] Carrusel del hero bajo el fold en 360×800 (primera pantalla = solo texto) | Hero | **Alto** | Medio | Visual medio |
| 3 | [A3.13] Carrusel sin swipe táctil (solo flechas de 36px) | Hero | **Alto** | Medio | Bajo |
| 4 | [A6.2] Galería sin lightbox y captions solo-hover (invisibles en móvil) | Galería | **Alto** | Medio | Bajo |
| 5 | [A3.18+A9.4] Autoplay sin pausa táctil e ignora `prefers-reduced-motion` | Hero | **Alto** (a11y) | Medio | Bajo |
| 6 | [A5.1] Textos 10-11px a `#9c9488` ≈ 2.75:1 — fallan AA | Contenido | **Alto** (a11y) | **Bajo** | Nulo |
| 7 | [A4.31+A9.2a/b] D-pad 28px/gap 2px y botón "ocultar" de 14px | Customizer | **Alto** | **Bajo** | Medio |
| 8 | [A2.4] Sin `scroll-mt`: el header sticky tapa los títulos al navegar anchors | Navbar | Medio | **Bajo** | Bajo |
| 9 | [A1.4b+A7.1] FAB WhatsApp ~50px, sin safe-area iOS | WhatsApp | Medio | **Bajo** | Bajo |
| 10 | [A1.3] Hero `92vh` → `svh/dvh` (salto de barra del navegador) | Viewport | Medio | **Bajo** | Bajo |
| 11 | [A4.17] Input URL de imagen a 14px → zoom forzado iOS | Customizer | Medio | **Trivial** | Bajo |
| 12 | [A4.26] `dpr` piso 1.5 → bajar a `[1,2]` (fluidez gama baja) | Customizer | Medio | **Trivial** | Visual bajo |
| 13 | [A3.9+A4.8] CTA hero ~45px y botones del wizard ~40px (<48px) | Hero/Customizer | Medio | **Bajo** | Visual bajo |
| 14 | [A4.32+A9.2] Slider thumb 16px, botones ± 28px, toggles gap 4px, links footer ~20px, sociales 36px | Varios | Medio | **Bajo** | Bajo |
| 15 | [A4.6] Hint de rotación 12px, bajo contraste, poco descubrible | Customizer | Medio | **Bajo** | Bajo |
| 16 | [A9.3c] Tooltips `title=` inaccesibles en táctil (opciones deshabilitadas sin explicación) | Customizer | Medio | Medio | Bajo |
| 17 | [A4.5] Pinch-zoom de accesibilidad anulado sobre el visor 3D | Customizer | Medio | Bajo | Bajo |
| 18 | [A5.3] Ritmo vertical inconsistente (PricingEngraving `py-24` outlier) | Contenido | Medio | **Bajo** | Visual bajo |
| 19 | [A4.27] Render 3D continuo (batería) — evaluar con cuidado | Customizer | Medio | Medio | **Alto** (auto-spin/captura) |
| 20 | [A3.11] Copy CTA "Comenzar" genérico — **recomendación, requiere aprobación** | Hero | Medio | Bajo | — |
| 21 | [A2.2] Sin menú móvil (decisión válida; evaluar accesos a Precios/Contacto) | Navbar | Medio | Medio | Bajo |
| 22 | [A4.23] Placeholder del chunk 3D: div vacío de 90vh (sin skeleton) | Customizer | Bajo/medio | Bajo | Bajo (¡no tocar el lazy!) |
| 23 | [A3.21] Prefetch del carrusel baja la variante 900w en móvil | Hero | Bajo | Bajo | Bajo |
| 24 | [A3.17] 31 dots de 6px como indicador — ruido | Hero | Bajo | Bajo | Bajo |
| 25 | [A2.3] Logos sin 2x/SVG (retina) | Navbar | Bajo | Bajo | Bajo |
| 26 | [A9.5b] Paneles del customizer en landscape (no se rompe; UX justa) | Customizer | Bajo | Medio | Bajo |
| 27 | [A9.4d] `whileInView` (galería/precios) sin `MotionConfig reducedMotion="user"` | Transversal | Bajo/medio (a11y) | **Bajo** | Bajo |

## Guardrails — lo que está bien y es intocable

- Meta viewport con zoom permitido (A1.1) · `overflow-x-hidden` raíz (A1.2) · safe-area en la barra del wizard (A1.4a).
- Pipeline LCP del hero: preload con `imagesrcset`, variantes 700/900, CLS 0, `fetchpriority` (A3.19-22).
- Code-splitting: chunk `three` (732KB) y `customizer` (397KB) diferidos, `DeferUntilVisible`, CSS async, GTM diferido (A4.22/24, A9.6).
- `srcset`/`sizes` de la galería sirviendo `-700.webp` en móvil (A6.3).
- Inputs de grabado a 16px (sin zoom iOS), contadores de caracteres (A4.15/16).
- Feedback `active:` sistemático, animaciones compositables, reduced-motion en hero/funnel/tutorial (A9.3/9.4).
- Un solo contexto WebGL a la vez, fallbacks WebGL y `webglcontextlost` (A4.4/28).
- Token `--muted-foreground` a 4.9:1 (usarlo para arreglar los grises sueltos, no recalibrarlo).
