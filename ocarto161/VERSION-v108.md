# Ocarto v1.08 — Importar polígonos OCAD 10 y 11

- El lector de plantillas OCAD admite versiones 10, 11, 12 y 2018.
- Se decodifican las cabeceras antiguas de objetos y sus anillos de área; la lectura OCAD 12/2018 se mantiene.
- Cuando el archivo no declara un EPSG, se usa el CRS seleccionado del mapa (por defecto UTM WGS84 zona 30N) y se informa de esa suposición.
- Si el archivo indica que no está en coordenadas de mundo real, la interfaz advierte que se debe revisar el encaje antes de compararlo con LiDAR.
- La plantilla OCAD permanece protegida y puede seguir usándose para inspección y aprendizaje de símbolos.

Verificación: `npm test` completo. La prueba de navegador se omitió porque el entorno no dispone del ejecutable Chromium.
