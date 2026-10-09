# MEJORAS — Landing, personalizador y conexión con el ecommerce

**Fecha:** 2026-10-08. Complementa `AUDITORIA*.md` / `RESULTADOS*.md` (performance y móvil, ya resueltos). Este documento cubre **conversión, flujo de creación de diseños, circuito del pedido** y el plan de **integración con el ecommerce de Hydrate**.

---

## 1. Cómo funciona hoy

1. **Landing:** Hero → Demo → **Personalizador** → Posibilidades → A tu medida / Empresas → Tarifas → Galería → Footer. Solo el hero carga de entrada; el resto se carga al scrollear (`home.tsx`).
2. **Personalizador:** material → producto → color → técnica (láser / UV) → diseño (texto, ícono o logo) sobre un 3D. En celular es un wizard de 4 pasos (Producto · Estilo · Diseño · Resumen); en desktop, una sola pantalla.
3. **Pedido:** captura del 3D → `POST /api/orders` (número `CS-0001`, imagen y SVG de producción) → abre WhatsApp con el resumen. Si el backend tarda más de 8 s, WhatsApp se abre igual sin número (fallback).

---

## 2. Diagnóstico general (márgenes de mejora)

### 🔴 Alta
| # | Problema | Estado |
|---|---|---|
| 1 | El mensaje de WhatsApp no incluía tamaño, color ni material | ✅ Hecho |
| 2 | No había selector de tamaño (siempre quedaba el del medio) | ✅ Hecho |
| 3 | No se muestra ningún precio durante el armado (solo grabado en "Tarifas"; "la pieza se cotiza aparte") | 🟡 Parcial — precio estimado del grabado hecho (§3b); el precio de la pieza llega con Odoo (§5) |
| 4 | Cero medición del embudo (GTM cargado pero sin eventos) | ✅ Hecho |

### 🟠 Media
| # | Problema | Estado |
|---|---|---|
| 5 | `GET /api/orders/CS-0001` es público y los números son correlativos → se pueden recorrer y ver nombres, textos y fotos de otros clientes | ✅ Hecho |
| 6 | `POST /api/design-preview` (endpoint viejo) aceptaba 8 MB sin límite de envíos ni vencimiento en el bucket | ✅ Hecho (cerrado) |
| 7 | Se puede enviar un pedido vacío (sin texto, ícono ni logo) | ✅ Hecho |
| 8 | `/admin` es solo lectura: no se puede cambiar el estado del pedido y no muestra el tamaño | ✅ Hecho |
| 9 | El hero promete "Traé tu termo" pero el personalizador no lo ofrecía | ✅ Hecho |
| 10 | Bolígrafos: "Traigo mis bolígrafos" (Gs. 35.000) cuesta más que "Bolígrafo de la tienda" (Gs. 20.000) | ✔️ Confirmado por el negocio: es correcto, no se toca |

### 🟡 Baja
| # | Problema | Estado |
|---|---|---|
| 11 | No se puede compartir ni retomar un diseño | ✅ Hecho |
| 12 | Faltan señales de confianza junto al CTA | ✅ Hecho (sin plazos de entrega, por decisión del negocio) |
| 13 | `customizer.tsx` tiene ~3.000 líneas en un solo componente | ⏭️ Se hace junto con el rediseño de la creación (§4), que toca esas mismas piezas |
| 14 | Tutorial: medir si ayuda | ✅ Hecho (eventos). Ya no se abría solo: es manual desde "Ver cómo funciona" |
| — | `check:local` medía el chunk equivocado como "JS inicial" (0,3 KB) | ✅ Hecho (ahora lee el entry real de `index.html`: 88 KB) |
| — | El panel `/admin` usa la clave por defecto `creativa123` si no se define `INTERNAL_ACCESS_KEY` | ⚠️ Acción del dueño: definir el Secret (ver §3b) |

---

## 3. Cambios ya implementados

### Punto 1 — Mensaje de WhatsApp completo
El resumen del Paso 4 y el mensaje salen de la misma función (`orderFields()`), así que ambos quedaron actualizados:

```
Pedido: CS-0042
Producto: Termo
Tamaño: 32oz (Grande)
Material: Acero con pintura recubierta
Color: Borgoña (#6d2434)
Técnica: Grabado láser
Texto: Juan Pérez (Pacifico)
```
En bolígrafos se omite el material (repite el producto); en productos de un solo tamaño (chopera) se omite el tamaño.

