# Ocarto v42 — recorte LiDAR por área seleccionada

## Implementado
- Si se selecciona un polígono del mapa al iniciar un mosaico LAS/LAZ, Ocarto lo usa como área de interés.
- Los huecos del polígono se conservan: solo se incorporan puntos dentro del anillo exterior y fuera de sus huecos.
- El Worker comprueba los límites XY de la cabecera antes de reservar el búfer completo. Si una tesela no cruza el área, detiene su lectura y la omite.
- Si una cabecera no proporciona límites válidos, se lee la tesela y el filtro exacto punto a punto sigue aplicándose.
- Si no hay polígono seleccionado, el mosaico mantiene el comportamiento de v41 y usa la extensión completa.

## Límites
- Se necesita seleccionar un elemento de tipo área; una línea abierta no define una zona interior.
- El polígono y los archivos deben compartir CRS y unidades.
- Las teselas que cruzan el área se leen y decodifican completas, ya que el lector LAZ actual es secuencial. El recorte reduce puntos agregados y tamaño de resultados; las teselas exteriores se omiten antes de reservar el búfer LAZ.
- Si todas las teselas quedan fuera, no habrá modelo para exportar.

## Validación
- `npm test` y comprobaciones de sintaxis de Worker y lector.
- Prueba sintética: filtra un punto exterior y conserva los interiores en terreno y vegetación.
- Prueba visual omitida: falta Chromium en este entorno.
