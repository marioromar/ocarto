# Ocarto v1.54 — curvas por defecto al dibujar

- Las líneas y áreas dibujadas con herramientas normales o a mano alzada reciben vértices Bézier automáticamente.
- El símbolo «Edificio» conserva esquinas y trazos rectos; la herramienta Bézier explícita mantiene su comportamiento.
- La exportación GeoJSON de candidatos conserva la forma Bézier muestreada, también para anillos interiores.
- Las geometrías importadas permanecen intactas.

## Verificación

- Se mantienen las pruebas de curvas naturales, edificios y geometría fuente.
- `npm test`: 58 pruebas superadas.
- Sintaxis validada en los 20 scripts JavaScript inline de `index.html`.
