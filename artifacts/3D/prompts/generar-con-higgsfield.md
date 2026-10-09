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

Leé antes `artifacts/termos-landing/GUIA-MODELOS-3D.md` (las reglas de las
fotos, la ficha de cada forma, las medidas y el checklist) y
`artifacts/termos-landing/Mejoras.md` §5 (los requisitos técnicos del .glb).

# Tu tarea

Usá el conector de **Higgsfield** para generar los modelos 3D de las formas
base **a partir de fotos reales** de los productos. Después dejalos listos
para la corrección en Blender. Formas (en este orden de prioridad):

| # | Forma | Archivo final | Producto de referencia | Piezas |
|---|---|---|---|---|
| 1 | Botella boca ancha (Hoppie) | `forma-botella.glb` | Hoppie 710 ml | body · steel (cuello) · lid |
| 2 | Vaso con tapa | `forma-vaso.glb` | Vaso 600 ml | body · lid |
| 3 | Termo mate | `forma-termo-mate.glb` | Termo Mate 1200 ml | body · handle · lid |
| 4 | Vaso con manija y pajita | `forma-vaso-manija.glb` | Vaso con Pico y Agarre 887 ml | body · handle · lid · straw · steel |
| 5 | Guampa / Copa | `forma-guampa.glb` | Guampa 220 ml | body (+ lid si tiene) |
| 6 | Taza | `forma-taza.glb` | Coffee Cup 236 ml | body · handle · lid |

La forma 4 ya está hecha (`artifacts/3D/forma-vaso-manija.glb`). Solo regenerala
si te lo pido.

# Fotos de entrada

Las fotos van en `artifacts/3D/fotos/<forma>/` con estos nombres:
`frente.jpg`, `izquierda.jpg`, `atras.jpg`, `derecha.jpg` (girando el
producto 90° cada vez), más `medidas.txt` con el alto total, el diámetro
del cuerpo y la zona grabable. Si falta una carpeta o una vista, avisame
antes de seguir. **No uses texto a 3D ni inventes vistas sin preguntarme.**

# Proceso por forma

1. **Revisar las fotos** con las reglas de oro de la guía (§2): producto
   entero, cámara a media altura, fondo liso, luz pareja, manija visible en
   una vista lateral. Decime qué foto no sirve y por qué.
2. **Limpiar las fotos antes de convertirlas.** Esto es lo que más
   importa, porque **el 3D copia lo que está en la imagen**:
   - Quitar el fondo (`remove_background`).
   - Si el producto tiene **logo, texto o stickers** (por ejemplo "HYDRATE"),
     o si es de color oscuro o fuerte, editá la foto con `generate_image`
     para dejar el cuerpo **gris claro mate, liso, sin logos**, conservando
     la forma, la tapa y la manija exactas. Las 4 vistas tienen que salir
     con el mismo tratamiento. Mostrame las imágenes editadas al lado de
     las originales antes de pasar al 3D.
   - Las partes de **acero sin pintar** (aros, cuello, base) tienen que
     verse claramente distintas del cuerpo, como una banda gris metálica
     con un borde nítido. Así después se separan fácil.
   - La **manija tiene que verse despegada** del cuerpo, con fondo visible
     entre la manija y el vaso.
3. **Subir las imágenes** a Higgsfield (`media_upload` → PUT → `media_confirm`).
4. **Elegir el modelo** con `models_explore(type:'3d')` y revisar los roles y
   parámetros reales de cada uno. Preferencia:
   - 2–4 vistas → `multi_image_to_3d` (Meshy) o Tripo Multiview. **Es obligatorio en
     las formas con manija** (termo mate, vaso con manija, taza).
   - 1 sola vista buena → Meshy Image to 3D con `symmetry_mode: on`.
