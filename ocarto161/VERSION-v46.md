# Ocarto v46 — liberación de memoria del mosaico

## Comportamiento
- El Worker libera el búfer comprimido de cada LAZ y su decodificador al completar una tesela, antes de avisar a la interfaz para que cargue la siguiente. El acumulador solo conserva los resúmenes por celda.
- El asignador WebAssembly puede conservar la memoria lineal reservada como capacidad reutilizable durante el mosaico; por eso el Worker se termina al completar, cancelar o fallar una sesión de área. Al crear un nuevo Worker, el motor y la memoria anterior quedan disponibles para recolección del navegador.
- Si falla la validación antes de iniciar la sesión, conserva el Worker y la nube que ya estuviera cargada.

## Validación
- `npm test` incluye la prueba mock de varias teselas LAZ y comprueba que se liberan las asignaciones de cada búfer antes de acabar el mosaico.
- La prueba de navegador sigue omitida por falta de Chromium en este entorno.
