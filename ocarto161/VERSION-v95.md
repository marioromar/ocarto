# v95 — Conversión de coordenadas y autodetección UTM

- Importación GeoJSON/KML/KMZ: reproyección al CRS configurado del mapa desde GPS (EPSG:4326), Web Mercator (EPSG:3857), UTM WGS84 y UTM ETRS89.
- Los datos GPS pueden establecer automáticamente la zona UTM al importarse en un mapa nuevo. Si el usuario elige una zona manualmente, esa elección se conserva.
- La detección de zona contempla las excepciones UTM de Noruega y Svalbard.
- Se añade la acción «Reproyectar el mapa completo»: transforma juntos elementos, datos LiDAR, centro y escala de la nube, y afines de imágenes georreferenciadas, manteniendo el lienzo en su sitio y el tamaño de los símbolos.
- La conversión ETRS89/WGS84 es aproximada y no aplica rejillas geodésicas. Las plantillas WMS se deben volver a cargar en el CRS destino.

Verificación: `npm test`, pruebas de conversión CRS, importación y sintaxis.
