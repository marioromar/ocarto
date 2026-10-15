# Ocarto v43 — recorte LiDAR con lectura anticipada

## Cambios
- Si una tesela no cruza el polígono seleccionado, Worker y lector coordinan para cancelar el archivo después de recibir el primer bloque (hasta 1 MiB). No se reserva su búfer completo ni se inicia el decodificador LAZ.
- Se añade una prueba al lector por bloques que confirma que una tesela exterior detiene la transferencia tras el primer bloque.
- Se mantienen el recorte punto a punto del v42, los anillos interiores y el funcionamiento sin polígono.

## Validación
- `npm test` y chequeos de sintaxis pasan. La prueba visual sigue omitida porque el entorno no tiene Chromium.
- LAZ real de 7.585.022 puntos: ventana de 600 × 600 m retiene 2.273.747 puntos (30 %), con 14.383 celdas de terreno y 14.400 de vegetación; RSS máximo 224 MiB en esta ejecución Node.
- La extensión real de cabecera permite reconocer teselas exteriores con límites XY antes de reservar el LAZ.

## Límite
Las teselas que sí cruzan el área todavía se leen y decodifican completas; esta optimización evita leer las que están fuera y reduce la cantidad de puntos acumulados en los modelos.
