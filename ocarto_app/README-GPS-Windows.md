# Ocarto Windows — GPS Bluetooth y grabación de tracks (v250)

Se añade **GPS** como menú desplegable de la aplicación de escritorio Flutter `ocarto_app`, sin proyecto paralelo. Funciona con receptores GNSS Bluetooth **SPP/NMEA** que Windows presenta como un puerto COM, así como receptores USB con puerto serie. Los dispositivos solo **BLE/GATT** no son compatibles con este modo.

1. En Windows, abre Configuración > Bluetooth y dispositivos, empareja el receptor y comprueba el **puerto COM saliente** en las opciones Bluetooth avanzadas o en el Administrador de dispositivos.
2. Abre Ocarto > **GPS**, pulsa **Buscar puertos**, elige `COM...`, selecciona la velocidad adecuada (habitual: 4800/9600) y **Conectar**.
3. Comprueba latitud, longitud, número de satélites y HDOP. Un mensaje de conectado no equivale a una fijación válida. Si no hay posiciones revisa el COM correcto, que el receptor emita **NMEA 0183** y la velocidad en baudios.
4. Elige un **símbolo lineal** del desplegable (por defecto *506 — Sendero*); pulsa **Iniciar grabación**. Los puntos entran directamente en una línea del proyecto, conservando coordenadas **WGS84**, marcas de tiempo y altitud cuando está disponible.
5. **Detener** finaliza la línea. Se puede seleccionar y mover sus vértices después de detenerla, o cambiar el símbolo. También se puede **Exportar GPX**.

**Autoguardado:** se escribe una copia del proyecto en el directorio de documentos de la aplicación como `ocarto-project.json` al iniciar y terminar un track y periódicamente durante su grabación (aprox. cada tres segundos, si llegan posiciones nuevas). Se recomienda además usar **Guardar proyecto** para elegir una ruta externa. El autoguardado se puede recuperar mediante **Cargar proyecto** cuando no se selecciona un archivo.

**Control de calidad:** solo posiciones GGA/RMC con checksum correcto, GGA con calidad positiva o RMC con estado A. Un filtro de 2 m, HDOP máximo 5 (si existe) y velocidad implícita máxima 30 m/s reduce el ruido y rechaza saltos. Estos valores son configurables en el código y no deben confundirse con precisión certificada.

**Limitación cartográfica importante:** el prototipo Flutter de Windows todavía no importa un fondo vectorial/raster georreferenciado completo, así que en modo GPS se utiliza una cuadrícula métrica local y la posición GNSS se representa respecto a WGS84. No se afirma que la cartografía previa sin georreferenciación coincida con el GPS. El track conserva coordenadas para una integración cartográfica posterior.

**Dependencia:** `flutter_libserialport ^0.6.0` (wrapper MIT que empaqueta `libserialport`, LGPL-3.0-or-later). Al distribuir binarios de Windows, hay que incluir los avisos de licencia y cumplir las condiciones de redistribución de la biblioteca nativa.

**Compilar en Windows:** dentro de `ocarto_app` ejecutar `flutter pub get`, `flutter test`, `flutter build windows`. Necesita Flutter estable, Visual Studio con Desktop development with C++, SDK de Windows y receptor GPS para ensayos reales. No se adjunta EXE porque la compilación y la prueba con un equipo Bluetooth real no se han ejecutado en este entorno.