# Ocarto Windows — GPS Bluetooth, tracks y plantilla georreferenciada (v252)

Se añade **GPS** como menú desplegable de la aplicación de escritorio Flutter `ocarto_app`, sin proyecto paralelo. Funciona con receptores GNSS Bluetooth **SPP/NMEA** que Windows presenta como un puerto COM, así como receptores USB con puerto serie. Los dispositivos solo **BLE/GATT** no son compatibles con este modo.

1. En Windows, abre Configuración > Bluetooth y dispositivos, empareja el receptor y comprueba el **puerto COM saliente** en las opciones Bluetooth avanzadas o en el Administrador de dispositivos.
2. Abre Ocarto > **GPS**, pulsa **Buscar puertos**, elige `COM...`, selecciona la velocidad adecuada (habitual: 4800/9600) y **Conectar**.
3. Comprueba latitud, longitud, número de satélites y HDOP. Un mensaje de conectado no equivale a una fijación válida. Si no hay posiciones revisa el COM correcto, que el receptor emita **NMEA 0183** y la velocidad en baudios.
4. Elige un **símbolo lineal** del desplegable (por defecto *506 — Sendero*); pulsa **Iniciar grabación**. Los puntos entran directamente en una línea del proyecto, conservando coordenadas **WGS84**, marcas de tiempo y altitud cuando está disponible.
5. **Detener** finaliza la línea. Se puede seleccionar y mover sus vértices después de detenerla, o cambiar el símbolo. También se puede **Exportar GPX**.

**Autoguardado v251:** el proyecto se escribe primero en `ocarto-project.json.tmp` y solo después se sustituye el archivo principal `ocarto-project.json`. Antes de sustituir un principal válido se conserva la versión anterior en `ocarto-project.json.bak` (mediante `ocarto-project.json.bak.tmp`). El proceso evita sobrescribir la última copia buena con un principal corrupto. Si el principal no se puede leer, **Recuperar autoguardado** intenta el temporal válido y después el respaldo. Se guarda al iniciar y terminar un track y periódicamente durante la grabación (aprox. cada tres segundos, si llegan posiciones nuevas). Se recomienda usar además **Guardar proyecto** para elegir una ruta externa. La recuperación se debe probar con un archivo real antes de depender de ella en campo.

**Control de calidad:** solo posiciones GGA/RMC con checksum correcto, GGA con calidad positiva o RMC con estado A. Un filtro de 2 m, HDOP máximo 5 (si existe) y velocidad implícita máxima 30 m/s reduce el ruido y rechaza saltos. Estos valores son configurables en el código y no deben confundirse con precisión certificada.

**Limitación cartográfica importante:** el prototipo Flutter de Windows todavía no importa un fondo vectorial/raster georreferenciado completo, así que en modo GPS se utiliza una cuadrícula métrica local y la posición GNSS se representa respecto a WGS84. No se afirma que la cartografía previa sin georreferenciación coincida con el GPS. El track conserva coordenadas para una integración cartográfica posterior.

**Dependencia:** `flutter_libserialport ^0.6.0` (wrapper MIT que empaqueta `libserialport`, LGPL-3.0-or-later). Al distribuir binarios de Windows, hay que incluir los avisos de licencia y cumplir las condiciones de redistribución de la biblioteca nativa.

**Compilar en Windows:** dentro de `ocarto_app` ejecutar `flutter pub get`, `flutter test`, `flutter build windows`. Necesita Flutter estable, Visual Studio con Desktop development with C++, SDK de Windows y receptor GPS para ensayos reales. La automatización de GitHub Actions incluye pruebas y compilación para Windows y publica el paquete `ocarto-windows-gps` cuando termina correctamente; no es un instalador. **La conexión con un GPS físico sigue sin validación en campo**.

**Pruebas v251:** `test/project_storage_test.dart` verifica que las posiciones WGS84 sobreviven al guardado, que se conserva una copia previa y que la recuperación funciona con archivos truncados o temporales interrumpidos. Son pruebas de lógica de archivos; no sustituyen una prueba real del disco Windows ni de un receptor GNSS.
## Plantilla PNG + PGW: v252

En el panel izquierdo, abre **Plantilla georreferenciada**. Selecciona el EPSG del mapa y después pulsa **Importar PNG + PGW**. Ambos archivos deben compartir nombre base y estar en la misma carpeta, por ejemplo `bobadilla.png` y `bobadilla.pgw`. También se admite el world file `.pngw`.

Los sistemas de coordenadas aceptados son **ETRS89 / UTM 29N, 30N, 31N** (EPSG 25829, 25830, 25831) y **WGS84 / UTM 29N, 30N, 31N** (32629, 32630, 32631). **El PGW contiene solamente la transformación espacial de seis números; no contiene el EPSG**. Hay que seleccionar el correcto según los metadatos del ráster; de lo contrario los tracks pueden quedar desplazados. Se aplica proyección UTM en la visualización y la edición de los vértices GPS.

La plantilla se visualiza **bajo los tracks** y conserva el deslizador de opacidad del panel de capas. Para limitar el consumo de memoria, la previsualización se decodifica como máximo a **4096 píxeles en el lado más largo**, pero el posicionamiento utiliza las dimensiones originales y el PGW completo. No se modifica el archivo PNG.

La referencia del PNG, la transformación PGW y el EPSG quedan guardados en el proyecto `.ocarto` (formato versión 3). El proyecto **no incrusta el PNG**: si se mueve a otra carpeta u ordenador hay que conservar o reubicar la imagen. Al reabrir un proyecto cuya plantilla no está disponible se avisa del problema, sin inventar un mapa de fondo.

**Limitaciones:** esta función muestra una plantilla ráster; no importa GeoTIFF ni vectores OCAD/OMAP a Flutter, ni sustituye el editor cartográfico web. La conversión usa el elipsoide WGS84 para visualización UTM; no ejecuta transformaciones geodésicas oficiales de alta precisión. La visualización y la grabación sobre cartografía deben comprobarse con un mapa de coordenadas conocidas y con un receptor GNSS físico antes de uso profesional.
