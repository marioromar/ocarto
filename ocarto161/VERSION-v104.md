# Ocarto v1.04 — Roles de imágenes de referencia

- Cada imagen de plantilla puede marcarse como ortofoto (entrena color/textura), mapa guía, imagen LiDAR u otra referencia.
- El rol se guarda en el proyecto y en las plantillas antiguas se conserva el modo automático.
- El clasificador visual solo usa plantillas compatibles, georreferenciadas y con rol de ortofoto/automático que cubran la extensión LiDAR. Los mapas e imágenes LiDAR no contaminan ese entrenamiento.
- La carga desde «Preparar mapa» conserva accesos directos a imágenes, LiDAR y mapas vectoriales de referencia.
- Capacidad pendiente: importar los objetos y áreas directamente desde OCAD `.ocd` para usarlos como muestras automáticamente; el lector actual solo valida el índice y los símbolos.

Verificación pendiente tras los últimos cambios: `npm test` y compilación de script inline.
