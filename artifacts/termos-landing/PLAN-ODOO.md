# PLAN-ODOO — Personalizar y comprar termos entre Odoo y la landing

**Fecha:** 2026-10-21. Complementa `Mejoras.md` §5–§6 (catálogo de Odoo ya conectado) y `DACEN.md` (máquinas y medidas de impresión).

> Versión para leer y compartir (con diagramas): https://claude.ai/artifact/3FQabVr4EBhK76okYd7B1p

**Resumen:** Odoo vende y descuenta el stock; la landing solo diseña. El cliente va siempre hacia adelante —de la ficha del termo al editor y del editor al pago de un pedido ya armado— y nunca puede volver a empezar el ciclo. Así se conectan las dos plataformas sin bucles, y cada termo se diseña con sus medidas reales.

---

## 0. Etapa previa — Dominio: `creativastudio.marketplace.com.py`

La landing pasa a vivir como subdominio de Marketplace. Nombre elegido: **`creativastudio.marketplace.com.py`**.

**Datos verificados (2026-10-21):**

| Dato | Valor |
|---|---|
| DNS de `marketplace.com.py` | BanaHosting (`ns7108` / `ns7109.banahosting.com`) → se edita desde **cPanel** |
| Sitio principal de Marketplace | `75.102.22.202` (no se toca) |
| `creativastudio.marketplace.com.py` | No existe todavía (libre) |
| Registros CAA | Ninguno → no bloquean el certificado SSL de Replit |
| Dominio actual de la landing | `creativastudiopy.com` (DNS en Cloudflare, apunta a Replit `34.111.179.208`) |

### Paso 1 — Pedir el dominio en Replit

1. Abrir el proyecto en Replit → pestaña **Deployments** (Publicación).
2. Entrar a **Settings** → **Link a domain** / **Manage custom domains**.
3. Escribir `creativastudio.marketplace.com.py` y continuar.
4. Replit muestra **dos registros** para crear. Dejar esa pantalla abierta:
   - un registro **A** (nombre `creativastudio`, valor = una IP),
   - un registro **TXT** de verificación (valor tipo `replit-verify=…`).

**No quitar `creativastudiopy.com`** de Replit: se mantiene conectado para que los links ya enviados por WhatsApp sigan funcionando (ver Paso 5).

### Paso 2 — Crear los registros en cPanel

1. Entrar a cPanel → sección **Dominios** → **Zone Editor** (Editor de zona).
2. En la fila de `marketplace.com.py` → **Manage** (Administrar).
3. **+ Add Record** → tipo **A**:
   - **Name:** `creativastudio.marketplace.com.py.` (cPanel suele completar el dominio solo; si al escribir `creativastudio` ya muestra el nombre completo, alcanza con eso)
   - **TTL:** `300`
   - **Record (Address):** la IP que mostró Replit (copiarla exacta).
4. **+ Add Record** → tipo **TXT**:
   - **Name:** el que indica Replit (normalmente el mismo `creativastudio.marketplace.com.py.`)
   - **TTL:** `300`
   - **Record:** el texto `replit-verify=…` completo, copiado tal cual.
5. Guardar.

**Qué NO hacer en cPanel:**
- **No usar "Subdominios"** (Domains → Subdomains / Create a New Domain). Esa herramienta crea un registro A apuntando al hosting de BanaHosting y una carpeta vacía: el subdominio mostraría una página en blanco del hosting en vez de la landing. Si ya se creó por ahí, borrar ese subdominio y crear solo los registros del Zone Editor.
- **No crear un CNAME** para `creativastudio` además del A: un nombre no puede tener las dos cosas.
- **No tocar** los registros existentes (`@`, `www`, `mail`, `MX`, el TXT de SPF ni los de Google/Pinterest): son del sitio y el correo de Marketplace.

### Paso 3 — Verificar en Replit — ✅ Verified (2026-10-21)

