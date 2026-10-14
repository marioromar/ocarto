# Ocarto v24 — Primeros vectores a partir de vegetación LiDAR y ajuste guiado de caminos

**Estado: experimental, con pruebas; no es un modelo de IA entrenado ni cartografía final validada.**

## Implementado
- `vectorize-vegetation.js`: extrae regiones contiguas de la rejilla LiDAR del módulo v23, une celdas de igual categoría estructural, produce polígonos GeoJSON editables y conserva los huecos interiores. Descarta superficies inferiores al umbral. No modifica los datos originales ni asigna símbolos ISOM automáticamente.
- Categorías provisionales: cobertura escasa, vegetación baja, arbolado disperso y cobertura arbórea densa. No estiman directamente la penetrabilidad del corredor; requieren calibración local mediante ejemplos de mapas finales. Alturas calculadas relativas al terreno solo donde hay puntos de suelo observados en la misma celda.
- Nuevo botón «Vectorizar coberturas LiDAR → GeoJSON» junto a los indicadores de vegetación; se exportan polígonos pendientes de revisión.
- `road-align.js`: ajuste experimental de un **trazado inicial existente**, con una **ortofoto local** georreferenciada y una muestra RGB configurada por el usuario. Busca continuidad de color dentro de un máximo desplazamiento lateral; conserva extremos y trazado original, y devuelve **solo propuesta** GeoJSON con confianza y advertencias. Puede confundir suelo desnudo con caminos; no detecta caminos desde cero ni sustituye inspección manual.
- Interfaz de ajuste experimental: seleccionar un vector lineal existente, plantilla ortofoto local activa y CRS UTM métrico. Por limitaciones CORS **no se analiza directamente la imagen de WMS**; WMS sigue disponible como plantilla visual.
- Pruebas sintéticas para polígonos, agujeros, clasificación incierta, no mutación, centrado de caminos y parámetros inválidos.

## Prueba con LiDAR real
PNOA_2024_AND_279-4085_H30_NPC01.laz, 7.585.022 puntos, celda 5 m:
- 39.987 celdas analizadas; 37.801 con suelo y vegetación.
- **452 polígonos de coberturas estructurales** (>150 m²) para revisión, a partir de indicadores no calibrados.
- 69 ejes de vaguadas candidatos mayores de 20 m (funcionalidad v23), sin modificación del DTM.
- Tiempo de prueba integral: ~29 segundos; memoria máxima ~293 MiB en el entorno de prueba, resultados dependientes del equipo.

## Pendiente / no implementado todavía
- Clasificación automática en verde ISOM 1/2/3 con ejemplos de OCAD base/final y LiDAR alineado.
- Detección de caminos **sin** trazado inicial, segmentación semántica de ortofotos, validación con LiDAR y modelos IA entrenados.
- Extracción de edificios, muros, vallados, tendidos, canales, cortados, zanjas y rocas (detectores a desarrollar).
- Integración opcional de PDAL, GDAL, GRASS, Orfeo ToolBox / ONNX, tras evaluar formatos, plataformas y licencias; no se incorporaron binarios externos nuevos en esta versión.
- Prueba visual real de correcciones de caminos y comparación con mapas OCAD georreferenciados.

## Validación
`npm test` y `node tests/lidar-v24-real.cjs <ruta a LAZ>`.
