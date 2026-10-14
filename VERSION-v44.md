# Ocarto v44 — menor pico de memoria en mosaicos LiDAR

## Cambios
- El cálculo de indicadores de vegetación permite finalizar solo las filas por celda sin construir además polígonos GeoJSON.
- Los flujos de vegetación y mosaico usan ese modo compacto porque la interfaz consume las filas para CSV y vectorización, no el GeoJSON intermedio.
- El modo estándar conserva el GeoJSON para mantener compatibilidad con otros usos del módulo.

## Motivo
Con mosaicos de muchas teselas, el Worker ya acumula resúmenes limitados por celda; crear a la vez un segundo conjunto de polígonos añade geometrías, coordenadas y propiedades duplicadas. Este cambio elimina ese pico de memoria evitable.

## Verificación
- `npm test` valida ambos modos de finalización y conserva las pruebas existentes.
- Se mantiene el límite de 100.000 celdas por modelo. Los archivos LAZ que cruzan el área todavía se leen y decodifican completos, uno por uno.
