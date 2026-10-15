# Ocarto v74 — decisiones manuales por superficie

- Se pueden tocar áreas de la vista previa y marcarlas como conservar, quitar o volver al filtro automático.
- Las decisiones manuales prevalecen sobre los mínimos y se mantienen al cambiar escala, tamaño de celda, superficie mínima y ancho.
- Las áreas conservadas manualmente se incluyen al exportar o añadir candidatas; las marcadas para quitar se excluyen.
- La vista diferencia aprobadas automáticamente, conservadas manualmente, descartadas por superficie, descartadas por ancho y quitadas manualmente. Las decisiones son temporales hasta generar y guardar la exportación o añadir al mapa.

Verificación: pruebas unitarias de inclusión y exclusión manual, contratos de interfaz, `npm test` y validación sintáctica inline.