1. Volver a la pantalla de Replit del Paso 1 y tocar **Verify** (Verificar).
2. Puede tardar de 5 minutos a unas horas (hasta 24–48 h en el peor caso). Con TTL 300 suele ser rápido.
3. Cuando queda **Verified**, Replit emite el certificado SSL solo. Probar `https://creativastudio.marketplace.com.py`: tiene que abrir la landing con candado.
4. Comprobar también `https://creativastudio.marketplace.com.py/api/healthz` → `{"status":"ok"}` (el servidor de pedidos responde en el dominio nuevo).

Si no verifica después de un par de horas: revisar en cPanel que el nombre del registro no haya quedado duplicado (`creativastudio.marketplace.com.py.marketplace.com.py`), que la IP y el TXT estén copiados sin espacios, y que no exista otro registro para `creativastudio`.

### Paso 4 — Cambios en el código — ✅ Hecho (2026-10-21, falta republicar)

El dominio viejo está escrito a mano en algunos archivos. Se cambian a `https://creativastudio.marketplace.com.py` y se republica:

| Archivo | Qué tiene |
|---|---|
| `index.html` | `canonical`, `og:url`, `og:image`, `twitter:image` y los datos estructurados (`url`, `image`, `logo`) |
| `public/robots.txt`, `public/sitemap.xml` | URL del sitemap y de la home (el server ya los genera con el host de cada pedido; los estáticos son respaldo) |
| `public/llms.txt` | Links a las secciones |
| `scripts/check-prod.mjs` | Origen por defecto del chequeo de producción |

Los links de imagen de los pedidos **no** se tocan: el api-server arma la URL con el host de cada request, así que los pedidos nuevos salen solos con el dominio nuevo.

**og:image nuevo:** WhatsApp cachea la vista previa por URL. Al cambiar de dominio, la tarjeta del link se regenera sola (es otra URL); no hace falta versionar la imagen.

### Paso 5 — El dominio viejo — ✅ Redirección hecha en `server.mjs` (falta republicar)

- Dejar `creativastudiopy.com` conectado en Replit y agregar en `server.mjs` una **redirección 301** de `creativastudiopy.com/*` a `creativastudio.marketplace.com.py/*`, **excepto `/api/*`**: los links de pedidos ya enviados por WhatsApp (`/api/orders/CS-XXXX/image?t=…`) se siguen sirviendo tal cual en el dominio viejo.
- Mantener el dominio viejo pago al menos 1 año (Google tarda en pasar el posicionamiento al nuevo, y quedan links viejos en Instagram, WhatsApp y tarjetas).

### Paso 6 — Afuera del código

- [ ] **Google Search Console:** agregar `creativastudio.marketplace.com.py` como propiedad y usar "Cambio de dirección" desde la propiedad vieja.
- [ ] **GTM / GA4:** sumar el dominio nuevo a la lista de dominios del flujo de datos (si hay filtros por host).
- [ ] **Instagram, Facebook, Google Maps, WhatsApp Business:** cambiar el link del perfil.
- [ ] **Odoo:** el botón "Personalizar" (§6, pieza 1) ya se arma con el dominio nuevo.

---

## 1. Punto de partida

La mitad del camino ya está hecha: la landing lee de Odoo los termos Hydrate con stock, sus colores, precios y fotos. Lo que falta es todo lo que **escribe** en Odoo: crear el pedido, cobrarlo y el botón de ida desde la tienda.

| Parte | Estado hoy | Qué falta |
|---|---|---|
| Catálogo (productos, colores, capacidades) | Hecho. Se lee de Odoo cada 10 min, filtrado por marca HYDRATE y solo con stock | Nada para empezar |
| Precio de la pieza + grabado | Hecho. Total en el resumen y en WhatsApp | Cargar en Odoo los servicios `GRAB-NOMBRES`, `GRAB-ICONO`, `GRAB-LOGO` |
| Fotos de producto | Hecho. Se sirven desde el servidor de la landing | Nada |
| Modelos 3D exactos | 6 modelos Hydrate con 3D propio; el resto usa forma genérica | Más modelos, y a escala real (§7) |
| Cierre del pedido | Por WhatsApp, con número CS-XXXX guardado en la landing | Crear el pedido de venta en Odoo y cobrarlo |
| Botón "Personalizar" en la tienda | No existe | Agregarlo a la ficha del producto en Odoo |
| Permisos en Odoo | Usuario de solo lectura | Permiso para crear pedidos de venta (lo da Marketplace) |

