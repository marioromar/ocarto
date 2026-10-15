# Ocarto v69 — conversión comprobable de áreas LiDAR al mapa

- Extrae la conversión GeoJSON → objetos de área editables a un módulo comprobable.
- Conserva huecos y etiquetas de clase, crea una capa por categoría y admite coordenadas de nube georreferenciada o transformación LiDAR local.
- La nueva acción del editor añade áreas y capas como una sola operación del historial; Deshacer restaura el mapa y las capas anteriores.
- Prueba sintética verifica conversión de coordenadas, atributos originales, huecos y rechazo de geometrías/transformaciones inválidas.

Verificación: `npm test` y validación sintáctica del JavaScript inline. La prueba visual con Chromium continúa pendiente.
