# PLAN MÓVIL — Etapa B (priorizado por impacto en conversión ÷ esfuerzo)

Basado en `AUDITORIA-MOVIL.md` (27 hallazgos). Orden: primero lo que afecta la acción principal (hero → CTA → customizer → WhatsApp), después confianza/contenido.

## Método de verificación (aplica a todos los ítems)

- **Estática**: build (`pnpm build`) sin errores + revisión de clases resultantes en 360 y 412 px (cálculo Tailwind).
- **Visual**: al inicio de la Etapa C intento instalar Playwright + Chromium en el entorno para screenshots reales en 360×800 y 412×915 + Lighthouse móvil. Si el entorno no lo permite (hoy no hay navegador), cada ítem incluye un **checklist de 30 segundos para verificar vos** en DevTools/tu teléfono, y las métricas se validan con el Lighthouse de PageSpeed Insights sobre el deploy.
- **Guardrails duros** (se verifican tras cada lote): TBT <200ms, CLS <0.05, score ≥ actual, chunk del customizer NO carga sin scroll, srcset de galería intacto, zoom nunca bloqueado, inputs ≥16px.

Riesgos marcados por ítem: `[TBT]` `[CLS]` `[LAZY-3D]` `[SRCSET]` = puede romper ese logro si se hace mal; la ejecución los protege explícitamente.

---

## LOTE 1 — Desbloqueos del flujo principal

### P1. Canvas 3D: liberar el scroll vertical (A4.1/A4.2/A4.5) — impacto ALTO / esfuerzo medio
- **Qué**: cambiar `touchAction: "none"` → `"pan-y pinch-zoom"` en los 3 canvas (`thermos-3d.tsx:1104` y `:1075`, `object-3d.tsx:566`) + lock de intención de gesto en los pointer handlers (`thermos-3d.tsx:555-617`): si el gesto arranca mayormente horizontal → rotar (y ahí sí capturar); si arranca vertical → dejar que el navegador scrollee (el browser emite `pointercancel` y no rotamos). El pitch vertical sigue disponible una vez "lockeado" el gesto como rotación.
- **Resultado**: scrollear la página tocando el termo funciona; girar con drag horizontal funciona; el pinch-zoom de accesibilidad vuelve a funcionar sobre el visor.
- **Archivos**: `thermos-3d.tsx`, `object-3d.tsx`.
- **Verificación 360/412**: swipe vertical sobre el canvas debe scrollear; drag horizontal debe rotar; pinch debe hacer zoom del navegador. (Es EL ítem que exige prueba en dispositivo real.)
- **Riesgo**: alto en sensación de rotación (por eso el lock de intención en vez de quitar el bloqueo a secas). Sin riesgo de performance.

### P2. Anchors con `scroll-mt` (A2.4) — impacto medio / esfuerzo trivial
- **Qué**: `scroll-mt-20` en `#customizer`, `#precios`, `#galeria`, `#contacto`, `#personalizaciones`.
- **Archivos**: `home.tsx`, `pricing-engraving.tsx`, `gallery.tsx`, `footer.tsx`, `personalization-info.tsx`.
- **Verificación**: tocar "Comenzar"/links del footer → el título de la sección queda visible bajo el header, no tapado.

### P3. Hero: `92vh` → `92svh` (A1.3) — impacto medio / esfuerzo trivial
- **Qué**: `min-h-[92vh]` → `min-h-[92svh]` con fallback (`min-h-[92vh] min-h-[92svh]` vía CSS o supports). Sin tocar nada más del hero acá.
- **Archivos**: `hero.tsx:65`.
- **Verificación**: en DevTools móvil el hero no "salta" al aparecer/desaparecer la barra de URL; CTA visible sin scroll. `[CLS]` — svh es más chico que vh: reduce el riesgo de salto, no lo aumenta.

