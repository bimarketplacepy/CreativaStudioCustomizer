# PLAN — Editor del personalizador: simple, rápido y listo para Odoo

**Fecha:** 2026-10-09 · Complementa `Mejoras.md` §4 (diagnóstico de la creación de diseños) y §6 (hoja de ruta).
**Estado:** etapas 1 y 2 implementadas (2026-10-09, ver §5); etapas 3 y 4 pendientes.

---

## 0. Objetivo

Que el cliente vea **su nombre sobre su termo en menos de 10 segundos**, que pueda **mover, agrandar o borrar** lo que puso sin pelearse con el 3D, y que todo ande fluido en un celular de gama media.

Visión final (pedida por el dueño): el cliente navega el **ecommerce de Odoo**, ve las fotos de un termo, toca **"Personalizar"** y se abre el editor **con el modelo 3D de ese termo** ya cargado, listo para editar.

---

## 1. Qué está mal hoy (verificado)

### 1.1 Edición tosca
| Problema | Dónde |
|---|---|
| Con un nombre, ícono o imagen cargado, **arrastrar sobre el 3D siempre mueve el diseño**: ya no se puede girar el termo | `thermos-3d.tsx` `onDown`: `designActive && editSingleFace ? "design" : "rotate"` |
| **No hay "Listo" / "Hecho"**: no hay forma de salir del modo edición y volver a mirar la pieza | — |
| El diseño se mueve con una **cruz de flechas** encima del 3D y el arrastre va ×1,5–1,7 más rápido que el dedo | `onDesignMove` |
| No se ve **qué** está seleccionado (texto o ícono): depende de la pestaña abierta | `customizer.tsx` |
| Muchas decisiones antes de ver el resultado: material → producto → "¿ya tenés tu termo?" → tamaño → 12 colores → **tono exacto** → técnica → orientación → **23 tipografías** → tamaño → ajustes avanzados | wizard de 4 pasos |

### 1.2 Lento (medido en celular simulado: CPU ×4 más lenta, 390 px)
| Medición | Resultado | Causa |
|---|---|---|
| Descarga más pesada de toda la página | **1,64 MB** de `raw.githubusercontent.com` (45 % de lo transferido) | La iluminación `Environment preset="studio"` baja un HDR desde GitHub. **El 3D no aparece hasta que termina**; si GitHub anda lento o bloqueado, no aparece nunca |
| Escribir "Sofía Martínez" letra por letra | **10,6 s de bloqueo** del navegador en total; la peor pausa, **8,1 s** | Cada tecla regenera **4 texturas de 1024×2048** (color, rugosidad, metal, relieve) y las vuelve a subir a la GPU |
| Fuentes al entrar al paso Diseño | **~20 tipografías, ~750 KB**, todas de una | El carrusel muestra la vista previa de cada una |
| Render continuo | 60 cuadros/s aunque nada se mueva | `ContactShadows frames={Infinity}` (sombra recalculada cada cuadro) + giro automático |

> Nota: la prueba usa una GPU por software, que exagera el costo de subir texturas. En un celular real los números son menores, pero el orden de los problemas es el mismo.

---

## 2. Propuesta

### 2.1 Interacción: "mirar" y "editar" bien separados
- **Por defecto, arrastrar gira el termo.** Siempre.
- **Tocar el diseño lo selecciona:** recuadro con manijas en las esquinas (arrastrar = mover **1:1 con el dedo**, manija = agrandar/achicar) y una **barra flotante**: `Letra · Tamaño · Borrar · ✓ Listo`.
- **"✓ Listo"** (o tocar fuera del producto) termina la edición y vuelve a girar.
- Agregar cosas con botones grandes debajo del 3D: **`+ Nombre` · `+ Ícono` · `+ Logo/Foto`**. Cada uno abre una hoja inferior corta (campo de texto con teclado abierto, grilla de íconos o subida de archivo) con **"Listo"**. Al cerrar, el elemento queda puesto en el frente, bien centrado y con buen tamaño.
- **Deshacer** y **Empezar de nuevo**.
- Sale la cruz de flechas. Orientación vertical, alineación e interlineado pasan a un "Más opciones" dentro de la barra flotante.

