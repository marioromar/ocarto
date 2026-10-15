# Ocarto v1.48 — validación real de mosaicos LiDAR

## Cambios

- Se añade `tests/lidar-mosaic-real.cjs`, una prueba reproducible con dos o más teselas LAZ reales.
- La prueba usa el mismo protocolo de mosaico por área que la aplicación: lectura por bloques, acumulación de MDT y vegetación, vectorización de indicadores humanos y generación/conexión de curvados.
- El informe identifica límites XY, continuidad de la frontera entre teselas, celdas observadas/interpoladas, segmentos conectados, vaguadas candidatas, clases de vegetación y elementos humanos.
- Se incorpora el comando `npm run test:mosaic-real -- tesela1.laz tesela2.laz`.

## Prueba realizada con las teselas PNOA aportadas

- 22.148.169 puntos en dos teselas contiguas de 1 km², formato LAS 1.4 / punto 8.
- 79.977 celdas de terreno observadas, 14 huecos internos interpolados y 1.208 celdas sin vecindario suficiente.
- 22.668 segmentos de curvas sin unir; 154 líneas conectadas, 70 cerradas.
- 514 ejes de vaguada candidatos de más de 20 m.
- 957 polígonos de indicadores de vegetación; todos quedan como propuestas revisables.
- 3 edificios detectados por clasificación LAS; no aparecieron líneas eléctricas ni apoyos en estas teselas.

Estas cifras son una validación técnica del flujo, no una cartografía final ni una clasificación automática aprobada.
