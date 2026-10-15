# v92 — PDF, TIFF y GeoTIFF como plantillas

La carga de plantillas acepta imágenes habituales, PDF y archivos auxiliares geográficos. Para un PDF multipágina, se elige la página que se rasteriza como plantilla. Los TIFF/GeoTIFF se decodifican localmente y se limitan a 6000 píxeles en su lado mayor para controlar memoria.

Al seleccionar conjuntamente una imagen o PDF con un world file de igual nombre base, Ocarto lo asocia automáticamente. Se admiten JGW/JPGW, PGW/PNGW, TFW/TIFW/TIFFW, PDFW y WLD. El PRJ con igual nombre base identifica EPSG cuando lo declara. GeoTIFF lee ModelTransformation o ModelPixelScale/ModelTiepoint y extrae EPSG de las GeoKeys. Los CRS diferentes del mapa quedan ocultos para evitar una superposición incorrecta. Sin transformación geográfica se mantiene el ajuste por parejas de puntos.

Los lectores PDF.js 6.4.299 y geotiff.js 3.0.5 se incluyen localmente con sus licencias; la importación no necesita conexión de red.

Verificación: `npm test`, análisis sintáctico de scripts integrados y prueba unitaria de las transformaciones GeoTIFF.