El Odoo es el de Marketplace (Odoo 19 Online, 956 productos Hydrate, 516 con stock): cada cosa que la landing escriba ahí necesita su permiso.

## 2. Los dos caminos del cliente

```
Tienda Odoo (ficha del termo) ──Personalizar──┐
                                              ▼
                                   Editor de la landing ──Comprar──▶ Pedido en Odoo ──link de pago──▶ Pago en Odoo
                                   (termo bloqueado)                 (ref. CS-0042;                   (fin del camino)
                                              ▲                       si ya existe, se reutiliza)          │
Landing (elige el termo) ──Diseñar────────────┘                                                         │
                                              ▲                                                         │
                                              └──── "Ver mi diseño": solo edita el diseño, no crea otro pedido
```

- **Desde la tienda:** el cliente toca "Personalizar" y llega al editor con ese termo, color y capacidad ya elegidos (bloqueados). Diseña, toca "Comprar" y va al pago.
- **Desde la landing:** elige un termo del catálogo (el mismo de Odoo), lo diseña, toca "Comprar" y va al mismo pago.
- **WhatsApp sigue existiendo:** "Continuar por WhatsApp" queda al lado de "Comprar", y funciona como hoy.
- La única vuelta es "Ver mi diseño", desde la página del pedido: abre el diseño ya comprado para editarlo, sin crear otro pedido ni pasar de nuevo por el pago.

## 3. Cómo se evita el bucle

Tres formas en que pasaría:

- **Navegación:** tienda → landing → carrito de la tienda → "Personalizar" otra vez. El cliente da vueltas y nunca paga.
- **Pedidos:** cada vuelta crea un pedido nuevo; quedan varios del mismo termo, sin pagar.
- **Datos:** Odoo avisa a la landing, la landing le avisa a Odoo, y se repite sin fin.

### Regla 1 — Cada sistema hace una sola cosa

| | Odoo (tienda) | Landing (editor) |
|---|---|---|
| Producto, color, capacidad | Es la fuente | Lee y muestra |
| Precio | Es la fuente | Lee y suma el grabado (que también viene de Odoo) |
| Stock | Lo reserva y descuenta | Nunca lo escribe |
| Pedido y pago | Lo crea y lo cobra | Pide crearlo, una sola vez |
| Diseño (texto, logo, ubicación) | Solo guarda CS-XXXX y el link | Es la fuente |

### Regla 2 — El camino va siempre hacia adelante

Ficha del termo → editor → pago. La landing nunca manda a la ficha del producto ni al carrito de Odoo: manda a la página de pago de un pedido ya armado, que no tiene botón "Personalizar". El termo personalizado **no pasa por el carrito de Odoo** (el carrito vive en el navegador del cliente, en otro dominio).

### Regla 3 — Un diseño es un solo pedido

El número de diseño (CS-0042) va en el campo **"Referencia del cliente"** (`client_order_ref`) del pedido de Odoo. Antes de crear, el servidor busca esa referencia:

- **Existe y no está pagado:** se actualiza y se devuelve el mismo link de pago.
- **Existe y está pagado:** "Ya pagaste este pedido", con el link para verlo.
- **No existe:** se crea.

Es la misma idea que ya protege los pedidos por WhatsApp (`designState.requestId`, `api-server/src/routes/orders.ts`).

Los avisos de Odoo hacia la landing ("pedido pagado") son **de una sola vía**: la landing actualiza su estado y nunca le escribe a Odoo como respuesta a un aviso.

## 4. Stock: quién lo descuenta y cuándo

Solo Odoo toca el stock, con su circuito normal de ventas. La landing solo lo consulta.

