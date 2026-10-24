# Ocarto Flutter · Windows y móvil

Esta carpeta contiene la aplicación Flutter de Ocarto para Windows, Android e iOS. La primera adaptación móvil mantiene las herramientas de selección, dibujo de puntos, líneas y áreas, edición de vértices Bézier, catálogo de símbolos y visibilidad de capas, usando navegación inferior para pantallas táctiles.

En móviles, los proyectos se autoguardan en el dispositivo. **Abrir proyecto** usa el selector del teléfono, que puede mostrar OneDrive si está instalado; **Guardar copia** abre el menú de compartir del sistema para elegir OneDrive u otro destino. Es una transferencia manual; la sincronización automática de fondo aún no está conectada. LiDAR se procesa en Windows y se importan al móvil sus PNG georreferenciados con el PGW correspondiente; el PGW se guarda con la referencia espacial del proyecto.

La conexión GPS Bluetooth clásica por puerto COM, la grabación NMEA y la exportación GPX siguen disponibles en Windows. La conexión a GNSS del teléfono y Bluetooth BLE se habilitarán en una fase móvil posterior. Consulta [README-GPS-Windows.md](README-GPS-Windows.md) para las instrucciones GPS de Windows.

## Compilar en un equipo Windows

Instala Flutter y Visual Studio con el componente de desarrollo de escritorio C++. Abre una terminal en esta carpeta y ejecuta:

```powershell
flutter pub get
flutter test
flutter build windows --release
```

El ejecutable y sus bibliotecas aparecerán en `build/windows/x64/runner/Release/`. Debes copiar **toda** esa carpeta para distribuirlo (no solo el .exe). La compilación automatizada está definida en [el workflow Windows](../.github/workflows/flutter-windows-gps.yml), que adjunta el resultado cuando termina correctamente.

## Compilar la versión Android

En Android Studio o una terminal con el SDK configurado:

```powershell
flutter pub get
flutter test
flutter build apk --release
```

El APK aparece en `build/app/outputs/flutter-apk/app-release.apk`. El proyecto móvil permite importar PNG y PGW en una selección, copia la imagen al almacenamiento privado de Ocarto y conserva la georreferenciación al cerrar y volver a abrir la app.

La app Flutter continúa ampliándose y todavía no incorpora todas las herramientas del editor web profesional `source/v234/index.html`. LiDAR no se procesa en el teléfono.

La distribución debe conservar los avisos exigidos por la licencia LGPL de `libserialport` y las licencias del proyecto.