### Punto 2 — Selector de tamaño
- Celular: paso "Estilo", arriba del color. Desktop: pestaña "Color", arriba de la paleta.
- 3 botones (ej. 20oz Estándar / 32oz Grande / 40oz XL); el 3D se reescala en vivo. Se oculta si el producto tiene un solo tamaño.

### Punto 4 — Analítica del embudo (`src/lib/analytics.ts`)
| Evento | Parámetros |
|---|---|
| `cta_click` | `location` (hero, hero_precios, demo, galeria) |
| `whatsapp_click` | `location` (fab, a-tu-medida, empresas, contacto…) — listener delegado único |
| `customizer_view` | — (una vez por carga) |
| `customizer_step` | `step`, `step_name` (wizard móvil) |
| `customizer_material_select` / `_product_select` / `_size_select` | ids elegidos |
| `order_submit` | producto, material, técnica, `has_text`, `has_icon`, `has_image` |
| `order_created` / `order_fallback` | número de pedido / producto |

> ⚠️ **Pendiente en GTM:** crear un activador "Evento personalizado" + una etiqueta de evento GA4 por cada uno para verlos en GA4.

### Punto 6 — Endpoint de subida cerrado
- `POST /api/design-preview` eliminado de `server.mjs` y del dev server (`vite.config.ts`). Verificado: responde **404**; `/api/healthz` sigue en 200.
- `/u/<id>.png` se sigue sirviendo (solo lectura) para no romper links ya enviados por WhatsApp.
- `check:prod` ahora verifica que el upload esté cerrado y que la API de pedidos esté viva.

> **Pendiente:** republicar en Replit y correr `pnpm run check:prod`.

### Ronda 2 — resto del diagnóstico (§3b)

**Punto 3 — Precio estimado** (`customizer.tsx`, bloque de acciones del pedido)
- Caja "Precio estimado" encima del botón de WhatsApp, y renglón `Precio estimado:` en el mensaje.
- Termos/vasos con láser: precio del plan de Tarifas deducido del diseño (solo texto Gs. 35.000 · + ícono Gs. 40.000 · + logo Gs. 50.000) + "la pieza se cotiza aparte" (o "sobre tu producto" si lo trae).
- Impresión UV: "se cotiza según el diseño". Bolígrafos: precio según de dónde sale el bolígrafo. Resto: "te pasamos el precio por WhatsApp".
- Solo se muestran montos que la landing ya publica.

**Punto 5 — Privacidad de los pedidos** (`api-server`)
- La URL de la imagen lleva un token HMAC no adivinable (`/api/orders/CS-0011/image?t=…`): sin token o con token incorrecto → 404.
- Los pedidos anteriores al cambio siguen abriendo sin token (no se rompen los links ya mandados por WhatsApp).
- `GET /api/orders/:n` (detalle completo) ahora exige la clave interna (401 sin ella). La landing no lo usaba.
- La clave interna se compara en tiempo constante, y el server avisa en el log si sigue la clave por defecto.
- **Acción del dueño:** definir en Secrets `INTERNAL_ACCESS_KEY` (clave larga) y, opcional, `ORDER_LINK_SECRET`. Ojo: cambiar cualquiera de los dos invalida los links de imagen firmados hasta ese momento.

**Punto 7 — Pedido vacío:** primer click sin texto/ícono/imagen muestra un aviso con "Seguir diseñando" / "Enviar igual".

**Punto 8 — Panel `/admin`:** selector de estado por pedido (Nueva / En proceso / Completada / Cancelada, vía `PATCH /api/admin/orders/:n`), tamaño, etiqueta "Trae su producto" y precio estimado; miniaturas con token.

**Punto 9 — "Traigo el mío":** selector "Lo compro acá / Traigo el mío" en el paso Producto (termos, vasos, etc. y bolígrafos). Cambia el precio estimado y viaja en el mensaje (`Origen: Lo trae el cliente`) y al panel.

**Punto 11 — Compartir diseño:** botón "Compartir diseño" (hoja nativa en celular; copiar link en desktop). El diseño viaja en el hash `#diseno=…`; al abrir el link, la página baja al personalizador, aplica el diseño (validando cada valor) y en celular salta al paso Diseño. El logo/foto subido no viaja (no entra en una URL): se avisa.

