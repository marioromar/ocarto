# Ocarto v29 — Modelo de vegetación dentro del proyecto

## Implementado
- Continúa desde v28, conservando la carga/descarga independiente de modelos JSON.
- Guarda el modelo local de vegetación dentro del archivo `.ocarto` junto con el mapa.
- Al abrir un proyecto, valida el modelo antes de aplicar los cambios al mapa y lo restaura para su reutilización.
- Los proyectos anteriores, que no contienen el campo del modelo, siguen abriendo sin cambios.
- Añade una prueba de persistencia, compatibilidad hacia atrás, validación y restauración.

## Límites
- El proyecto guarda las muestras resumidas y parámetros del clasificador, no el LiDAR ni las áreas originales de entrenamiento.
- Las predicciones de vegetación son propuestas y requieren revisión cartográfica.

## Validación
- `npm test`
- Compilación de scripts inline de `index.html`.
