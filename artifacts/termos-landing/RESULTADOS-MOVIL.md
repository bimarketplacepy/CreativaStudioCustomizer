# RESULTADOS — Optimización móvil (Etapa C)

**Fecha:** 2026-07-22 · Ejecución del plan aprobado (`PLAN-MOVIL.md`): Lotes 1 y 2 completos + Lote 3 completo (P17 versión conservadora, P18 con "Personalizar mi producto", P19-P22 aprobados). Descartes respetados: `frameloop="demand"`, menú móvil, logos 2x, preload de Cronos.

> Nota de verificación: el entorno no permitió instalar Chromium/Playwright (la descarga falla en Replit), así que no hay screenshots automatizados. La verificación fue **estática + build de producción exitoso**; al final está el checklist de 2 minutos para validar en tu teléfono y el paso de Lighthouse sobre el deploy.

---

## Antes / después por sección

### Hero (`hero.tsx`)
| Qué | Antes | Después |
|---|---|---|
| Altura (P3) | `min-h-[92vh]` (salta con la barra del navegador) | `92svh` con fallback `92vh` |
| Fold 360×800 (P17) | `py-24`, `mb-10/12`, `gap-14` → primera pantalla 100% texto | `py-10 md:py-24`, `mb-6/8 md:…`, `gap-8 md:gap-14` → ~110px ganados, el carrusel asoma como invitación a scrollear. Desktop intacto |
| CTA (P5/P18) | "Comenzar", 11px, ~45px de alto | **"Personalizar mi producto"**, 12px, `min-h-12` (48px) + estado `active:` |
| Eyebrow (P10) | `white/55` (contraste al límite) | `white/70` |

### Carrusel del hero (`hero-carousel.tsx`)
| Qué | Antes | Después |
|---|---|---|
| Swipe (P4) | Solo flechas; sin gesto táctil | Swipe con Pointer Events + `touch-action: pan-y` (horizontal cambia foto, vertical scrollea; umbral 40px) |
| Autoplay (P4) | Solo pausaba con hover; ignoraba reduced-motion | Se detiene con `prefers-reduced-motion` (reactivo), pausa 8s tras cualquier interacción manual |
| Flechas (P4) | 36×36px | **44×44px** + `active:` |
| Prefetch (P4) | Siempre la variante 900w | Variante 700w bajo 1024px |
| Indicador (P21) | 31 dots de 6px | Contador "n / 31" (12px, `white/70`) |
| **Guardrail LCP** | — | Preload/`srcset`/`sizes`/`width/height` del `<img>` **sin tocar** |

### Visores 3D (`thermos-3d.tsx`, `object-3d.tsx`)
| Qué | Antes | Después |
|---|---|---|
| Scroll atrapado (P1) | `touch-action: none` en todo el canvas: swipe vertical rotaba en vez de scrollear | `touch-action: pan-y pinch-zoom` + **lock de intención de gesto**: umbral generoso de **10px** antes de decidir; en diagonal gana el eje dominante; el puntero se captura recién al confirmar rotación; `pointercancel` limpia el estado cuando el navegador toma el scroll |
| Modo diseño | — | Sigue con `touch-action: none` (el arrastre del diseño es bidireccional a propósito) — dinámico según `designActive` |
| Pinch (P1) | Bloqueado sobre el visor | `pinch-zoom` habilitado (accesibilidad) |
| Canvas 2D de respaldo | `touch-action: none` | Mismo lock de intención + `pan-y pinch-zoom` |
| `dpr` (P9) | `[1.5, 2]` | `[1, 2]` (menos píxeles en gama baja; en dpr≥2 no cambia nada) |
| **Descartado (aprobado)** | — | `frameloop="demand"` NO se tocó: el auto-spin y la captura PNG del pedido siguen intactos |