### P4. Carrusel del hero: swipe + autoplay accesible + flechas 44px (A3.13/A3.18/A3.15/A3.21/A9.4a) — impacto ALTO / esfuerzo medio
- **Qué**: (a) swipe táctil con Pointer Events propios (sin librería) + `touch-action: pan-y` en el marco (swipe horizontal cambia foto, scroll vertical libre); (b) autoplay: pausar con `prefers-reduced-motion`, al tocar/interactuar, y reanudar tras 8s de inactividad; (c) flechas `h-9 w-9` → `h-11 w-11` (44px); (d) prefetch de la siguiente imagen usando la variante `-700.webp` en viewports chicos.
- **Archivos**: `hero-carousel.tsx`.
- **Verificación 360/412**: deslizar cambia la imagen sin mover el scroll vertical; con reduced-motion activado el carrusel queda quieto; Network muestra prefetch de `-700.webp` en móvil. `[SRCSET]`/`[CLS]`: NO se toca el preload LCP ni `width/height`/`sizes` del `<img>` — solo se agregan handlers y se corrige el prefetch.

### P5. CTA hero y botones del wizard a ≥48px (A3.9/A4.8) — impacto medio / esfuerzo bajo
- **Qué**: CTAs del hero: `min-h-12` + `leading-none` (~48px). Botones "Atrás/Siguiente" de la barra fija: `py-2.5` → `py-3` + `min-h-11`.
- **Archivos**: `hero.tsx:114-127`, `customizer.tsx:243-259`.
- **Verificación**: medir en DevTools ≥48px (hero) y ≥44px (wizard); la barra fija no crece tanto que tape contenido (sigue con safe-area).

### P6. FAB de WhatsApp: 56px + safe-area (A1.4b/A7.1) — impacto medio / esfuerzo bajo
- **Qué**: `py-3.5`→`p-4` + glifo 22→24px (≈56px) y `bottom-[calc(1.25rem+env(safe-area-inset-bottom))]`.
- **Archivos**: `whatsapp-button.tsx:21-24`.
- **Verificación**: ≥56px medidos; en viewport iOS con notch simulado no queda pegado al home indicator; sigue ocultándose en el paso de diseño del customizer.

### P7. Touch targets críticos del customizer (A4.31/A9.2a/b/A4.32/A4.10) — impacto ALTO / esfuerzo bajo
- **Qué**: d-pad `w-7 h-7 gap-0.5` → `w-9 h-9 gap-1.5` (36px/6px); botón "ocultar controles" con `p-2` (≥30px real, ideal `min-w-11 min-h-11` si el layout lo tolera); botones ± del slider `w-7`→`w-9`; thumb del slider `h-4 w-4`→`h-5 w-5` (revisar que `ui/slider.tsx` no se use en otro contexto que se rompa); toggles de alineación `gap-1`→`gap-2`.
- **Archivos**: `customizer.tsx` (404, 423-435, 481, 497, 544-642), `ui/slider.tsx:21`.
- **Verificación 360**: el d-pad flotante no desborda el visor de 300px de alto; todos los targets ≥24px con ≥8px de separación (los primarios ≥44).

### P8. Input de URL de imagen a 16px (A4.17) — impacto medio / esfuerzo trivial
- **Qué**: `text-sm` → `text-base` (o `text-base md:text-sm`).
- **Archivos**: `image-upload.tsx:147`.
- **Verificación**: en iOS simulado, enfocar no dispara zoom.

### P9. `dpr={[1.5, 2]}` → `[1, 2]` (A4.26) — impacto medio / esfuerzo trivial
- **Qué**: bajar el piso del device-pixel-ratio del Canvas en ambos visores.
- **Archivos**: `thermos-3d.tsx:1090`, `object-3d.tsx:556`.
- **Verificación**: en gama media/alta (dpr≥2) no cambia nada; en gama baja mejora fluidez. Chequeo visual de nitidez en tu teléfono. `[TBT]` a favor (menos trabajo de GPU).

---

## LOTE 2 — Accesibilidad y contraste (fixes objetivos, sin cambio de diseño)

### P10. Contrastes que fallan AA (A5.1/A5.1b/A5.1c) — impacto ALTO (a11y) / esfuerzo bajo
- **Qué**: `#9c9488` → `#6f685d` (≥4.5:1) en la nota de cierre (`personalization-info.tsx:84`, y subirla de 10→12px) y en `.fd-caption` (`funnel-demo.tsx`); eyebrow de precios `text-white/40` → `text-white/60`; eyebrow del hero `white/55` → `white/70` (A3.7).
- **Archivos**: `personalization-info.tsx`, `funnel-demo.tsx`, `pricing-engraving.tsx`, `hero.tsx:96`.
- **Verificación**: ratios recalculados ≥4.5:1; visualmente casi imperceptible (mismo tono, más oscuro).

