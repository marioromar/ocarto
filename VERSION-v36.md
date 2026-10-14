# Ocarto v36 — Restaurar copia local sin descarga intermedia

## Implementado
- Continúa desde v35 con estado visible de la copia automática y almacenamiento alternativo.
- Permite validar y abrir directamente la última copia local.
- Comparte el mismo proceso de preparación que abrir archivos `.ocarto`; valida todo antes de modificar el mapa en pantalla.
- Un error de lectura o validación mantiene intacto el mapa actual y la copia guardada.
- Conserva también la opción de descargar el archivo y abrirlo manualmente.
- Refactoriza la aplicación de proyectos para compartirla entre apertura de archivo y recuperación local.

## Validación
- `npm test`
- Compilación de scripts inline y pruebas de proyecto/copias locales.
