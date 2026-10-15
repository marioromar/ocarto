# v91 — Imágenes como plantillas y ajuste por puntos

Las imágenes que el navegador pueda abrir se pueden añadir como plantillas de referencia. Si la imagen tiene world file, se puede cargar para colocarla mediante sus coordenadas. Si no tiene georreferenciación, el ajuste se hace con tres o más parejas de clics: primero un detalle de la imagen y luego el mismo detalle en el mapa. La transformación afín resultante se guarda en el proyecto y sitúa la imagen en el plano del mapa sin convertir el mapa de trabajo a coordenadas geográficas.

La carga intenta la decodificación nativa del navegador y, como alternativa, `createImageBitmap`; cuando se usa la alternativa, guarda una copia PNG para que el proyecto pueda reabrirla. Los formatos no compatibles en el navegador muestran un error con el nombre del archivo.

Verificación: `npm test`, comprobaciones de plantillas en `tests/project-settings.cjs` y `node --check` de los scripts integrados.
