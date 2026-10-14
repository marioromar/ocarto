# Ocarto v28 — Reutilización de modelos locales de vegetación

## Implementado
- Continúa desde v27 y conserva la extracción experimental de caminos sin SHP.
- Exporta a JSON los modelos locales aprendidos con ejemplos cartográficos.
- Permite cargar el modelo guardado en otro proyecto y generar propuestas sin repetir el etiquetado.
- Comprueba la versión del formato, variables, etiquetas, muestras, escalas y umbrales antes de cargar.
- No guarda el LiDAR original ni las geometrías de las áreas de entrenamiento.
- Incluye pruebas para el ciclo exportar/cargar, compatibilidad y rechazo de modelos inválidos.

## Límites
- Clasificador local por similitud de vecinos; no es una red entrenada ni garantiza la transitabilidad.
- La idoneidad del modelo cambia según zona, LiDAR y criterio cartográfico. Revisa las propuestas frente a ortofoto y criterio profesional.
- El modelo se guarda como archivo JSON; no se incorpora automáticamente al archivo del proyecto.

## Validación
- npm test
- Verificación de compilación de los scripts inline de index.html.
- Prueba sintética del ciclo de guardado y carga del modelo.
