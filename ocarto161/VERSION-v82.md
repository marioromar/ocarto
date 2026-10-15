# v82 — Puntos candidatos de roca por relieve LiDAR

- Añade detección de máximos locales en el MDT de suelo observado y compara su cota con la mediana del anillo exterior.
- Permite ajustar prominencia mínima, radio de comparación y puntos mínimos de suelo por celda; conserva esos parámetros en el proyecto.
- Ignora celdas interpoladas, vecindades incompletas y candidatos no locales. Añade los resultados como puntos editables en una capa propia y ofrece GeoJSON.
- Los resultados son formas elevadas candidatas, no una clasificación segura de roca; pueden incluir tocones, escalones naturales o errores del terreno.

Verificación: `npm test` y comprobación sintáctica del script principal.
