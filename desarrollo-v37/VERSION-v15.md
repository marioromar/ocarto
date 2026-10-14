# Ocarto v15 — filtro de clases LAS/LAZ

Base: versión recuperada v14. Rama prevista: `desarrollo-v15`.

- El análisis LiDAR permite filtrar por clasificación LAS: todas, suelo (clase 2), vegetación baja/media/alta (3, 4, 5) o sin clasificar (0, 1).
- Compatible con registros LAS antiguos (formatos 0–5, clase en los cinco bits bajos del byte 15) y nuevos (6–10, clase completa en byte 16), tanto LAS como LAZ.
- Se muestra el número de puntos de la clasificación seleccionada realmente considerados por el detector.
- No se modifican los archivos importados ni se asignan automáticamente símbolos definitivos.
- Añadidas pruebas de clasificación de ambos grupos de formatos y de filtro inválido; nueve suites automáticas superadas.
- Comprobación adicional con archivo LAZ PNOA real de 7.585.022 puntos: descompresión y procesamiento de máximos sin filtro completados; **queda pendiente validar el filtro por clases con una prueba real específica** y revisar resultados visualmente en la interfaz.

Aviso: los máximos Z por celda no son un detector fiable de árboles o rocas; los candidatos deben ser revisados. La clasificación que existe dentro del LAZ puede no tener todas las clases disponibles.
