# Ocarto v39 — Reutilización de LAZ en memoria WASM

## Implementado
- Al terminar de leer un LAZ, el Worker conserva la copia comprimida dentro de memoria WASM y suelta el ArrayBuffer JavaScript original.
- Detección, rejilla de terreno y análisis de vegetación vuelven a abrir el mismo búfer comprimido; ya no asignan ni copian el archivo completo en cada análisis.
- Al cargar con éxito otra nube, se libera el búfer LAZ anterior. Si la nueva carga falla o se cancela, se conserva la nube anterior.
- Los registros de punto temporales y el búfer LAZ se liberan en los momentos correspondientes; LAS sin compresión mantiene su ruta anterior.

## Límites
- La carga inicial de un LAZ sigue necesitando un ArrayBuffer completo y espacio adicional en WASM mientras se copia y decodifica. La compatibilidad con archivos de 1 GB depende de la memoria disponible del navegador y del equipo.
- No se aplica un máximo fijo de puntos para LAS/LAZ.

## Validación
- `npm test`.
- `npm run test:real -- ruta/al/archivo.laz`: 7.585.022 puntos LAZ reales, carga y detección completadas; 40.000 celdas y 765 candidatos.
- `tests/laz-perf-mock.cjs`: comprueba que el LAZ se copia a WASM una vez, se reutiliza en análisis y se libera al sustituir la nube.
