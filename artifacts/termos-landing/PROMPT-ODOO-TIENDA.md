# La landing dentro de Odoo: personalizar desde la tienda y cobrar sin sorpresas

**Para:** quien implemente que el personalizador viva dentro de la tienda Odoo de Marketplace.
**Fecha:** 2026-11-09 · Se apoya en `PLAN-ODOO.md` (caminos, reglas anti-bucle, stock) y en `PROMPT-ODOO-PRUEBAS.md` (botón «Comprar», base de pruebas, freno anti-producción). Este documento **no los reemplaza**: les agrega la tienda como puerta de entrada y, sobre todo, las reglas de cobro.

El final del documento (desde la línea `---`) es un **prompt para pegar en otro Claude Code** con acceso a la base de pruebas de Odoo.

---

## 0. La idea en una frase

El cliente está en la ficha de un termo en la tienda Odoo, toca **«Personalizar»**, diseña **sin salir de la tienda** (el personalizador se abre encima de la ficha) y **paga recién cuando el diseño está verificado como producible**. Si el diseño necesita que lo mire una persona, primero lo aprueba el taller y el cliente acepta una prueba visual: **nunca se cobra un diseño que no se puede hacer ni uno que no es lo que el cliente vio**.

## 1. Lo crucial: nunca cobrar un diseño imposible o distinto

### 1.1 Qué puede salir mal (y hay que evitar a toda costa)

| Riesgo | Ejemplo | Cómo se evita |
|---|---|---|
| Diseño imposible de producir | Impresión a color en un termo con manija; logo encima de la manija o del logo de la marca; diseño más grande que la pieza | **Veredicto de factibilidad** calculado en el servidor (§1.2). Un diseño `IMPOSIBLE` nunca llega a un botón de pago |
| Resultado distinto a lo que vio | Logo pixelado (pocos dpi); 3D aproximado (forma genérica); color de pantalla ≠ pintura real; arte de artista provisorio | Diseños con riesgo van a **revisión con prueba visual** (§1.3): el cliente acepta la prueba antes de pagar |
| Precio distinto al anunciado | El cliente manipula el precio en el navegador; cambió el precio en Odoo | El precio **lo calcula el servidor con Odoo**, nunca el navegador. La landing muestra un estimado; manda Odoo |
| Pieza agotada al pagar | Dos clientes, una unidad | Stock reconsultado al crear el pedido (`PLAN-ODOO.md` §4) |
| Pagar dos veces el mismo diseño | Doble clic, volver atrás | Un diseño = un pedido (`client_order_ref = CS-XXXX`, `PLAN-ODOO.md` §3) |
| Cambiar el diseño después de pagar | Sube otro logo tras pagar | Lo que se produce es la **versión aprobada**; cambios posteriores siguen `PLAN-ODOO.md` §5 |

### 1.2 Veredicto de factibilidad (servidor, antes de cualquier cobro)

El api-server recalcula **todo** a partir de `designState` (nunca confía en lo que dice el navegador) y devuelve uno de tres veredictos, con sus motivos:

- **`OK` — se puede cobrar ya.** Todo esto se cumple:
  - Pieza de la tienda con variante exacta y stock, o pieza genérica con precio cargado.
  - Técnica permitida para esa pieza según `print-specs.ts` (la Dacen solo cilíndricas sin manija; ver `DACEN.md`).
  - Modelo 3D **exacto** (`exactFor`) para esa pieza y tamaño: lo que vio es la forma real.
  - Textos e íconos dentro de la zona grabable y fuera de las zonas sin grabado (`keep-out.ts`: logo, manija, escudo, relieves).
  - Sin imágenes subidas, **o** imágenes con resolución `ideal` u `ok` (`wrap-design.ts`, `dpiVerdict`).
  - Diseño de artista sobre **la pieza para la que se probó** y con su archivo definitivo (no `provisional`).
- **`REVISION` — se cobra después de aprobar una prueba.** Cualquiera de estos:
  - Logo o foto subida (siempre: el recorte, el contraste y la limpieza los mira una persona).
  - Resolución `warn`, 3D aproximado (forma genérica o «vista aproximada»), diseño de artista `provisional`, impresión a color con cobertura 360°.
  - Texto con caracteres raros o muy chico para la técnica.
