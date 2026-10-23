# Ocarto v286 — propuestas de áreas amarillas y posibles cultivos

**Rama de desarrollo separada**: `ocarto-v286-cultivos-candidatos-revisables`.
**Versión para probar en Windows**: sigue siendo `0.285.0`, sin cambiarla ni fusionar.

## Implementación

En **LiDAR e IA → Claros y arbolado alto** se añade **«Detectar y vectorizar amarillos / posibles cultivos → GeoJSON»**.

1. Analizar una nube LAS/LAZ y preparar los indicadores de vegetación.
2. Cargar mapa guía u ortofoto georreferenciada cuando exista (opcional para aprender solo por LiDAR).
3. Marcar varios **ejemplos de Amarillo** y usar **Aprender ejemplos**.
4. Tener abierto un mapa georreferenciado, comprobar manualmente que el **EPSG y las coordenadas de LiDAR, mapa y plantillas coinciden**, y marcar la casilla **«He comprobado que el LiDAR, el mapa y las plantillas están en el mismo EPSG»**. El valor predeterminado del campo EPSG no equivale a una verificación automática.
5. Ejecutar la nueva detección. Si se cambia de proyecto o de EPSG, la casilla vuelve a desmarcarse. Ocarto propone polígonos de las áreas que el modelo aprendió como `amarillo`, respetando huecos y los parámetros de área/anchura.
6. Los exporta como **GeoJSON** y los incorpora al **inventario de candidatos**, donde deben revisarse antes de convertirse en objetos editables CART. El botón no modifica por sí mismo el mapa definitivo ni las imágenes fuente.

## Límites deliberados

- Un área amarilla **no demuestra que sea un cultivo**: podría ser pastizal, parcela sin sembrar, suelo desnudo o claro. Todos los polígonos llevan `crop_confirmed: false`, `review_required: true` y `auto_accept: false`.
- Las celdas LiDAR que tienen puntos clasificados como edificaciones (clase 6), agua (clase 9) o vías (clase 11) se excluyen de la propuesta amarilla.
- Además de la confirmación manual, Ocarto detiene la vectorización si el EPSG registrado del proyecto o de la plantilla activa difiere del campo del mapa. Cambiar el campo no sustituye reproyectar el proyecto.
- Sin ejemplos aprendidos de Amarillo **no se inventan polígonos agrícolas**.
- LiDAR original, TIFF original, las capas existentes y la v285 no se modifican.
- No se ha comprobado todavía la precisión con una zona real de cultivos de Bobadilla ni se ha confirmado el EPSG del TIFF de referencia.
- El flujo no identifica de forma fiable tipos agrícolas (cultivo herbáceo, olivar, viñedo). Los símbolos 413/414 y las geometrías exactas necesitan revisión cartográfica.

## Revisión del inventario y optimización

- El inventario de candidatos muestra las zonas amarillas con su propio nombre y tono amarillo `#e9cf49`; **no** se asigna automáticamente un símbolo definitivo de orientación.
- La selección de ortofoto se reutiliza durante cada proceso de detección en lugar de buscarla para cada celda; el cálculo de límites del mosaico evita desbordamientos por listas de cientos de miles de celdas.
- Los polígonos conservan huecos interiores, propiedades de revisión y coordenadas originales de la rejilla LiDAR. Se exportan como GeoJSON candidato, no como mapa CART aceptado.
- Las pruebas ejecutadas directamente con el motor vectorial confirmaron siete casos sintéticos. Además se comprobó directamente la integración GeoJSON amarillo → inventario: un polígono con hueco quedó como Bézier editable y candidato, con X/Y UTM conservadas y sin incorporar automáticamente al mapa. Se añadieron pruebas de regresión al repositorio; **no equivale a validación en Chromium/Windows ni en Bobadilla real**.

## Pruebas

`node --test source/v234/tests/lidar-cultivated-candidates.test.cjs`

Casos: aprendizajes amarillos, rechazo de verdes/edificios/vías, ningún polígono sin ejemplos, preservación de huecos, LiDAR sin ortofoto, parámetros y no modificación de fuentes.

El CI mantiene también las pruebas reales de carga LAS/LAZ, los resultados de Chromium y la comprobación de arranque Windows heredados de v285.

**No se publica v286** como instalador y no sustituye el ejecutable de prueba `Ocarto 0.285.0.exe`.
