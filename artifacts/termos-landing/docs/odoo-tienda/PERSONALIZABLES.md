# Productos personalizables desde la tienda (mapa)

**Fecha:** 2026-11-10 · **Base:** staging `marketplace-staging-261109-41612773` (copia de producción del 09/11) · **Generado con:** `node scripts/odoo-personalizables.mjs --md <archivo>`.

Solo se personalizan los **mismos estilos que tiene el personalizador**, no todo lo que cae en la categoría Termos o Vasos. La regla vive en `lib/print-specs/src/shop-personalizable.ts` y la usan el script que marca `cs_personalizable` en Odoo y la landing (que no abre el editor para un producto que no corresponde):

1. **Nombre:** el producto de la tienda, con su edición («Vaso Taza · River Plate»), coincide con un **modelo 3D exacto** del personalizador. No entran las formas genéricas aproximadas (Termo Classic, Matero Classic, Go Everyday Tumbler…) ni las ediciones de clubes sin modelo propio, que tienen escudo de fábrica y, en varios casos, otra tapa o manija.
2. **Código e imagen:** se cruzaron las fotos de Odoo de cada plantilla con el modelo. Cinco productos con el nombre de un modelo pero de **otro estilo** quedan excluidos por código (`STYLE_EXCLUSIONS`):

| Código | Producto | Por qué no |
|---|---|---|
| 220973 | Vaso 470 ml Beige | Vaso pint recto, sin tapa ni escalón (el 3D es el vaso escalonado de 600/900 ml) |
| 262972 | Vaso 473 ml Cherry | Ídem |
| 262978 | Vaso 473 ml Naranja | Ídem |
| 210202 | Termo Mate 1200 ml Amarillo Sol | Manija en el cuerpo y taza (el 3D no tiene manija) |
| 262960 | Termo 530 ml Naranja | Tapa con pajita y funda en la base (el 3D es el de tapa a rosca) |

**Resultado en staging:** 97 plantillas personalizables, 41 no (16 ediciones sin modelo propio, 20 formas genéricas o sin modelo, 5 por estilo). El catálogo solo incluye productos **con stock**: una plantilla agotada se desmarca y vuelve a marcarse cuando tenga stock (el script es idempotente).

**Para sumar un producto:** cargar su modelo 3D en el personalizador (`products.ts`, con su nombre en `exactFor`) y volver a correr el script. **Para excluir uno del mismo nombre pero otro estilo:** agregar su código a `STYLE_EXCLUSIONS` con el motivo.

## Mapa completo

