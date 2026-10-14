# Ocarto v53 — memoria contenida al unir curvas

## Cambios

- Conserva el índice espacial de extremos y evita mantener además una lista completa duplicada de nodos.
- Mantiene la búsqueda de coincidencias en celdas vecinas y el rechazo de empalmes ambiguos de v52.

## Verificación

- `npm test` cubre unión entre celdas vecinas, bifurcaciones, ciclos, ambigüedades y una cadena de 10.000 segmentos.
- La continuidad entre teselas reales sigue pendiente de revisar los LAZ contiguos.
