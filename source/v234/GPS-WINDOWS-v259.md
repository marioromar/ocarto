# Ocarto v259 — Menú GPS en editor profesional y app Windows

En el editor profesional `source/v234/index.html`, el nuevo menú **GPS** permite seleccionar receptor Bluetooth clásico que Windows expone como COM, posición GNSS en directo, centrado en la posición, y grabación de tracks editables usando un símbolo de línea. Exporta el recorrido **GNSS original** a GPX. El navegador pide permiso para seleccionar el puerto por medio de la API Web Serial: requiere Chromium/Edge con contexto seguro, no Firefox y no Bluetooth LE exclusivamente. Si la aplicación se abre desde archivo y no admite Web Serial, servir por `http://localhost`.

**Georreferenciación:** para grabar en el mapa, hay que abrir un mapa con plantilla georreferenciada y CRS correcto. Ocarto transforma WGS84 a ese CRS y guarda en cada vértice sus coordenadas proyectadas, además de los datos NMEA. Sin georreferenciación puede mostrar información de posición GPS, pero evita crear trazas mal situadas. Durante la grabación guarda copia local periódicamente; al detener, el track queda en CART como objeto lineal con símbolo seleccionado.

En paralelo sigue disponible la compilación nativa de `ocarto_app` con GPS Bluetooth SPP mediante COM de Windows. La conexión física aún debe probarse. El prototipo Flutter de Windows sigue sin las herramientas completas del editor profesional.

**Verificación:** `node --test source/v234/tests/gps-webserial.test.cjs` comprueba parser NMEA, checksums, GGA/RMC fragmentados y filtrado del track. La conexión Web Serial real y la alineación cartográfica han de verificarse con un receptor y un mapa georreferenciado reales.
