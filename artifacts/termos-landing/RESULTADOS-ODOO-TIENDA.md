# Resultados — Creativa dentro de la tienda Odoo (motor)

**Fecha:** 2026-11-10 · **Rama:** `odoo-tienda`, creada desde `odoo-checkout` con `mejoras` mergeada adentro (clubes, diseños de artistas, `PROMPT-ODOO-TIENDA.md`) · **Base de pruebas prevista:** `staging_261109` de Odoo.sh.

> **Estado (actualizado 2026-11-10, tarde):** pruebas **1 a 10 y las del módulo corridas contra `staging_261109`** (`marketplace-staging-261109-41612773`, Odoo 19.0+e), con el motor local mapeado a staging y la base `creativa_test`. Todas pasan **después de 4 arreglos** (§7). Los `ODOO_*` de producción no se usaron en ningún momento. Detalle y hallazgos abiertos en §7.

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

## 7. Pruebas contra staging (2026-11-10)

**Cómo se corrieron:** api-server local (`:8099`) con `ODOO_*=$ODOO_*_STAGIGN`, `DATABASE_URL` → `creativa_test` y el `webhook_secret` del módulo; landing (`server.mjs`) en el puerto público `:3000` del dominio de desarrollo de Replit; firma y pago en el portal con Chromium (Playwright) y el proveedor **Demo** en modo test. Se verificó en Odoo por API (solo lectura) cada presupuesto.

**Preparación de staging:** `odoo-setup.mjs --demo` (creó `GRAB-*`, `IMP-COLOR-*` en 0 y `DISENO-ARTISTA-AOPY-NAVIDAD-TAZA` a Gs. 12.500; instaló `payment_demo`), `odoo-personalizables.mjs --aplicar` (139 plantillas marcadas; segunda pasada: 0 cambios). El módulo `website_creativa_studio` ya estaba instalado.

| # | Prueba | Resultado |
|---|---|---|
| 1 | `OK` de punta a punta | ✅ `CS-0001` → `S00201`: pieza 185.000 + `GRAB-NOMBRES` 35.000 = 220.000, `require_signature` y `require_payment`, validez 12/11 (48 h), huella de la versión en el portal. Firmado → aviso = `pendiente`; pagado con Demo → `sale`, aviso = `pagado`; repetido → `changed=false`. |
| 2 | `REVISION` | ✅ `CS-0002` (logo) → `S00202` en borrador, sin `portalUrl`, captura adjunta. Aprobar: sin clave 401; precio de la pieza → 400; con prueba del taller → `sent` + «Prueba aprobada» adjunta; aprobar dos veces → 409. El mismo diseño reenviado recibe el link → firmar y pagar → `pagado`. **Email:** el chatter registra «Quotation sent», pero staging está neutralizado y `send_mail` no deja copia: el envío en sí no se pudo verificar. |
| 3 | `IMPOSIBLE` | ✅ color en Vaso con Pico y Agarre → 422 `color_not_allowed`; AOPY en otra pieza → 422 (`artist_unavailable` con el flag apagado, `artist_other_piece` encendido); variante inexistente → 422. Presupuestos CS- en Odoo antes/después: iguales. |
| 4 | Precio manipulado | ✅ `piecePrice`/`estimate`/`price` = 1 → total de Odoo 220.000. |
| 5 | Pago sin firma | ✅ `S00204` confirmado sin firma → aviso = `pago_sin_firma`; `/admin` muestra «Pago sin aceptación: revisar» y «no producir». |
| 6 | Diseño cambiado después de aprobar | ✅ Diseño nuevo → CS nuevo en revisión, sin link. Mismo `requestId` con otro texto → reutiliza el pedido aprobado tal cual. Fila aprobada modificada (simulado en la base) → `approvedCurrent=false` y aviso «versión nueva sin aprobar». No hay ruta de la API que cambie el `designState` de un pedido. |
| 7 | Doble clic / volver atrás | ❌ → ✅ **Fallaba**: 3 «Comprar» simultáneos crearon 3 presupuestos para el mismo CS (S00205/206/207) y, en otra corrida, 5 clics crearon 5 CS (0006–0010). Arreglado (§7.1). Después: 5 simultáneos + uno posterior → 1 CS y 1 presupuesto (dos corridas); WhatsApp 5 simultáneos → 1 CS. |
| 8 | iframe | ✅ 1440 y 390 px: `cs:ready` ≈1 s después del clic, `cs:resize`, `cs:checkout` con ruta relativa → la ficha navega al portal (`S00220`, `S00221`). Pieza fija: tocar otro producto no la cambia. CSP `frame-ancestors` solo el origen de staging. |
| 9 | Respaldo sin iframe | ❌ → ✅ Con el iframe bloqueado, el módulo manda a `?odoo=…&volver=…` a los 8 s. **Fallaba:** caía en el hero (sin bajar al personalizador) y sin «Volver a la tienda». Arreglado (§7.1). Después: baja sola a «Creá tu pieza», tarjeta fija, «Volver a la tienda» a la ficha, compra → portal `S00223`. |
| 10 | Liquidación | ✅ (flag encendido solo en el build de prueba) AOPY: 3 pedidos en `REVISION` (`generic_piece`, `artist_provisional`, `color_360`); aprobar sin precio del color → 409; con `IMP-COLOR-360` = 45.000 → 57.500. 2 pagados + 1 sin pagar → **2 copias, Gs. 20.000**; CSV igual; octubre vacío; sin clave 401. |
| 11 | Typecheck, builds, check-prod | ✅ typecheck, builds, unitarias 23/23 + 11/11 · ❌ `check-prod`: solo `vaso-guarani-print.png` (162 KB > 150 KB), anterior a este trabajo. |
| + | Botón en la ficha | ✅ «Personalizar» aparece con `cs_personalizable`. |
| + | Aviso del módulo | ✅ **Primera prueba real de punta a punta:** pago de `S00220` en el portal → el módulo avisó solo al motor → `CS-0020` «pagado». Sin firma: el portal de Odoo exige firmar antes de pagar; el caso «pago sin firma» solo aparece si alguien confirma desde el backend (prueba 5). |