| Código | Plantilla en Odoo | Producto en el personalizador | Modelo 3D | Personalizable | Motivo |
|---|---|---|---|---|---|
| 108190 | [108190] Copa Aqua. | Copa | `copa-hydrate` | Sí |  |
| 108196 | [108196] Copa Rosado Pastel. | Copa | `copa-hydrate` | Sí |  |
| 190738 | [190738] FOOD FLASK 830 ML ROJO | Food Flask | `food-flask` | Sí |  |
| 220389 | [220389] FOOD FLASK 591 ML AMARILLO SOL | Food Flask | `food-flask` | Sí |  |
| 220393 | [220393] FOOD FLASK 830 ML ROSADO PASTEL | Food Flask | `food-flask` | Sí |  |
| 220395 | [220395] FOOD FLASK 830 ML VERDE PASTEL | Food Flask | `food-flask` | Sí |  |
| 109613 | [109613] Growler 1.9lts Verde Militar | Growler | `growler` | Sí |  |
| 214205 | [214205] Growler 1.9lts Aqua | Growler | `growler` | Sí |  |
| 214206 | [214206] Growler 1.9lts Blanco | Growler | `growler` | Sí |  |
| 220884 | [220884] Growler 1.9lts Beige | Growler | `growler` | Sí |  |
| 108202 | [108202] Kids Blanco. | Hoppie Kids | `hoppie-kids` | Sí |  |
| 108206 | [108206] Kids Gris. | Hoppie Kids | `hoppie-kids` | Sí |  |
| 132718 | [132718] Kids Verde Pastel | Hoppie Kids | `hoppie-kids` | Sí |  |
| 206562 | [206562] ICE BUCKET 3250 ML CORAL | Ice Bucket | `ice-bucket` | Sí |  |
| 220139 | [220139] QUENCHER 887ML FLOWSTATE BLANCO | Quencher H2.0 | `vaso-quencher` | Sí |  |
| 222463 | [222463] QUENCHER 887ML FLOWSTATE CREMA. | Quencher H2.0 | `vaso-quencher` | Sí |  |
| 241502 | [241502] QUENCHER H2,0 590ML CREMA | Quencher H2.0 | `vaso-quencher` | Sí |  |
| 241505 | [241505] QUENCHER H2,0 590ML NEGRO | Quencher H2.0 | `vaso-quencher` | Sí |  |
| 262760 | [262760] QUENCHER 887ML PETROL | Quencher H2.0 | `vaso-quencher` | Sí |  |
| 274547 | [274547] QUENCHER FLOWSTATE 1.18 LTS CHERRY BLOSSOM | Quencher H2.0 | `vaso-quencher` | Sí |  |
| 254260 | [254260] QUENCHER PROTOUR 1.18 LTS STRIKER BLUE MESSI | Quencher ProTour | `vaso-protour` | Sí |  |
| 194198 | [194198] V2 PRO series Litro Rosa Pastel | Termo Frontier | `hoppie` | Sí |  |
| 258087 | [258087] TERMO 1060 ML ROSA FLAMENCO | Termo Frontier | `hoppie` | Sí |  |
| 108121 | [108121] Hydrate 530ml Amarillo Sol | Termo Hydrate | `hoppie-hydrate` | Sí |  |
| 108134 | [108134] 530ml Negro | Termo Hydrate | `hoppie-hydrate` | Sí |  |
| 108222 | [108222] Litro Blanco | Termo Hydrate | `hoppie-hydrate` | Sí |  |
| 108229 | [108229] Litro Rosado Flamenco | Termo Hydrate | `hoppie-hydrate` | Sí |  |
| 108231 | [108231] Litro Verde Menta | Termo Hydrate | `hoppie-hydrate` | Sí |  |
| 128366 | [128366] Litro Amarillo Sol | Termo Hydrate | `hoppie-hydrate` | Sí |  |
| 128367 | [128367] Litro Azul Pacifico | Termo Hydrate | `hoppie-hydrate` | Sí |  |
| 258910 | [258910] TERMO 946 ML VERDE MILITAR EDICION 1 PALMEIRAS | Termo Hydrate · Palmeiras | `termo-hydrate-palmeiras` | Sí |  |
| 258911 | [258911] TERMO 946 ML VERDE MILITAR EDICION 2 PALMEIRAS | Termo Hydrate · Palmeiras | `termo-hydrate-palmeiras` | Sí |  |
| 220356 | [220356] Termo Mate Verde Militar 915ml | Termo Mate | `termo-mate` | Sí |  |
| 220358 | [220358] Termo Mate Aqua 915ml | Termo Mate | `termo-mate` | Sí |  |
| 220359 | [220359] Termo Mate Rojo 915ml | Termo Mate | `termo-mate` | Sí |  |
| 220360 | [220360] Termo Mate Rosado Pastel 915ml | Termo Mate | `termo-mate` | Sí |  |
| 220361 | [220361] Termo Mate Lila 915ml | Termo Mate | `termo-mate` | Sí |  |
| 246727 | [246727] TERMO MATE 800 ML AVENA | Termo Mate | `termo-mate` | Sí |  |
| 246960 | [246960] TERMO MATE FORGE 1200 ML AZUL | Termo Mate Forge | `termo-mate-forge` | Sí |  |
| 108164 | [108164] 710ml Aqua. | Termo Sleek Line | `termo-sleek` | Sí |  |
| 132715 | [132715] 620ml Amarillo Sol. | Termo Sleek Line | `termo-sleek` | Sí |  |
| 202749 | [202749] TUMBLER FLIP 887ML- PLUM STRIPE | Tumbler Flip | `vaso-flip` | Sí |  |
| 251291 | [251291] TUMBLER FLIP 887ML - CHERRY BLOSSOM | Tumbler Flip | `vaso-flip` | Sí |  |
| 108236 | [108236] Vaso 900ml Verde Militar. | Vaso | `vaso-hydrate` | Sí |  |
| 108240 | [108240] Vaso 600ml Aqua. | Vaso | `vaso-hydrate` | Sí |  |
| 108243 | [108243] Vaso 600ml Coral. | Vaso | `vaso-hydrate` | Sí |  |
| 108248 | [108248] Vaso 900ml Aqua. | Vaso | `vaso-hydrate` | Sí |  |
| 108250 | [108250] Vaso 900ml Blanco. | Vaso | `vaso-hydrate` | Sí |  |
| 108252 | [108252] Vaso 900ml Gris. | Vaso | `vaso-hydrate` | Sí |  |
| 120297 | [120297] Vaso 600ml Azul Pacifico. | Vaso | `vaso-hydrate` | Sí |  |
| 120299 | [120299] Vaso 600ml Verde Menta. | Vaso | `vaso-hydrate` | Sí |  |
| 128387 | [128387] Vaso 900ml Amarillo Sol | Vaso | `vaso-hydrate` | Sí |  |
| 128390 | [128390] Vaso 900ml Verde Menta. | Vaso | `vaso-hydrate` | Sí |  |
| 128391 | [128391] Vaso 900ml Verde Salvia. | Vaso | `vaso-hydrate` | Sí |  |
| 184298 | [184298] Vaso 900ml rojo | Vaso | `vaso-hydrate` | Sí |  |
| 232946 | [232946] Vaso 900ml Negro y Naranja | Vaso | `vaso-hydrate` | Sí |  |
| 258231 | [258231] VASO 473 ML EDICION 2 GUARANI. | Vaso · Guaraní | `vaso-guarani` | Sí |  |
| 241699 | [241699] VASO 887 ML NEGRO OLIMPIA | Vaso · Olimpia | `vaso-olimpia` | Sí |  |
| 241711 | [241711] VASO 600ML AMARILLO SOL LUQUE | Vaso · Sportivo Luqueño | `vaso-luqueno` | Sí |  |
| 119539 | [119539] 350ml Café - Aqua. | Vaso Café | `vaso-cafe` | Sí |  |
| 119540 | [119540] 350ml Café - Celeste. | Vaso Café | `vaso-cafe` | Sí |  |
| 119541 | [119541] 350ml Café - Coral. | Vaso Café | `vaso-cafe` | Sí |  |
| 119544 | [119544] 350ml Café - Rosado Flamenco. | Vaso Café | `vaso-cafe` | Sí |  |
| 119546 | [119546] 350ml Café - Verde Militar. | Vaso Café | `vaso-cafe` | Sí |  |
| 132655 | [132655] 350ml Café - Azul Pacifico. | Vaso Café | `vaso-cafe` | Sí |  |
| 206239 | [206239] 350ml Café - Amarillo Sol | Vaso Café | `vaso-cafe` | Sí |  |
| 206579 | [206579] VASO C/ PICO Y AGARRE 887 ML VERDE MILITAR | Vaso con Pico y Agarre | `vaso-manija` | Sí |  |
| 224418 | [224418] VASO CON PICO Y AGARRE 887 ML AZUL | Vaso con Pico y Agarre | `vaso-manija` | Sí |  |
| 224428 | [224428] VASO CON PICO Y AGARRE 887 ML ROJO | Vaso con Pico y Agarre | `vaso-manija` | Sí |  |
| 241683 | [241683] VASO CON PICO Y AGARRE 887 ML ROJO CERRO. | Vaso con Pico y Agarre · Cerro Porteño | `vaso-manija-cerro` | Sí |  |
| 241687 | [241687] VASO CON PICO Y AGARRE 887 ML AZUL LUQUE | Vaso con Pico y Agarre · Sportivo Luqueño | `vaso-manija-luqueno` | Sí |  |
| 121069 | [121069] Manija Coral. | Vaso Manija | `taza-manija` | Sí |  |
| 121071 | [121071] Manija Verde Militar. | Vaso Manija | `taza-manija` | Sí |  |
| 214166 | [214166] Manija Rojo | Vaso Manija | `taza-manija` | Sí |  |
| 214170 | [214170] Manija Azul Pacifico | Vaso Manija | `taza-manija` | Sí |  |
| 214175 | [214175] Manija Gris | Vaso Manija | `taza-manija` | Sí |  |
| 214209 | [214209] Manija Verde Menta | Vaso Manija | `taza-manija` | Sí |  |
| 258908 | [258908] MANIJA 710 ML VERDE MILITAR EDICION 1 PALMEIRAS | Vaso Manija · Palmeiras | `taza-manija-palmeiras` | Sí |  |
| 221405 | [221405] SUNBEAM 1183ML AQUA | Vaso Sunbeam | `vaso-sunbeam` | Sí |  |
| 221408 | [221408] SUNBEAM 1183ML GRAFITO | Vaso Sunbeam | `vaso-sunbeam` | Sí |  |
| 221410 | [221410] SUNBEAM 1183ML NEGRO | Vaso Sunbeam | `vaso-sunbeam` | Sí |  |
| 262946 | [262946] SUNBEAM 1183 ML JADE | Vaso Sunbeam | `vaso-sunbeam` | Sí |  |
| 262951 | [262951] SUNBEAM 887 ML CHOCO MOUSSE | Vaso Sunbeam | `vaso-sunbeam` | Sí |  |
| 262952 | [262952] SUNBEAM 887 ML JADE | Vaso Sunbeam | `vaso-sunbeam` | Sí |  |
| 132720 | [132720] Taza Aqua. | Vaso Taza | `vaso-taza` | Sí |  |
| 132722 | [132722] Taza Azul Pacifico. | Vaso Taza | `vaso-taza` | Sí |  |
| 220400 | [220400] Taza Amarillo Sol | Vaso Taza | `vaso-taza` | Sí |  |
| 258909 | [258909] TAZA 355 ML VERDE MILITAR EDICION 1 PALMEIRAS | Vaso Taza · Palmeiras | `vaso-taza-palmeiras` | Sí |  |
| 265075 | [265075] TAZA 355 ML NEGRO EDICION UV RIVER | Vaso Taza · River Plate | `vaso-taza-river` | Sí |  |
| 214679 | [214679] TAZA ESPRESSO 160 ML AZUL | Vaso Taza Espresso | `vaso-espresso` | Sí |  |
| 214682 | [214682] TAZA ESPRESSO 160 ML ROSADO PASTEL | Vaso Taza Espresso | `vaso-espresso` | Sí |  |
| 214683 | [214683] TAZA ESPRESSO 160 ML VERDE MILITAR | Vaso Taza Espresso | `vaso-espresso` | Sí |  |
| 214684 | [214684] TAZA ESPRESSO 80 ML AZUL | Vaso Taza Espresso | `vaso-espresso` | Sí |  |
| 214687 | [214687] TAZA ESPRESSO 80 ML VERDE MILITAR | Vaso Taza Espresso | `vaso-espresso` | Sí |  |
| 214688 | [214688] TAZA ESPRESSO 80 ML ROSADO PASTEL | Vaso Taza Espresso | `vaso-espresso` | Sí |  |
| 275173 | [275173] WHISKY LOWBALL 295 ML NEGRO | Vaso Whisky Lowball | `vaso-whisky` | Sí |  |
| 275174 | [275174] WHISKY LOWBALL 295 ML VERDE MILITAR | Vaso Whisky Lowball | `vaso-whisky` | Sí |  |
| 208318 | [208318] BOTELLA AEROLIGHT 1.06LTS. NARANJA | Botella Aerolight | `botella-ancha` | No | sin modelo 3D en el personalizador |
| 233279 | [233279] GO EVERYDAY TUMBLER GUAVA | Go Everyday Tumbler | `vaso` | No | forma genérica aproximada, no es un modelo del personalizador |
| 243240 | [243240] GUAMPA 220 ML BLANCO | Guampa | `guampa` | No | forma genérica aproximada, no es un modelo del personalizador |
| 243241 | [243241] GUAMPA 220 ML NEGRO | Guampa | `guampa` | No | forma genérica aproximada, no es un modelo del personalizador |
| 107316 | [107316] MATERO CLASSIC 236 ML VERDE | Matero Classic | `guampa` | No | forma genérica aproximada, no es un modelo del personalizador |
| 107317 | [107317] MATERO CLASSIC 236ML NEGRO | Matero Classic | `guampa` | No | forma genérica aproximada, no es un modelo del personalizador |
| 237762 | [237762] MATERO/GUAMPA CLASSIC 236ML SILVER | Matero Classic | `guampa` | No | forma genérica aproximada, no es un modelo del personalizador |
| 238446 | [238446] MATERO/GUAMPA CLASSIC 236 ML ROSA MESSI | Matero Classic | `guampa` | No | forma genérica aproximada, no es un modelo del personalizador |
| 254258 | [254258] MATERO/GUAMPA CLASSIC 236 ML BLUE MESSI | Matero Classic | `guampa` | No | forma genérica aproximada, no es un modelo del personalizador |
| 257349 | [257349] MATERO/GUAMPA CLASSIC 236 MESSI BLACK | Matero Classic | `guampa` | No | forma genérica aproximada, no es un modelo del personalizador |
| 224003 | [224003] GUAMPA TERERE 200ML NEGRO | Matero Tereré | `guampa` | No | forma genérica aproximada, no es un modelo del personalizador |
| 254253 | [254253] MATERO/GUAMPA TERERE 200ML DRIED PINE | Matero Tereré | `guampa` | No | forma genérica aproximada, no es un modelo del personalizador |
| 179304 | [179304] TERMO CLASSIC 940ML LAKE PICO MATERO | Termo Classic | `termo` | No | sin modelo 3D en el personalizador |
| 233275 | [233275] TERMO CLASSIC 940 ML NEGRO PICO MATERO | Termo Classic | `termo` | No | sin modelo 3D en el personalizador |
| 274536 | [274536] TERMO CLASSIC 940ML H SILVER PICO PLANO | Termo Classic | `termo` | No | sin modelo 3D en el personalizador |
| 94820 | [94820] TERMO CLASSIC 1,4LTS NEGRO | Termo Classic | `termo` | No | sin modelo 3D en el personalizador |
| 94822 | [94822] TERMO CLASSIC 1,4LTS  ROJO | Termo Classic | `termo` | No | sin modelo 3D en el personalizador |
| 97112 | [97112] TERMO CLASSIC 1,9 LT NEGRO | Termo Classic | `termo` | No | sin modelo 3D en el personalizador |
| 262960 | [262960] TERMO 530 ML NARANJA | Termo Hydrate | `hoppie-hydrate` | No | Termo 530 ml Naranja: tapa con pajita y funda, otro modelo |
| 241693 | [241693] TERMO 532 ML AZUL CERRO | Termo Hydrate · Cerro Porteño | `hoppie-hydrate` | No | edición sin modelo propio (escudo o forma distinta) |
| 265073 | [265073] TERMO 532 ML BLANCO EDICION 1 RIVER | Termo Hydrate · River Plate | `hoppie-hydrate` | No | edición sin modelo propio (escudo o forma distinta) |
| 265074 | [265074] TERMO 532 ML ROJO EDICION 1 RIVER | Termo Hydrate · River Plate | `hoppie-hydrate` | No | edición sin modelo propio (escudo o forma distinta) |
| 242154 | [242154] TERMO 946 ML AMARILLO SOL EDICION 1 LUQUE | Termo Hydrate · Sportivo Luqueño | `hoppie-hydrate` | No | edición sin modelo propio (escudo o forma distinta) |
| 210202 | [210202] Termo Mate Amarillo Sol 1200ml | Termo Mate | `termo-mate` | No | Termo Mate 1200 ml Amarillo Sol: manija en el cuerpo y taza, otro modelo |
| 241737 | [241737] TERMO MATE 915 ML BLANCO ALBIRROJA | Termo Mate · Albirroja | `termo-mate` | No | edición sin modelo propio (escudo o forma distinta) |
| 241757 | [241757] TERMO MATE 1200 ML AZUL CERRO | Termo Mate · Cerro Porteño | `termo-mate` | No | edición sin modelo propio (escudo o forma distinta) |
| 241764 | [241764] TERMO MATE 1200 ML AMARILLO SOL GUARANI | Termo Mate · Guaraní | `termo-mate` | No | edición sin modelo propio (escudo o forma distinta) |
| 258912 | [258912] TERMO MATE 1200 ML VERDE MILITAR EDICION 1 PALMEIR | Termo Mate · Palmeiras | `termo-mate` | No | edición sin modelo propio (escudo o forma distinta) |
| 258913 | [258913] TERMO MATE 915 ML VERDE MILITAR EDICION 1 PALMEIRA | Termo Mate · Palmeiras | `termo-mate` | No | edición sin modelo propio (escudo o forma distinta) |
| 265079 | [265079] TERMO MATE 1200 ML NEGRO EDICION 1 RIVER | Termo Mate · River Plate | `termo-mate` | No | edición sin modelo propio (escudo o forma distinta) |
| 265080 | [265080] TERMO MATE 915 ML BLANCO EDICION 1 RIVER | Termo Mate · River Plate | `termo-mate` | No | edición sin modelo propio (escudo o forma distinta) |
| 265081 | [265081] TERMO MATE 915 ML NEGRO EDICION 1 RIVER | Termo Mate · River Plate | `termo-mate` | No | edición sin modelo propio (escudo o forma distinta) |
| 242150 | [242150] TERMO 710 ML AMARILLO SOL EDICION 1 LUQUE | Termo Sleek Line · Sportivo Luqueño | `termo-sleek` | No | edición sin modelo propio (escudo o forma distinta) |
| 242151 | [242151] TERMO 710 ML AZUL EDICION 2 LUQUE | Termo Sleek Line · Sportivo Luqueño | `termo-sleek` | No | edición sin modelo propio (escudo o forma distinta) |
| 220973 | [220973] Vaso 470ml Beige | Vaso | `vaso-hydrate` | No | Vaso 470 ml Beige: vaso pint recto, no el vaso escalonado del 3D |
| 262972 | [262972] VASO 473 ML CHERRY | Vaso | `vaso-hydrate` | No | Vaso 473 ml Cherry: vaso pint recto, no el vaso escalonado del 3D |
| 262978 | [262978] VASO 473 ML NARANJA | Vaso | `vaso-hydrate` | No | Vaso 473 ml Naranja: vaso pint recto, no el vaso escalonado del 3D |
| 241769 | [241769] TERMO CAFÉ 355 ML BLANCO ALBIRROJA | Vaso Café · Albirroja | `vaso-cafe` | No | edición sin modelo propio (escudo o forma distinta) |
| 241770 | [241770] TERMO CAFÉ 355 ML ROJO CERRO | Vaso Café · Cerro Porteño | `vaso-cafe` | No | edición sin modelo propio (escudo o forma distinta) |
| 89454 | [89454] VASO CLASSIC 473 ML AZUL NOCHE C/TAPA+ABRIDOR | Vaso Classic | `vaso` | No | forma genérica aproximada, no es un modelo del personalizador |
| 269688 | [269688] VASO EVERYDAY PINT 470ML PARAGUAY 1 | Vaso Everyday Pint | `vaso` | No | forma genérica aproximada, no es un modelo del personalizador |
