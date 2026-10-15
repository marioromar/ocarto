# Ocarto v42 — recorte LiDAR por área seleccionada

## Implementado
- Al seleccionar uno o varios archivos LAS/LAZ, si hay un polígono cartográfico seleccionado, Ocarto lo usa como área de interés del mosaico.
- Se admiten anillos interiores del área como huecos. Solo puntos dentro del anillo exterior y fuera de los huecos actualizan terreno y vegetación.
- El Worker examina los límites XY en la cabecera antes de reservar el búfer completo del archivo. Si la extensión es válida y no cruza el área, omite la tesela y detiene su lectura.
- Si los límites de cabecera están vacíos o son incoherentes, se procesa la tesela completa y se aplica el recorte exacto punto a punto.
- Sin un área seleccionada, se mantiene el mosaico v41 por la extensión completa.

## Impacto y límites
- Hay que seleccionar un elemento de tipo área. Una línea abierta no define por sí sola un interior; no se usa automáticamente para recortar.
- Las coordenadas del área deben estar en el mismo CRS/unidades que los archivos.
- Las teselas que cruzan el área aún se leen y decodifican completas, porque LAZ se consume secuencialmente. El recorte reduce los puntos que llegan a los acumuladores y los modelos exportados; el descarte por cabecera evita reservar búferes para las teselas exteriores.
- Si todas las teselas se omiten, el mosaico informa que no se procesaron teselas y no genera un modelo vacío.

## Validación
- `npm test` y chequeos de sintaxis del Worker y lector.
- Prueba sintética: polígono con un punto interior y otro exterior; solo el punto interior se agrega a terreno y al contador del mosaico.
- Prueba visual del navegador omitida: Chromium no está instalado en este entorno.