- **`IMPOSIBLE` — no se ofrece pagar.** Cualquiera de estos:
  - Técnica no permitida para la pieza (color en una pieza con manija sin diseño de artista aprobado para ella).
  - Diseño sobre la manija o fuera de la pieza.
  - Resolución `bad`.
  - Variante inexistente o agotada.
  - Diseño de artista sobre otra pieza.

  El cliente ve el motivo en lenguaje claro y cómo arreglarlo («Mové el logo a la izquierda», «Subí una imagen más grande», «Elegí un vaso sin manija para imprimir a color») y siempre tiene WhatsApp.

Las reglas viven en **un solo lugar compartido** por landing y api-server (paquete `lib/print-specs`, ya previsto en `PLAN-ODOO.md` §7). El editor usa las mismas reglas para avisar mientras se diseña; el servidor las vuelve a aplicar al comprar.

### 1.3 Prueba visual y aceptación (diseños en `REVISION`)

Odoo ya trae el flujo justo para esto: el **presupuesto con firma y pago en línea** del portal.

1. El cliente toca «Comprar» → se crea el **presupuesto** en Odoo (no confirmado, sin cobrar), con estado de diseño «En revisión».
2. El taller abre `/admin?pedido=CS-XXXX`, revisa y genera la **prueba**:
   - captura del 3D (frente y costados);
   - el desarrollo plano a medida real en mm (el archivo de producción);
   - colores elegidos y la nota «el color impreso puede variar levemente respecto de la pantalla».
3. El taller adjunta la prueba al presupuesto y lo **envía** desde Odoo. El cliente recibe el link del portal: ve la prueba, **firma** («Acepto que mi pieza se produzca así») y **paga** en el mismo paso (`require_signature` + `require_payment` en el presupuesto).
4. Si el taller encuentra un problema, no envía el presupuesto: le escribe al cliente (WhatsApp o email) con la corrección propuesta. Nunca se cobra antes de esta aceptación.

Para los `OK` no hace falta la revisión: el presupuesto se crea con la prueba automática (el mismo render) y va directo a firma + pago.

### 1.4 Qué se cobra (líneas del pedido de venta)

| Línea | Producto en Odoo | Origen del precio |
|---|---|---|
| Pieza | Variante exacta de la tienda | Lista de precios de Odoo |
| Grabado láser | `GRAB-NOMBRES` / `GRAB-ICONO` / `GRAB-LOGO` + `GRAB-EXTRA` por escritura extra | Servicios de Odoo (`engraving-plans.ts` como respaldo) |
| Impresión a color | `IMP-COLOR-CHICO` / `IMP-COLOR-FRENTE` / `IMP-COLOR-360` | Servicios de Odoo (`pricing.ts` → `dacen.tiers`, hoy `null`: se cotiza) |
| Diseño de artista | `DISENO-ARTISTA-<id>` (ej. `DISENO-ARTISTA-AOPY-NAVIDAD-TAZA`), Gs. 12.500 | Servicio de Odoo; `artist-designs.ts` como respaldo |

- **Si una línea no tiene precio en Odoo** (hoy: impresión a color), el diseño **no puede ser `OK`**: va a `REVISION` y el taller completa el precio en el presupuesto antes de enviarlo. El cliente nunca paga un monto que no vio.
- **Artistas:** cada copia vendida y **pagada** genera Gs. 10.000 para el artista (`artistFee` en `designState.artistDesign`). Liquidación mensual con un reporte desde `/admin` (pedidos pagados agrupados por artista). En Odoo, la línea `DISENO-ARTISTA-*` permite sacar el mismo reporte por producto.

## 2. Cómo vive el personalizador dentro de Odoo

Odoo de Marketplace es **Odoo 19 Online**: no admite módulos propios en Python. Sí permite, desde el editor del sitio web, **bloques de HTML/JS** («Código incrustado») y **código propio en el `<head>`** del sitio. Con eso alcanza.

### 2.1 Recomendado: el personalizador encima de la ficha (iframe en un panel)