**Punto 12 — Confianza:** bajo el botón, "Revisamos el diseño final con vos por WhatsApp antes de producir", "Pagás recién cuando confirmás el diseño" y "Retirás en nuestro local: …".

**Bug de la subida de imagen (era §4 punto 4):** se quitó la exigencia circular de "elegir un plan con imagen"; ahora se sube directo y el plan se deduce solo.

**Eventos nuevos:** `customizer_own_product`, `order_empty_warning`, `design_link_copy`, `design_link_open`, `tutorial_open`, `tutorial_close`, `tutorial_complete`; `order_submit` suma `own_product`.

**Verificación:** typecheck de landing y api-server, build OK, `check:local` OK. Backend probado de punta a punta contra la base de desarrollo (token de imagen, 401/404, PATCH de estado, datos en el panel). Link de diseño probado ida y vuelta con acentos y emojis. Falta probar el flujo en un navegador real.

---

## 4. Creación de diseños: por qué se siente tosca y cómo mejorarla

### Causas concretas
1. **Con un diseño cargado ya no se puede girar el termo.** Con texto/ícono/imagen, arrastrar sobre el 3D *siempre* mueve el diseño, en cualquier pestaña (incluso "Color") y en cualquier parte del visor (`customizer.tsx` `activeDesignKind`, `thermos-3d.tsx` `onDown`). En celular, además, el visor deja de permitir scrollear. Es el principal generador de confusión.
2. **El diseño no sigue al dedo:** el arrastre está multiplicado ×1,7 / ×1,5 (`onDesignMove`). No hay recuadro ni manijas de selección; las guías solo aparecen mientras se arrastra.
3. **No queda claro qué se está moviendo:** con texto + ícono, lo que se mueve depende de la pestaña abierta, sin indicación visible. El d-pad mueve "lo activo" a saltos fijos.
4. ~~**Bug: subir imagen está trabado por los planes.**~~ ✅ Resuelto en la ronda 2. La pestaña "Imagen" dice *"El plan de solo nombres no incluye imagen. Elegí un plan…"*: sin imagen el plan inferido es "solo nombres", y ese plan no permite subir imagen. Es circular.
5. **Jerarquía invertida:** la técnica (láser/UV), que cambia todo, está dentro de "Texto"; el tamaño del ícono está en "Ajustes avanzados"; la imagen no tiene control de tamaño; 28 tipografías en un carrusel numerado sin agrupar.
6. **Se arranca de cero:** termo vacío, sin ejemplos de partida.
7. **No hay deshacer ni reiniciar.**
8. **Desktop:** el visor ocupa 4/12 columnas y los controles 8/12; la prioridad está invertida.

### Propuesta en etapas
**Etapa A — Interacción (1–2 días, impacto alto)**
- Girar y mover conviven: arrastrar *sobre el diseño* lo mueve; *fuera* gira. Alternativa simple: interruptor visible `[↻ Girar] [✥ Mover]`.
- Movimiento 1:1 con el dedo y recuadro de selección visible.
- Indicador "Moviendo: Texto ▾" para cambiar de elemento sin depender de la pestaña.
- ~~Destrabar la subida de imagen~~ ✅ hecho en la ronda 2.
- Deshacer / Reiniciar diseño.

**Etapa B — Simplificar el editor (2–3 días)**
- Ejemplos de partida: "Nombre", "Nombre + fecha", "Monograma", "Frase envolvente"…
- Reordenar: Técnica primero → Texto → Tipografía → Tamaño.
- Tipografías agrupadas por estilo (Manuscrita / Clásica / Moderna / Divertida) con vista previa del texto real.
- Tamaño de ícono/imagen siempre visible.
- Desktop: visor más grande (6/12 o 7/12).

**Etapa C — Opcional**
- Varios textos por pieza (nombre + fecha con distinta tipografía).
- Más íconos y categorías (fútbol, mate, mascotas, fechas).
- Vista "foto real" del diseño sobre el producto antes de enviar.

**Recomendación:** Etapa A completa + ejemplos de partida de la B.

---

## 5. Integración con el ecommerce (Odoo, productos Hydrate) y modelos 3D reales

