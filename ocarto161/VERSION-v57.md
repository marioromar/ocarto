# Ocarto v57 — intercambio DXF por capas para OCAD

- La importación DXF crea una capa vectorial independiente por nombre de capa DXF y conserva asignados a ellas sus puntos, líneas y polígonos.
- Los nombres `LIDAR_OPEN`, `LIDAR_LOW`, `LIDAR_SPARSE` y `LIDAR_DENSE` se presentan con etiquetas descriptivas y colores iniciales editables; los nombres DXF originales se conservan en la propiedad `dxfLayerName` de la capa.
- Las capas pueden renombrarse, colorearse, ocultarse y deshacerse junto con la importación. La geometría de áreas DXF toma el color de su capa.
- La exportación vegetal existente genera `.ocdCrt` cuando dispone de equivalencias de símbolos aprendidas. OCAD permite utilizar la tabla CRT para asociar los nombres de capa DXF con símbolos del mapa.
- Las cuatro clases LiDAR provisionales siguen sin código ISOM automático: requieren selección/confirmación del símbolo en OCAD, porque altura y cobertura por sí solas no determinan transitabilidad.
- Se añadió cobertura de prueba para retención de capas y polilíneas DXF clásicas.

Verificación: `npm test` completo. La prueba de navegador se omite si Chromium no está instalado.
