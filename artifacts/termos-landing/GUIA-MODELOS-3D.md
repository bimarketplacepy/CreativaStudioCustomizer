# Guía para armar los modelos 3D con Higgsfield

**Para:** quien genere los modelos 3D de las 6 formas base del personalizador.
**Fecha:** 2026-10-08 · Complementa `Mejoras.md` §5 (requisitos técnicos) y §6 (hoja de ruta).

---

## 0. La idea en una frase

Hacemos **6 modelos 3D en un solo color neutro**, uno por forma. La landing los **pinta con el color real** de cada variante de Odoo y los **estira** según la capacidad (530 → 710 → 1 L). No hay que hacer un modelo por color ni por tamaño.

| # | Forma base | Archivo final | Productos que la usan |
|---|---|---|---|
| 1 | Botella boca ancha | `forma-botella.glb` | Hoppie, Hoppie V2 Pro, Hoppie Kids, Termo 473/530/710 |
| 2 | Termo mate | `forma-termo-mate.glb` | Termo Mate, Termo Mate Forge, ediciones de clubes |
| 3 | Vaso con tapa | `forma-vaso.glb` | Vaso, Vaso Café, Vaso Shaker, Whisky Lowball |
| 4 | Vaso con manija y pajita | `forma-vaso-manija.glb` | Sunbeam, Vaso con Pico y Agarre, Vaso Manija |
| 5 | Guampa / Copa | `forma-guampa.glb` | Guampa, Copa |
| 6 | Taza | `forma-taza.glb` | Taza Espresso, Mini Coffee Mug, Coffee Cup |

---

## 1. Cómo funciona Higgsfield para 3D (importante)

- **El 3D se genera a partir de imágenes, no de texto.** En los modelos de "imagen a 3D" el texto se ignora: **la calidad del modelo depende de la calidad de la foto**.
- Hay "texto a 3D" (Meshy 6, Hunyuan 3.1), pero inventa proporciones. Úsenlo solo como último recurso.
- **Varias vistas dan mejor resultado que una:** con 2 a 4 fotos del mismo producto desde distintos ángulos, la forma sale mucho más fiel.
- Lo que devuelve es un archivo **`.glb`**, que es el formato que usa la landing.

### Qué herramienta de Higgsfield usar

| Situación | Herramienta (modelo) | Por qué |
|---|---|---|
| **Tenés 3–4 fotos del producto real** ✅ recomendado | **Multi-Image to 3D** (Meshy) o **Tripo H3.1 Multiview to 3D** | La forma más fiel: manijas y tapas salen bien |
| Tenés una sola foto buena | **Meshy 7 Image to 3D** | Buen resultado con una vista; activar `symmetry_mode: on` |
| No hay fotos | Generar la imagen primero (§3.B) y después Image to 3D | Evitar texto a 3D directo |

### Parámetros recomendados (Meshy)

| Parámetro | Valor | Motivo |
|---|---|---|
| `should_texture` | **false** (sin textura) | El color lo pone la landing; una textura "horneada" se pelearía con el color de Odoo |
| `topology` | **quad** | Superficies lisas y fáciles de editar en Blender |
| `target_polycount` | **20.000 – 40.000** | Suficiente detalle y archivo liviano para el celular |
| `symmetry_mode` | **on** en botella, vaso, guampa · **auto** en formas con manija | Los cilindros son simétricos; la manija rompe la simetría |
| `should_remesh` | true (por defecto) | Malla limpia |
| `enable_rigging` / `enable_animation` | **false** | Solo sirven para personajes |

En **Tripo**: `texture: false`, `quad: true`, `geometry_quality: detailed`, `auto_size: true` (escala real).

---

## 2. Reglas de oro (para todas las formas)

1. **Un solo producto por foto**, entero, centrado, sin cortar la tapa ni la base.
2. **Color neutro: blanco o gris claro mate.** Nunca negro (se pierde el volumen) ni colores fuertes. Si en el local hay uno blanco, ese es el ideal.
3. **Sin logo, sin texto, sin stickers, sin diseño impreso.** Si el producto real tiene logo, mejor el de una variante lisa. Las ediciones de clubes usan el modelo liso de su forma (§5).
4. **Fondo liso** (blanco o gris), **luz pareja y difusa**, sin reflejos fuertes ni sombras duras. El acero brillante confunde a la IA: si brilla mucho, luz más suave.
5. **Cámara a la altura del centro del producto**, de frente, sin perspectiva exagerada (alejarse y hacer zoom, no acercar el celular).
6. **Vistas para multi-imagen, siempre en el mismo orden:** frente → lado izquierdo (90°) → atrás → lado derecho. En formas con manija, que la **manija se vea claramente en una vista lateral**.
7. **Mismo producto, misma luz, misma distancia** en todas las vistas.

