# Aviso de dependencia: laz-perf

Ocarto descarga bajo demanda `laz-perf.js` y `laz-perf.wasm` de la etiqueta oficial `3.4.0` de Hobu mediante `npm run vendor:laz-perf`. La dependencia se distribuye bajo Apache License 2.0. La licencia completa está disponible en https://github.com/hobuinc/laz-perf/blob/3.4.0/COPYING.

Los binarios generados se excluyen de Git mediante `.gitignore`; el script de instalación conserva la fuente fijada a una versión, y evita guardar artefactos binarios no inspeccionables en el repositorio de la aplicación.
