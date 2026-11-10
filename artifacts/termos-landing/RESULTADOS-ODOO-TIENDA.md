# Resultados — Creativa dentro de la tienda Odoo (motor)

**Fecha:** 2026-11-10 · **Rama:** `odoo-tienda`, creada desde `odoo-checkout` con `mejoras` mergeada adentro (clubes, diseños de artistas, `PROMPT-ODOO-TIENDA.md`) · **Base de pruebas prevista:** `staging_261109` de Odoo.sh.

> **Estado:** el motor está programado y probado **sin Odoo** (pruebas unitarias, builds y CSP). Las pruebas contra `staging_261109` (1 a 10 y las del módulo) **todavía no se corrieron**: las credenciales de staging (`ODOO_URL_STAGIGN`, `ODOO_DB_STAGIGN`, `ODOO_API_KEY_STAGIGN`) se cargaron con la sesión ya abierta y esta sesión todavía no las ve. Los `ODOO_*` cargados son de **producción** y no se usaron.

## 1. Qué se hizo

### Factibilidad compartida — paquete `lib/print-specs` (`@workspace/print-specs`)
- Se movieron ahí `print-specs.ts`, `machines.ts` (con `orderMachine` y `MACHINE_LABELS`, que el api-server tenía duplicados: se borró su copia) y `artist-designs.ts`. Los umbrales de dpi (`dpiVerdict`) pasaron a `dpi.ts`; `wrap-design.ts` los reexporta.
- `pieces.generated.ts`: lo que el servidor necesita de cada pieza sin cargar el 3D (modelo exacto `exactFor`, caras grabables, tamaños). Sale de `products.ts` con `pnpm --filter @workspace/print-specs run gen`; una prueba falla si quedó desactualizado.
- `feasibility(designState, ctx) → { verdict, reasons }` con las reglas de §1.2. Mensajes en español (vos), cada uno con su arreglo. El contexto lo pone quien llama (pieza de la tienda según Odoo, líneas sin precio), nunca el navegador.
- **Límite conocido:** los `.glb` están comprimidos con Draco, así que el servidor no mide los logos y escudos de cada modelo. Controla las zonas sin grabado **por cara** (la cara de la manija, del logo o del escudo no está en `engraveFaces`) y la banda grabable. Los bordes finos de cada logo los sigue frenando el editor (`keep-out.ts`).

### API
- `POST /api/checkout`:
  1. Calcula el veredicto en el servidor, con la variante, el stock y los precios leídos de Odoo (solo lectura). Con `IMPOSIBLE` responde **422** con los motivos y no crea nada, ni en Odoo ni en la base.
  2. Arma las líneas con los precios de Odoo: pieza, `GRAB-*`, `IMP-COLOR-*` y `DISENO-ARTISTA-<ID>`. Un servicio que falta o vale 0 queda como nota «a cotizar» y el veredicto pasa a `REVISION`.
  3. Crea el presupuesto con `require_signature: true`, `require_payment: true`, validez de 48 h y `client_order_ref = CS-XXXX`, con la captura del 3D adjunta (`ir.attachment`).
  4. Con `OK` devuelve `portalUrl` **relativa** (`/my/orders/<id>?access_token=…`) y deja la huella de la versión en la nota del presupuesto. Con `REVISION` el presupuesto queda sin enviar y el pedido pasa a «En revisión».
- `POST /api/admin/orders/:cs/approve` y `/reject`:
  - **approve:** completa precios faltantes solo en servicios (nunca en la pieza), adjunta la prueba del taller, sella el hash, envía el presupuesto con la plantilla de Odoo y registra quién aprobó y cuándo.
  - **reject:** cancela el presupuesto con el motivo y deja el pedido en «Requiere cambios».
- **Webhook:** marca «pagado» solo con pago cubierto **y** firma (`signed_on`). Un pago sin firma queda en `pago_sin_firma`, que el panel muestra como «Pago sin aceptación: revisar».
- **Inmutabilidad:** se guarda el SHA-256 del `designState` (claves ordenadas) al aprobar o al pagar. El panel avisa si el diseño cambió después de aprobarse.
- `GET /api/admin/artists/settlement?month=YYYY-MM[&format=csv]`: pedidos **pagados** del mes, agrupados por artista. El honorario sale del catálogo, no del navegador.
- Base: columnas nuevas en `orders` (`verdict`, `verdict_reasons`, `review_state`, `review_note`, `approved_hash`, `approved_at`, `approved_by`).

