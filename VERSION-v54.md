# Ocarto v54 — exportación orientada a OCAD

Añade exportación del MDT y de la altura máxima de copa como PNG RGBA con world file PGW, empaquetados en un ZIP con nota de CRS y escala. Los huecos quedan transparentes. La plantilla muestra valores LiDAR mediante una paleta visual, no simbología ISOM. Límite de raster: 12 millones de píxeles; aumentar el tamaño de celda para áreas mayores.

Añade exportación de curvas conectadas a DXF ASCII con polilíneas por elevación y elevación Z, compatibles con el importador DXF de Ocarto y orientadas a importación CAD/OCAD. Las coordenadas mantienen unidades de origen; el usuario configura el mismo CRS y unidades en OCAD.

CSV y GeoJSON permanecen como formatos para intercambio, análisis y SIG. La automatización de simbología OCAD y GeoTIFF no está incluida.
