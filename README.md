# Ocarto — editor cartográfico de orientación

**Editor profesional web: v259 (GPS + LiDAR v258) · Aplicación Windows Flutter: v257.** Ambas aplicaciones permanecen en este mismo repositorio Ocarto; Windows sigue en desarrollo y todavía no integra todas las herramientas del editor web.

## Descargar la aplicación

- **[Ocarto v259 — ZIP de la rama con GPS y LiDAR](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v259.zip)**
- **[Código y versiones de Ocarto](source/v234/index.html)**
- **[Cambios y comprobaciones OCAD v249](source/v234/OCAD-v249.md)**

Para usar Ocarto desde un ordenador, descarga el ZIP, descomprímelo y abre el archivo **`index.html`** con el navegador. GitHub muestra el código fuente; no ejecuta por sí mismo el editor. El archivo `index.html` de la raíz del repositorio también conduce a la versión actual del editor en `source/v234/index.html`.

## Revisión OCAD 2018

En **Archivo → Revisar símbolos y tintas OCAD…** se puede abrir un archivo de Bobadilla y comprobar en modo **solo lectura** símbolos, colores CMYK y orden provisional de impresión. La auditoría permite descargar un informe JSON, y **no sustituye los símbolos, colores ni las prioridades actuales**. Falta verificar el resultado visualmente contra OCAD 2018 antes de aprobar nuevos predeterminados.

La rama `ocarto-v259` incorpora el GPS al editor profesional sin sustituir sus herramientas. El ZIP enlazado es el archivo de esta misma rama GitHub.

## LiDAR v258 · Volver a poder importar LAS/LAZ

Se ha restaurado el archivo **lidar-worker.js** ausente, el decodificador **laz-perf 3.4.0** y su WebAssembly local, y se ha conectado con la lectura por bloques del editor web. La validación incluye pruebas sobre archivos LAS y LAZ reales y modelos pequeños controlados; **no demuestra aún la fiabilidad con áreas de 4–9 km² ni con el LAZ PNOA de millones de puntos**.

**Para abrir esta versión en Windows:** descomprime el ZIP de la rama v258 y ejecuta **ABRIR-OCARTO.bat**; el navegador se abrirá en un servidor local. Abrir index.html directamente puede bloquear los Workers.

- [Instrucciones de prueba LiDAR v258](PRUEBA-LIDAR-v258.md)
- [ZIP completo con LiDAR v258](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v258.zip)
- [Código GitHub v258](https://github.com/marioromar/ocarto/tree/ocarto-v258)
- [Pruebas LiDAR GitHub Actions](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml)

**Límites explícitos:** COPC jerárquico no implementado; 1.000.000 de celdas por modelo como protección de memoria; la app Windows Flutter aún no procesa LAS/LAZ. El diseño de menús LiDAR aún necesita revisión presencial.

## Ocarto Windows — Bézier georreferenciado en metros UTM (v257)

La [rama ocarto-v257](https://github.com/marioromar/ocarto/tree/ocarto-v257) continúa la aplicación Flutter de Windows dentro del **mismo proyecto Ocarto**, sin alterar la rama web v249 ni las anteriores. Las operaciones Bézier sobre mapas PNG+PGW con EPSG UTM (29, 30 y 31) ahora calculan tiradores y desplazamientos en **metros UTM**, evitando tratar un grado de latitud como un grado de longitud. Los vértices y tiradores continúan guardándose como coordenadas WGS84, para mantener el esquema .ocarto v7 y sus proyectos anteriores.

Se conservan los modos Simétricos, Alineados y Libres, la creación/edición de vectores, GPS Bluetooth COM, GPX, plantilla georreferenciada, autoguardado y símbolos favoritos. **El catálogo Windows todavía es provisional**: no incorpora todo OCAD/ISOM ni las herramientas completas del editor web.

- [Código Windows v257](ocarto_app/)
- [Manual técnico y limitaciones](ocarto_app/README-GPS-Windows.md)
- [Pruebas y compilación Windows](https://github.com/marioromar/ocarto/actions/workflows/flutter-windows-gps.yml)
- [ZIP correspondiente exactamente a la rama v257](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v257.zip)

El archivo ZIP corresponde al código fuente. El **paquete ejecutable Windows** solo puede confirmarse cuando GitHub Actions publica el resultado ocarto-windows-gps tras superar las pruebas y la compilación build-windows. La precisión práctica del GPS y el uso cartográfico profesional aún deben validarse sobre mapas reales.

## GPS Bluetooth en el editor cartográfico profesional (v259)

El menú independiente **GPS** se ha añadido a `source/v234/index.html`: conexión a receptores Bluetooth clásicos emparejados por COM mediante **Web Serial** (Chromium/Edge en contexto seguro), coordenadas NMEA GGA/RMC en directo, centrado en posición, grabación en el símbolo lineal predeterminado o elegido, copia local periódica y exportación de tracks originales GPX. Para dibujar el track directamente sobre el mapa, Ocarto necesita **plantilla georreferenciada y CRS válido**, y convierte coordenadas WGS84 al CRS del mapa. Sin georreferenciación evita crear geometrías mal alineadas.

- [Manual GPS y límites de v259](source/v234/GPS-WINDOWS-v259.md)
- [Código GPS Web Serial](source/v234/gps-webserial.js)
- [Pruebas automáticas del GPS navegador](https://github.com/marioromar/ocarto/actions/workflows/gps-webserial.yml)
- [ZIP v259 de exactamente esta rama](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v259.zip)

Para usar el editor web en Windows, descomprime el ZIP y ejecuta `ABRIR-OCARTO.bat`: utiliza un servidor local y abre la app en el navegador compatible. El prototipo Flutter de Windows usa su **propia conexión COM nativa**, incluida en el código `ocarto_app`; no es la misma interfaz que el editor profesional. La comunicación física Bluetooth debe probarse con un receptor real.
