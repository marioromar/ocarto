# Ocarto v26 — Primeros edificios y tendidos a partir de clases LiDAR

## Implementado y probado
- `vegetation-lidar.js` conserva ahora, en las mismas celdas compactas, contadores de estructuras para LAS clases **6 (edificios)**, **14 (conductor eléctrico)** y **15 (torre/apoyo)**. No se vuelven a conservar arrays completos de puntos.
- `lidar-worker.js` incluye las tres clases durante el análisis LiDAR, preservando la extracción previa de alturas y estructura vegetal. Almacena las estadísticas de cada clase de forma diferenciada.
- `vectorize-structures.js`: agrupa celdas contiguas con retornos clase 6 y propone **contornos de edificios** como polígonos GeoJSON (solo para revisión). Propone trazados de cables aproximados a partir de celdas clase 14 conectadas; trata clase 15 como celdas candidatas de apoyo. Todos los resultados necesitan comprobación de ortofoto y levantamiento topográfico.
- Nuevo botón **«Extraer edificios y tendidos LiDAR → GeoJSON»** disponible tras analizar las clases LiDAR de la nube.
- Acceso a **Capas y LiDAR desde móvil Android** mediante panel desplegable; antes el panel derecho quedaba oculto en pantallas pequeñas.
- Nuevas pruebas `tests/vectorize-structures.cjs` incluidas en `npm test`.

## Prueba real PNOA
LAS/LAZ `PNOA_2024_AND_279-4085_H30_NPC01.laz`:
- 7.585.022 puntos originales, rejilla 5 m, 40.000 celdas (ahora incluyendo clases de construcciones).
- 13 superficies candidatas a edificios detectadas por clase 6; **13.674 retornos clase 6**.
- 0 líneas y 0 apoyos eléctricos: el archivo no contenía retornos clase 14/15. Ocarto NO debe fabricar cables por ese motivo.
- 452 polígonos de cobertura vegetal estructural; 69 ejes de vaguadas candidatos >20 m.
- Tiempo 29,4 segundos, pico RSS ~289 MiB en el entorno de pruebas. Depende del ordenador.

## Lo que aún no hace
- Detección de edificios **sin clasificación previa** de puntos LAS por segmentación DSM/DTM y ortofoto.
- Posición topográfica exacta de cables, apoyos y líneas eléctricas a partir de puntos 3D: el método actual solo tiene centroides de celdas.
- Detección automática de muros, vallas, canales, senderos no registrados, carreteras, rocas, cortados y zanjas; requiere detectores especializados, procesado de ortofotos, revisión.
- Integración real de ejecutables opcionales PDAL, GDAL, GRASS GIS, Orfeo ToolBox y redes ONNX (en evaluación técnica, sin instalaciones nuevas).
- Aprendizaje desde archivos `.ocd` directamente (solo ejemplos dibujados/etiquetados en Ocarto).

## Validación
`npm test` y `node tests/lidar-v26-real.cjs /ruta/fichero.laz`.
