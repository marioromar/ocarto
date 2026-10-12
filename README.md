# Ocarto

Primer bloque verificable del editor de cartografía de orientación.

Abre `index.html` en un navegador. Activa/desactiva capas, cambia transparencia, selecciona Punto/Línea/Área y dibuja. La plantilla y la vegetación permanecen separadas del grupo editable; limpiar solo borra lo editable.

Arquitectura prevista: `core` (geometrías, coordenadas, historial y símbolos IOF), `map-editor` (capas y edición), `templates` (plantillas bloqueadas), `lidar` (LAS/LAZ y detección) e `io` (GeoJSON, imágenes y formatos de orientación). El importador LAS/LAZ y el curvado suavizado serán módulos independientes.
