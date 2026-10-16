# PLAN — Diseñar el termo desde el celular

**Fecha:** 2026-10-15 · **Origen:** dos pruebas con participantes en celulares (Android y iPhone). En PC el personalizador funciona bien y no se toca.

## Qué salió en las pruebas

| # | Problema | Causa en el código |
|---|---|---|
| 1 | Achicar o agrandar el diseño con los botones + / − es incómodo | `DesignEditBar` solo tenía botones; el visor no reconocía dos dedos |
| 2 | El botón para ir a "Diseñar" no se nota | Era igual a cualquier "Siguiente"; en el paso 2 decía "Siguiente" |
| 3 | En la vista AR la pieza se puede agrandar y achicar: pierde la idea de tamaño real | AR Quick Look (iPhone) permite escalar por defecto |
| 4 | Las opciones están abajo: después de cada cambio hay que subir a mirar el termo | En el celular el visor scrolleaba con la página y las opciones quedaban debajo |
| 5 | Diseñar resulta tosco, con demasiadas opciones | Pestaña Texto con campo, ideas IA, técnica, color, orientación, ubicación, 23 tipografías, tamaño, avanzados, texto 2 y tapa/base, todo junto |
| 6 | Elegir el material es confuso | Pastillas con scroll horizontal: "Acero con pintura recubierta" ocupaba media pantalla y Cristal/Plástico quedaban fuera de la vista |

---

## Etapa 1 — Arreglos directos ✅ (hecha)

1. **Pellizco para el tamaño** (`lib/pinch.ts`, `thermos-3d.tsx`, `object-3d.tsx`). Con un diseño seleccionado, dos dedos sobre el visor lo agrandan o lo achican. Si el primer dedo ya estaba moviendo el diseño, el pellizco corta ese arrastre, y soltar los dedos no cuenta como "toque". Cada pellizco se deshace con un solo "Deshacer". En el celular se quitaron los botones + / − (en PC siguen). La barra indica *"Arrastrá para mover · Pellizcá para el tamaño"*.
2. **"Diseñar" visible.** El paso anterior al Diseño muestra un botón más grande, con pincel y un pulso suave (tres veces; se desactiva con "reducir movimiento"). El paso 1 de termos y vasos ahora dice "Elegir color" en lugar de "Diseñar", que no correspondía.
3. **AR a tamaño real.** En iPhone el enlace de Quick Look lleva `#allowsContentScaling=0`, que impide escalar la pieza. En Android (WebXR) ya no se podía escalar.
4. **Una sola pantalla para diseñar** (`MobileDesignScreen`). El paso Diseño ocupa la pantalla completa, sin scroll de página: arriba una barra con volver, título y número de paso; debajo el producto fijo (alrededor del 40 % del alto); después las opciones, que scrollean dentro de su propio panel con las pestañas Texto · Íconos · Imagen siempre visibles; al final Atrás / Continuar. Con el teclado abierto la pantalla se adapta al área visible (`visualViewport`) y se ocultan la barra inferior y la de edición. El botón "Atrás" del celular vuelve al paso anterior en lugar de salir del sitio.
5. **Material y producto en grilla.** Los 6 materiales entran juntos en tarjetas de 3×2, cada una con ícono, nombre corto y qué productos incluye (*Acero: termos, vasos y botellas*). Los productos genéricos también van en grilla con su silueta: se ven 6 y el resto aparece con "Ver todos (N)".

**Verificado:** typecheck OK. Recorrido completo simulado a 390 px (Chromium con pantalla táctil): grilla de material → color → "Diseñar" → escribir → pellizco (el texto crece y se habilita Deshacer) → Atrás del navegador → Continuar → resumen con la captura. En escritorio no cambió nada.

**Falta probar en un celular real:** el teclado en iPhone (que el campo quede a la vista), el pellizco en Safari de iOS y que Quick Look ya no deje escalar.

---

## Etapa 1b — Ubicación libre, sin recuadro ✅ (hecha)

Pedido después de la Etapa 1: que el texto se pueda poner en cualquier lugar, sin el recuadro de una cara, pero que no se pueda diseñar sobre el logo y la marca HYDRATE ni sobre los relieves.

- **Sin recuadro ni "Ubicación: frente / dorso".** El diseño se arrastra por toda la banda grabable, entre la tapa y la base, alrededor de todo el cuerpo. Cuando se acerca al borde de lo que se ve, el termo gira solo para seguirlo. "Centrar" lo lleva al centro de la cara donde está. Se activa con `FREE_PLACEMENT` en `customizer.tsx` (en `false` vuelve el recuadro).
- **Zonas sin grabado** (`lib/keep-out.ts`). Son las únicas que frenan el diseño:
  - **Logo y marca:** las piezas `logo`, `logo_texto` (HYDRATE) y `logo_funda` de cada modelo 3D.
  - **Manija:** las piezas `handle`, `strap` y `rivets`. En los productos sin modelo 3D se deduce de la cara que no se graba.
  - **Relieves:** las piezas `label*` o `relieve*` del modelo, o zonas cargadas a mano en el producto (`keepOut` en `products.ts`).

  Las zonas se miden solas sobre el modelo 3D al cargarlo, así que un modelo nuevo solo necesita las piezas bien nombradas.