### Customizer (`customizer.tsx`)
| Qué | Antes | Después |
|---|---|---|
| Botones del wizard (P5) | ~40px | `py-3 min-h-11` (≥44px), safe-area intacta |
| D-pad de posición (P7) | 28px con gap 2px; label 9px | **36px con gap 6px**; label 10px. Pad resultante ≈132×154px: **verificado contra el visor de 360px** (mín. 210px de alto, ancho ≈328px) — no desborda |
| Botón "ocultar controles" (P7) | ~14px | `p-2 -m-1` (~30px) sin mover el layout |
| Botones ± tamaño (P7) | 28px | 36px |
| Toggles alineación/disposición/interlineado (P7) | gap 4px | gap 8px |
| Hint de rotación (P20) | Texto gris 12px bajo el canvas, permanente | **Chip sobre el canvas** (13px, blanco sobre `black/55`, ícono ↔), `pointer-events-none`, desaparece al primer toque del visor y no vuelve (sessionStorage). Montado en los 3 visores; oculto en modo diseño/wrap360. El texto inferior se mantiene como refuerzo |
| Tooltips de opciones deshabilitadas (P22) | Solo `title=` (invisible en touch) | Helper text visible de 12px: motivo del wrap360 deshabilitado, "Justificado no disponible con una palabra por línea", motivo de Vertical deshabilitado |
| Replay del tutorial (P13) | `text-xs` sin altura mínima | `min-h-11 py-2` |
| Links "Volver al tono original" (A9.2e) | ~18px de alto | `py-1.5` |
| Badge "Todo color" y nombres de fuentes (P11) | 10px | 11px |

### Tutorial (`customizer-tutorial.tsx`)
- X de cierre: 30×30px → **44×44px** (P13). Tap fuera, Escape y dvh ya estaban bien.

### Contenido (`personalization-info.tsx`, `funnel-demo.tsx`, `pricing-engraving.tsx`)
| Qué | Antes | Después |
|---|---|---|
| Nota de cierre (P10) | 10px a `#9c9488` ≈ **2.75:1 (falla AA)** | 12px a `#6f685d` (≥4.5:1 sobre `#faf7f2`) |
| Caption del funnel (P10) | 11px a `#9c9488` (falla AA) | 12px a `#6f685d` |
| Eyebrow de precios (P10) | `white/40` ≈ 3.97:1 | `white/60` |
| Cuerpo de cards (P11) | 11px a `#7a7266` | 12px a `#6f685d` |
| Ritmo vertical (P15) | Precios `py-24 md:py-32` (outlier) | `py-16 md:py-24`, alineado al resto |
| Reduced-motion (P12) | `whileInView` animaba igual | `<MotionConfig reducedMotion="user">` en precios y galería |

### Galería (`gallery.tsx` + `gallery-lightbox.tsx` nuevo)
| Qué | Antes | Después |
|---|---|---|
| Zoom (P19) | Sin lightbox; miniaturas ~174px; captions solo-hover (invisibles en móvil) | **Lightbox propio sin librerías**: tap abre overlay con la variante 900w + caption siempre visible + contador. Cierre por X (44px, con safe-area top), tap fuera, Escape y swipe vertical; navegación por flechas 44px, swipe horizontal y teclado. Scroll del body bloqueado mientras está abierto |
| Peso (guardrail) | — | El lightbox es un **chunk lazy de 2.7KB** que se monta recién al primer tap: cero impacto en el bundle inicial. **`srcset`/`sizes` de las miniaturas sin tocar** |
| CTA final | "Comenzar", 11px | "Personalizar mi producto", 12px, `min-h-12` |

### WhatsApp y footer (`whatsapp-button.tsx`, `footer.tsx`)
| Qué | Antes | Después |
|---|---|---|
| FAB (P6) | ~50×54px, `bottom-5` fijo | **≈56×56px** (`p-4` + glifo 24px), `bottom-[calc(1.25rem+env(safe-area-inset-bottom))]` |
| Links del footer (P14) | ~20px de alto | `inline-block py-1.5` (~32px) |
| Íconos sociales (P14) | 36px | **44px** |
| Solape FAB/footer (A7.1c) | El FAB podía tapar los sociales | `pb` móvil del footer con reserva de 88px + safe-area |

