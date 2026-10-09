# Contexto

Trabajo en la landing de **Creativa Studio** (Paraguay), un taller que
personaliza termos y vasos de la marca **Hydrate** con grabado láser e
impresión UV. La landing tiene un **personalizador 3D** hecho con three.js
(r184): el cliente elige un producto, ve un modelo 3D que gira y le agrega
texto, íconos o logos, que se "graban" sobre el cuerpo.

Los productos y colores salen del ecommerce (Odoo). Para no hacer un modelo
por producto, usamos **6 "formas base"**. Cada forma es **un solo modelo 3D
en color neutro** que la landing:
- **pinta** con el color real de la variante elegida (el material del cuerpo
  recibe un color plano);
- **estira** según la capacidad (por ejemplo 530 → 710 → 1000 ml);
- **graba**: aplica el diseño del cliente como una capa sobre el cuerpo,
  usando una proyección cilíndrica (u = vuelta alrededor del eje vertical,
  v = altura).

Las 6 formas son: **botella boca ancha / Hoppie** (este caso), termo mate,
vaso con tapa, vaso con manija (ya terminado e integrado), guampa/copa y
taza.

Los modelos los genera el dueño con Higgsfield (imagen → 3D, motor Meshy).
**Tu tarea es corregir el modelo con Blender**, con un script bpy en modo
background reutilizable para los próximos modelos.

# Archivo a corregir

`artifacts/3D/botella-raw-v1.glb`: forma **"botella boca ancha"** (Hydrate
Hoppie 710 ml). **No sobrescribas el original.**

Viene de Higgsfield (job `e434a209-7ed5-463d-94a1-86f55b2dd97c`,
`multi_image_to_3d`, sin textura, quad, symmetry on). Fotos de referencia:
`artifacts/3D/fotos/botella/originales/` (frente, lado, atrás, arriba;
cuerpo verde militar, tapa negra, logo en el frente). **Si las fotos no
están en el repo, pedímelas antes de decidir colores o piezas.**

Estructura actual (ya analizada):
- **1 sola malla** (`Mesh0`), **sin material ni textura**, 58.642
  triángulos, 33.916 vértices, 1,37 MB, sin Draco.
- Tiene UV, pero cortado en 299 islas (8.736 bordes de costura). Soldando a
  0,1 mm queda cerrada: 0 bordes abiertos, 0 aristas no-manifold.
- Eje Y arriba. Bounding box ≈ x [-0,310, 0,308] · y [-0,951, 0,948] ·
  z [-0,326, 0,325] (unidades de Meshy, **sin escala real**, origen en el
  centro y no en la base).
- **Eje del cuerpo corrido:** el centro del cilindro está en x ≈ 0,
  **z ≈ +0,0145** (radio ≈ 0,31). Hay que centrarlo.
- Perfil medido por altura (radio máximo):
  - y −0,95 a −0,85: base redondeada;
  - y −0,85 a 0,375: **cuerpo cilíndrico recto** (radio 0,31);
  - y 0,375 a 0,45: hombro/labio (0,325 → 0,30);
  - y 0,45 a 0,73: **tapa** (radio ≈ 0,27, con relieves y rebajes laterales);
  - y 0,73 a 0,95: **asa de transporte** de la tapa, inclinada hacia
    **-Z** (atrás). De frente (+Z) se ve el agujero del asa.
- Sin relieve del logo ni del texto en el cuerpo (bien).

# Problemas a corregir

1. **Todo es una sola pieza sin materiales.**
   → Separar por altura (y verificar contra las fotos):
   - `body`: base + cuerpo + hombro hasta donde termina la pintura;
   - `steel`: el cuello o labio de acero entre el cuerpo y la tapa, **si en
     las fotos se ve acero expuesto** (en el Hoppie suele verse un aro fino).
     Si no se ve, no lo inventes;
   - `lid`: tapa + asa, en una sola pieza.
2. **Eje corrido y escala falsa.**
   → Centrar el eje del cilindro en x = z = 0. Origen en el **centro de la
   base**, apoyado en y = 0, Y arriba. Escala real en metros: si existe
   `medidas.txt`, usalo; si no, dejá el **alto total (con tapa) en 0,26 m**
   y avisame para ajustarlo.