| Momento | Qué pasa con el stock | Quién |
|---|---|---|
| El cliente elige y diseña | Nada; se muestra cuántas quedan | La landing lee Odoo |
| Toca "Comprar" | Se vuelve a consultar; si se agotó, se avisa y no se crea el pedido | Servidor de la landing |
| Se crea el pedido (presupuesto) | Nada: un presupuesto no reserva | Odoo |
| El cliente paga | Se confirma y la unidad queda reservada | Odoo, automático con el pago online |
| Se entrega o retira | Se descuenta del inventario | Quien valida la entrega en Odoo |

- **Presupuestos abandonados:** no bloquean stock. Darles validez corta (ej. 48 h).
- **Dos clientes, una unidad:** si pagan casi a la vez, Odoo confirma los dos y el segundo queda esperando stock; el taller le ofrece otro color.
- **Pago en el local:** sin pago online, el pedido queda como presupuesto y se confirma a mano al cobrar.

## 5. Editar el diseño después de comprar

Se puede cambiar hasta que el taller lo pase a producción. Los cambios tocan solo el diseño guardado en la landing, nunca las líneas ni el precio del pedido de Odoo.

- **Cómo llega:** link "Ver mi diseño" en la página del pedido en Odoo (y en el mensaje de confirmación), con un token privado para que nadie abra el diseño de otro cambiando el número.

| Cambio | Antes de pagar | Pagado, antes de producción | En producción |
|---|---|---|---|
| Texto, tipografía, ícono | Sí | Sí | No |
| Ubicación y tamaño del diseño | Sí | Sí | No |
| Cambiar el logo por otro | Sí | Sí | No |
| Pasar de nombre a logo (cambia el precio) | Sí, se recalcula | No: por WhatsApp | No |
| Cambiar color o capacidad del termo | Sí, se recalcula | No: por WhatsApp | No |

- Lo que cambia el precio se bloquea después de pagar: cobrar diferencias o devolver lo resuelve una persona.
- Al marcar "En producción", el link queda en solo lectura. Ese estado se marca en **un solo lugar** (una etapa del pedido en Odoo, o el panel de la landing).
- Cada cambio queda como una versión nueva del diseño, con fecha; el taller produce la última.

## 6. Las piezas a construir

| # | Pieza | Dónde vive | Qué hace | Escribe en Odoo |
|---|---|---|---|---|
| 1 | Botón "Personalizar" | Ficha del producto en la tienda Odoo | Link a `https://creativastudio.marketplace.com.py/?odoo=<id del producto>`, solo en productos que se graban | No (se edita la tienda) |
| 2 | Editor con producto preseleccionado | Landing | Lee el id, salta a "Diseño" con ese termo/color/capacidad bloqueados; si se agotó, lo dice y ofrece otro color | No |
| 3 | Botón "Comprar" | Landing, resumen | Al lado de "Continuar por WhatsApp" | No |
| 4 | Crear el pedido de venta | api-server | Pedido con 2 líneas: termo (variante exacta) + servicio de grabado. CS-XXXX en `client_order_ref`, imagen y link "Ver mi diseño" en notas. Devuelve el link de pago del portal | Sí: pedidos y contactos |
| 5 | Aviso "pedido pagado" | Odoo → api-server | Automatización de Odoo al confirmar; la landing marca CS-XXXX pagado. Una sola vía | Sí: crear la automatización |
| 6 | Editar después de comprar | Landing + portal | Link con token y reglas del §5 | No |

- **Datos del cliente:** al tocar "Comprar" se piden nombre, teléfono y email. Si el contacto ya existe en Odoo (mismo email o teléfono), se reutiliza.
- **Precio cobrado:** lo calcula Odoo con sus tarifas. La landing muestra un estimado; si difiere (promoción, lista de precios), manda Odoo.

## 7. Termos con sus medidas reales

Hoy ningún termo tiene sus medidas reales cargadas:

- `src/lib/print-specs.ts`: todas las medidas en `null` ("falta medir").
- `api-server/src/lib/production-svg.ts` (`PRODUCT_AREAS_MM`): área genérica por tipo (cualquier termo 80 × 110 mm, vaso 70 × 90 mm).
- El 3D de algunas capacidades se escala parejo: Termo Mate 800/915 ml sale del modelo de 1200 ml achicado entero.

