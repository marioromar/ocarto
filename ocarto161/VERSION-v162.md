# Ocarto v1.62 — ajuste de bordes al segmento

- «Ajustar bordes» proyecta los vértices seleccionados al tramo más cercano del segundo contorno, dentro de la tolerancia indicada, en vez de buscar solo vértices coincidentes.
- Mantiene los metadatos de cada vértice y registra el cambio para deshacer/rehacer.
- La operación exige dos áreas rectas, desbloqueadas y sin huecos. Las curvas Bézier y áreas con huecos se rechazan explícitamente para evitar perder controles o topología.
- Se corrige la detección de áreas bloqueadas seleccionadas.

## Verificación

- Pruebas de proyección interior a segmento, ajuste a extremo, tolerancia y rechazo de valores inválidos.
- `npm test` y comprobación sintáctica de los scripts inline.