3. **Orientación del frente.**
   → El frente (la cara del logo en `frente.jpg`) mira hacia **+Z**.
   Confirmalo con las fotos. El asa queda de frente, como en `frente.jpg`.
4. **El cuerpo de IA nunca queda perfectamente cilíndrico,** y el grabado lo
   nota.
   → **Recomendado:** reconstruir `body` (y `steel`, si hay) como **superficie
   de revolución** a partir del perfil medido (Screw/Spin de un perfil, 128
   segmentos), con las mismas medidas. Queda un cilindro perfecto y liviano.
   La tapa y el asa sí se conservan de Meshy.
   Si preferís no reconstruir, explicá por qué.
5. **UV del cuerpo cortado en islas.**
   → UV de `body` con **proyección cilíndrica** alrededor de Y: costura
   atrás (**-Z**), **u = 0,5 en el frente (+Z)** y creciendo hacia **+X**,
   v de la base (0) a la boca (1), sin espejado.
6. **Polígonos de más (58.642).**
   → Total **20.000–40.000**. Decimá la tapa y el asa (objetivo ~8–12k)
   cuidando el agujero del asa y los rebajes; el cuerpo, si es de
   revolución, sale liviano solo.

# Especificación de salida (vale para todos los modelos)

- **Objetos/materiales con estos nombres exactos** (la landing los busca por
  nombre):
  - `body`: cuerpo (recibe el color y el grabado). Gris neutro **#e6e6e6**,
    metallic 0, roughness ≈ 0,6, **sin textura**;
  - `lid`: tapa + asa. **Plástico negro** como el real: #1c1c1e,
    metallic 0, roughness ≈ 0,5;
  - `steel` (si hay): acero cepillado #c7c9cc, metallic ≈ 0,9,
    roughness ≈ 0,35;
  - no hay `handle` ni `straw` en esta forma.
- Materiales PBR estándar (Principled BSDF): solo base color, metallic y
  roughness.
- Normales hacia afuera, *Shade Auto Smooth* (que los bordes de la tapa y del
  asa no queden "derretidos"), sin caras sueltas ni agujeros. Sin
  doubleSided si las normales quedan bien.
- En el nodo `body`, agregá `extras` como en `forma-vaso-manija.glb`:
  `uv_projection: "cylindrical-y"`, `uv_seam: "-Z"`,
  `uv_u0_angle: "u=0.5 at +Z (front), u increases toward +X"`,
  `paint_band_m: [y_min, y_max]` (dónde empieza y termina la pintura) y
  `radius_median_m`.
- Exportar **glTF Binary (.glb)**, Y-up, **con compresión Draco**, objetivo
  **< 1 MB**.
- Guardar como **`artifacts/3D/forma-botella.glb`**, con el script en
  **`artifacts/3D/scripts/`**. Hacelo genérico (archivo de entrada, alturas de
  corte, nombres y escala como parámetros), porque el del vaso con manija no
  quedó guardado y lo vamos a reutilizar con termo mate, vaso, guampa y taza.
- Anotá la corrección en `artifacts/3D/higgsfield/registro.md`, en la
  entrada de la Forma 1 (si no existe ese archivo, crealo).

# Verificación (antes de dar por terminado)

1. Listar objetos, materiales, triángulos por objeto, peso del archivo y
   bounding box final. Confirmar que el eje queda centrado: el radio del
   cuerpo debe ser el mismo en ±X y ±Z.
2. Renderizar con three.js 4 vistas (frente +Z, lado +X, atrás -Z y 3/4
   desde arriba) con:
   - a) el cuerpo en **rojo #c62828**: la tapa sigue negra, el acero (si hay)
     plateado y ningún pedazo del cuerpo queda en otro color;
   - b) una **textura de cuadrícula numerada** en el cuerpo: cuadros parejos,
     números derechos (no espejados) en el frente y costura solo atrás.
3. Comparar lado a lado con las fotos (frente y lado): proporción alto/ancho
   y forma de la tapa y el asa.
4. Confirmar que el .glb abre sin errores en three.js / glTF Viewer
   (https://gltf-viewer.donmccurdy.com).
5. Entregar un resumen con lo que cambiaste, las capturas y las decisiones a
   confirmar (escala real, si hay acero visible, color de la tapa).

Si algo de esta especificación no se puede cumplir con este modelo, explicá
por qué y proponé la alternativa antes de improvisar.