### 7.1 Arreglos hechos en esta tanda

- **Doble presupuesto / doble pedido (prueba 7).** `checkout()` buscaba por `client_order_ref` y después creaba; `createOrReuseOrder` tenía un `await` entre consultar y marcar el pedido en curso. Ahora las dos secciones corren bajo un **candado de Postgres** (`pg_advisory_lock`, `src/lib/pg-lock.ts`): `order:<requestId>` y `checkout:<CS>`. Se eligió Postgres y no memoria porque la publicación es *autoscale*. Se quitó el mapa `inflight` en memoria.
- **Respaldo `?odoo=` sin bajar al personalizador (prueba 9).** `home.tsx` hace el mismo scroll que con un diseño compartido.
- **«Volver a la tienda» ausente (prueba 9).** Dependía de `CS_SHOP_ORIGINS` en el **build**. `server.mjs` ahora inyecta `<meta name="cs-shop-origins">` también con `?odoo=<id>` (el CSP sigue en `'none'`; el hero no se oculta).
- **Aviso «Falta el archivo plano del artista» dependía del navegador.** `/admin` tomaba `provisional`, título y artista de `designState.artistDesign` (lo que mandó el cliente). Ahora salen del catálogo por id (`artistDesignView` en `admin.ts`).

### 7.2 Hallazgos abiertos (a decidir)

1. **`engine_url` del módulo en staging apunta a producción** (`https://creativastudio.marketplace.com.py`). Los avisos de pago de staging van al motor de producción con ids de staging; hoy no hacen nada solo porque el secreto de staging es distinto (404). Conviene apuntarlo a una URL de prueba o dejar el módulo sin `engine_url` en staging. Se cambió para las pruebas y **se restauró** al valor original.
2. **Taza genérica de AOPY sin línea ni nota en el presupuesto.** Con `generic_piece` no se agrega «Pieza: a cotizar», así que el taller puede aprobar y cobrar solo el diseño y el color (Gs. 57.500, sin la taza). `/admin` no permite cargar el precio de la pieza (a propósito); hoy hay que agregarla a mano en Odoo y nada lo recuerda.
3. **Tour del editor en el celular embebido.** El modo embebido oculta la sección «tutorial», pero el *tour* de primera visita («Agregá tu diseño · 1 de 3») sí aparece y tapa el «+». Puede ser deseable; el documento decía «sin tutorial».
4. **Texto pensado para WhatsApp en el paso «Enviar» del celular** («Revisá tu diseño y envialo por WhatsApp…», barra fija con «Enviar por WhatsApp» y el precio cortado «Gs. 2…») mientras la tienda empuja «Comprar y pagar».
5. **Lista de productos visible en el modo embebido (escritorio).** La pieza no cambia al tocar otro producto, pero la lista de 19 productos sigue a la vista y no responde.
6. **El respaldo tarda 8 s** con el panel vacío antes de navegar (`READY_TIMEOUT` del módulo).
7. **AR en el iframe:** «Permissions policy violation: xr-spatial-tracking»; el `<iframe>` del módulo solo permite `clipboard-write`.
8. **El secreto del webhook lleva caracteres especiales:** quien lo pruebe a mano con `curl` tiene que codificarlo (`encodeURIComponent`); el módulo lo manda bien.
9. **El build de la landing incluyó cambios en curso de otra persona** (Termo Hydrate · Palmeiras: `catalog.ts`, `products.ts`, `thermos-3d.tsx`, `pieces.generated.ts`…). No se tocaron.

### 7.3 Datos de prueba que quedan

- **Odoo staging:** presupuestos `S00201`–`S00223` con `client_order_ref` `CS-0001`…`CS-0023` (pagados: S00201, S00202, S00217, S00218, S00220; confirmado sin firma: S00204; duplicados de la prueba 7 antes del arreglo: S00205–S00212). Contactos «Prueba Staging/Embebida/Celu/Respaldo» (`@example.com`). Servicios `GRAB-*`, `IMP-COLOR-*`, `DISENO-ARTISTA-AOPY-NAVIDAD-TAZA`; proveedor Demo en test y publicado; 139 plantillas con `cs_personalizable`. `engine_url` restaurado.
- **Postgres:** `creativa_test` con `CS-0001`…`CS-0023`. Se borra con `drop database creativa_test`.
