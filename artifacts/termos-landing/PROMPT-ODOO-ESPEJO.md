# Prompt — «Comprar» con Odoo, probado en el espejo

Pensado para pegarlo en **otra máquina**, con otro Claude Code que tiene acceso
al **Odoo espejo**. Copiá todo lo que está debajo de la línea.

---

Sos el desarrollador que va a implementar y probar, **solo contra un Odoo espejo**, el botón «Comprar» del personalizador de Creativa Studio y el aviso de pago desde Odoo. Trabajás en esta máquina; no publicás nada y no tocás el Odoo de producción.

## 1. Código

- Repositorio: `https://github.com/bimarketplacepy/CreativaStudioCustomizer`
- Rama base: **`mejoras`**. Cloná o actualizá (`git fetch && git checkout mejoras && git pull`) y creá la rama de trabajo **`odoo-checkout`** desde ahí.
- Si `mejoras` no existe en el remoto, pará y avisame: falta subirla.
- Es un monorepo pnpm (Node 24):
  - `artifacts/termos-landing`: landing + personalizador (React + Vite). En producción la sirve `server.mjs`, que también levanta la API.
  - `artifacts/api-server`: API Express. Pedidos en `src/routes/orders.ts`, panel en `src/routes/admin.ts`, cliente Odoo (JSON-RPC) en `src/lib/odoo.ts`.
  - `lib/db`: Drizzle + PostgreSQL (`DATABASE_URL`). Cambios de esquema con `pnpm --filter @workspace/db run push`, **solo en una base de prueba**.
- Para levantarlo: `pnpm install`; compilar con `pnpm --filter @workspace/termos-landing --filter @workspace/api-server run build`; correr con `PORT=3000 pnpm --filter @workspace/termos-landing run start` (sirve la landing en `:3000` y levanta la API interna). En desarrollo, Vite proxya `/api` a la API (ver `artifacts/termos-landing/vite.config.ts`).
- Leé antes de escribir código:
  - `artifacts/termos-landing/PLAN-ODOO.md` (§2 a §6): caminos, reglas anti-bucle, stock.
  - `artifacts/termos-landing/src/lib/odoo-catalog.ts`, `src/lib/pricing.ts` y `src/lib/engraving-plans.ts`: cómo la landing ya lee el catálogo de Odoo y calcula el precio.
  - `artifacts/api-server/src/routes/orders.ts`: pedidos CS-XXXX y `requestId` (evita duplicados).
  - En `artifacts/termos-landing/src/components/customizer.tsx`: `orderFields`, `buildOrderMessage`, `handleOrder` y `renderDrinkSummary` («Tu orden de trabajo»).

## 2. Seguridad (antes de cualquier otra cosa)

- **Producción de Odoo:** host `marketplace.odoo.com`, base `marketplace-main-33409600`. Odoo 19 Enterprise Online.
- Agregá en `src/lib/odoo.ts` un **freno duro**: toda llamada que escriba (`create`, `write`, `unlink`, `action_*`, `get_portal_url` o cualquier método que no sea de lectura) se rechaza si el host es `marketplace.odoo.com` o la base es `marketplace-main-33409600`. Solo se habilita con una variable `ODOO_ALLOW_PRODUCTION_WRITES=si`, que **no** tenés que crear.
- Antes de escribir nada, corré un chequeo que imprima: versión de Odoo, host y nombre de la base configurados, permisos del usuario de API sobre `sale.order` y `res.partner`, y medios de pago activos. Si apunta a producción o no hay espejo configurado, **pará y avisame**.
- Usá un PostgreSQL de prueba para `DATABASE_URL`, nunca el de producción.
- No hagas push a `main`, no publiques y no cambies configuraciones de despliegue.

Datos del Odoo de producción (27/10/2026), que el espejo debería repetir:
- Usuario de API con lectura, creación y modificación de `sale.order` y `res.partner`.
- Medios de pago: Bancard y pago contra entrega.
- `sale.order` tiene `access_token`, `client_order_ref`, `amount_paid` y `state`.
- Plantillas de email editables.

Confirmá que el espejo tiene lo mismo; si algo difiere, anotalo en el informe.

## 3. Preparar el espejo (por API, idempotente)

- Crear o actualizar los servicios de grabado (`type` servicio, `sale_ok` verdadero), buscándolos por `default_code` para no duplicar:
  - `GRAB-NOMBRES` Gs. 35.000
  - `GRAB-ICONO` Gs. 40.000
  - `GRAB-LOGO` Gs. 50.000
  - `GRAB-EXTRA` Gs. 5.000 (escritura extra)

  Confirmá los montos contra `engraving-plans.ts` y `pricing.ts`; no los inventes.
- Para simular pagos: si Bancard no tiene modo de prueba en el espejo, activá el proveedor de pago de prueba de Odoo (`demo`) **solo en el espejo**.
- Dejalo en un script reutilizable `artifacts/api-server/scripts/odoo-setup.mjs` que reciba la base por parámetro. Se va a correr en producción recién cuando se apruebe.

## 4. Etapa 1 — «Comprar» desde la landing

