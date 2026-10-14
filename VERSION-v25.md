# Ocarto v25 — Aprendizaje de vegetación por ejemplos cartografiados

## Implementado
- `vegetation-learning.js`: entrenamiento **local** mediante áreas vectoriales anotadas por el usuario con etiquetas de vegetación. Cruza centroides de las celdas de análisis LiDAR con polígonos georreferenciados y sus huecos. El modelo compara altura normalizada, intensidad estructural de clases baja/media/alta y fracción de retornos de vegetación.
- El usuario puede dibujar/seleccionar un área del mapa y etiquetarla como `blanco`, `verde1`, `verde2`, `verde3`, `amarillo` o `matorral`.
- El botón **«Aprender ejemplos → Proponer polígonos»** crea predicciones, con descarte de patrones que se alejan de los ejemplos. No transforma las propuestas directamente en mapa final; exporta GeoJSON y conserva el origen intacto.
- Aprende de una sola etiqueta de ejemplo o varias; si solo hay una etiqueta, deja sin clasificar los patrones distintos. Se incluyen ejemplos de suelo sin vegetación clasificada para terreno abierto.
- `vectorize-vegetation.js` admite etiqueta supervisada además de categorías estructurales provisionales.
- Pruebas sintéticas para clasificación a partir de áreas, casos con una o dos clases, falta de muestras, valores inconsistentes y conservación de la revisión manual.

## Alcance y límites honestos
- Prototipo **por similitud de vecinos** basado en características LiDAR, sin aprendizaje profundo ni entrenamiento sobre los OCAD aportados todavía.
- La etiqueta de un ejemplo necesita cobertura LiDAR georreferenciada en el mismo CRS, y deben existir suficientes celdas con retornos de suelo para calcular altura normalizada.
- Los mapas OCAD originales aún **no se importan ni parsean** de manera nativa. Para aprender de sus superficies finales será necesario vectorizarlas/importarlas o implementar lectura OCAD tras validar el formato y su licencia.
- No interpreta transitabilidad real por sí solo; además de la nube de puntos habrá que validar contra ortofoto y criterio profesional.
- Todavía faltan segmentación automática de caminos sin seed, polígonos de edificios, muros, canales, vallados, tendidos, cortados y rocas.
- El aprendizaje no incluye automáticamente un repositorio persistente de modelos entre proyectos: las etiquetas se guardan en las áreas de trabajo, pero el modelo se vuelve a construir al ejecutar la detección.

## Pruebas
`npm test`, nuevos casos `tests/vegetation-learning.cjs`. Prueba LiDAR real v24 conservada, `node tests/lidar-v24-real.cjs /ruta/al/archivo.laz`.