```
Ficha del termo (tienda Odoo)
  └─ botón «Personalizar» (lo agrega el script del sitio)
       └─ abre un panel a pantalla completa con un iframe:
          https://creativastudio.marketplace.com.py/?embed=odoo&product=<product.product id>
            └─ el cliente diseña (pieza, color y tamaño bloqueados)
                 └─ «Comprar» → el servidor crea el presupuesto y responde con el link del portal
                      └─ el iframe le avisa a la ficha (postMessage) y la ficha navega al portal de pago (misma pestaña)
```

- **El botón** solo aparece en productos que se personalizan: el script del sitio consulta `GET /api/catalog/customizable?product=<id>` (o una lista cacheada de ids) y, si no corresponde, no muestra nada.
- **Modo `embed=odoo` en la landing:**
  - sin encabezado, pie, WhatsApp flotante ni el resto de las secciones: solo el personalizador;
  - la pieza llega bloqueada (la del producto de la ficha); el cliente elige solo el diseño;
  - «Recomendados» (diseños de artistas) se muestra como una pestaña del personalizador, filtrada a los diseños aprobados **para esa pieza**.
- **Comunicación iframe ↔ ficha:** solo `postMessage` con **origen verificado** en los dos lados:
  - la landing únicamente acepta y envía mensajes a `https://marketplace.odoo.com` y al dominio de la tienda;
  - la ficha únicamente acepta mensajes de `https://creativastudio.marketplace.com.py`.

  Mensajes: `cs:ready`, `cs:close`, `cs:checkout { portalUrl }`, `cs:resize`. La ficha **solo navega a URLs del portal de su propio dominio** (valida el prefijo `/my/orders/`); nunca a una URL arbitraria que llegue por mensaje.
- **Encabezados del servidor de la landing** (`server.mjs`), solo en el modo `embed=odoo`:
  - `Content-Security-Policy: frame-ancestors https://marketplace.odoo.com https://<dominio de la tienda>`;
  - sin `X-Frame-Options: DENY`.

  El resto de la landing sigue sin poder incrustarse en otros sitios.
- **Celular:** el panel ocupa toda la pantalla; el botón «volver» del navegador cierra el panel (con `history.pushState` al abrir).
- **Si el iframe no carga** (bloqueo del navegador, red), el botón abre la landing en la misma pestaña con `?odoo=<id>&volver=<url de la ficha>`. Es el camino 1 de `PLAN-ODOO.md` §6, que sigue funcionando igual.

### 2.2 Por qué no por el carrito de Odoo

Odoo permite atributos con valor libre (para guardar «Diseño CS-0042» en una línea del carrito), pero el carrito vive en el navegador del cliente:

- puede borrar la línea del servicio de grabado y quedarse con la pieza;
- puede cambiar la cantidad o la variante;
- puede pagar un diseño que nunca pasó por el veredicto de factibilidad.

Por eso se mantiene la **Regla 2** de `PLAN-ODOO.md`: el termo personalizado va directo a un **presupuesto armado por el servidor**, que no se puede editar desde el portal. Un termo **sin** personalizar sigue por el carrito normal de la tienda.

### 2.3 Qué hace cada sistema (sin cambios respecto de `PLAN-ODOO.md` §3)

| | Odoo | Landing (embebida o no) |
|---|---|---|
| Producto, precio, stock | Fuente | Lee |
| Diseño y su veredicto | Guarda CS-XXXX, la prueba y la firma | Fuente |
| Presupuesto, firma y pago | Lo cobra | Pide crearlo, una sola vez |
| Aviso «pagado» | Lo envía (una vía) | Lo recibe y marca CS-XXXX pagado |

---

# Prompt — Personalizar dentro de la tienda Odoo y cobrar solo diseños aprobados

Pensado para pegarlo en **otra máquina**, con un Claude Code que tiene acceso a la **base de pruebas de Odoo**. Copiá todo lo que está debajo de esta línea.

Sos el desarrollador que va a hacer que el personalizador de Creativa Studio viva dentro de la tienda Odoo de Marketplace y que el cobro sea seguro: **ningún cliente paga un diseño imposible de producir ni distinto de lo que vio**. Trabajás **solo contra la base de pruebas de Odoo**: no publicás nada y no tocás producción.

## 1. Antes de empezar

