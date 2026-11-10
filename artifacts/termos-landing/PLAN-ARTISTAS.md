# PLAN-ARTISTAS — Alta de artistas y diseños sin tocar código

**Estado:** propuesta (2026-11-09). Nada implementado todavía.
**Objetivo:** que el taller cargue, revise y publique diseños de artistas desde el
panel `/admin`, sin editar `artist-designs.ts` ni subir archivos al repo.
**Planilla para los artistas:** https://claude.ai/artifact/GkSbA3L7GTnbK57N3Wji5F
(qué entregan: arte plano, fotos y ficha de datos).

---

## 1. Situación actual

- Artistas y diseños son una lista fija en `src/lib/artist-designs.ts`. Las
  imágenes están en `public/disenos/`. Cada alta implica editar código y publicar
  una versión nueva.
- El pedido guarda `artistDesign` (id, precio, comisión, `provisional`), pero
  **no lleva ningún archivo para imprimir**. `buildDacenFile()` en
  `customizer.tsx` solo genera archivo cuando la máquina es la Dacen, y la taza
  enlozada va a la eufyMake.
- La zona de la manija (`handleU` en `print-specs.ts`) no se usa en ningún lado.
  Las medidas de la taza salen del modelo 3D.

## 2. Flujo que buscamos

```
Artista entrega (planilla) → Taller carga en /admin → Validación automática
  → Revisión del taller (OK / REVISIÓN / IMPOSIBLE) → Muestra impresa
  → Aprobación del artista → Publicado → aparece en «Recomendados»
```

Estados del diseño: `borrador` → `en_revision` → `muestra` → `publicado`,
además de `pausado` (fuera de temporada o sin stock) y `rechazado`.
Solo `publicado` llega a la tienda.

## 3. Datos (Postgres + Drizzle, `lib/db/src/schema/artists.ts`)

### `artists`
| Campo | Tipo | Nota |
|---|---|---|
| id | text PK | slug: `aopy` |
| name | text | nombre artístico |
| bio | text | ≤ 80 caracteres |
| instagram | text | sin @ |
| payout | jsonb | titular, banco o billetera, cuenta. **Solo admin** |
| active | bool | |
| created_at / updated_at | timestamp | |

### `artist_designs`
| Campo | Tipo | Nota |
|---|---|---|
| id | text PK | slug: `aopy-navidad-taza` |
| artist_id | text FK | |
| title, collection | text | |
| material_id, material_product_id | text | tienen que existir en `materials.ts` |
| color_id, finish | text | |
| price, artist_fee | integer | Gs.; null = los generales |
| status | enum | ver §2 |
| verdict | enum | `ok` / `revision` / `imposible` |
| review_notes | text | lo que se le pide corregir al artista |
| allow_text | bool | si el cliente puede sumar su nombre |
| text_zone | jsonb | `{u, v, w, h}` de la zona libre, en fracción de la banda |
| cover_key, cover_small_key | text | foto principal 900 y 700 px (webp) |
| photos | jsonb | claves de las fotos de lado y atrás (para el taller) |
| master_key | text | **arte plano original** (PNG 300 dpi), sin tocar |
| master_meta | jsonb | ancho/alto en px, dpi, alfa sí/no, sha256 |
| preview_key | text | arte reducido (webp, ≤ 2048 px) para el 3D |
| mode | text | siempre `artwork` para diseños nuevos |
| sort | integer | orden en la grilla |
| valid_from / valid_until | date | temporada; fuera de fecha no se muestra |
| version | integer | sube con cada arte nuevo (para invalidar la caché) |

Los archivos van a **Replit Object Storage** (el mismo cliente que
`api-server/src/lib/order-images.ts`), con claves
`artistas/<designId>/v<version>/{master.png,preview.webp,cover.webp,cover-700.webp,lado.jpg,atras.jpg}`.
Las claves llevan la versión, así se pueden servir con caché `immutable`.

## 4. API (`api-server/src/routes/artists.ts`)

### Pública
- `GET /api/artist-designs`: artistas activos y diseños `publicado` dentro
  de fecha, **sin** `payout` ni `master_key`. Caché en memoria que se vacía al
  guardar, igual que `product-settings.ts`.
- `GET /api/artist-designs/file/:designId/:version/:name`: sirve solo
  `cover`, `cover-700` y `preview`, con `Cache-Control: public, max-age=31536000, immutable`.

### Admin (header `x-internal-key`, como `/api/admin/orders`)
- `GET / POST / PATCH /api/admin/artists`
- `GET / POST / PATCH /api/admin/artist-designs` (cambia el estado, el
  veredicto y las notas)
- `POST /api/admin/artist-designs/:id/files`: sube el arte plano y las fotos
  (data URL en JSON; el server ya acepta 32 MB en `app.ts`). Al subir un arte
  nuevo se incrementa `version`.
- `GET /api/admin/artist-designs/:id/master`: descarga el arte plano original
  para producción.

## 5. Validación automática al subir (las reglas de la planilla)

