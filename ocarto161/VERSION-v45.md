# Ocarto v45 — aviso previo de capacidad del mosaico

## Cambios
- Al preparar un mosaico con polígono seleccionado, el Worker calcula cuántas celdas podrían caber dentro del encuadre rectangular con cada resolución elegida.
- La interfaz muestra esa estimación y el límite de 100.000 celdas por modelo mientras se procesan las teselas.
- La estimación es una cota por encuadre, no un recuento de puntos: la forma del polígono, teselas disponibles y clases LAS pueden reducir el número real.
- No se cambia automáticamente el tamaño de celda ni la precisión solicitada.

## Verificación
- `npm test` valida encuadres alineados a la cuadrícula y una estimación que supera el límite.
- La prueba real anterior sigue mostrando 14.383 celdas de terreno y 14.400 de vegetación con el LAZ de 7.585.022 puntos.
