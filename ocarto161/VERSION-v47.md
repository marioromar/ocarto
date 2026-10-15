# Ocarto v47 — detección de solape entre teselas

## Cambios
- La prueba del mosaico confirma que si dos archivos contienen registros LAS idénticos, ambos contribuyen a los puntos y conteos de suelo y vegetación.
- La interfaz compara los encuadres XY de cada archivo que cruza el área y avisa cuando una tesela se solapa con otra procesada.
- Los archivos completamente fuera del polígono siguen omitiéndose y ahora no alteran los límites del mosaico mostrado.

## Cómo interpretar el aviso
El solape de encuadres indica que podrían repetirse puntos, pero no demuestra que los archivos tengan registros duplicados: los bordes de los datos pueden ser irregulares. Ocarto no elimina automáticamente puntos coincidentes, porque mantener una tabla exacta de millones de registros consumiría memoria y la coincidencia de coordenadas por sí sola podría borrar retornos distintos. Los puntos repetidos sí afectan conteos y promedios; el mínimo del terreno conserva el valor más bajo.

## Verificación
- `npm test` valida dos teselas con registros byte-equivalentes y los recuentos resultantes.
- La prueba de navegador sigue omitida porque el entorno no dispone de Chromium.