### Anchors y carga (`defer-until-visible.tsx`, `home.tsx`, `index.css`)
- **P2**: `scroll-mt-20` en `#customizer`, `#personalizaciones`, `#precios`, `#galeria`, `#contacto` — el header sticky de 64px ya no tapa los títulos.
- **P16**: el placeholder del chunk del customizer dejó de ser un div en blanco: mismo `minHeight` exacto (CLS intacto) + shimmer CSS sutil (respeta reduced-motion) + "Cargando personalizador…". `DeferUntilVisible` y el `lazy()` **sin tocar**.

---

## Checklist de touch targets

| Elemento | Antes | Ahora | ≥24px | Primario ≥44px |
|---|---|---|---|---|
| CTAs hero / galería / custom-requests | ~45px | ≥48px | ✅ | ✅ |
| Flechas del carrusel | 36px | 44px | ✅ | ✅ |
| Botones Atrás/Siguiente wizard | ~40px | ≥44px | ✅ | ✅ |
| FAB WhatsApp | ~50px | ~56px | ✅ | ✅ |
| D-pad posición | 28px/gap 2 | 36px/gap 6 | ✅ | n/a |
| Botón ocultar d-pad | ~14px | ~30px | ✅ | n/a |
| Botones ± tamaño | 28px | 36px | ✅ | n/a |
| Thumb del slider | 16px | 20px (track sigue siendo el target real) | ✅ | n/a |
| X del tutorial / X del lightbox | 30px / — | 44px / 44px | ✅ | ✅ |
| Links footer / sociales | ~20px / 36px | ~32px / 44px | ✅ | ✅ |
| Links de texto (tono, quitar imagen) | ~18px | ~30px | ✅ | n/a |
| Dots del carrusel | no interactivos (correcto) | contador no interactivo | n/a | n/a |

Inputs: grabado 16px (ya estaba), input simple 16px (ya estaba), **URL de imagen 14→16px** — ningún input dispara el zoom forzado de iOS.

## Guardrails de performance — verificación

| Métrica | Antes | Después | Estado |
|---|---|---|---|
| Entry JS | 319.8 KB | **321.1 KB** (+1.3KB: swipe+contador+chip) | ✅ sin regresión material |
| CSS (async, no bloquea) | 138.0 KB | 140.2 KB (+2.2KB) | ✅ |
| Chunk `three` | 732.0 KB, hash `Urscy41h` | **idéntico, mismo hash** (no se recompiló) | ✅ intocado |
| Chunk `customizer` | 396.6 KB | 399.2 KB (+2.6KB, sigue lazy) | ✅ diferido |
| Lightbox | — | chunk lazy de **2.7 KB**, se monta al primer tap | ✅ |
| CLS | fallbacks con minHeight | mismos `minHeight` exactos; shimmer no cambia layout; svh reduce el salto del hero | ✅ |
| Lazy-load del customizer | `DeferUntilVisible` 200px móvil | **sin tocar** | ✅ |
| `srcset` galería/hero | variantes 700/900 | **sin tocar** (solo se corrigió el prefetch a 700w: menos datos) | ✅ |
| Zoom del usuario | permitido | permitido + pinch ahora también sobre el visor 3D | ✅ mejorado |
| Librerías nuevas | — | **cero** (lightbox y swipe a mano) | ✅ |

Build de producción: ✅ `vite build` sin errores (9.6s, 2777 módulos).

## Checklist de 2 minutos en tu teléfono (validación final)

1. **Scroll sobre el termo 3D**: deslizá verticalmente con el dedo SOBRE el termo → la página debe scrollear. Drag horizontal → rota. Drag diagonal → gana el eje dominante, sin sensación errática.
2. **Hero en 360px**: el borde superior del carrusel debe asomar sin scrollear; el CTA dice "Personalizar mi producto".
3. **Carrusel**: deslizá las fotos con el dedo; tocá una flecha → el autoplay espera ~8s.
4. **Galería**: tocá una foto → lightbox con la leyenda; cerrá con swipe hacia abajo.
5. **Anchors**: "Ver precios" → el título "Tarifas" queda visible bajo el header.
6. **iPhone**: el botón de WhatsApp no queda pegado al home indicator.
7. **Lighthouse móvil** (PageSpeed Insights sobre el deploy): confirmar TBT <200ms, CLS <0.05, score ≥ el actual, y en Network que `three-*.js` NO baja sin scrollear.
