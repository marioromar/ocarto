# Ocarto v1.59 — validar agujeros y contornos Bézier

- «Validar geometría» comprueba que los agujeros estén dentro del área, no crucen su borde y no se solapen entre sí.
- Se revisan también los cruces y la validez de cada anillo.
- Las curvas Bézier se muestrean antes de validar su contorno dibujado.
- Para mantener la respuesta interactiva, la validación topológica detallada se limita a 2.500 vértices por polígono; las geometrías mayores solicitan simplificación previa.

## Verificación

- Pruebas de agujeros válidos, exteriores, cruzados, solapados y auto-intersectados.
- `npm test` y comprobación de sintaxis JavaScript inline.