### 2.2 Menos pasos (de 4 a 3; de 2 cuando venga desde Odoo)
1. **Tu pieza** (una pantalla): grilla de productos con silueta → color → tamaño (solo si hay más de uno). Sin "tono exacto". "Acero natural" como un color más. "Traigo el mío" pasa al final.
2. **Tu diseño**: el editor de §2.1. Ejemplos para empezar con un toque: *Nombre · Nombre + fecha · Monograma · Frase alrededor*. **6 estilos de letra** (Clásica, Manuscrita, Moderna, Divertida…) + "Ver más". Técnica: láser por defecto; la impresión UV se ofrece sola al subir un logo a color.
3. **Revisá y enviá** (como hoy) + "Traigo el mío".

Desde Odoo el paso 1 ya viene resuelto (producto, color y tamaño de la variante) → el cliente cae **directo en el editor**.

### 2.3 Rendimiento: presupuesto y arreglos
**Presupuesto** (celular de gama media, 4G):
- 3D visible en **< 2,5 s** desde que se abre el editor.
- **Ninguna pausa > 50 ms al escribir.**
- Por producto: modelo `.glb` ≤ 300 KB (el vaso con manija pesa 115 KB).

**Arreglos:**
1. **Iluminación sin descargas:** reemplazar el HDR de GitHub (1,64 MB) por `RoomEnvironment` de three.js (se genera en el navegador, 0 KB). Es el cambio de mayor impacto y el más barato.
2. **Escribir sin trabas:**
   - mientras se escribe, una sola textura liviana (512×1024) solo con el color + el texto; las 4 texturas completas, una vez que el cliente deja de tipear (~250 ms);
   - reusar los mismos canvas y texturas (`needsUpdate`) en lugar de crear nuevos en cada cambio;
   - la capa de fondo (color + acabado) no se redibuja cuando solo cambia el texto.
3. **Render a demanda** (`frameloop="demand"`): dibujar solo cuando algo cambia (giro, arrastre, edición). El giro automático se detiene a los pocos segundos. Sombra calculada una vez (`frames={1}`).
4. **Fuentes a demanda:** solo la elegida; las vistas previas de los 6 estilos con un subconjunto mínimo (o una imagen).
5. Resolución de pantalla tope 1,5 en celulares; la captura para WhatsApp se hace con un render puntual, no con `preserveDrawingBuffer` permanente.

### 2.4 Conexión con Odoo (la visión final)
```
Odoo eCommerce (ficha del producto)
   └─ botón "Personalizar" ──▶ /personalizar?producto=<template_id>&color=<variante>
                                   │
                                   ▼
                      Editor (ruta propia, liviana)
                      · lee el producto de /api/catalog (ya existe)
                      · carga SOLO el .glb de esa forma (~100–300 KB)
                      · arranca en el paso "Tu diseño"
```
- **Fase 1 (simple):** botón en la ficha de Odoo que abre la landing en `/personalizar?...` (link, sin tocar el código de Odoo más que un botón/snippet).
- **Fase 2 (opcional):** el editor embebido dentro de la propia ficha de Odoo (iframe), que al terminar agrega al carrito el producto + el servicio de grabado (§6 de `Mejoras.md`, pago en Odoo).
- La ruta `/personalizar` carga solo lo necesario: three.js + el editor + el modelo de esa forma. La landing (hero, galería…) no se descarga.

---

## 3. Etapas

| Etapa | Qué incluye | Esfuerzo | Impacto |
|---|---|---|---|
| **1 · Rendimiento rápido** | Iluminación local (§2.3-1), render a demanda (§2.3-3), fuentes a demanda (§2.3-4) | 0,5–1 día | Alto: el 3D aparece antes y deja de depender de GitHub |
| **2 · Mirar / editar + "Listo"** | §2.1 completo + escritura sin trabas (§2.3-2) | 2–3 días | Muy alto: es la queja principal |
| **3 · Menos pasos** | §2.2: 3 pasos, 6 estilos, ejemplos, sin tono exacto; desktop igual que celular con el 3D grande; partir `customizer.tsx` (3.300 líneas) | 2–3 días | Alto |
| **4 · Ruta `/personalizar` + link desde Odoo** | §2.4 fase 1 | 1–2 días | Habilita la visión final |

