# Resultados — «Comprar» con Odoo, probado en la base de pruebas

**Fecha:** 2026-10-28 · **Rama:** `odoo-checkout` (desde `mejoras`) · **Base de pruebas:** `marketplace-staging-kless-260919-40228160` en `marketplace-staging-kless-260919-40228160.dev.odoo.com` (Odoo 19.0+e, Odoo.sh, base neutralizada). Producción (`marketplace.odoo.com` / `marketplace-main-33409600`) **no se tocó**.

## 1. Qué se hizo

**API (`artifacts/api-server`)**

| Archivo | Qué hace |
|---|---|
| `src/lib/odoo.ts` | **Freno duro anti-producción**: toda llamada que no sea de lectura (`create`, `write`, `unlink`, `action_*`, `get_portal_url`, …) se rechaza antes de autenticar si el host es `marketplace.odoo.com` o la base es `marketplace-main-33409600`. Solo lo habilita `ODOO_ALLOW_PRODUCTION_WRITES=si`. Lecturas siempre pasan. |
| `src/lib/phone-py.ts` | `normalizePhonePy` (→ `+5959XXXXXXXX`), `normalizeEmail`, `phoneSearchPattern` (los 9 dígitos con `%` entre medio: encuentra «0982 555-444» aunque esté guardado con espacios y guiones). Pruebas unitarias en `phone-py.test.ts`. |
| `src/lib/odoo-checkout.ts` | Flujo de Odoo: stock y precio de la variante → contacto (email primero, después teléfono normalizado, el más reciente no archivado, nunca fusiona ni modifica) → **un diseño = un pedido** por `client_order_ref` → link del portal con `get_portal_url`. El pedido se crea con la variante exacta (cantidad 1), el servicio `GRAB-*` del plan, `GRAB-EXTRA` × escrituras extra, validez 48 h, `require_payment` (sin esto el portal no muestra «Pagar»), imagen del diseño y link del taller en las notas. |
| `src/routes/checkout.ts` | `POST /api/checkout`: valida teléfono y email **antes** de llamar a Odoo (400 con `field`), crea o reutiliza el pedido CS-XXXX (mismo `requestId`), 409 si se agotó (nada creado en Odoo), 200 con `odoo.paid=true` y «Ya pagaste este pedido» si ya está pagado, 502 con `whatsapp=true` si Odoo no responde o no está configurado. Guarda id, nombre, total y estado de pago en la base de la landing. |
| `src/routes/odoo-webhook.ts` | `POST /api/odoo/webhook?secret=…`: 404 si el secreto no coincide; no confía en el cuerpo, relee el pedido en Odoo; marca «pagado» solo si `client_order_ref` empieza con `CS-` y `amount_paid` cubre el total (o el pedido está confirmado). Idempotente; nunca escribe en Odoo. |
| `src/routes/orders.ts` | La creación del pedido CS-XXXX se extrajo a `createOrReuseOrder` (la usan `/api/orders` y `/api/checkout`). WhatsApp sigue igual. |
| `src/routes/admin.ts` | El listado incluye el pedido de Odoo y su estado; etiqueta «Odoo S00138 · Pagado / Pendiente de pago · Gs. …» y botón **«Actualizar pago»** (`POST /api/admin/orders/:n/odoo-refresh`, solo lectura en Odoo). |
| `scripts/odoo-preflight.mjs` | Chequeo de solo lectura del §2: versión, host/base, si es producción, permisos sobre `sale.order` / `res.partner`, campos clave, medios de pago, plantillas de email. |
| `scripts/odoo-setup.mjs` | Idempotente. Crea o corrige `GRAB-NOMBRES` 35.000 · `GRAB-ICONO` 40.000 · `GRAB-LOGO` 50.000 · `GRAB-EXTRA` 5.000 (montos de `engraving-plans.ts` y `pricing.ts`; IVA copiado de un producto publicado). Con `--demo` instala y publica el proveedor de pago Demo (se niega en producción). Recibe la base por `--url/--db/--user/--key` o `ODOO_*`. |

**Base (`lib/db`)**: columnas nuevas en `orders`: `odoo_order_id`, `odoo_order_name`, `odoo_total`, `odoo_payment_state`, `odoo_payment_at`.

