# Ocarto v0.99 — Vista previa unificada de claros y arbolado alto

- Integra claros potenciales y arbolado alto en la vista previa común de áreas LiDAR, en vez de limitar su detección a una exportación separada.
- Representa los claros candidatos en amarillo y el arbolado alto candidato en blanco. Las superficies mantienen estados de revisión: filtro automático, conservar manualmente o quitar manualmente.
- Los umbrales editables de proporción vegetal y altura se aplican a la vista previa, a la vectorización aprendida y al raster PNG/PGW clasificado.
- Las decisiones manuales se mantienen al recalcular la vista previa y al exportar. También se aplican los filtros ajustables por área mínima y ancho mínimo equivalente.
- Para exportación DXF/OCAD, las zonas abiertas y el arbolado alto se separan en capas con asignación candidata a 401 y 405, respectivamente; los códigos se pueden comprobar/cambiar con el mapa OCAD.
- Todas las superficies siguen marcadas como candidatas que deben revisar con ortofoto y cartografía. El arbolado alto no confirma por sí solo bosque blanco, y el claro puede ser cultivo, pradera, roca expuesta o un hueco de clasificación.

Verificación: batería completa `npm test`, pruebas específicas de vectorización, exportación y persistencia del flujo de revisión, y `node --check` sobre el script de la aplicación. Prueba de navegador omitida por falta del ejecutable Chromium de Playwright.