---

## 3. Cómo conseguir las imágenes

### A. Fotos del producto real ✅ (lo mejor: tienen los productos en el local)
- Celular en trípode o apoyado, a 1–1,5 m, zoom 2x.
- Producto sobre una cartulina blanca o gris, con un fondo del mismo color detrás (curva tipo "infinito").
- Luz de ventana indirecta o dos lámparas a los costados con papel manteca.
- 4 fotos: frente, izquierda, atrás, derecha (girar el producto, no moverse uno).
- Medir el producto con una regla o centímetro (ver §6) y anotar las medidas.

### B. Si no hay fotos: generar la imagen de referencia en Higgsfield
Con el generador de imágenes, en **inglés** (rinde mejor), usando esta plantilla y cambiando la descripción del producto:

```
Studio product photo of [DESCRIPCIÓN DEL PRODUCTO], plain matte light gray finish,
no logo, no text, no stickers, no pattern, single object, centered, entire object
visible from base to lid, straight-on front view at eye level, orthographic look,
pure white seamless background, soft even diffused lighting, no harsh reflections,
no shadows, high detail, sharp edges
```

Después, para más vistas del **mismo** producto, pedí la misma imagen con: `same object, side view rotated 90 degrees, same lighting and background`. Revisá que las vistas coincidan (misma tapa, misma manija) antes de pasarlas a 3D.

---

## 4. Ficha por forma

En cada forma: qué describir, qué piezas tiene, **qué parte se pinta con el color de Odoo** y **dónde se graba**.

### 1 · Botella boca ancha → `forma-botella.glb`
- **Producto de referencia:** Hoppie 710 ml (el tamaño "medio" de la línea).
- **Descripción para la imagen (§3.B):** `an insulated stainless steel water bottle, straight cylindrical body, gently rounded shoulder, wide mouth, short brushed steel threaded neck, screw cap with a small carry loop on top`
- **Piezas:** cuerpo · cuello de acero · tapa.
- **Se pinta con el color de Odoo:** el **cuerpo** (y la tapa si en la realidad es del mismo color: confirmar).
- **Zona de grabado:** frente del cuerpo, la parte recta (sin hombro ni base).
- **Herramienta:** Multi-Image con `symmetry_mode: on`.

### 2 · Termo mate → `forma-termo-mate.glb`
- **Referencia:** Termo Mate 1200 ml.
- **Descripción:** `a tall slim insulated thermos for mate, long straight cylindrical body, side D-shaped carry handle attached to the body, pour spout stopper cap`
- **Piezas:** cuerpo · manija · tapa/pico cebador.
- **Se pinta:** el **cuerpo** (manija y tapa según el producto real).
- **Zona de grabado:** el lado **opuesto a la manija** (el frente), parte recta.
- **Herramienta:** Multi-Image (la manija necesita vista lateral), `symmetry_mode: auto`.

### 3 · Vaso con tapa → `forma-vaso.glb`
- **Referencia:** Vaso 600 ml.
- **Descripción:** `an insulated stainless steel tumbler, slightly tapered body wider at the top, flat base, press-on lid with a sliding sip opening`
- **Piezas:** cuerpo · tapa (transparente o de color, según el real).
- **Se pinta:** el **cuerpo**.
- **Zona de grabado:** frente del cuerpo, dejando 1 cm arriba y abajo.
- **Herramienta:** Multi-Image o Meshy 7 con `symmetry_mode: on`.