### Panel `/admin`
- Los pedidos en revisión y los pagos sin firma aparecen arriba, con el veredicto, los motivos y los botones «Aprobar y enviar presupuesto» y «Pedir cambios».
- Avisos de «diseño de artista provisorio: no producir hasta tener el archivo» y de «versión nueva sin aprobar».
- Pestaña «Liquidación de artistas» con descarga en CSV.

### Landing
- **Veredicto en el resumen:** «Comprar y pagar» (OK); «Enviar a revisión» con el texto «Te mandamos una prueba para aprobar antes de pagar» (REVISION); sin botón de compra, con los motivos y WhatsApp (IMPOSIBLE).
- **Pieza fija desde la tienda:** `?odoo=<id>&volver=<ficha>` (respaldo sin iframe, PLAN-ODOO §6 pieza 2, que no existía) y `?embed=odoo&product=<id>`. Pieza, edición, color y tamaño quedan fijos desde la variante de Odoo. Si el producto no se personaliza o está agotado, se muestra un mensaje y, embebido, se manda `cs:close`. «Volver a la tienda» solo apunta a un origen de la tienda.
- **Embebido:** solo el personalizador, sin hero, secciones, pie, tutorial ni WhatsApp flotante. Mensajes `cs:ready`, `cs:resize { height }`, `cs:close` y `cs:checkout { portalUrl }`, enviados y aceptados solo con los orígenes de `CS_SHOP_ORIGINS`.
- **«Recomendados»** dentro del personalizador, filtrado a los diseños aprobados para la pieza. Los diseños de artistas siguen **apagados** (`ARTIST_DESIGNS_ENABLED = false`) hasta la prueba 10.
- **`server.mjs`:** `Content-Security-Policy: frame-ancestors <CS_SHOP_ORIGINS>` solo con `embed=odoo`; en el resto, `frame-ancestors 'none'`. En modo embebido inyecta `<meta name="cs-shop-origins">`.

### Scripts (`artifacts/api-server/scripts`)
- `odoo-setup.mjs` suma `IMP-COLOR-CHICO`, `IMP-COLOR-FRENTE` e `IMP-COLOR-360`, que se crean en 0 porque se cotizan y el script no pisa un precio que cargue el taller, y `DISENO-ARTISTA-<ID>` con el precio del catálogo.
- `odoo-personalizables.mjs`: sin flags solo informa; con `--aplicar` escribe, siempre con el freno anti-producción. Marca `cs_personalizable` con la misma función que arma `/api/catalog` y desmarca lo que dejó de estar.

## 2. Pruebas

| # | Prueba | Resultado |
|---|---|---|
| — | Unitarias de factibilidad (una por regla, más casos de borde) | ✅ 20/20 (`node --test lib/print-specs/src/*.test.ts`), más 3 de consistencia de piezas |
| — | Unitarias existentes del api-server (freno, teléfonos) | ✅ 11/11 |
| 1 | `OK` de punta a punta (ficha → nombre → firmar → pagar → «Pagado») | ⏳ pendiente: staging |
| 2 | `REVISION` (logo → revisión → aprobar → email → firmar y pagar) | ⏳ pendiente: staging |
| 3 | `IMPOSIBLE` (color en termo con manija; AOPY en otra pieza) → 422 | ✅ en unitarias · ⏳ el 422 contra staging |
| 4 | Precio manipulado | ✅ por construcción: el servidor no lee `piecePrice` ni `estimate` · ⏳ verificar en staging |
| 5 | Pago sin firma → «Pago sin aceptación» | ⏳ pendiente: staging |
| 6 | Diseño cambiado después de aprobar (mismo hash) | ⏳ pendiente: staging |
| 7 | Doble clic / volver atrás → un solo presupuesto | ⏳ pendiente: staging (usa el `requestId` de `odoo-checkout`) |
| 8 | iframe: `frame-ancestors` | ✅ `curl -I`: `/` y `?odoo=` → `'none'`; `?embed=odoo` → solo los orígenes https de `CS_SHOP_ORIGINS` (un `http://` y una ruta se descartaron); el `<meta>` aparece solo embebido · ⏳ 390/1440 px y `postMessage` con el módulo |
| 9 | Respaldo sin iframe con el botón del módulo | ⏳ pendiente: módulo instalado |
| 10 | Liquidación: 2 copias pagadas de AOPY → 2 y Gs. 20.000 | ⏳ pendiente: staging (encender `ARTIST_DESIGNS_ENABLED`) |
| 11 | Typecheck, builds de landing y API, `check-prod --local` | ✅ typecheck y builds · ❌ `check-prod`: `vaso-guarani-print.png` pesa 162 KB (límite 150 KB). Es un archivo del 29/10, anterior a este trabajo |
| + | Botón en la ficha con `cs_personalizable` | ⏳ pendiente: módulo |
| + | Pago firmado → aviso del módulo → «Pagado»; sin firma → no se confirma | ⏳ pendiente: módulo |

