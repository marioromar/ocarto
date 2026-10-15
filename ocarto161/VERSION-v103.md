# Ocarto v1.03 — Preparación de mapa y aprendizaje de vegetación por fuentes

- Añadido un panel inicial «Preparar mapa · vegetación IA» con accesos directos para cargar ortofotos/imágenes, LiDAR y mapas vectoriales de referencia.
- El panel muestra qué fuentes y ejemplos están disponibles y guía el flujo: modalidad/CRS, LiDAR, ortofoto y mapa guía, aprendizaje, vista previa, conservar/quitar e incorporación al mapa.
- El análisis sigue disponible con fuentes incompletas; se indican las limitaciones en vez de exigir que estén todas.
- La ortofoto georreferenciada para aprendizaje se elige entre las plantillas locales cargadas, comprobando cobertura de la zona LiDAR y CRS compatible. La imagen usada queda asociada al modelo visual, aunque se seleccione otra plantilla.
- Los mapas vectoriales con áreas y símbolos cartográficos reconocidos sirven como ejemplos de entrenamiento. Las plantillas raster de mapa antiguo siguen siendo referencia visual y requieren áreas guía manuales.
- Los proyectos mantienen modelos y correcciones como antes; las propuestas continúan sin aprobar hasta que el cartógrafo las revise.

Verificación: scripts inline compilados con `new Function`; `npm test` completo. La prueba de navegador se omitió porque no está instalado Chromium.
