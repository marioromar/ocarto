# Ocarto v1.57 — continuación de curvas Bézier

- «Continuar línea» acepta líneas rectas y Bézier, conservando los tiradores existentes.
- «Ampliar área» acepta contornos rectos y Bézier; valida las áreas curvas sobre una muestra de su contorno real.
- Los nuevos tramos trazados punto a punto se registran con vértices de esquina.

## Verificación

- Prueba de integración para continuación y ampliación de geometrías Bézier.
- `npm test` y comprobación de sintaxis JavaScript inline.
