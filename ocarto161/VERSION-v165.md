# Ocarto v1.65 — ajuste con desplazamientos de objeto

- «Ajustar bordes» ahora compara las coordenadas efectivas de las áreas, incluyendo el desplazamiento del objeto y no solo las coordenadas locales de sus vértices.
- El resultado se guarda de nuevo en las coordenadas locales de la primera área; mover el objeto no altera el desplazamiento ni la forma de la segunda.
- Se aplica tanto a contornos rectos como Bézier, con desplazamientos distintos entre ambas áreas.
- Se rechazan desplazamientos no válidos y se mantienen la tolerancia, los tiradores y los metadatos.

## Verificación

- Pruebas de desplazamientos distintos en contornos rectos y transformación compartida en curvas Bézier.
- `npm test`: 60 pruebas superadas.
