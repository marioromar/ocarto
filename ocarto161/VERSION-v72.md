# Ocarto v72 — filtro de ancho equivalente

- Añade un ancho mínimo equivalente a la referencia IOF elegida, adaptado a escala: 406 (0,4 mm), 408 (0,3 mm), 410 (0,25 mm), 402 (1,5 mm); símbolos sin ancho mínimo normativo usan 0.
- El ancho se estima para cada componente conectado mediante área y perímetro raster; se puede editar manualmente o poner 0 para conservar componentes estrechos. Se guarda en el proyecto y afecta a todas las vectorizaciones de vegetación.
- Mantiene por separado el filtro de área mínima.

Verificación: pruebas automatizadas, incluidos componentes de ancho conocido y valor cero; validación sintáctica del JavaScript inline.

- Cada GeoJSON registra umbrales, ancho equivalente calculado, componentes conservados y descartados por cada filtro; la interfaz muestra el resumen y lo incluye en el LEEME del DXF.