- **Repositorio y entorno:** los mismos de `artifacts/termos-landing/PROMPT-ODOO-PRUEBAS.md` §1. Rama base `mejoras`; trabajá en la rama nueva **`odoo-tienda`**. Si existe `odoo-checkout` con el «Comprar» ya hecho, partí de ahí y decilo en el informe.
- **Seguridad:** aplicá **todo** el §2 de `PROMPT-ODOO-PRUEBAS.md`:
  - el freno duro anti-escritura en producción (host `marketplace.odoo.com` / base `marketplace-main-33409600`);
  - el chequeo previo de la base;
  - un PostgreSQL de prueba.

  Si el freno no existe todavía, es lo primero que hacés.
- **Leé, en este orden:**
  1. `artifacts/termos-landing/PROMPT-ODOO-TIENDA.md` (este documento, §0 a §2).
  2. `artifacts/termos-landing/PLAN-ODOO.md` §2 a §6.
  3. `artifacts/termos-landing/src/lib/print-specs.ts`, `src/lib/machines.ts`, `src/lib/keep-out.ts` y `src/lib/wrap-design.ts` (`dpiVerdict`, `artworkDistortion`): las reglas de qué se puede producir.
  4. `artifacts/termos-landing/src/lib/artist-designs.ts`: diseños de artistas, atados a una pieza; `provisional` = sin archivo definitivo.
  5. `artifacts/termos-landing/src/components/customizer.tsx`: `orderPayload` (qué viaja en `designState`), `estimate`, `canColor` / `canWrap`, `approxNote`.
  6. `artifacts/api-server/src/routes/orders.ts`: pedidos CS-XXXX y `requestId`.

## 2. Reglas compartidas de factibilidad

- **Paquete compartido:** mové a `lib/print-specs` (paquete del monorepo usado por landing y api-server) lo necesario para decidir la factibilidad:
  - `PRINT_SPECS`, `fitsDacen` y `machineFor`;
  - las zonas sin grabado;
  - los umbrales de dpi;
  - la lista de piezas con modelo exacto (`exactFor`);
  - los diseños de artistas (id, pieza, `provisional`, precio, `artistFee`).

  La landing pasa a importar de ahí, sin cambiar su comportamiento visible.
- **La función:** `feasibility(designState) → { verdict: "OK" | "REVISION" | "IMPOSIBLE", reasons: { code, message }[] }`, con exactamente las reglas de `PROMPT-ODOO-TIENDA.md` §1.2. Los mensajes van en español, dirigidos al cliente, y cada uno dice cómo arreglarlo.
- **Pruebas unitarias**, una por regla:
  - color en una pieza con manija → `IMPOSIBLE`;
  - el diseño de AOPY en su taza → `REVISION` mientras sea `provisional`; `OK` cuando no lo sea;
  - el diseño de AOPY en otra pieza → `IMPOSIBLE`;
  - logo subido → `REVISION`;
  - dpi `bad` → `IMPOSIBLE`;
  - texto en zona libre de una pieza con modelo exacto y precio → `OK`.
- **En el editor:** el resumen muestra el veredicto antes de «Comprar». Con `OK`, «Comprar y pagar». Con `REVISION`, «Enviar a revisión» y el texto «Te mandamos una prueba para aprobar antes de pagar». Con `IMPOSIBLE`, sin botón de compra: los motivos, cada uno con su arreglo, y WhatsApp.

## 3. API

- **`POST /api/checkout`:** el del §4 de `PROMPT-ODOO-PRUEBAS.md`, con estos cambios:
  1. Antes de tocar Odoo, correr `feasibility` **en el servidor** sobre el `designState` recibido. Con `IMPOSIBLE`: 422 con los motivos, sin crear nada en Odoo.
  2. Recalcular el precio en el servidor:
     - variante y servicios desde Odoo;
     - la línea `DISENO-ARTISTA-<id>` si hay diseño de artista;
     - si falta el precio de alguna línea (hoy, la impresión a color), el veredicto pasa a `REVISION`.
  3. Crear o reutilizar el **presupuesto** (un diseño = un pedido, `client_order_ref = CS-XXXX`), con `require_signature` y `require_payment` activos y validez de 48 h. Adjuntar la prueba automática: la captura del 3D (`previewImage`) y, si existe, el desarrollo plano (`productionImage`).
  4. **Con `OK`:** devolver `{ verdict: "OK", portalUrl }` (de `get_portal_url`). **Con `REVISION`:** dejar el presupuesto sin enviar, guardar el estado «En revisión» en el pedido de la landing y devolver `{ verdict: "REVISION" }`. La landing muestra «Te avisamos por WhatsApp/email cuando el taller apruebe la prueba».
