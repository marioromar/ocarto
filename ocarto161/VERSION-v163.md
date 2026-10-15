# Ocarto v1.63 — ajuste de bordes en curvas Bézier

- «Ajustar bordes» admite áreas con contornos rectos y Bézier, incluso cuando una sola de las dos áreas es curva.
- En el contorno de referencia, busca muestras de los segmentos Bézier y proyecta sobre la curva dentro de la tolerancia indicada.
- Al mover un vértice de la primera área, conserva sus tiradores relativos y sus metadatos de vértice; la geometría curva no se convierte en líneas rectas.
- Se mantienen las salvaguardas para áreas con huecos, áreas bloqueadas y selecciones distintas de dos áreas.

## Verificación

- Pruebas de ajuste a curva Bézier, conservación de tiradores y metadatos, tolerancia y casos sin ajuste.
- `npm test`: 60 pruebas superadas.
