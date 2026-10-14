# Ocarto v21 — doble curvado desde MDT

- Curvas generales de trabajo con equidistancia configurable (predeterminada: 5 m) y suavizado existente.
- Curvas detalladas de plantilla generadas **por separado directamente del MDT**, de forma predeterminada a 1 m para 5 m general (ratio 1/5).
- Curvas originales de la equidistancia general conservadas sin suavizar; curvas auxiliares reservadas para edición posterior.
- Exportaciones GeoJSON independientes para general y detalle; detalle no se añade automáticamente al mapa final.
- Pruebas de separación de capas y de precisión de equidistancias.

Limitaciones: la plantilla de 1 m puede incluir ruido del LiDAR, no sustituye comprobación cartográfica ni verifica físicamente cada forma; visualización superpuesta como plantilla interactiva queda pendiente. El suavizado inteligente adaptativo por tramo y la detección de cruces también quedan pendientes.