### P11. Cuerpos de 11px → 12px en cards informativas (A5.1d/A9.1) — impacto medio / esfuerzo bajo
- **Qué**: descripciones de PersonalizationInfo `text-[11px]` → `text-xs`; label 9px del d-pad → 10-11px; textos 10px → 11-12px donde no sean puramente decorativos.
- **Archivos**: `personalization-info.tsx:48,62,77`, `customizer.tsx:422,367`.
- **Verificación**: sin saltos de layout en 360px (los contenedores son fluidos).

### P12. `MotionConfig reducedMotion="user"` (A9.4d) — impacto bajo-medio / esfuerzo trivial
- **Qué**: envolver galería y precios (o el árbol común) en `<MotionConfig reducedMotion="user">`.
- **Archivos**: `gallery.tsx`, `pricing-engraving.tsx`.
- **Verificación**: con reduced-motion activo, las secciones aparecen sin animación de entrada.

### P13. Tutorial: X de 30→44px y replay tocable (A4.20/A4.21) — impacto bajo / esfuerzo trivial
- **Archivos**: `customizer-tutorial.tsx:62-67`, `customizer.tsx:1981-1990`.
- **Verificación**: targets ≥44px; el modal sigue cabiendo en 360×800 (usa dvh, no cambia).

### P14. Footer: links y sociales tocables (A7.2) — impacto medio / esfuerzo bajo
- **Qué**: links con `inline-block py-1.5`; íconos sociales `h-9 w-9` → `h-11 w-11`.
- **Archivos**: `footer.tsx:57-89,109`.
- **Verificación**: targets ≥44px, sin desbordes en 320px.

### P15. Ritmo vertical: PricingEngraving `py-24 md:py-32` → `py-16 md:py-24` (A5.3) — impacto medio / esfuerzo trivial
- **Archivos**: `pricing-engraving.tsx:7`.
- **Verificación**: scroll total más corto; separación consistente con las secciones vecinas (48-96px).

### P16. Skeleton del chunk 3D (A4.23) — impacto bajo-medio / esfuerzo bajo — `[LAZY-3D]` `[CLS]`
- **Qué**: `SectionFallback` deja de ser un div vacío: mismo `minHeight` EXACTO (CLS intacto) + shimmer CSS sutil y texto "Cargando personalizador…". NO se toca `DeferUntilVisible` ni el `lazy()`.
- **Archivos**: `home.tsx:23-25` (+ unas líneas de CSS).
- **Verificación**: con Network throttling, al scrollear hacia el customizer se ve el shimmer y no hay salto de layout cuando monta; el chunk sigue SIN cargar al load sin scroll (Network tab).

---

## LOTE 3 — Propuestas de diseño/copy — **requieren tu aprobación ítem por ítem** (no se aplican con la aprobación general del plan)

### P17. Compactar el hero móvil para que el producto asome en el fold (A3.2/A3.3) — impacto ALTO
- **Antes** (360×800): `py-24` (96px) arriba y abajo, `mb-10` tras el eyebrow, `mb-12` antes de los CTAs, `gap-14` al carrusel → primera pantalla 100% texto; la foto del termo arranca en y≈712px.
- **Después propuesto**: `py-10 md:py-24`, `mb-6 md:mb-10`, `mb-8 md:mb-12`, `gap-8 md:gap-14` (solo variantes móviles; desktop intacto) → se ganan ~110px: el borde superior del carrusel (~⅓ de la foto) entra en el fold como invitación a scrollear.
- **Alternativa más agresiva** (si querés la foto entera en el fold): además acortar el párrafo-cita o moverlo debajo del carrusel en móvil. Cambio de estructura → solo si lo aprobás explícitamente.
- **Archivos**: `hero.tsx:91,96,109`. **Verificación**: screenshot 360×800 — headline + CTA + inicio del carrusel visibles. `[CLS]` sin riesgo (solo padding).

