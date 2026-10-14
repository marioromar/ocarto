# Ocarto v56 — plantillas LiDAR con CRS interoperable

Esta iteración prepara las primeras áreas vectoriales por clase en DXF, incluso antes de entrenar ejemplos, y mejora las imágenes LiDAR para OCAD y SIG:

- Sin modelo aprendido, la exportación incluye áreas DXF separadas en capas `LIDAR_OPEN`, `LIDAR_LOW`, `LIDAR_SPARSE` y `LIDAR_DENSE`, nombradas por evidencias de cobertura/altura. En OCAD se puede asignar manualmente a cada capa el símbolo de área que corresponda.
- Con un modelo aprendido se mantienen clases entrenadas en capas separadas y se incluye `.ocdCrt` con los códigos candidatos que tengan equivalencia definida.
- La exportación DXF conserva deliberadamente fuera las geometrías con huecos para evitar que un área rellene un claro interior; el GeoJSON sigue conservando esa geometría.
- El `.prj` contiene ahora una definición WKT, en lugar de solo el texto `CRS declarado`.
- Se generan definiciones para ETRS89/UTM (EPSG:25828–25838), WGS 84/UTM norte y sur (EPSG:32601–32660 y 32701–32760), ETRS89 geográfico (4258) y WGS 84 geográfico (4326).
- Un código EPSG no compatible se rechaza antes de crear un PRJ incorrecto. Si el usuario no ha declarado CRS, se conserva el PNG/PGW y se omite el `.prj`; los metadatos indican que la proyección no está declarada.
- La exportación de alturas de copa y de clases de vegetación comparte el mismo control de CRS.

La georreferenciación pixel-centro del PGW y la transparencia de celdas sin datos se conservan. La clasificación provisional por altura/cobertura no equivale a transitabilidad; por eso las capas DXF no reciben símbolos automáticamente.

**Pendiente:** leer objetos y códigos de símbolo del OCAD binario como ejemplos de aprendizaje. La plantilla e imagen de La Muela ya pueden utilizarse como referencia visual; el mapa `.ocd` no se convierte automáticamente en etiquetas de entrenamiento todavía.
