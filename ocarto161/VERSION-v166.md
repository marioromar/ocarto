# Ocarto v1.66 — eliminación segura de vértices Bézier

- La eliminación múltiple de vértices ahora detecta si la selección incluye puntos creados al dividir una curva Bézier.
- En ese caso, conserva la geometría al pedir que esos vértices se eliminen individualmente, aplicando la restauración exacta de los manejadores originales.
- La eliminación múltiple de vértices normales sigue funcionando igual.

## Verificación

- `npm test`