### P18. Copy del CTA principal (A3.11) — impacto medio (conversión)
- **Antes**: "Comenzar" / **Después propuesto**: **"Personalizar mi termo"** (alternativas: "Crear mi diseño", "Diseñar el mío"). También propongo subir el texto de 11px → 12-13px manteniendo el uppercase+tracking (A9.1c).
- **Archivos**: `hero.tsx:119`. Cero riesgo técnico; es 100% decisión de marca.

### P19. Lightbox de galería con captions (A6.2/A9.3a) — impacto ALTO
- **Antes**: miniaturas de ~174px sin zoom; captions solo-hover (invisibles en móvil).
- **Después propuesto**: tap sobre una foto abre un overlay propio (sin librerías: `<dialog>` + CSS) con la imagen 900w + caption visible + cierre por X (44px), tap fuera y swipe-down. Lazy: el componente se monta solo al primer tap (no suma al bundle inicial). `[SRCSET]`: las miniaturas no se tocan; el lightbox pide la 900w que ya existe.
- **Archivos**: `gallery.tsx` + componente nuevo `gallery-lightbox.tsx` (~80 líneas).
- **Verificación**: tap abre/cierra; el grid no cambia; Lighthouse igual (código diferido).

### P20. Hint de rotación visible sobre el visor (A4.6) — impacto medio
- **Antes**: texto gris de 12px debajo del canvas, permanente.
- **Después propuesto**: chip semitransparente centrado SOBRE el canvas ("↔ Arrastrá para girar", 13px, fondo `black/55`, texto blanco) que desaparece al primer drag y no vuelve (sessionStorage). El texto inferior actual se mantiene como refuerzo contextual.
- **Archivos**: `customizer.tsx` (zona 2113-2181). **Verificación**: visible al llegar al paso, desaparece al girar, no intercepta el touch (`pointer-events-none`).

### P21. Indicador del carrusel: contador en vez de 31 dots (A3.17) — impacto bajo
- **Antes**: 31 segmentos de 6px. / **Después propuesto**: contador "7 / 31" (12px, `white/70`) + los dots se eliminan. Minimalista, coherente con el estilo.
- **Archivos**: `hero-carousel.tsx:135-151`.

### P22. Tooltips `title=` → texto visible cuando explican algo importante (A9.3c) — impacto medio / esfuerzo medio
- **Qué**: solo los ~4 casos que explican por qué una opción está deshabilitada (`customizer.tsx:552,594` etc.) pasan a un helper text de 12px debajo del control cuando está disabled. El resto de los `title` quedan como están.
- **Archivos**: `customizer.tsx`.

### Descartados de esta iteración (recomendación)
- **A4.27 `frameloop="demand"`**: riesgo alto de romper auto-spin y captura del pedido; ganancia incierta. Dejar para una iteración con dispositivo de prueba.
- **A2.2 menú móvil**: la landing es one-page y los CTAs cubren el flujo; agregar hamburguesa es esfuerzo medio con impacto dudoso. Si querés accesos a Precios/Contacto, es mejor un mini-índice al final del hero (decisión de diseño → tu llamada).
- **A2.3 logos 2x, A9.5b landscape, A9.6a preload Cronos**: impacto bajo; el criterio de landscape ("que no se rompa") ya se cumple.

---

## Orden de ejecución en Etapa C

1. Lote 1 (P1-P9) — un ítem por vez, empezando por P2/P3/P8/P9 (triviales) y dejando P1 y P4 (los de más cuidado) con verificación dedicada.
2. Lote 2 (P10-P16).
3. Lote 3: SOLO los ítems que apruebes explícitamente.
4. Cierre: `RESULTADOS-MOVIL.md` con antes/después por sección, checklist de touch targets y verificación de que TBT/CLS/score no retrocedieron (Lighthouse sobre el deploy).

**Toco código recién cuando apruebes este plan.** Para el Lote 3, indicá ítem por ítem: P17 (¿versión propuesta o agresiva?), P18 (¿qué copy?), P19, P20, P21, P22.