### 4 · Vaso con manija y pajita → `forma-vaso-manija.glb`
- **Referencia:** Vaso con Pico y Agarre 887 ml (o Sunbeam 1183 ml).
- **Descripción:** `a large insulated stainless steel travel tumbler, tapered lower body that fits a cup holder, large C-shaped side handle, lid with a reusable straw`
- **Piezas:** cuerpo · manija · tapa · pajita.
- **Se pinta:** el **cuerpo** y normalmente la **manija** (confirmar con el producto real).
- **Zona de grabado:** frente, lado opuesto a la manija.
- **Herramienta:** **Multi-Image obligatorio** (es la forma más compleja), `symmetry_mode: auto`.
- ⚠️ Esta forma y la taza **no existen hoy** en el personalizador: son las que más se benefician de Higgsfield.

### 5 · Guampa / Copa → `forma-guampa.glb`
- **Referencia:** Guampa 220 ml (la Copa usa la misma forma, más alta).
- **Descripción:** `a short wide insulated stainless steel mate cup, rounded base, straight walls, no handle`
- **Piezas:** cuerpo (más tapa si la tiene).
- **Se pinta:** el **cuerpo**.
- **Zona de grabado:** frente, banda central.
- **Herramienta:** Meshy 7 con `symmetry_mode: on` alcanza.

### 6 · Taza → `forma-taza.glb`
- **Referencia:** Coffee Cup 236 ml.
- **Descripción:** `an insulated stainless steel coffee mug, straight cylindrical body, side loop handle, lid`
- **Piezas:** cuerpo · asa · tapa.
- **Se pinta:** el **cuerpo** (y el asa si es del mismo color).
- **Zona de grabado:** frente, lado opuesto al asa.
- **Herramienta:** Multi-Image, `symmetry_mode: auto`.

> 💡 **Recomendación honesta:** la botella, el vaso con tapa y la guampa son **formas de revolución** (un perfil que gira). Para esas, en Blender se modelan en minutos y con medidas exactas (modificador *Screw* sobre el perfil), y quedan más precisas que con IA. Donde **Higgsfield realmente ayuda** es en las formas con **manija, pajita o tapas complejas** (termo mate, vaso con manija, taza).

---

## 5. Colores: cómo se resuelven

**No se hace un modelo por color.** El modelo sale en gris neutro y la landing pinta el **cuerpo** con el color de la variante elegida en Odoo (y la manija o la tapa, si se indica que llevan el mismo color).

### Lo que necesitamos para que los colores se vean bien
Hoy los productos Hydrate en Odoo **no tienen cargado el código de color** (hex), así que la landing lo **aproxima por el nombre**. Para que sea exacto hay dos opciones:

**Opción A (recomendada): pasarnos los códigos oficiales.** Completar esta tabla con el hex real de cada color (lo tiene el proveedor o el catálogo de Hydrate; o se puede medir sobre una foto con buena luz):

| Color (como figura en Odoo) | Hex aproximado hoy | Hex oficial (completar) |
|---|---|---|
| Negro | `#161616` | |
| Blanco | `#f2f2f0` | |
| Rojo | `#c62828` | |
| Azul | `#2f5fb3` | |
| Azul Pacifico | `#1f6fa8` | |
| Celeste | `#8ecae6` | |
| Aqua | `#7fd3d0` | |
| Verde Militar | `#4b5320` | |
| Verde Salvia | `#9caf88` | |
| Verde Menta | `#98d7c2` | |
| Verde Pastel | `#b8e0b0` | |
| Oliva | `#6b7a3a` | |
| Jade | `#4f8f7a` | |
| Lima | `#c5d94a` | |
| Amarillo Sol | `#f2c230` | |
| Amarillo Pastel | `#f6e3a1` | |
| Naranja | `#f08a24` | |
| Coral | `#f0806b` | |
| Peach Fuzz | `#f6b38f` | |
| Cherry | `#9b1b30` | |
| Rosado Pastel / Rosa Pastel | `#f4c2c9` | |
| Rosado Flamenco | `#f08a9a` | |
| Soft Pink | `#f4c2c9` | |
| Lila / Lilac | `#b39ddb` | |
| Lila Pastel | `#cdb4e3` | |
| Violeta | `#7d4fa0` | |
| Beige | `#d9c6a5` | |
| Avena | `#d9c6a5` | |
| Choco Mousse | `#5a3a2e` | |
| Gris | `#9a9da1` | |
| Grafito | `#3d3f42` | |
| Negro y Naranja | `#1d1d1d` (bicolor) | |