**Sin verificar visualmente:** el modo embebido, la tarjeta de pieza fija y los botones por veredicto compilan y entran en el build, pero no se miraron en un navegador.

## 3. Datos de prueba creados

- **Odoo:** ninguno todavía.
- **Postgres:** base `creativa_test` en el servidor de desarrollo (no es `heliumdb`), con el esquema nuevo, vacía. Se borra con `drop database creativa_test`.

## 4. Para correr las pruebas de staging

1. Que esta sesión vea las credenciales de staging (reiniciar la sesión o el Repl después de cargar los Secrets). Falta además el **login** del usuario de API de staging (`ODOO_USER_STAGIGN`, si no es el mismo de producción).
2. `ODOO_WEBHOOK_SECRET` igual a `website_creativa_studio.webhook_secret` del build, y `CS_SHOP_ORIGINS=https://marketplace-staging-261109-<n>.dev.odoo.com`.
3. El módulo instalado en el build, con `engine_url` apuntando a una URL pública del motor (la del preview de Replit sirve para probar).
4. Se corren con las variables de staging mapeadas solo en el proceso de prueba (`ODOO_URL=$ODOO_URL_STAGIGN …`) y `DATABASE_URL` → `creativa_test`.

## 5. Lista para pasar a producción (no ejecutada)

1. **Base de la publicación, antes de publicar:** `pnpm --filter @workspace/db run push`. Agrega las columnas `odoo_*` (de `odoo-checkout`, que hoy tampoco están en la base de desarrollo) y las de veredicto y revisión. Sin ellas fallan también los pedidos por WhatsApp.
2. **Servicios:** `node scripts/odoo-setup.mjs` crea `IMP-COLOR-*`, que quedan en 0 hasta que el taller les ponga precio, y `DISENO-ARTISTA-AOPY-NAVIDAD-TAZA` a Gs. 12.500.
3. **Módulo:** instalar `website_creativa_studio`, cargar `webhook_secret` (= `ODOO_WEBHOOK_SECRET`) y correr `node scripts/odoo-personalizables.mjs` (informe) y después con `--aplicar`.
4. **Incrustación:** `CS_SHOP_ORIGINS` con el dominio de producción de la tienda.
5. **Escritura en producción:** habilitarla de forma explícita (`ODOO_ALLOW_PRODUCTION_WRITES=si`).
6. **Prueba real:** un pedido de bajo monto de cada veredicto (`OK` y `REVISION`).

## 6. Diferencias y decisiones

- **Artistas:** `artist-designs.ts` ya existía en `mejoras`. Se movió al paquete compartido en lugar de crear uno nuevo.
- **AOPY:** el diseño `AOPY-NAVIDAD-TAZA` va sobre la taza enlozada genérica, que no es un producto de la tienda. Puede ser `OK` solo si la pieza genérica tiene precio (`genericPrice`). Hoy el servidor no tiene ese precio, así que el diseño va a `REVISION` y el taller agrega la pieza al presupuesto.
- **Impresión a color:** sin precio en Odoo, así que siempre va a `REVISION`, como pide §1.4.
- **`odoo-personalizables.mjs`:** no descuenta los productos deshabilitados en `/admin`. Además, una plantilla sin variantes con stock sale del catálogo y se desmarca.