**API spec (`lib/api-spec/openapi.yaml`)**: `POST /checkout` con `CheckoutRequest` / `CheckoutResult` / `CheckoutErrorResponse`; clientes regenerados con orval.

**Landing (`artifacts/termos-landing`)**

- `src/components/customizer.tsx`: botón **«Comprar»** (`cs-btn cs-btn-primary`) al lado de «Enviar pedido por WhatsApp», solo con precio confirmado (pieza de la tienda con variante en stock + grabado láser). `handleBuy` captura el diseño, llama a `/api/checkout` y va al portal de pago **en la misma pestaña**. El `requestId` es estable por diseño y se guarda en `sessionStorage` con una huella del diseño: repetir el clic o **volver atrás desde el pago reutiliza el mismo pedido**; cambiar el diseño genera otro.
- `src/components/checkout-dialog.tsx`: formulario corto (nombre, celular, email) con validación en el navegador (mismas reglas que el servidor), mensajes claros, «Seguir por WhatsApp» cuando Odoo no responde y «Ver mi pedido» cuando ya está pagado.
- `src/lib/phone-py.ts`: copia del normalizador para validar antes de llamar.

## 2. Resultado de cada prueba

| # | Prueba | Resultado | Evidencia |
|---|---|---|---|
| 1 | Camino feliz | ✅ `CS-0001` → `S00138`, 2 líneas (`[108121] Hydrate 530ml Amarillo Sol` 175.000 + `GRAB-NOMBRES` 35.000), IVA 10 % incluido, total 210.000, validez 30/10, compañía Marketplace S.A. Pago con Demo («Exitoso») → Odoo confirmó el pedido (`state=sale`, `amount_paid=210000`). Aviso → `/admin` muestra «Odoo S00138 · Pagado · Gs. 210.000». | `docs/odoo-pruebas/portal-4-demo.png`, `portal-5-despues-pago.png`, `cap-1440-admin.png` |
| 2 | Doble clic y volver atrás | ✅ Mismo `requestId` → mismo `CS-0001` y mismo `S00138`; `search_count` por referencia = 1. En el navegador: Comprar → portal (pedido 147) → atrás → Comprar → portal del **mismo pedido 147**. | script `ui7.mjs` |
| 3 | Diseño ya pagado | ✅ Reenviar el diseño de `CS-0001` responde 200 con «Ya pagaste este pedido. Podés verlo en el link.», `paid=true` y el link del portal. | respuesta JSON |
| 4 | Variante sin stock | ✅ Variante `104635` (stock 0) → 409 «Ese color se agotó mientras diseñabas…», `soldOut=true`, **0 pedidos en Odoo** con esa referencia. | respuesta JSON |
| 5 | Email o teléfono inválidos | ✅ «021 123 456» → 400 `field=telefono` en 21 ms; «sin-arroba» → 400 `field=email` en 12 ms. Sin llamada a Odoo. En el navegador se ven los dos mensajes bajo cada campo. | `cap-1440-formulario-errores.png` |
| 5b | Contacto existente | ✅ Contacto cargado como «0982 555-444» con otro email; comprar con `+595982555444` reutiliza ese contacto (no crea otro: 9349 → 9349 contactos) y anota el email nuevo en el pedido. Comprar con `OTRO.EMAIL@EXAMPLE.COM` reutiliza el contacto de `otro.email@example.com`. **Hallazgo:** el `ilike` con los 9 dígitos seguidos no encontraba «0982 555-444»; se cambió a un patrón con comodines entre dígitos + cruce exacto en la API. | scripts `test-checkout.mjs`, `test-5b.mjs` |
| 6 | Odoo caído | ✅ Con `ODOO_URL=http://127.0.0.1:9`: `/api/checkout` → 502 «No pudimos conectar con la tienda. Podés enviar el pedido por WhatsApp…», `whatsapp=true`; `/api/orders` sigue respondiendo 201. | respuesta JSON |
| 7 | Avisos de pago | ✅ Secreto incorrecto → 404. Pedido pendiente → `state=pendiente`, no marca pagado. Repetido → `changed=false`. Pedido sin `CS-` → `state=ignorado`. Tras el pago real → `changed=true, state=pagado`; repetido → `changed=false`. | respuestas JSON |
| 8 | Freno anti-producción | ✅ 6 pruebas unitarias (`odoo-guard.test.ts`): host o base de producción rechazan `create/write/unlink/action_confirm/get_portal_url/message_post`, las lecturas pasan, solo `ODOO_ALLOW_PRODUCTION_WRITES=si` habilita (ni `true` ni `SI`), `OdooClient.call` corta antes de tocar la red. `odoo-setup.mjs` también se niega contra producción. | `node --test` |
| 9 | WhatsApp igual que antes | ✅ `POST /api/orders` → 201 `CS-0005`; el botón «Enviar pedido por WhatsApp» sigue al lado de «Comprar» (y solo, cuando no hay precio confirmado). `buildOrderMessage` no se tocó: sigue la línea «Taller: …/admin?pedido=CS-XXXX». | `cap-1440-resumen-comprar.png` |
| 10 | Builds y capturas | ✅ `pnpm run typecheck`, build de landing y API, `check-prod.mjs --local` («Todo OK»). 11 pruebas unitarias en verde. Capturas a 390 y 1440 px abajo. | `docs/odoo-pruebas/` |