Hoy el catálogo está escrito a mano (`products.ts`, `materials.ts`, `COLORS`) y el 3D se genera por código desde un perfil (`THREE.LatheGeometry` en `thermos-3d.tsx`), no se carga desde un archivo.

### Arquitectura
```
Ecommerce (Hydrate)  ──API──▶  api-server (existente)  ──▶  Landing / Personalizador
  productos, variantes,          GET /api/catalog              elige producto real
  precios, stock, fotos          caché 10–15 min                + diseño en 3D
                                 + ficha 3D por producto
                                        │
                                        ▼
              Pedido: WhatsApp (como hoy) o carrito del ecommerce
```

1. **Catálogo leído desde el servidor**, no desde el navegador: `/api/catalog` en el `api-server`, con caché. Las credenciales no se exponen, la landing sigue rápida y, si el ecommerce se cae, se usa el último catálogo guardado.
2. **Cada producto se vincula con una ficha 3D** (por SKU o etiqueta):

   | Producto del ecommerce | Modelo 3D | Zona grabable | Técnicas |
   |---|---|---|---|
   | Termo Hydrate Mate 1L | `termo-mate.glb` | frente del cuerpo | láser, UV |
   | Vaso Hydrate 20oz | `vaso-20.glb` | cuerpo completo | láser, UV |

3. **Las variantes reemplazan lo hecho a mano:** colores y tamaños reales con stock (desaparece la paleta inventada y el selector de tono libre). **Precio real: pieza + grabado** en el resumen (resuelve el punto 3).
4. **Cierre del pedido:**
   - **A. WhatsApp con datos completos** (lo más rápido): suma SKU, precio de la pieza, grabado y total.
   - **B. Carrito del ecommerce:** agrega el termo + el servicio de grabado al carrito real, con el número de diseño (`CS-0042`) adjunto. Es lo que más convierte; depende de que la plataforma lo permita (Shopify y WooCommerce sí; otras, varía).

### Requisitos para los modelos de Higgsfield
El sistema de grabado ubica el diseño con coordenadas sobre el cuerpo (u alrededor, v en altura); de ahí salen la vista 3D **y** el SVG de producción. Cada `.glb` necesita:
- **Cuerpo separado** de la tapa y la manija (solo el cuerpo recibe el grabado).
- **UV cilíndrico en el cuerpo**: la textura debe envolverlo de forma pareja. Los modelos generados por IA suelen traer UVs desordenados: probablemente haya que rehacerlos en Blender.
- **Escala real**, modelo centrado y parado derecho.
- **1–3 MB** comprimido con Draco (se carga en celulares).
- **Material base neutro**: el color lo aplica el código según la variante.

Del lado del código: el visor debe aceptar `.glb` además del perfil actual, para migrar producto por producto sin romper nada.

### Plan
1. ✅ Conectar el catálogo (`/api/catalog`) con productos, colores, tamaños, precios y stock reales, todavía con los modelos 3D actuales.
2. ✅ Precio y SKU en el resumen y en WhatsApp (opción A).
3. Visor con soporte `.glb` + prueba con un primer modelo de Higgsfield.
4. Pago del servicio en Odoo (ver §6, al final de la hoja de ruta).

### 5b. Conexión con Odoo — implementada (2026-10-08)

**Estado:** el código está listo y probado contra un Odoo simulado (misma API que Odoo 17). **Se activa sola** al cargar los Secrets; mientras no estén, la landing funciona exactamente como antes (catálogo propio).

**Qué hace**
- `GET /api/catalog` (api-server, `src/lib/catalog.ts` + `src/lib/odoo.ts`): lee de Odoo las plantillas **publicadas** en el ecommerce y vendibles, sus variantes, colores, tamaños, precio público y stock. Caché de 10 min; si Odoo falla, sirve la última copia buena (y si nunca la tuvo, la landing usa su catálogo propio).
- Usa la API externa estándar de Odoo (JSON-RPC): funciona en Odoo Online, Odoo.sh y servidor propio, v14–v18, sin módulos extra. Pide solo los campos que existen en la instancia (cambian entre versiones).
- **Personalizador** (cuando Odoo tiene un producto para el material + producto elegidos):
  - **Colores reales** de las variantes (con su color hex de Odoo). Desaparecen la paleta inventada y el "Tono exacto". Los colores sin stock se ven tachados y no se pueden elegir; con ≤ 3 unidades muestra "Quedan N".
  - **Tamaños reales** (si el producto tiene atributo de tamaño). El 3D usa el perfil de capacidad más cercana ("20 oz" → vaso 20oz).
  - **Modelo:** si hay varios productos de Odoo del mismo tipo (ej. dos termos distintos), aparece un selector.
  - **Precio real:** pieza + grabado = total (ej. "Gs. 224.000 — Termo Hydrate Mate 1L Gs. 189.000 + grabado Gs. 35.000"). Con "Traigo el mío", solo el grabado.
  - El resumen, el mensaje de WhatsApp y el pedido llevan el **nombre real, el código (SKU) y la variante**; el `designState` guarda `odooTemplateId`, `odooVariantId`, `sku` y `piecePrice` (base para el pago en Odoo).
  - El link "Compartir diseño" también guarda la variante elegida.
