# v84 — Plantillas vectoriales de referencia

Las detecciones LiDAR aceptadas pueden permanecer en capas vectoriales de plantilla para revisión. Se dibujan debajo de la cartografía editable, tienen opacidad ajustable y no se pueden mover, cortar ni editar por accidente. Selecciona objetos de la plantilla y usa Ctrl/Cmd+C y Ctrl/Cmd+V para copiarlos a la capa activa del mapa. Quitar la capa elimina sus detecciones.

Los proyectos abiertos como mapas conservan sus capas editables normales. Solo las capas marcadas explícitamente `referenceOnly` funcionan como plantilla de referencia; las plantillas raster/WMS siguen siendo fondos visuales.

Verificación: `npm test` pasa. La comprobación de navegador se omite si Chromium de Playwright no está instalado.
