# Ocarto v1.53 — trazos naturales curvos

- Las líneas y áreas naturales propuestas desde LiDAR ahora se guardan como geometrías Bézier editables, incluidas las áreas de vegetación y sus huecos.
- Caminos, cursos de agua, muros/escarpes y otros objetos lineales detectados reciben curvas suaves con tiradores limitados por la longitud de sus segmentos.
- Los edificios conservan sus esquinas y trazos rectos.
- La transformación no muta la geometría de origen y mantiene los vértices para su posterior edición.

## Verificación

- Añadida prueba para curvas, huecos, edificios y geometría original.
- `npm test`: 58 pruebas superadas.
