# Ocarto v1.58 — simplificar geometrías seleccionadas

- Nueva acción «Simplificar selección» con tolerancia visual configurable en píxeles.
- Reduce vértices redundantes en líneas y áreas rectas seleccionadas; mantiene extremos y vértices marcados como esquina o discontinuidad.
- Las áreas se validan después de simplificarse; si la tolerancia produce un contorno inválido, se reduce automáticamente.
- Las curvas Bézier, áreas con huecos y elementos protegidos se omiten para no alterar su geometría.
- La operación admite selección múltiple y se puede deshacer.

## Verificación

- Pruebas unitarias de reducción, conservación de esquinas, extremos y anillos cerrados.
- `npm test` y comprobación de sintaxis JavaScript inline.