- **Tarifas** muestra los precios de grabado de Odoo si existen los servicios (ver abajo).

**Verificado:** typecheck y build; API contra el Odoo simulado (clasificación, publicados vs. no publicados, stock, servicios), casos de error (sin configurar, clave inválida, Odoo caído → nunca rompe); y la página real en Chromium sin pantalla, en desktop y en celular (colores, tamaños, sin stock, precio total, resumen con SKU, y el modo sin Odoo intacto). Sin errores de consola.

#### Guía de configuración (para el dueño)
1. **Usuario de API en Odoo:** crear un usuario interno (ej. `api-landing`) con permisos de **solo lectura** de Ventas/Inventario. Con ese usuario: *Preferencias → Seguridad de la cuenta → Nueva API key*.
2. **Secrets en Replit** (los lee el api-server):
   | Secret | Ejemplo |
   |---|---|
   | `ODOO_URL` | `https://tuempresa.odoo.com` |
   | `ODOO_DB` | nombre de la base (en Odoo Online suele ser el subdominio) |
   | `ODOO_USER` | login del usuario de API |
   | `ODOO_API_KEY` | la API key generada |
   | `ODOO_CURRENCY_LABEL` | opcional, por defecto `Gs.` |
3. **Colores:** en Odoo, el atributo de color debe ser de tipo de visualización **"Color"** y cada valor tener su color cargado. Si falta, la landing usa un tono aproximado por el nombre ("Negro", "Celeste"…).
4. **Tamaños:** atributo con nombre que contenga "Tamaño", "Capacidad", "Medida" o "Volumen", con valores tipo `20 oz`, `500 ml`, `1.2 L`.
5. **Clasificación de productos:** por el **nombre** del producto. Tipo: guampa, hoppie, chopera, jug/bidón, copa, vaso/tumbler, termo, botella. Material: "inox/inoxidable" → acero inoxidable; "cuero/forrado" → cuero; "cristal/vidrio" → cristal; si no, acero pintado. Los productos que no encajan (ej. bombillas) se omiten y se listan en el log del api-server ("productos de Odoo sin perfil 3D") para ajustar las reglas (`TYPE_RULES` / `MATERIAL_RULES` en `catalog.ts`).
6. **Precios de grabado desde Odoo (opcional):** crear productos de tipo **Servicio** con referencia interna `GRAB-NOMBRES`, `GRAB-ICONO` y `GRAB-LOGO`. Si no existen, se usan los precios de `engraving-plans.ts`.
7. **Probar:** abrir `/api/catalog` en la web publicada: `"source": "odoo"` y la lista de productos. Si `stale: true` y la lista vacía, revisar el log del api-server (credenciales o URL).

**Limitaciones conocidas**
- El precio es el **precio público** del producto (+ extra de la variante); si la tienda usa listas de precios especiales, no se aplican todavía.
- La imagen del producto apunta a `/web/image/...` de Odoo (pública para productos publicados); hoy no se muestra en la landing, queda disponible para el próximo paso.
- Los productos sin modelo 3D en la landing (jug, botella) se clasifican pero no aparecen en el personalizador hasta sumarlos a `materials.ts`.

### 5c. Conexión real con Odoo — probada (2026-10-08)

Probado con `pnpm --filter @workspace/api-server run odoo:check -- hydrate` (diagnóstico **solo lectura**, no crea ni modifica nada en Odoo).

