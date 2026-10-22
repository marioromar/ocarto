# Ocarto v284 — corrección de exportaciones GeoJSON Bézier

**Base segura:** versión v283, sin retroceder a `main` ni modificar la detección LiDAR, el catálogo de símbolos o el motor de curvas editables.

## Problema corregido

En versiones anteriores, el botón **Exportar inventario de candidatos** enviaba un objeto completo a la función de muestreo Bézier, que esperaba una **lista de vértices**. Como consecuencia, las líneas y contornos naturales curvos podían exportarse como geometrías vacías, pese a verse correctamente en el editor.

Además, en la exportación completa **GeoJSON/KMZ**, los vértices intermedios Bézier no siempre conservaban las coordenadas reales del mapa y las **islas/huecos interiores** de polígonos curvos se exportaban como segmentos rectos.

## Qué hace ahora

- El **inventario de propuestas LiDAR y ortofoto** exporta todos los puntos muestreados de caminos y áreas Bézier, incluyendo los agujeros interiores cerrados correctamente.
- Las coordenadas de todos los puntos intermedios respetan la transformación del mapa **UTM georreferenciado**.
- Si se trabaja directamente con un mosaico **LAS/LAZ**, respeta su transformación de nube (`cloudTransform`) y declara el CRS del mapa si está configurado.
- Si se desplaza un objeto, se aplica correctamente su nueva posición al exportar las curvas y los metadatos de vértices Bézier.
- El **GeoJSON del mapa completo**, empleado también para la exportación **KMZ**, aplica el mismo criterio a sus líneas, áreas y agujeros, sin modificar los vértices Bézier editables del proyecto.
- El comportamiento de exportación de geometrías rectas y mapas locales se conserva.

## Pruebas de regresión

```bash
node --test source/v234/tests/lidar-curved-geojson.test.cjs
```

Se comprueban ocho escenarios, entre ellos:

- Camino Bézier: GeoJSON LineString con puntos intermedios no vacíos.
- Polígono de agua/vegetación con un hueco interior Bézier.
- Coordenadas UTM de los puntos intermedios y metadatos de tangentes.
- Exportación de todo el mapa, no solo del inventario.
- Transformación de nube LiDAR y CRS.
- Objetos movidos respecto al origen local del mapa.
- Geometrías rectas anteriores, sin cambios.
- Conservación de los botones de inventario, GeoJSON, KMZ y edición CART.

Las pruebas se han ejecutado también directamente sobre las funciones extraídas de la interfaz. Siguen pendientes la ejecución confirmada de **GitHub Actions/Chromium** y la prueba en Windows con el archivo **PNOA LAZ de unos 7,6 millones de puntos**.

## Descargar

[ZIP completo de Ocarto v284](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v284-bezier-geojson-fix.zip).

En Windows, descomprime y ejecuta `ABRIR-OCARTO.bat`. No abras `index.html` desde `file://`, porque el worker LiDAR necesita un servidor HTTP local.
