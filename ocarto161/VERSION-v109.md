# Ocarto v1.09 — Inventario común de detecciones LiDAR

- Añadido un formato GeoJSON común para reunir propuestas naturales y humanas ya generadas: vegetación, claros, cultivos/frutales, edificios, infraestructura eléctrica, muros/escarpes, rocas, drenajes/surcos y caminos detectados con ortofoto.
- El inventario conserva la geometría, CRS y procedencia de cada candidato; agrupa categorías para facilitar su revisión.
- Ningún candidato se acepta automáticamente. No se deduplican las geometrías: las coincidencias entre detectores quedan visibles para inspección.
- Las propuestas de frutales y de claros/arbolado alto también se incorporan al inventario pendiente de revisión.

Verificación: prueba unitaria del inventario común y `npm test`.