**API:**
- Nuevo `POST /api/checkout` que recibe el pedido de diseño (lo mismo que hoy va a `/api/orders`, con `requestId`) y el cliente `{ nombre, telefono, email }`. Pasos, en este orden:
  1. Crear o reutilizar el pedido CS-XXXX de la landing (mismo `requestId`).
  2. En Odoo, volver a consultar el stock y el precio de la variante elegida. Si se agotó: 409 con un mensaje para el cliente, sin crear nada.
  3. Buscar el contacto por email o teléfono; si no existe, crearlo.
  4. **Un diseño = un pedido.** Buscar `sale.order` con `client_order_ref = CS-XXXX`:
     - **Existe y no está pagado:** reutilizarlo.
     - **Existe y está pagado:** responder «ya pagaste este pedido», con el link para verlo.
     - **No existe:** crearlo con:
       - la variante exacta del termo, cantidad 1;
       - el servicio de grabado según el plan del diseño, más `GRAB-EXTRA` por cada escritura extra;
       - `client_order_ref = CS-XXXX` y validez de 48 h;
       - en notas, la imagen del diseño y el link del taller `/admin?pedido=CS-XXXX`.
  5. Link de pago: llamar a `get_portal_url` sobre el pedido (es público y genera el `access_token`). Devolver la URL absoluta del portal y el total calculado por Odoo.
- Guardar en el pedido de la landing: id y nombre del pedido de Odoo, total y estado de pago (columnas nuevas en `lib/db`).
- Si Odoo no responde: 502 con un mensaje que ofrezca seguir por WhatsApp. El cliente nunca queda sin salida.

**Landing:**
- En «Tu orden de trabajo», botón **«Comprar»** al lado de «Enviar pedido por WhatsApp», con las clases existentes `cs-btn cs-btn-primary`.
- Aparece solo con precio confirmado: pieza de la tienda Odoo con variante elegida y grabado láser. Impresión a color, stickers y «Traigo el mío» siguen solo por WhatsApp en esta etapa.
- Al tocarlo: formulario corto (nombre, teléfono, email) con validación y mensajes claros; luego, ir al portal de pago de Odoo en la misma pestaña.
- Repetir el clic o volver atrás no crea otro pedido.
- Panel `/admin`: mostrar el pedido de Odoo y su estado (pendiente / pagado).

## 5. Etapa 2 — Aviso de pago (solo de ida)

- `POST /api/odoo/webhook?secret=…` con un secreto `ODOO_WEBHOOK_SECRET`. Si no coincide: 404.
- **No confiar en el cuerpo del aviso:** con el id recibido, volver a leer el pedido en Odoo. Marcar «Pagado» solo si `client_order_ref` empieza con `CS-` y `amount_paid` cubre el total (o el pedido está confirmado). Los demás se ignoran.
- La landing **nunca escribe en Odoo** como respuesta a un aviso, y un aviso repetido no cambia nada.
- En el espejo, crear la automatización de Odoo: al cambiar el estado o lo pagado de un pedido de venta, enviar el webhook a la URL pública de esta máquina (si no es pública, usá un túnel o simulá el aviso con `curl` y anotalo). Documentá los pasos exactos para repetirla en producción.
- Respaldo: botón «Actualizar pago» en `/admin` que consulta Odoo para ese pedido.

## 6. Pruebas (contra el espejo; resultado de cada una en el informe)

1. **Camino feliz:** diseñar un vaso de la tienda con nombre → Comprar → pedido en el espejo con dos líneas y referencia CS- → pagar con el proveedor de prueba → aviso → `/admin` muestra «Pagado».
2. **Doble clic y volver atrás:** un solo pedido en Odoo.
3. **Diseño ya pagado:** responde «ya pagaste».
4. **Variante sin stock en el espejo:** 409, sin pedido creado.
5. **Email o teléfono inválidos:** no llama a Odoo.
6. **Odoo caído** (URL inválida en la prueba): 502 y WhatsApp sigue disponible.
7. **Avisos de pago:** con secreto incorrecto, 404; repetido, sin cambios; de un pedido sin CS-, ignorado.
8. **Freno anti-producción:** con host o base de producción configurados (sin conectar de verdad, o con una prueba unitaria), la escritura se rechaza.
9. **WhatsApp igual que antes:** el pedido por WhatsApp sigue funcionando (mensaje corto + línea «Taller: …/admin?pedido=CS-XXXX»).
10. **Builds y capturas:** `pnpm run typecheck`, el build de landing y API, y `node artifacts/termos-landing/scripts/check-prod.mjs --local`, todos en verde. Capturas a 390 px y 1440 px del formulario y del panel.

## 7. Entrega

- Commits en `odoo-checkout`, con push de esa rama al mismo repositorio. Sin mergear a `main` ni a `mejoras`.
- Informe `artifacts/termos-landing/RESULTADOS-ODOO-ESPEJO.md` con:
  - qué se hizo;
  - el resultado de cada prueba;
  - capturas;
  - los pedidos y contactos de prueba creados en el espejo, para poder borrarlos;
  - las diferencias encontradas entre el espejo y producción.
- Pasos para pasar a producción, en orden:
  1. Correr el script de servicios en la base real.
  2. Crear la automatización.
  3. Cargar `ODOO_WEBHOOK_SECRET` en la publicación.
  4. Habilitar la escritura en producción de forma explícita.
  5. Hacer un pedido real de bajo monto para verificar.
- Textos en español rioplatense (vos), con el sistema visual existente (`cs-btn`, variables `--cs-*` en `src/index.css`). Sin dependencias nuevas pesadas.

## 8. Fuera de alcance

Personalizar un termo ya comprado en la tienda (camino 2), el botón «Personalizar» en la ficha de Odoo (camino 1), editar el email de confirmación y «Ver mi diseño». Van en la etapa siguiente, cuando esta funcione en el espejo.
