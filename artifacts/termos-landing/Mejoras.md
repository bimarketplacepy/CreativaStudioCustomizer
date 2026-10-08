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

## 5. Integración con el ecommerce (productos Hydrate) y modelos 3D reales

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
1. Conectar el catálogo (`/api/catalog`) mostrando productos y precios reales, todavía con los modelos 3D actuales.
2. Precio y SKU en el resumen y en WhatsApp (opción A).
3. Visor con soporte `.glb` + prueba con un primer modelo de Higgsfield.
4. Agregar al carrito del ecommerce (opción B), si la plataforma lo permite.

### Datos pendientes del negocio
1. ~~Plataforma del ecommerce~~ → **Odoo**. Falta la URL de la instancia.
2. Acceso de administrador para crear un usuario de API de solo lectura en Odoo (la API es XML-RPC/JSON-RPC: url, base de datos, usuario y API key).
3. Cierre preferido: WhatsApp o carrito de la tienda.
