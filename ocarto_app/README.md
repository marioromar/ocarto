# Ocarto para Windows (Flutter)

Esta carpeta contiene la aplicación de escritorio del **mismo repositorio Ocarto**, con un nuevo menú **GPS** y soporte de receptores Bluetooth clásicos que Windows expone como puertos COM.

**Funciones disponibles:** conexión COM/USB, lectura NMEA GGA/RMC con verificación de checksum, posición en directo, selección de símbolo lineal (506 por defecto), grabación de recorrido en línea editable, autoguardado y exportación GPX. Consulta [README-GPS-Windows.md](README-GPS-Windows.md) para las instrucciones y limitaciones.

## Compilar en un equipo Windows

Instala Flutter y Visual Studio con el componente de desarrollo de escritorio C++. Abre una terminal en esta carpeta y ejecuta:

```powershell
flutter pub get
flutter test
flutter build windows --release
```

El ejecutable y sus bibliotecas aparecerán en `build/windows/x64/runner/Release/`. Debes copiar **toda** esa carpeta para distribuirlo (no solo el .exe). La compilación automatizada está definida en [el workflow Windows](../.github/workflows/flutter-windows-gps.yml), que adjunta el resultado cuando termina correctamente.

La aplicación Flutter es todavía un prototipo cartográfico; no incorpora todas las herramientas del editor web profesional `source/v234/index.html`. El track GPS conserva latitud/longitud WGS84 y los detalles NMEA, pero el fondo cartográfico de este prototipo aún no dispone de carga avanzada georreferenciada. Para un GPS Bluetooth exclusivamente BLE sin COM se necesita otro módulo de conexión.

La distribución debe conservar los avisos exigidos por la licencia LGPL de `libserialport` y las licencias del proyecto.