**Opción B: cargarlos en Odoo.** Crear valores en el atributo **"color"** (tipo de visualización *Color*) con su color hex y asignarlos a cada producto. La landing los toma automáticamente y prioriza lo que diga Odoo. Es más trabajo de carga, pero queda centralizado.

### Acabado
Confirmar si la pintura Hydrate es **mate** (polvo electrostático, lo más común) o **brillante**. La landing ajusta el reflejo según eso.

### Ediciones de clubes
El 3D muestra la forma y el color base, **no el diseño impreso del club**. En esos productos la landing va a mostrar también la **foto real** del producto al lado del 3D, con una nota del tipo "grabamos en la zona libre". No hace falta un modelo 3D especial para los clubes.

---

## 6. Medidas reales (completar con regla o calibre)

La landing escala el modelo a cada capacidad. Necesita las medidas de **cada tamaño** que existe:

| Forma | Capacidad | Alto total (cm) | Diámetro del cuerpo (cm) | Zona grabable: desde/hasta la base (cm) |
|---|---|---|---|---|
| Botella | 350 / 473 / 530 / 620 / 710 / 770 / 946 / 1000 / 1060 ml | | | |
| Termo mate | 800 / 915 / 1200 ml | | | |
| Vaso con tapa | 470 / 591 / 600 / 900 ml | | | |
| Vaso con manija | 887 / 1183 ml | | | |
| Guampa / Copa | 220 / 267 ml | | | |
| Taza | 80 / 160 / 236 / 350 ml | | | |

---

## 7. Después de Higgsfield: preparación en Blender (obligatorio)

Lo que devuelve la IA suele venir **todo en una sola pieza** y con la superficie "mal desplegada", lo que deforma el grabado. Este paso lo puede hacer cualquier persona con nociones de Blender (gratis), o un modelador 3D freelance (es un trabajo corto por modelo):

1. **Importar** el `.glb` en Blender.
2. **Separar las piezas** y nombrar los objetos/materiales **exactamente así** (la landing los busca por nombre):
   - `body`: cuerpo (recibe el color y el grabado)
   - `lid`: tapa
   - `handle`: manija o asa
   - `steel`: partes de acero sin pintar (cuello, borde)
   - `straw`: pajita
3. **Desplegar el UV del cuerpo** con proyección **cilíndrica** (*UV → Cylinder Projection*), para que el grabado no se estire. Es el paso más importante.
4. **Orientación y escala:** parado sobre la base, **origen en el centro de la base**, eje Y hacia arriba, **la zona de grabado mirando hacia adelante (+Z)**, escala real en metros.
5. **Materiales simples:** color base gris neutro, sin texturas.
6. **Exportar glTF Binary (`.glb`)** con compresión **Draco** activada. Objetivo: **menos de 2 MB** por archivo.

---

## 8. Checklist de aceptación (antes de mandarnos cada modelo)

- [ ] Se parece al producto real (comparar con la foto lado a lado).
- [ ] Gris neutro, sin logos ni texto.
- [ ] Piezas separadas y nombradas: `body`, `lid`, `handle`, `steel`, `straw` (las que tenga).
- [ ] UV del cuerpo cilíndrico (en Blender, una textura de cuadrícula se ve pareja, sin estirarse).
- [ ] Parado, origen en la base, frente hacia +Z, escala real.
- [ ] `.glb` con Draco, **menos de 2 MB**.
- [ ] Nombre de archivo según la tabla del §0.
- [ ] Medidas del §6 completadas para esa forma.

---

## 9. Cómo nos los mandan

Subir los `.glb` a `artifacts/termos-landing/public/models/` (o pasarlos por el medio que prefieran) junto con la tabla de medidas y la de colores. La landing los integra **forma por forma**: mientras una forma no tenga su `.glb`, sigue usando el 3D actual, así que no hace falta tener las 6 para empezar.

**Orden sugerido** (de mayor impacto a menor):
1. Botella boca ancha (la línea con más productos).
2. Vaso con tapa.
3. Termo mate.
4. Vaso con manija y pajita (forma nueva).
5. Guampa / Copa.
6. Taza (forma nueva).

> También se pueden generar desde esta misma sesión de Claude: Higgsfield está conectado. Con las fotos de cada forma, se lanza la generación con los parámetros de esta guía (consume créditos de la cuenta de Higgsfield).
