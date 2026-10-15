# v81 — Candidatos LiDAR editables en el mapa

- Al detectar edificios, tendidos y apoyos eléctricos, muros/escarpes, caminos o cauces/surcos, descarga el GeoJSON y añade también los resultados al mapa como objetos vectoriales editables.
- Agrupa cada clase en una capa propia, que se puede ocultar o eliminar desde el panel de capas. Una sola acción de deshacer retira la incorporación completa.
- Conserva las propiedades de cada candidato para que se puedan consultar durante la revisión y añade un símbolo provisional para apoyos eléctricos.
- Añade una nota clara para las rocas: se pueden proponer puntos a partir de máximos LiDAR, pero requieren revisión y no equivalen a una clasificación automática de roca. El matorral/arbusto ya se puede aprender con ejemplos etiquetados y vectorizar en una capa propia.
- La incorporación no valida los objetos automáticamente: siguen marcados como candidatos y requieren revisión cartográfica.

Verificación: `npm test` y comprobación sintáctica del script principal.