### Paso 1 — Medir y cargar (calibre)

| Modelo | Capacidad | Alto total (mm) | Ø arriba (mm) | Ø abajo (mm) | Alto grabable (mm) | Manija (inicio–fin) |
|---|---|---|---|---|---|---|
| Termo Mate | 800 ml | | | | | |
| Termo Mate | 915 ml | | | | | |
| Termo Mate | 1200 ml | | | | | |
| Termo Mate Forge | | | | | | |
| Hoppie V2 Pro Series | | | | | | |
| Vaso | | | | | | |
| Vaso Sunbeam | | | | | | |
| Vaso con Pico y Agarre | | | | | | |
| Vaso Shaker | | | | | | |

Son los modelos con 3D propio; las capacidades faltantes salen del catálogo de Odoo. Los diámetros arriba/abajo importan en piezas cónicas.

**Dónde guardarlo:** ideal en Odoo, campos de Studio del producto (ej. `x_studio_alto_mm`, `x_studio_diametro_arriba_mm`), así llegan con el catálogo. Si Marketplace no lo permite, una tabla en la landing por modelo y capacidad.

### Paso 2 — 3D a escala real

Cada modelo se ajusta al alto real de esa capacidad y el ancho al diámetro real, **por separado** (no un escalado parejo). Capacidades con formas muy distintas → un `.glb` por capacidad. Las formas genéricas se estiran a las medidas reales.

### Paso 3 — Diseñar en milímetros

- Zona grabable = alto grabable × circunferencia real, menos la franja de la manija.
- El editor muestra el tamaño real mientras se mueve ("Logo: 4,5 × 3 cm"); regla opcional.
- No deja agrandar más allá de lo que entra en la pieza ni poner el diseño sobre la manija.
- El archivo de producción usa exactamente esas medidas en vez de `PRODUCT_AREAS_MM`.
- Las medidas pasan a un paquete compartido landing + api-server (`lib/print-specs`, ya previsto en `DACEN.md`).

## 8. Lo que hay que acordar con Marketplace

- [ ] **Permiso para crear pedidos:** usuario de API que cree pedidos de venta y contactos, sin tocar precios ni stock. Ideal: limitado a un equipo de ventas "Creativa Studio".
- [ ] **Medio de pago online:** Odoo Online no permite módulos de terceros (Bancard/Pagopar los necesitan). Ver qué medio ya tiene la tienda; si no hay, se paga en el local o por transferencia.
- [ ] **Servicios de grabado:** productos de tipo Servicio `GRAB-NOMBRES`, `GRAB-ICONO`, `GRAB-LOGO`, con precio.
- [ ] **Botón en la ficha:** confirmar que se puede editar la ficha de los productos Hydrate y quién lo hace.
- [ ] **Campos de medidas** (opcional): campos de Studio o tabla en la landing.
- [ ] **Facturación:** ¿factura Marketplace todo (y le paga a Creativa el grabado) o Creativa factura el grabado aparte? Define si el grabado va en el mismo pedido o en uno separado.

## 9. Hoja de ruta

| Etapa | Contenido | Depende de |
|---|---|---|
| 0. Dominio | `creativastudio.marketplace.com.py` (§0) | Acceso a cPanel ✔ |
| 1. Medidas reales | Medir, 3D a escala, diseño en mm (§7) | La tabla de medidas completa |
| 2. Tienda → editor | Botón "Personalizar" + producto preelegido (piezas 1–2) | Nada: funciona con el acceso de solo lectura |
| — Acuerdo con Marketplace | Permisos, medio de pago, servicios de grabado (§8) | Marketplace |
| 3. Comprar | Pedido en Odoo + link de pago + "un diseño, un pedido" (piezas 3–4) | El acuerdo |
| 4. Tras el pago | "Ver mi diseño", aviso de pago, cierre en producción (piezas 5–6) | Etapa 3 |

Mientras se espera a Marketplace, las etapas 1 y 2 ya dejan al cliente diseñando el termo exacto de la tienda, con su tamaño real; el cierre sigue por WhatsApp.
