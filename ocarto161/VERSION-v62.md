# Ocarto v62 — raster de proporción de retornos vegetales

- Nueva exportación PNG + PGW de la proporción de retornos clasificados como vegetación respecto a los retornos de vegetación y suelo en cada celda.
- Escala fija de 0 a 1: amarillo claro para proporción baja y verde oscuro para proporción alta; las celdas sin valor quedan transparentes.
- Incluye metadatos con la interpretación, extensión, tamaño de celda y CRS cuando está declarado.
- Es un indicador de retornos clasificados, no cobertura de copa calibrada, penetrabilidad ni velocidad de carrera. No asigna símbolos o colores ISOM automáticamente.
- Prueba sintética valida escala fija, transparencia, alineación PGW y rechazo de valores fuera de rango.

Verificación: `npm test`. Requiere revisión visual con un mosaico LiDAR real antes de interpretar cartográficamente la paleta.