**Resultado: la conexión funciona.**
- Odoo **19.0 Enterprise** (Odoo Online), login OK, permiso de lectura OK.
- Campos de esta versión: `is_published`, `free_qty` (stock), `is_storable`. El código ya los soporta.
- **Bug encontrado y corregido:** el Secret `ODOO_URL` tenía `/odoo` al final (la URL del panel en v17+). La API vive en la raíz, así que Odoo respondía 400 "invalid CSRF token". Ahora el api-server usa solo el origen del dominio, aunque el Secret traiga una ruta. Igual conviene dejar el Secret como `https://marketplace.odoo.com`.

**Hallazgos que cambiaron la sincronización (✅ ya implementado, ver "Sincronización adaptada" abajo):**
1. **El catálogo es el de todo Marketplace:** 257.614 plantillas, **2.346 publicadas y vendibles**, de todas las marcas. Clasificar por nombre ("vaso", "termo") mezclaría marcas → hay que **filtrar por marca**.
2. **La marca está en un campo de Studio:** `x_studio_marca` (texto, ej. `"HYDRATE"`), además de `x_studio_codigo_marca` (`"943"`). El filtro debe ser `x_studio_marca = HYDRATE` (no el nombre).
3. **Solo 8 productos tienen "hydrate" en el nombre y 1 está publicado** ("Hydrate 530ml Amarillo Sol"). Falta ver cuántos hay por el campo de marca y si se muestran también los no publicados.
4. **Cada color es un producto aparte**, no una variante: "Hydrate 530ml Amarillo Sol" tiene 1 sola variante, y el color está en el nombre. La sincronización tiene que **agrupar** las plantillas por modelo ("Hydrate 530ml") y tomar cada una como un color.
5. **La categoría interna describe tipo y material:** `HIDRATACION / HOPPIE / DOBLE PARED INOX / HYDRATE`. Es mejor fuente para el perfil 3D (HOPPIE) y el material que el nombre.
6. Existen atributos `color`, `size`, `brand`, etc. (estilo Google Shopping); falta ver si estos productos los tienen cargados (sirven para el hex del color).
7. Odoo 19 marca la API JSON-RPC como **obsoleta** (sigue funcionando; su reemplazo es la API "JSON-2"). Migrar cuando Odoo anuncie la fecha de retiro.

**Sincronización adaptada (decisión del dueño: solo Hydrate, solo con stock):**
- Filtro por marca: `x_studio_marca` = `HYDRATE` (sin distinguir mayúsculas), **publicados o no**.
- **Solo con stock:** stock controlado y unidades libres (`free_qty`) > 0. Lo demás se excluye.
- **Agrupación por modelo:** cada producto-color entra como un color del mismo modelo. Color: atributo `color` de Odoo (con su hex) o, si falta, el final del nombre ("Amarillo Sol"); capacidad: atributo `size` o el nombre ("530ml", "1L"). Ej.: "Hydrate 530ml Amarillo Sol" + "Hydrate 1L Negro" → modelo **"Hoppie Hydrate"** con colores y capacidades.
- **Perfil 3D desde la categoría interna** (`… / HOPPIE / …`), con el nombre como respaldo. Material: cuero / cristal por nombre o categoría; **inox solo si el color es acero natural** ("Inox", "Plateado"…). "DOBLE PARED INOX" en la categoría describe la construcción, no el acabado.
- Configurable sin tocar código (Secrets opcionales): `ODOO_BRAND` (por defecto `HYDRATE`; varias separadas por coma), `ODOO_BRAND_FIELD` (por defecto `x_studio_marca`), `ODOO_ONLY_PUBLISHED=true` para exigir publicados.
- **Vista previa con los datos reales:** `pnpm --filter @workspace/api-server run odoo:check -- catalogo` corre la misma sincronización que `/api/catalog` (solo lectura) y lista modelos, colores, capacidades, precios, stock y lo que quedó sin perfil 3D.
- Verificado contra un Odoo 19 simulado con la forma real del catálogo (otra marca mezclada, un color sin stock, un accesorio sin perfil, un modelo inox, URL con `/odoo`).

