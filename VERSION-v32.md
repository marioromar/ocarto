# Ocarto v32 — Copia automática local de proyectos

## Implementado
- Continúa desde v31 con validación de parámetros y modelos dentro del proyecto.
- Guarda automáticamente la última copia del proyecto en IndexedDB tras 2,2 s sin actividad de edición.
- Incluye una acción para descargar la última copia local como archivo `.ocarto` y abrirla con el flujo normal.
- La copia conserva mapa, plantillas locales, modelo de vegetación y parámetros; LiDAR original debe reimportarse.
- Si el almacenamiento local no está disponible o se llena, el guardado manual descargable sigue funcionando y se muestra el estado.
- Añade pruebas de presencia del guardado diferido, lectura/descarga y compatibilidad del archivo.

## Validación
- `npm test`
- Compilación de scripts inline y comprobación sintáctica del módulo IndexedDB.
