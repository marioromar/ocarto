# Ocarto v1.49 — comprobación de duplicados en el borde LAZ

## Cambios

- Se añade `tests/laz-boundary-check.cjs` para comparar puntos reales de dos teselas LAZ en su frontera.
- Distingue duplicados XY exactos, puntos próximos dentro de una tolerancia y coincidencias XY/Z próximas.
- La prueba se ejecuta con `npm run test:boundary-real -- izquierda.laz derecha.laz`.

## Resultado de las teselas PNOA aportadas

- Sin solape de extensiones: 384-4115 termina en X=384999,999 y 385-4115 empieza en X=385000,000.
- Duplicados XY exactos entre las dos teselas: 0.
- Pares XY dentro de 5 cm en la frontera: 8.
- Pares XY y Z dentro de 5 cm: 1.
- Interpretación: hojas contiguas, sin duplicación de teselas; los pocos pares cercanos corresponden a puntos de captura próximos y deben conservarse salvo que el usuario active una limpieza tolerante.