**Ajustes con los datos reales (956 productos Hydrate, 516 con stock):**
- Nombres sin marca y con el color primero ("530ml Negro"), paleta propia de Hydrate (Aqua, Avena, Cherry, Lima, Jade, Peach Fuzz, Choco Mousse), "Café" como línea y no color, puntuación y mayúsculas inconsistentes ("Rojo." / "ROJO" / "Azul Pacifico*"), capacidades sin unidad ("V2 PRO series 770", "Litro").
- **Ediciones de clubes incluidas como modelos propios** (decisión del dueño): "Termo Mate · Cerro Porteño", "Termo · Olimpia", "Termo 2 en 1 · Albirroja"… con sus colores; "Edición 1/2" va en el color ("Azul · Ed. 2") y las ediciones con nombre de la Albirroja son el color ("Fan Stripes", "Legends", "Lion").
- **Excluidos:** packs (+), kits, bolsos/mochilas y accesorios (tapas, straps, botas/gomas, fundas). Guampas y copas se mantienen aunque Odoo las tenga bajo "ACCESORIOS DE TERMOS".
- **Agrupación por modelo + club + material, tipo por mayoría:** Odoo tiene algunos modelos en dos categorías (ej. "Termo 473ml" en Hoppie y en Vasos); antes quedaban partidos en dos.
- Cristal solo por nombre (el Whisky Lowball de acero también está en una categoría de cristalería).
- Quedan sin modelo 3D (no se muestran): Food Flask, Growler, jarras, bowls, ice bucket, conservadoras — candidatos para la etapa de modelos 3D reales.

 → **Odoo**. Falta la URL de la instancia y las credenciales (guía de arriba).
2. ~~Cierre preferido~~ → por ahora WhatsApp; el pago en Odoo queda para el final (§6).

---

## 6. Hoja de ruta acordada (2026-10-08)

| # | Etapa | Estado |
|---|---|---|
| 0 | Diagnóstico: arreglos de impacto directo, riesgos y fricción (§2–§3) | ✅ Hecho |
| 1 | **Conectar Odoo:** precios, stock y **colores reales** (fin de la paleta inventada) | ✅ **Encendido** (2026-10-09, pedido del dueño: `ODOO_CATALOG_ENABLED = true`). El cliente elige el **producto real de la tienda, con su foto** (catálogo agrupado en Termos / Botellas / Vasos / Guampas y copas). Modelos 3D exactos: "Vaso con Pico y Agarre" → `forma-vaso-manija.glb` y "Hoppie" → `forma-botella.glb`; el resto usa la forma genérica de su tipo (con aviso "vista 3D aproximada"). **Ediciones de clubes excluidas** por ahora. El catálogo se agrupa **por marca** (campo `brand` de `/api/catalog`, sale de `x_studio_marca`): hoy **Hydrate** (Odoo) + **Genéricos** (formas propias sin producto de Odoo detrás, se cotizan: Vaso → `forma-vaso.glb`, Botella, Termo, Chopera, Guampa). Para sumar **Stanley**: Secret `ODOO_BRAND=HYDRATE,STANLEY` (aparece sola como otra pestaña) y revisar la clasificación de sus modelos. Las fotos se sirven desde `/api/catalog/image/:id` (Odoo solo publica las de productos publicados). Chopera, copa y botella siguen con el catálogo propio (Odoo no tiene esos productos con stock) |
| 2 | **Creación de termos rápida, fácil e intuitiva** (§4: Etapa A + B), reorganizando `customizer.tsx` | ⏭️ Próxima |
| 3 | **Modelos 3D reales** (Higgsfield → `.glb`, requisitos en §5) | Depende de los modelos del dueño |
| 4 | **Visor AR** del termo diseñado (`<model-viewer>`: Android Scene Viewer / iPhone Quick Look, con el diseño aplicado) | Después de 3 (funciona con el 3D actual, luce con los reales) |
| 5 | **Pagar el servicio en Odoo:** el server crea un pedido de venta (variante + servicio de grabado + número de diseño) y el cliente paga con el link del portal de Odoo. Funciona en Odoo Online; requiere un medio de pago online configurado en Odoo (Bancard/Pagopar en Paraguay necesitan módulo de terceros) | Al final |
| 6 | **Combos:** varias piezas (ej. termo + guampa) en un solo pedido; descuento opcional definido en Odoo (Promociones) | Al final, junto con 5 |

> Nota de arquitectura: aunque los combos van al final, la reorganización del personalizador de la etapa 2 debe dejar el estado preparado para **varias piezas**, para no rehacerla dos veces.