Además: `POST /api/admin/orders/CS-0001/odoo-refresh` («Actualizar pago») devuelve `pagado`; sin clave → 401; pedido por WhatsApp sin Odoo → 409 con mensaje.

## 3. Capturas (`artifacts/termos-landing/docs/odoo-pruebas/`)

| 1440 px | 390 px |
|---|---|
| `cap-1440-resumen-comprar.png` — resumen con «Comprar» + WhatsApp | `cap-390-resumen-comprar.png` |
| `cap-1440-formulario.png` — formulario | `cap-390-formulario.png` |
| `cap-1440-formulario-errores.png` — validación | |
| `cap-1440-portal-odoo.png` — portal de Odoo tras «Ir a pagar» | |
| `cap-1440-admin.png` — panel con «Odoo S00138 · Pagado» | `cap-390-admin.png` |
| `portal-4-demo.png` — modal de pago con Demo · `portal-5-despues-pago.png` — «Tu pago ha sido procesado» | |

## 4. Datos de prueba creados en la base de pruebas (para borrar)

**Pedidos de venta** (`origin = Creativa Studio`, `client_order_ref = CS-*`): `S00138` (CS-0001, **pagado con Demo**, confirmado), `S00139`…`S00147` (CS-0003/4/6/9/10/11/12/13/14, presupuestos, 210.000 o 385.000). El pagado tiene la transacción Demo #17.

**Contactos:** 34788 «Prueba Creativa», 34789 «Contacto Previo Prueba», 34790 «Contacto Previo Teléfono», 34791 «Prueba Tel» (archivado). Todos con emails `@example.com`.

**Configuración que queda** (sirve para seguir probando): servicios `GRAB-*` (plantillas 1330735–1330738), proveedor Demo (id 6) instalado, en modo test y publicado, automatización `Creativa Studio: aviso de pago` (base.automation 67 + acción servidor 1217) **inactiva**.

Base local: contenedor Docker `creativa-pg` (Postgres en :5544, base `creativa_test`) con los pedidos CS-0001…CS-0014.

## 5. Diferencias entre la base de pruebas y producción (27/10)

| Dato | Producción (según el prompt) | Base de pruebas | Efecto |
|---|---|---|---|
| Usuario de API | lectura/creación/modificación de `sale.order` y `res.partner` | `mateom@marketplace.com.py` (uid 6) tiene **también `unlink`** y acceso a dos compañías (DAS S.A. por defecto, Marketplace S.A.) | El pedido se crea explícitamente en la compañía 1 (`ODOO_SALE_COMPANY_ID`, sitio web 1). En producción conviene un usuario sin `unlink`. |
| `res.partner.mobile` | el prompt lo daba por posible | **no existe en 19** (solo `phone`) | La búsqueda por teléfono usa `phone`. |
| Medios de pago | Bancard y pago contra entrega | Bancard **deshabilitado** (dos registros), Wire Transfer en test, Cash on Delivery deshabilitado; **Demo** instalado por este trabajo | En producción se paga con Bancard; el flujo del portal es el mismo. |
| `sale.order` | `access_token`, `client_order_ref`, `amount_paid`, `state` | iguales (+ `validity_date`, `note`, `website_id`, `transaction_ids`) | — |
| Plantillas de email | editables | «Sales: Order Confirmation», «Payment Done», «Send Quotation», … presentes; la base está **neutralizada** (no manda correos) | Las pruebas no verifican correos. |
| Productos | 956 Hydrate, 516 con stock | el catálogo de la landing ve 20 modelos; por nombre «hydrate» solo **1 variante con stock** (`108121`) | Las pruebas de API usaron esa variante. |
| Automatizaciones | — | ninguna sobre `sale.order` antes de este trabajo | Se creó una, inactiva. |

