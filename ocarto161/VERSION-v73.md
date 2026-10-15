# Ocarto v73 — vista previa de filtros LiDAR

- Añade vista previa cartográfica antes de añadir o exportar áreas: verde para conservar, naranja para descartadas por superficie y morado por ancho.
- El panel informa cuántas áreas pasan y cuántas elimina cada filtro.
- Los mínimos, el tamaño de celda y la escala actualizan la vista al instante. La vista previa es temporal y no modifica el mapa; se puede quitar o añadir después las áreas aprendidas.
- Los descartes solo se incluyen en el modo de vista previa, no en las exportaciones ni en las áreas que se incorporan al mapa.

Verificación: pruebas de filtro y contrato de interfaz, `npm test` y análisis sintáctico del JavaScript inline.
