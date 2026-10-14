# Ocarto v55 — vegetación vectorial y salidas para orientación

Con ejemplos dibujados sobre el mapa, se aprende localmente bosque blanco, verde 1/2/3, terreno abierto y matorral; celdas contiguas similares se agrupan en polígonos. La propuesta se exporta como GeoJSON con atributos de etiqueta y códigos ISOM candidatos.

Cuando existe modelo de ejemplos, se descarga un ZIP con GeoJSON, DXF de polígonos por capas y tabla de referencias .ocdCrt para convertir nombres de capa a símbolos en OCAD. Los códigos candidatos son 405 (bosque blanco), 406/408/410 (vegetación progresivamente menos transitable), 401 (terreno abierto) y matorral sin símbolo único. Confirmar que la edición ISOM y los números existen en el mapa OCAD de destino.

El DXF excluye polígonos con huecos interiores para no convertir los claros en áreas cubiertas; el GeoJSON los conserva. Matorral tampoco se asigna automáticamente a un código único. Un botón adicional produce raster PNG + PGW de las etiquetas aprendidas y una leyenda; es una plantilla visual, no simbología de mapa final.

Las etiquetas requieren áreas de referencia dibujadas y verificadas. LiDAR mide retornos y estructura, no transitabilidad real; toda propuesta requiere revisión cartográfica.
