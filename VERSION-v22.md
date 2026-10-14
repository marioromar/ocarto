# Ocarto v22 — Vaguadas candidatas para revisión

- Detección conservadora de vaguadas aparentemente encajadas y posiblemente subrepresentadas por el MDT LiDAR.
- Requiere tres celdas consecutivas con concavidad transversal y datos de suelo observados: no inventa vaguadas a partir de huecos interpolados ni hoyos aislados.
- La exportación de puntos candidatos a GeoJSON incluye dirección estimada, cota observada y un límite orientativo de profundidad adicional, etiquetado como **no medido**.
- La herramienta **no profundiza automáticamente el MDT**, no modifica las curvas y no inserta elementos en el mapa sin revisión.
- Umbral mínimo regulable y sugerencia acotada por defecto a 1 m, que no constituye una predicción validada de la profundidad real.
- 15 suites de pruebas automáticas aprobadas. Prueba LAZ PNOA de 7.585.022 puntos, 4.080.114 de suelo; 5 ubicaciones candidatas para revisión (no verificadas en campo).

Limitaciones: diagnóstico orientativo según el terreno y resolución; la fiabilidad geomorfológica debe validarse con cartografía y observaciones de campo. Pendiente: enlazar propuestas con el mapa, mayor resolución local y modelos de corrección geométrica auditables.