- **`POST /api/admin/orders/:cs/approve`** (panel del taller, con la autenticación existente de `/admin`):
  - adjunta la prueba que subió o confirmó el taller;
  - permite completar precios faltantes **solo** en líneas de servicio;
  - envía el presupuesto desde Odoo (plantilla de email del presupuesto);
  - guarda quién aprobó y cuándo.
- **`POST /api/admin/orders/:cs/reject`:** deja el presupuesto cancelado en Odoo con el motivo, y el pedido de la landing en «Requiere cambios».
- **Webhook de pago:** el del §5 de `PROMPT-ODOO-PRUEBAS.md`, con una condición más para marcar «Pagado»: el presupuesto tiene que estar **firmado** (`signature` presente) además de cubierto por `amount_paid`. Un pago sin firma queda en «Pago sin aceptación: revisar» en `/admin`, y no se produce.
- **Inmutabilidad:** al aprobar o pagar, guardar una copia congelada del `designState` como «versión aprobada» (hash SHA-256 en las notas del presupuesto). El taller produce **esa** versión. Cambios posteriores siguen `PLAN-ODOO.md` §5.
- **`GET /api/catalog/customizable?product=<id>`:** responde si ese producto de Odoo se personaliza (tiene perfil 3D y técnica posible) y con qué pieza de la landing. Cacheado, sin datos sensibles.

## 4. Landing embebida (`?embed=odoo`)

- **Modo `embed=odoo&product=<product.product id>`:**
  - renderiza solo el personalizador, sin hero, secciones, pie ni botón flotante de WhatsApp (WhatsApp queda como enlace dentro del resumen);
  - la pieza, el color y el tamaño quedan bloqueados según el producto;
  - si el producto no se personaliza o está agotado, un mensaje claro y `cs:close`.
- **«Recomendados»** dentro del personalizador: pestaña con los diseños de artistas aprobados para esa pieza (`artist-designs.ts`). «Copiar diseño» aplica el diseño como hoy en la landing.
- **`postMessage` con lista de orígenes permitidos (constante)**, en los dos sentidos. Mensajes: `cs:ready`, `cs:resize { height }`, `cs:close`, `cs:checkout { portalUrl }`. Ignorar todo mensaje de otro origen o con otra forma.
- **`server.mjs`:** solo con `embed=odoo`, `Content-Security-Policy: frame-ancestors` con los dominios de la tienda. En el resto de las rutas, la política actual (sin incrustar). Probalo con `curl -I`.

## 5. Script del sitio Odoo (código propio del sitio web)

- Escribí `artifacts/termos-landing/odoo/personalizar.js`: JavaScript sin dependencias, pensado para pegar en **Sitio web → Configuración → Código personalizado del `<head>`** (o un bloque de código incrustado en la plantilla de la ficha).
- **Qué hace:**
  - en las fichas de producto (`/shop/...`), lee el id de la variante elegida;
  - consulta `/api/catalog/customizable` y, si corresponde, agrega el botón «Personalizar» debajo de «Agregar al carrito», con estilo de la tienda;
  - al tocarlo, abre el panel con el iframe. Al recibir `cs:checkout`, valida que la URL sea del portal de su propio dominio (`/my/orders/<id>?access_token=...`) y navega ahí;
  - si cambia la variante (color/tamaño) en la ficha, el botón usa la nueva.
- **Respaldo:** si el iframe no avisa `cs:ready` en 8 s, navegá a `https://creativastudio.marketplace.com.py/?odoo=<id>&volver=<url de la ficha>`.
- **Accesibilidad:** el panel es un `dialog` modal con foco atrapado; Esc y el botón «Atrás» lo cierran.
- **Instalación paso a paso** en `artifacts/termos-landing/odoo/INSTALAR.md`, con capturas de la base de pruebas. **No lo instales en producción.**

