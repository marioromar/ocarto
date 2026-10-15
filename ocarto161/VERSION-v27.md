# Ocarto v27 — Detección y dibujo preliminar de caminos SIN SHP a partir de ortofotos

## Implementado
- `road-extract.js`: máscara por similitud de color en ortofoto georreferenciada, eliminación de componentes minúsculos, esqueletización Zhang-Suen, extracción de ejes centrales y conversión a líneas GeoJSON en las coordenadas de mapa. Sin necesidad de trazado SHP previo.
- `road-extract-worker.js`: ejecución en hilo Web Worker con posibilidad de cancelar desde la interfaz para no bloquear el editor.
- Controles en panel «Ajuste experimental de caminos»: color de superficie, tolerancia y longitud mínima. Botón «Detectar ejes de caminos SIN SHP → GeoJSON».
- Resolución de lectura limitada a lado máximo de 1.500 píxeles para controlar memoria. En ortofotos de gran resolución, los senderos estrechos pueden desaparecer al reducirse; se mejorará con teselado, multiescala y aprendizaje semántico.
- Los ejes vectoriales resultantes son **candidatos para inspección**, nunca se aceptan automáticamente ni se consideran senderos certificados. Conserva la imagen original y la cartografía existente.
- Prueba sintética con camino oblicuo y georreferenciación, rechazo de color inexistente y límites de seguridad.

## Advertencias de precisión
- Este método NO aprende características semánticas de caminos: pueden confundirse campos, rocas, calvas, cortafuegos, cauces o materiales de color parecido. Los cruces y ramales pueden quedar omitidos. Necesita comparación LiDAR/DTM, validación visual y, para buen resultado, un modelo entrenado con ejemplos de caminos reales.
- Solo analiza imágenes locales PNG/JPG/WebP ya abiertas como plantilla. Los WMS se utilizan visualmente por las restricciones de lectura de píxeles entre dominios. GeoTIFF georreferenciado aún requiere importación o conversión a formato compatible.
- La longitud se estima en el CRS local; requiere EPSG UTM métrico. La orientación de píxeles respeta la transformación afín de la ortofoto.

## Validación
`npm test` incluye `tests/road-extract.cjs` y todas las pruebas anteriores. Análisis LAZ real v26 preservado en `tests/lidar-v26-real.cjs`.

## Pendiente
- Análisis de caminos desde ortofotos a resolución completa y multiescala, LiDAR/DSM/DTM y ejemplos etiquetados, intersecciones y topología de red.
- Exageración controlada de vaguadas en curvas cartográficas, con objetivo de lectura hasta la siguiente curva detallada de 1 m, sin alterar cotas sin respaldo.
- Detección de otros elementos (muros, zanjas, canales, roca, cortados, vallados, tendidos sin clasificar) y lectura nativa de mapas OCAD y GeoTIFF.
