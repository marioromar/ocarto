# Ocarto v41 — mosaico LiDAR por teselas

## Implementado
- El selector permite elegir varios LAS/LAZ para procesarlos como teselas de una misma área.
- El Worker procesa cada tesela por bloques y en una pasada calcula acumuladores de terreno (mínimo de suelo por celda) e indicadores de vegetación.
- Cada LAZ comprimido se libera al terminar su tesela; el siguiente archivo se carga después. El acumulador conserva solo estadísticas por celda, no nubes de puntos previas.
- Al final se combinan las celdas y quedan disponibles las exportaciones existentes de MDT, curvas, vaguadas e indicadores/vectorización de vegetación.
- La cancelación y los errores liberan la tesela parcial; los modelos calculados anteriormente se mantienen.

## Límites
- Las teselas se consideran una sola zona, con CRS y unidades compartidos. El área es la unión de sus extensiones; aún no se recorta mediante un polígono de interés.
- Los solapes entre archivos pueden contar puntos duplicados y alterar densidades y proporciones. Las cotas mínimas y máximas por celda son menos sensibles a duplicados.
- El terreno y la vegetación limitan cada acumulador a 100.000 celdas. Si se supera, aumenta el tamaño de celda y vuelve a procesar el mosaico.
- CSV/XYZ sigue limitado a 250.000 puntos y no forma parte del flujo de mosaico.

## Validación
- `npm test` y comprobación de sintaxis de los scripts.
- Pruebas sintéticas: combina dos teselas LAS y dos LAZ transmitidos por bloques, verifica celdas compartidas y liberación de cada búfer WASM.
- LAZ real de 7.585.022 puntos procesado por el acumulador de área: terreno, vegetación, edificios y vaguadas; 39.961 celdas de terreno y 40.000 celdas de vegetación, 384 MiB de RSS máximo en esta ejecución Node.
- La prueba visual del selector múltiple queda pendiente porque este entorno no tiene Chromium.