- **Al chocar:** el diseño se desliza por el borde de la zona sin atravesarla, el contorno se marca en el termo, el celular vibra una vez y debajo aparece *"Ahí está el logo de la marca: no se puede grabar encima"*. Mientras se arrastra se ven todas las zonas punteadas. Si el texto crece o se agranda contra una zona, se corre a la salida libre más cercana.
- **Texto que no entra en el alto** de la banda: se achica solo, como antes con el recuadro.
- **Archivo de producción** (`api-server/src/lib/production-svg.ts`): con ubicación libre sale la **vuelta completa (360°) desenrollada**, con el frente al centro y las zonas sin grabado rayadas en la capa de info. Si un elemento cruza la costura de atrás, avisa. El ancho se estima desde el área frontal: **AJUSTAR con π × diámetro real** cuando estén las medidas de `print-specs.ts`.
- **Envolvente 360°** sigue dando la vuelta entera y no la frenan las zonas: hay que decidir si se mantiene, porque pasa por encima del logo.

### Relieves: qué hacer con cada caso

| Tipo de relieve | Cómo se resuelve |
|---|---|
| Relieve modelado como pieza aparte en el .glb (etiqueta del Termo Mate) | Automático: nombrar la pieza `label…` o `relieve…` |
| Relieve que el modelo 3D no tiene (modelo genérico o viejo) | Cargar la zona a mano en el producto: `keepOut: [{ kind: "relief", u, halfU, v0, v1 }]` |
| Superficie con textura en todo el cuerpo (estriado, facetado) | No sirve como zona: se ofrece solo grabado sobre una franja lisa, o se consulta en el local |
| Relieve chico que el láser puede grabar alrededor | Margen de la zona (`MARGIN_U` / `MARGIN_V` en `keep-out.ts`) |

**Para confirmar con el taller:** que el rotativo del láser graba con un archivo de 360°, el diámetro real de cada pieza y si hay termos de la tienda con relieves que el modelo 3D no muestra.

## Etapa 2 — "Tu pieza" en una pantalla ✅ (hecha)

- El celular pasa de 4 pasos a 3: **Tu pieza · Diseño · Enviar** (objetos planos y bolígrafos: Tu pieza · Diseño).
- "Tu pieza" junta material → producto → tamaño → color → técnica, con la pieza chica **fija arriba** (sticky debajo del header) para ver cada color al instante.
- La **técnica** (láser / UV) se elige acá y salió de la pestaña Texto (en PC sigue en Texto).
- Sin "Tono exacto" en el celular: queda la paleta del producto.
- "Traigo el mío" es una línea con interruptor al final, seguida del resumen *Producto · tamaño · color · técnica* con el precio.
- Métrica: `design_reached { ms }` (desde que se ve el personalizador hasta tocar "Diseñar").

## Etapa 3 — Editor más simple ✅ (hecha, con un cambio)

**Cambio pedido:** la edición del texto es **libre**: el texto va en cualquier lugar de la pieza y solo lo frenan el logo, la marca HYDRATE, la manija y los relieves (Etapa 1b). Por eso no hay "Frente o dorso" en "Más opciones" ni "Lugar" en la barra: la ubicación se elige arrastrando.

- **Diseños rápidos** al entrar con la pieza vacía: *Nombre*, *Nombre + fecha*, *Frase + ícono*, *Logo* (o *Solo un ícono* donde no se pueden subir imágenes). El ejemplo queda seleccionado en el campo: lo que se escribe lo reemplaza.
- **Pestaña Texto** (celular): el campo, ideas con IA, color de tinta (solo UV) y **6 tipografías a la vista** con "Ver las 23 tipografías".
- **"Más opciones"** (hoja desde abajo): tamaño con control deslizante, orientación, disposición e interlineado, agregar / quitar el texto 2, tapa y base.
- Con texto 2, un selector *Texto 1 · Texto 2* arriba del campo; tocar un texto sobre la pieza también lo elige.
- **Barra sobre el diseño seleccionado:** *Letra* (o *Cambiar* para ícono / imagen) · Centrar · Deshacer · Borrar · Listo.
- En PC el editor no cambió. Los objetos planos (billeteras, tablas) siguen con su editor.

## Etapa 4 — Gestos y ayuda en contexto ✅ (hecha, sin giro)

- **Pellizco sin seleccionar antes:** si los dos dedos (o el punto medio) caen sobre un diseño, se selecciona y se escala en el mismo gesto (`onPinchSelect`, `claim` en `lib/pinch.ts`).
- **Vibración corta** al llegar al tamaño mínimo o máximo.
- **Pista de 3 segundos** la primera vez que se edita: *"Pellizcá para cambiar el tamaño"* sobre la pieza (`localStorage cs-pinch-hint`).
- **Girar el diseño con dos dedos: no se hizo.** Queda pendiente de que el negocio lo pida (hoy solo horizontal / vertical).

## Etapa 5 — Medir y volver a probar

- Eventos ya disponibles: `customizer_step`, `design_select`, `design_pinch` (nuevo), `design_undo`, `ar_click`/`ar_open`.
- Agregados: `design_first_text { ms }`, `customizer_leave { step, step_name, ms }` (se fue sin enviar), `design_quickstart { id }` y `design_pinch { preselected }`.
- Repetir la prueba con 5 personas (Android e iPhone), con las mismas tareas que antes: *"Hacé un termo negro con tu nombre, más grande y abajo, y miralo en tu mesa"*. Éxito: las 5 lo terminan solas, en menos de 2 minutos y sin volver a subir para ver el termo.

---

**Orden sugerido:** Etapa 1 → probar en celulares reales → Etapa 2 → Etapa 3 → nueva prueba con usuarios (Etapa 5) → Etapa 4 según lo que salga de esa prueba.