## 6. Panel del taller (`/admin`)

- **Pedidos «En revisión»** arriba, con:
  - el veredicto y sus motivos;
  - la prueba automática;
  - los botones «Aprobar y enviar presupuesto» y «Pedir cambios».
- **Diseños de artistas:**
  - muestra el diseño y el artista;
  - si el diseño es `provisional`, el aviso «falta el archivo plano del artista: no producir hasta tenerlo».
- **Reporte «Liquidación de artistas»:** pedidos **pagados** del mes con diseño de artista, agrupados por artista, con la cantidad de copias y `artistFee` total (Gs. 10.000 por copia). Exportable a CSV.

## 7. Pruebas (contra la base de pruebas; resultado de cada una en el informe)

1. **`OK` de punta a punta:** desde la ficha de un vaso de prueba → «Personalizar» → nombre grabado → «Comprar y pagar». Presupuesto con pieza + servicio y `client_order_ref` → portal con prueba → firmar → pagar con el proveedor de prueba → aviso → «Pagado».
2. **`REVISION`:** logo subido → «Enviar a revisión». Presupuesto sin enviar y sin link de pago. Aprobar desde `/admin` → llega el email → firmar y pagar → «Pagado».
3. **`IMPOSIBLE`:**
   - impresión a color forzada en un termo con manija (manipulando el `designState` en la petición) → 422, nada en Odoo;
   - el diseño de AOPY con `materialProductId` de otra pieza → 422.
4. **Precio manipulado:** mandar `piecePrice` o `estimate` falsos → el presupuesto usa los precios de Odoo.
5. **Pago sin firma:** simular el aviso con `amount_paid` completo y sin firma → «Pago sin aceptación: revisar», no «Pagado».
6. **Diseño cambiado después de aprobar:** el taller ve la versión aprobada (mismo hash) y el cambio queda como versión nueva sin aprobar.
7. **Doble clic / volver atrás:** un solo presupuesto.
8. **iframe:**
   - abre y cierra en 390 px y 1440 px;
   - `postMessage` desde otro origen se ignora;
   - un `cs:checkout` con URL de otro dominio no navega;
   - la landing fuera de `embed=odoo` no se deja incrustar (`frame-ancestors`).
9. **Respaldo sin iframe:** con el iframe bloqueado, el botón lleva a la landing con `?odoo=` y el camino sigue.
10. **Artistas:** dos copias pagadas del diseño de AOPY → el reporte muestra 2 copias y Gs. 20.000 para AOPY. Una copia no pagada no suma.
11. **Builds:** `pnpm run typecheck`, los builds de landing y API y `node artifacts/termos-landing/scripts/check-prod.mjs --local`, en verde.

## 8. Entrega

- Commits en `odoo-tienda`, push de esa rama. Sin mergear a `main` ni a `mejoras`.
- Informe `artifacts/termos-landing/RESULTADOS-ODOO-TIENDA.md` con:
  - qué se hizo y el resultado de cada prueba;
  - capturas;
  - presupuestos y contactos de prueba creados (para borrarlos);
  - diferencias entre la base de pruebas y producción.
- **Lista para pasar a producción**, en orden. **No la ejecutes:**
  1. Crear en Odoo los servicios `IMP-COLOR-*` y `DISENO-ARTISTA-*` con su precio (script idempotente, como `odoo-setup.mjs`).
  2. Activar firma y pago en línea en los presupuestos.
  3. Pegar `personalizar.js` en el sitio.
  4. Crear la automatización del aviso de pago.
  5. Habilitar la escritura en producción de forma explícita.
  6. Hacer un pedido real de bajo monto de cada veredicto (`OK` y `REVISION`).
- Textos en español rioplatense (vos), con el sistema visual existente (`cs-btn`, variables `--cs-*`). Sin dependencias nuevas pesadas.

## 9. Fuera de alcance

- Cobrar por adelantado y devolver si el diseño falla: **no se hace**. Se cobra solo lo aprobado.
- Pagos parciales o señas.
- Que el artista suba sus diseños solo (por ahora los carga el equipo en `artist-designs.ts`).
- Editar el diseño después de pagar (sigue `PLAN-ODOO.md` §5).