Se hace en el navegador del panel antes de enviar, y se repite en el server
con los metadatos del PNG:

| Chequeo | Bloquea | Advierte |
|---|---|---|
| Arte en PNG | ✔ | |
| Tiene canal alfa (fondo transparente) | | ✔ |
| Proporción vs. plantilla de la pieza (`artworkDistortion`) | > 4 % | > 1 % |
| dpi efectivos (`wrapEffectiveDpi`) | < 150 | < 300 |
| Pixeles opacos en la franja de la manija | | ✔ (muestra dónde) |
| Foto principal cuadrada y ≥ 1800 px | no cuadrada | < 1800 px |
| La pieza tiene medidas de calibre en `print-specs.ts` | no se puede **publicar** sin medidas | |

El panel genera en el navegador, con canvas, los derivados (`preview.webp`,
`cover.webp` 900 px y `cover-700.webp`) y los sube junto con el original. Así no
hace falta sumar `sharp` al server.

## 6. Panel `/admin`: pestaña «Artistas»

- Lista de diseños con su estado, foto chica, artista, pieza y ventas del mes.
- Ficha del diseño: los campos de la ficha de datos, los archivos y el
  resultado de la validación. Incluye una **vista previa en 3D**: un iframe a la
  landing con `#preview-artista=<id>`, que abre el personalizador con ese diseño
  aunque no esté publicado (pasando la clave interna).
- Botones para cada estado: «Pedir corrección» (pide notas), «Pasar a muestra»,
  «Publicar», «Pausar».
- Las piezas del selector salen de una lista compartida (ver §8, punto 1).

## 7. Cambios en la landing

1. `artist-designs.ts`: en lugar de la lista fija, un store (caché a nivel
   módulo + suscripción) que carga `GET /api/artist-designs` al iniciar. La
   lista actual queda como respaldo si la API falla.
   `getArtistDesign()` sigue siendo síncrona y lee del store.
2. Links compartidos y «Copiar diseño» con `artistDesignId`: si el store
   todavía no cargó, esperar a que cargue y recién ahí aplicar el diseño
   (hoy `getArtistDesign` lo resuelve en el momento).
3. `ArtistDesigns` (Recomendados): usa el store y se oculta si no hay
   diseños.
4. `wrap-design.ts`: no dibujar en la franja `handleU` de la pieza (3D,
   desplegado y archivo).
5. Texto del cliente sobre un diseño de artista: solo dentro de `text_zone`.
   Si `allow_text` es false, el campo de texto se desactiva mientras el diseño
   está aplicado.

## 8. Producción y liquidación

1. **Lista de piezas compartida.** Mover `PRINT_SPECS` y la lista de piezas
   habilitadas para artistas a un paquete del monorepo
   (`lib/print-specs`, como ya sugiere el comentario de `print-specs.ts`). Lo
   usan la landing, el server y el panel.
2. **Archivo de producción.** En pedidos con diseño de artista, el panel
   muestra «Descargar arte maestro» (`/master`) y, encima, el texto del
   cliente en vector, con la posición dentro de `text_zone`. La máquina sale de
   la pieza (hoy la eufyMake, UV DTF), no del flag `dacen`.
3. **Liquidación.** Una vista mensual por artista: cantidad de copias y
   `artistFee` sumado, a partir de `orders.design_state->'artistDesign'`.
   Solo cuenta pedidos en estado entregado. Se exporta como CSV.

## 9. Fases

| Fase | Qué incluye | Resultado |
|---|---|---|
| 1 | Tablas, Object Storage, API pública y admin, store de la landing, migración de AOPY | Los diseños salen de la base, sin código |
| 2 | Pestaña «Artistas» en `/admin` con carga, validación y estados | El taller da de alta un diseño solo |
| 3 | Descarga del arte maestro en el pedido, franja de manija, `text_zone` | Lo que se imprime es igual a la foto |
| 4 | Liquidación mensual y CSV | Pago a artistas sin planillas a mano |
| 5 (opcional) | Link privado por artista (token) con un formulario de entrega igual a la planilla; los envíos quedan en `en_revision` | El artista sube sus archivos sin pasar por el taller |

## 10. Riesgos y decisiones pendientes

- **Clave del panel:** hoy, si no se define `INTERNAL_ACCESS_KEY`, la clave
  por defecto es `creativa123`. Con subida de archivos y datos de pago, hay
  que definir el Secret antes de la fase 2.
- **Medidas reales de la taza enlozada** (Ø arriba y abajo, alto imprimible,
  ancho de la manija): sin ellas no se publica nada (regla de §5).
- **Técnica para piezas con manija:** confirmar con el taller si la UV DTF va
  en una sola calcomanía o en dos (a cada lado de la manija). Eso define si
  el arte maestro se divide al exportarlo.
- **«Navidad paraguaya» (AOPY)** sigue siendo provisorio hasta que llegue el
  arte plano. Mientras tanto, ¿se pausa o se vende con aviso?