Cada etapa se mide con los eventos que ya existen (`customizer_view` → `order_submit` → `order_created`) y con la prueba de rendimiento de §1.2 repetida.

---

## 4. Decisiones pendientes del dueño
1. ¿"Acero inoxidable" pasa a ser un color o queda como material aparte?
2. Otros materiales (cuero, madera, cristal, plástico, bolígrafos): ¿siguen en el editor bajo "Otros productos" o van directo a WhatsApp?
3. ¿Arrancamos por la etapa 1 + 2 (rendimiento + "Listo"), que es lo que más se nota?

---

## 5. Implementado — etapas 1 y 2 (2026-10-09)

### Etapa 1 · Rendimiento
- **Iluminación local** (`studio-lighting.tsx`): `RoomEnvironment` de three.js generado en el navegador. Sale el HDR de GitHub (1,64 MB) en el termo y en los objetos planos.
- **Render a demanda** (`frameloop="demand"`): el visor dibuja solo mientras algo se mueve (giro, inercia, arrastre). Quieto: **0 dibujos** (antes, 60 por segundo). El giro de vidriera dura 8 s al entrar o cambiar de producto.
- **Resolución tope 1,5×** en celulares.
- **Texturas del grabado en dos calidades** (`engraving-maps.ts`): mientras se escribe, arrastra o cambia el color, un borrador con ¼ de los píxeles y sin desenfoques; la versión completa se arma una vez, 280 ms después de la última tecla. En la versión completa, los desenfoques se limitan a la zona del diseño y los mapas de rugosidad y metal van a la mitad de resolución.
- **Tipografías a demanda**: el carrusel aplica cada fuente recién cuando el chip entra en pantalla.
- **Captura del 3D** (PNG para el resumen) en un momento ocioso, 1,2 s después del último cambio, y no cada 500 ms.

### Etapa 2 · Mirar / editar
- **Arrastrar siempre gira la pieza**, salvo que haya un diseño seleccionado.
- **Se selecciona** al crearlo (primera letra, ícono elegido, imagen subida), al **tocarlo sobre el producto** o con **"Mover o editar diseño"**. La pieza gira para mostrarlo de frente.
- **Barra de edición** debajo del visor (no lo tapa): **− / + / Centrar / Deshacer / Borrar / ✓ Listo**. Tocar fuera del diseño también termina.
- **Movimiento 1:1 con el dedo** (el visor convierte píxeles a la vuelta y la altura reales del cuerpo).
- **Deshacer** (hasta 30 pasos: arrastres, tamaño, centrar, borrar) y **"Deshacer borrado"** durante 6 s.
- Sale la cruz de flechas. Al pasar al resumen o enviar, la edición se termina sola (sin guías en la foto).
- Eventos nuevos: `design_select` (`kind`, `source`: create / tap / button), `design_done`, `design_undo`, `design_delete`.

### Medido (celular simulado: 390 px, CPU ×4, GPU por software)
| | Antes | Después |
|---|---|---|
| Transferido al abrir el personalizador | 3,6 MB | **1,3 MB** |
| Dibujos del 3D con todo quieto | continuo | **0** |
| Bloqueo por tecla al escribir un nombre | hasta 8 s | **50–250 ms** (borrador) |
| Pasada de calidad completa al dejar de escribir | en cada tecla | **una vez** |

**Pendiente de verificar en un celular real:** en el entorno de prueba (GPU emulada por software) la pasada de calidad completa todavía bloquea 1–6 s; la traza muestra que es espera de la GPU emulada, no JavaScript. En un celular con GPU real debería ser mucho menor: medirlo en uno de gama media antes de la etapa 3.
