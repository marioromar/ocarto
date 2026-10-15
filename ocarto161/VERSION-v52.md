# Ocarto v52 — unión de curvas con tolerancia espacial

## Cambios

- La búsqueda de extremos cercanos revisa las celdas vecinas de su índice espacial, evitando dejar una curva abierta cuando dos extremos están dentro de tolerancia pero caen a ambos lados de una división del índice.
- Solo se conectan extremos de la misma cota.
- Si un extremo puede coincidir con más de un nodo dentro de la tolerancia, el caso se marca como ambiguo mediante error; no se elige una conexión automáticamente.

## Verificación

- `npm test` prueba unión entre celdas vecinas, bifurcaciones, ciclos y rechazo de coincidencias ambiguas.
- La evaluación de continuidad con teselas LAZ reales sigue pendiente de los archivos contiguos del usuario.
