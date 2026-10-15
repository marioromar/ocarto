# Ocarto v64 — cultivos y frutales como clases de aprendizaje

- El selector de ejemplos incluye «Amarillo · cultivo o terreno abierto» y una etiqueta separada «Frutales».
- Los ejemplos de cultivos/frutales se etiquetan sobre el mapa y el modelo aprendido puede proponer polígonos por separado en GeoJSON, raster clasificado y DXF.
- La capa de frutales se exporta como `VEG_FRUTALES_REVISAR`, sin símbolo OCAD automático. El amarillo queda como clase de terreno abierto candidato.
- La predicción usa los indicadores LiDAR por celda y requiere ejemplos suficientes y variados; comprobar alineación y clasificación con ortofoto. La regularidad de filas de un huerto no se detecta aún como rasgo espacial propio.
- Pruebas sintéticas validan el aprendizaje y exportación de la nueva etiqueta.

Verificación: `npm test`. La ortofoto y el mapa terminado siguen siendo necesarios para revisar los candidatos.
