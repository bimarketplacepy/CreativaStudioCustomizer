# Plan: stickers con relieve en 3D

Creativa Studio · Stickers UV DTF · eufyMake E1 con Roll-to-Film · 16 de octubre de 2026
Versión visual: https://claude.ai/artifact/PRu1hd8GKfHPg4ivAVQqTz

Objetivo: que pedir stickers desde el celular sea tan directo como diseñar un termo, y que el
acabado "Relieve 3D" se vea con volumen real antes de pedirlo.

## La pregunta: ¿se puede ver el sticker en 3D con los relieves?

Sí. El sitio ya usa R3F para los termos, así que el sticker se arma como una pieza con grosor y
la tinta levantada encima. Al elegir "Relieve 3D" la tinta sube animada y pasa una luz rasante; el
cliente lo inclina con el dedo. Con "Brillante" queda plano, con barniz. Es una vista de
referencia: la altura real la decide el software de la E1.

## Problemas actuales (celular)

| # | Problema | Por qué pasa |
|---|----------|--------------|
| 1 | Tras subir el diseño, la vista previa queda arriba y fuera de pantalla | Página larga: tamaño, corte, acabado y cantidad están debajo |
| 2 | "Relieve 3D" casi no se distingue de "Brillante" | Es un filtro de luz sobre una imagen plana |
| 3 | Un logo blanco no se ve sobre el sticker blanco | Fondo de la vista claro, sin opción de cambiarlo |
| 4 | Cuesta imaginar el tamaño real | Solo hay una cuadrícula de 1 cm |
| 5 | Precio y "Pedir" quedan al final | Con precios apagados el recuadro dice "Precio" sin monto |
| 6 | Tamaño elegido dos veces; cantidad en dos filas | Botones 5/7/10/15 cm + deslizador; 10/25/50/100 no entran |
| 7 | El aviso de baja resolución asusta | Tres líneas en amarillo aunque a menor tamaño quede bien |

## Etapa 1 — Una pantalla fija, como en los termos (mediana)

- Primero el diseño: una sola acción "Elegir imagen" (+ ejemplos).
- Después: sticker siempre arriba, una fila por opción (Tamaño 5/7/10/15/Otro, Forma, Acabado,
  Cantidad) y barra fija abajo con resumen, precio y "Pedir ›".
- Tamaño: "Otro" abre el deslizador en una hoja aparte; se quita la doble elección.
- Fondo de la vista: claro / oscuro / color de termo. Si el diseño es casi todo blanco arranca en oscuro.
- Resolución: marca chica junto al tamaño ("Se puede ver pixelado") con el tamaño máximo recomendado.
- En PC se mantiene en dos columnas, con la misma barra de pedido.

## Etapa 2 — El sticker en 3D, con relieve (grande)

- Sticker: el contorno de corte de `sticker-shape.ts` extruido como lámina fina con borde redondeado.
- Arte: imagen recortada encima con material brillante tipo barniz.
- Relieve: mapa de alturas desde la imagen (tinta sube, bordes suavizados) → displacement + normal map.
- Interacción: inclinar con un dedo hasta ~35°, luz rasante periódica, relieve animado al cambiar acabado.
- Rendimiento: un solo visor, frameloop a demanda, mapa calculado una vez por diseño, fallback a la
  vista plana sin WebGL, carga diferida.
- Archivos: `sticker-3d.tsx` (nuevo), `lib/sticker-relief.ts` (nuevo), `sticker-shape.ts`,
  `lib/ar-viewer.ts` (opcional).

## Etapa 3 — Tamaño real y confianza (mediana)

- Sticker a escala sobre un vaso (modelo 3D existente), celular o notebook.
- Silueta de tarjeta de crédito como referencia de escala.
- Ver en AR a tamaño real (reutiliza lo del termo).
- Más adelante: varios diseños en el mismo pedido.

## Etapa 4 — Pedido y precio (chica)

- Hoja de resumen antes de WhatsApp (tamaño, forma, acabado, cantidad, precio).
- Con precios activos: total, precio unitario y ahorro por cantidad. Apagados: "A cotizar por WhatsApp".
- Archivo para el taller: el PNG sigue igual; si sirve, se suma el mapa de alturas en grises.

## Etapa 5 — Medir (chica)

Eventos: `sticker_finish_select`, `sticker_3d_tilt`, `sticker_context`, tiempo subida→"Pedir",
abandono antes de pedir. Comparar % de pedidos con relieve antes y después de la vista 3D.

## Para confirmar con el taller (antes de la Etapa 2)

1. ¿La E1 levanta todo lo impreso parejo o decide alturas por zona (color / mapa)?
2. Altura real del relieve en mm y grosor del vinilo.
3. ¿El borde blanco lleva relieve o queda plano?
4. ¿Sirve mandar un mapa de alturas junto con el PNG de producción?

La Etapa 1 no depende de esto. La vista 3D arranca con relieve parejo y se ajusta con la respuesta.

## Orden sugerido

1. Etapa 1 · 2. Confirmar relieve con el taller · 3. Etapa 2 · 4. Etapas 3 y 4 · 5. Etapa 5
