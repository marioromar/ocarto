# Ocarto v50 — progreso preciso al leer COPC por área

## Cambios

- El mosaico COPC por área recorre las páginas de jerarquía una primera vez para sumar los puntos de los bloques candidatos y una segunda vez para decodificarlos.
- La barra de progreso usa el total de puntos candidatos, por lo que llega al 100 % aunque el área cubra solo una parte del archivo.
- No se conserva una lista de todos los bloques entre recorridos; se vuelven a leer las páginas pequeñas de jerarquía para mantener acotada la memoria.
- Si la jerarquía no contiene bloques candidatos, se omite también la inicialización del decodificador.

## Verificación

- `npm test` comprueba que el progreso de un AOI parcial termina exactamente en el total de puntos de los bloques candidatos.
- `npm run test:copc-real -- ruta/al/archivo.copc.laz` valida la lectura espacial con un COPC real cuando se dispone del fixture.
- La prueba de integración de navegador puede omitirse si Chromium no está instalado en el entorno.