5. **Parámetros** (adaptalos a los nombres reales que devuelva
   `models_explore`):
   - `should_texture: false` (sin textura: evita logos y acero horneados);
   - `topology: quad`, `should_remesh: true`;
   - `target_polycount`: 20.000–40.000;
   - `symmetry_mode`: `on` en botella, vaso y guampa; `auto` en las formas con manija;
   - `enable_rigging` / `enable_animation`: `false`;
   - en Tripo: `texture: false`, `quad: true`, `geometry_quality: detailed`,
     `auto_size: true`.
6. **Costo:** antes de cada generación, consultá el precio con `get_cost: true` y
   mostrame el costo y el saldo (`balance`). **No lances nada sin mi OK.**
   Máximo 2 reintentos por forma sin volver a preguntar.
7. **Esperar y descargar** (`jobs_wait`). Guardá el resultado crudo como
   `artifacts/3D/higgsfield/<forma>-raw-v<N>.glb`. **Nunca sobrescribas un
   archivo que ya existe.** Anotá el job_id, el modelo y los parámetros en
   `artifacts/3D/higgsfield/registro.md`.

# Control del resultado crudo (antes de aceptarlo)

Renderizá 4 vistas (frente, lado, atrás, 3/4 desde arriba) y compará con
las fotos lado a lado. Rechazá y reintentá (con otra foto o con otro
modelo) si pasa algo de esto:
- la silueta o las proporciones no coinciden con la foto (alto/diámetro
  fuera de ±5 % respecto a `medidas.txt`);
- la manija está fundida con el cuerpo, rota o duplicada;
- hay agujeros, caras sueltas o "burbujas";
- la tapa o la pajita se deformaron;
- quedaron relieves de logos o texto en la superficie.

Listá los triángulos, el peso, el bounding box y los problemas que veas.

# Después de Higgsfield

Cada modelo aprobado pasa a la corrección en Blender con la misma
especificación que el vaso con manija (ver `corregir-botella.md` como
ejemplo). Si existe `artifacts/3D/scripts/`, **reutilizá ese script bpy**
(generalizalo si hace falta). La especificación:
- objetos/materiales con los nombres exactos `body`, `lid`, `handle`,
  `steel`, `straw` (los que tenga la forma);
- `body` sin textura, gris neutro `#e6e6e6`, metallic 0, roughness ≈ 0,6;
  `steel` en `#c7c9cc`, metallic ≈ 0,9, roughness ≈ 0,35; `handle` gris
  neutro plano;
- UV del cuerpo en **proyección cilíndrica** alrededor de Y, con la costura
  atrás (-Z), u = 0,5 en el frente (+Z), v de la base (0) a la boca (1) y
  sin espejado;
- origen en el centro de la base (y = 0), Y arriba, la **zona de grabado
  hacia +Z** y la manija en +X; escala real en metros según `medidas.txt`;
- normales hacia afuera, *Shade Auto Smooth*, 20.000–40.000 triángulos;
- `.glb` con Draco, menos de 2 MB (ideal menos de 1 MB), guardado como
  `artifacts/3D/<archivo final>`.

Verificación final de cada modelo: renders con el cuerpo en rojo `#c62828`
(el acero tiene que seguir plateado y no puede quedar ningún parche gris) y con
una cuadrícula numerada (cuadros parejos, números derechos en el frente,
costura solo atrás).

# Entrega

Por forma: las fotos usadas (originales y editadas), el modelo y los
parámetros de Higgsfield, el costo en créditos, los renders del modelo
crudo y del corregido, la tabla de objetos/triángulos/peso/bounding box y
las decisiones que tenga que confirmar yo (escala, si la tapa o la manija
van del color del cuerpo, si el acabado es mate o brillante).

**Alternativa a evaluar:** la botella, el vaso con tapa y la guampa son
formas de revolución. Si la IA no da buena forma después de 2 intentos,
proponeme modelarlas en Blender con un perfil + modificador *Screw* a
partir de las medidas reales, antes de seguir gastando créditos.

Si algo de esto no se puede cumplir, explicá por qué y proponé una
alternativa antes de improvisar.
