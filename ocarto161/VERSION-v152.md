# Ocarto v1.52 — pruebas completas y documentación sincronizada

- `npm test` ejecuta automáticamente todas las pruebas `.cjs` de `tests/`, incluidas las herramientas de edición que antes no estaban en la orden principal.
- El ejecutor es portable en Windows, macOS y Linux; detiene la ejecución al primer fallo y conserva la salida de cada prueba.
- Se corrige la documentación: las áreas compatibles de archivos OCAD se pueden importar como guía protegida y usar como ejemplos de aprendizaje de vegetación.
- Se aclaran los formatos: la aplicación guarda OMAP XML v9; la escritura binaria OCAD, la importación DGN y GeoTIFF siguen pendientes.

## Verificación

- `npm test`: 57 pruebas superadas en el paquete de trabajo.