## 6. Cosas a saber

- **Aviso de pago real no probado de punta a punta**: esta máquina no tiene URL pública (sin túnel instalado). El webhook se probó con `curl` con el mismo cuerpo que manda Odoo (`{_model, _id, _action, …campos}`, verificado en `odoo/addons/base/models/ir_actions.py:1048`). La automatización quedó creada **inactiva** apuntando a `https://creativastudio.marketplace.com.py/api/odoo/webhook?secret=CAMBIAR-EN-PRODUCCION`.
- **Fuera de Replit**, `@replit/object-storage` deja una promesa rechazada sin manejar al arrancar (`new Client()` busca el sidecar en 127.0.0.1:1106) y Node 24 aborta el build de la landing y el server. No se tocó ese código; en esta máquina se corrió todo con `NODE_OPTIONS=--unhandled-rejections=warn`. En Replit no pasa.
- En Windows hubo que instalar a mano (solo en `node_modules`, nada versionado) los binarios `@esbuild/win32-x64`, `@rollup/rollup-win32-x64-msvc`, `lightningcss-win32-x64-msvc` y `@tailwindcss/oxide-win32-x64-msvc`, porque `pnpm-workspace.yaml` los excluye a propósito para el deploy en Linux. `drizzle-kit push` con el `drizzle.config.ts` falla en Windows por la ruta; se corrió con `--schema ./src/schema/index.ts --url …`.
- «Comprar» no exige texto ni ícono (a diferencia de WhatsApp, que avisa si el diseño está vacío). Si se quiere el mismo aviso, es un cambio chico en `handleBuy`.
- El precio mostrado en la landing (Gs. 385.000) coincidió con el total de Odoo porque los precios de lista ya incluyen IVA; si una lista de precios o promoción difiere, manda Odoo (PLAN-ODOO §6).

## 7. Pasos para pasar a producción, en orden

1. **Servicios de grabado en la base real:** `node artifacts/api-server/scripts/odoo-setup.mjs --url https://marketplace.odoo.com --db marketplace-main-33409600 --user <api> --key <key>` (sin `--demo`). Necesita `ODOO_ALLOW_PRODUCTION_WRITES=si` en esa corrida; probar antes con `--dry`.
2. **Automatización en producción** (Ajustes → Técnico → Automatizaciones, o por API como en staging): modelo *Pedido de venta*, disparador *Al crear y editar*, campos disparadores `state` y `transaction_ids`, dominio `[("client_order_ref", "=like", "CS-%")]`; acción *Enviar webhook* a `https://creativastudio.marketplace.com.py/api/odoo/webhook?secret=<ODOO_WEBHOOK_SECRET>` con los campos `name, state, client_order_ref, amount_total, amount_paid`. Activarla.
3. **Secrets en la publicación:** `ODOO_WEBHOOK_SECRET` (el mismo de la URL), `ODOO_SALE_COMPANY_ID=1`, `ODOO_SALE_WEBSITE_ID=1` (confirmar ids en producción con `scripts/odoo-preflight.mjs`), y el usuario de API con permiso de crear pedidos y contactos.
4. **Habilitar la escritura en producción de forma explícita:** `ODOO_ALLOW_PRODUCTION_WRITES=si` en la publicación. Hasta entonces «Comprar» responde 502 y ofrece WhatsApp.
5. **Pedido real de bajo monto** con Bancard para verificar: pedido en Odoo con 2 líneas y referencia CS-, pago, aviso recibido, `/admin` en «Pagado».
6. Después: `pnpm --filter @workspace/db run push` en la base de la publicación (columnas `odoo_*`).

## 8. Fuera de alcance (sin cambios)

Camino 2 (personalizar un termo ya comprado), botón «Personalizar» en la ficha de Odoo (camino 1), email de confirmación y «Ver mi diseño».
