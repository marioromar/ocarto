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
- **Corrección de alineación espacial**: al reducir ortofotos grandes para muestrearlas junto al LiDAR, la transformación afín se invierte directamente en píxeles del lienzo reducido. Antes se aplicaba dos veces el factor de reducción y se muestreaban otros lugares de la ortofoto. Pruebas con imágenes reducidas/no reducidas, rotación y escalas de redondeo no uniformes.
- Los polígonos conservan huecos interiores, propiedades de revisión y coordenadas originales de la rejilla LiDAR. Se exportan como GeoJSON candidato, no como mapa CART aceptado.
- Las pruebas ejecutadas directamente con el motor vectorial confirmaron siete casos sintéticos. Además se comprobó directamente la integración GeoJSON amarillo → inventario: un polígono con hueco quedó como Bézier editable y candidato, con X/Y UTM conservadas y sin incorporar automáticamente al mapa. Se añadieron pruebas de regresión al repositorio; **no equivale a validación en Chromium/Windows ni en Bobadilla real**.

## Alturas de vegetación y Feature Map: suelo vecino v286

- **Problema encontrado:** en rejillas LiDAR de 0,5 m muchas copas no comparten celda con retornos de suelo. Antes se dejaban sin altura y se excluían del Feature Map.
- **Corrección:** si la celda tiene retornos vegetales pero carece de suelo, buscar suelo real en celdas cercanas, con un radio físico de hasta 2 m (como máximo cuatro celdas por eje para limitar trabajo en resoluciones muy finas). Exigir al menos tres celdas medidas; usar hasta ocho vecinas próximas y ponderarlas por distancia. Rechazar la estimación si sus cotas difieren más de 2 m.
- Los datos observados **no se sustituyen**: `ground_min_z` solo recoge el suelo realmente medido en esa celda. Cuando se estima la cota, se registra `estimated_ground_z_m`, `ground_height_source=nearby_estimate` y `ground_estimation_support_cells`. Cuando faltan referencias o existe un desnivel contradictorio, la altura sigue siendo **desconocida**.
- El **Feature Map** usa los mismos valores de altura que los indicadores de vegetación. Procesa las celdas una a una, sin crear otra copia de toda la rejilla, e informa cuántas alturas proceden de suelo medido y cuántas de suelo estimado.
- Los CSV de vegetación conservan sus columnas anteriores y añaden la procedencia de la cota estimada. También se corrige la antigua columna `ground_z_min` del CSV normal, cuyo valor no encontraba la propiedad interna `ground_min_z`.
- **Precaución:** esta interpolación local no equivale a un MDT/CHM científicamente contrastado, ni verifica si un terreno es transitable. No atribuir clases de vegetación definitivas por estas cotas aisladas. En laderas abruptas, copas densas y ausencia de suelo cercano, se deben usar modelos de terreno más completos.

**Comprobación directa:** 4 casos sintéticos superados (suelo medido, suelo cercano, falta de soporte y desnivel incompatible). Se añadieron pruebas a `source/v234/tests/lidar-worker.test.cjs`. La prueba con el LAZ real de Bobadilla sigue pendiente; **no confundir estas comprobaciones con validación completa en Windows**.


## Ensayos de compatibilidad LAZ PNOA y generación de modelos (23-10-2026)

- **Prueba de formato PNOA:** archivo LAS 1.4 **formato 8 artificial**, ocho puntos, rejilla de 0,5 m; comprueba recuentos, clasificación 2 suelo / 5 vegetación / 6 edificio / 9 agua / 11 carretera, suelo interpolado de cuatro celdas vecinas, altura de copa de 8 m y Feature Map con una celda estimada, sin alterar el suelo medido.
- **Prueba de compresión real:** archivo de ensayo `1815.laz` del repositorio, decodificado con `laz-perf.wasm`; se pasa de carga por bloques a análisis MDT y vegetación. Como no contiene retornos de vegetación, el Feature Map **se rechaza** en vez de inventar alturas.
- Las pruebas se ejecutan en `source/v234/tests/lidar-worker.test.cjs` y `source/v234/tests/lidar-reader-integration.test.cjs` mediante el flujo **Ocarto LiDAR smoke tests**. El flujo Chromium revisa importación e interfaz, no garantiza que cada funcionalidad cartográfica esté terminada.
- Los tres LAZ PNOA aportados por el usuario (7,6 + 10,9 + 11,3 millones de puntos) **no se han procesado punto a punto en esta validación**. El mapa de alturas RGB conservado del TIFF anterior **no es** un modelo de alturas cuantitativo recién calculado; las curvas de nivel reales y el Feature Map de esas teselas **siguen pendientes**.
- Evitar cualquier etiqueta de «curvado generado», «Feature Map real calculado» o «símbolo impasable confirmado» hasta que existan las salidas reales con trazabilidad de datos y revisión de campo.

## Pruebas

`node --test source/v234/tests/lidar-cultivated-candidates.test.cjs`

Casos: aprendizajes amarillos, rechazo de verdes/edificios/vías, ningún polígono sin ejemplos, preservación de huecos, LiDAR sin ortofoto, parámetros y no modificación de fuentes.

El CI mantiene también las pruebas reales de carga LAS/LAZ, los resultados de Chromium y la comprobación de arranque Windows heredados de v285.

**No se publica v286** como instalador y no sustituye el ejecutable de prueba `Ocarto 0.285.0.exe`.
