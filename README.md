# Ocarto — editor cartográfico de orientación

**Editor profesional web: v264 (MDT preliminar con halo entre teselas) · Aplicación Windows Flutter: v257.** Ambas aplicaciones permanecen en este mismo repositorio Ocarto; Windows sigue en desarrollo y todavía no integra todas las herramientas del editor web.

## Descargar la aplicación

- **[Ocarto v264 — ZIP de la rama con GPS y LiDAR](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v264.zip)**
- **[Código y versiones de Ocarto](source/v234/index.html)**
- **[Cambios y comprobaciones OCAD v249](source/v234/OCAD-v249.md)**

**Para probar LiDAR en Windows:** descarga el ZIP de la rama v264, extráelo completamente y haz doble clic en **`ABRIR-OCARTO.bat`**. El navegador se abrirá en `http://127.0.0.1:8787/`. **No abras `index.html` directamente**: con `file://` el navegador puede bloquear los Web Workers necesarios para LAS/LAZ. La ventana negra de PowerShell debe permanecer abierta. El servidor es local y no sube tus nubes de puntos a Internet. Ver [comprobaciones paso a paso](PRUEBA-LIDAR-v264.md).

## Revisión OCAD 2018

En **Archivo → Revisar símbolos y tintas OCAD…** se puede abrir un archivo de Bobadilla y comprobar en modo **solo lectura** símbolos, colores CMYK y orden provisional de impresión. La auditoría permite descargar un informe JSON, y **no sustituye los símbolos, colores ni las prioridades actuales**. Falta verificar el resultado visualmente contra OCAD 2018 antes de aprobar nuevos predeterminados.

La rama `ocarto-v264` incorpora GPS y el procesamiento LiDAR por ventanas en el mismo editor web profesional, sin sustituir sus herramientas. El ZIP enlazado es el archivo de esta misma rama GitHub.

## LiDAR v264 · MDT preliminar con halo y uniones entre teselas

Esta versión añade una **segunda fase opcional** al procesamiento LiDAR de áreas grandes. Después de exportar todas las teselas a CSV, en el panel LiDAR pulsa **«MDT preliminar · unir bordes»** y selecciona la carpeta de resultados `ocarto_teselas_...` que contiene `manifest.json`.

Ocarto lee por flujo las celdas de suelo de cada tesela y una franja de **2 celdas alrededor de sus vecinas (halo)**. Genera para cada bloque un archivo `tesela_NNN_NNN_mdt_preliminar.asc` compatible con **ESRI ASCII Grid**. Las cotas de suelo realmente observadas se conservan; solo se interpolan pequeños vacíos de hasta 2 celdas con al menos 3 muestras cercanas, mediante distancia inversa al cuadrado. Los huecos grandes y las zonas exteriores al polígono (incluidos sus huecos) permanecen como **NODATA**. El diseño conserva los límites de memoria por ventana y evita cargar la zona completa.

Los archivos se exportan por orden, y `manifest.json` mantiene un apartado `dtmSeams` separado del estado original de la nube, de modo que una cancelación de esta segunda fase no marque como fallido el procesamiento LAS/LAZ que ya se completó. Se puede pulsar **«Detener MDT»**. Las rejillas completas previas permanecen en disco.

**Muy importante:** es una **rejilla MDT preliminar**, no una interpolación geodésica/cartográfica profesional y **todavía no genera curvas continuas**. No se han implementado aún una exportación GeoTIFF/PNG georreferenciada de este nuevo MDT, los contornos suavizados ni el reconocimiento de formas de relieve. Se necesitan pruebas sobre el LAZ PNOA real y comparación visual con el terreno.

- [Guía de prueba con los botones exactos](PRUEBA-LIDAR-v264.md)
- [ZIP idéntico al repositorio v264](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v264.zip)
- [Pruebas LAS/LAZ, halo y lanzador Windows](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml)

## LiDAR v263 · Evitar descomprimir LAZ dos veces y validar archivos exportados

En mosaicos de varias teselas, la carga del LAZ ahora **lee y valida la cabecera** pero no descomprime los millones de puntos únicamente para hacer una vista previa que sería descartada. La descompresión se ejecuta durante el análisis verdadero de la ventana. La apertura individual de una nube, fuera del modo mosaico, **mantiene su vista previa**.

Se ha separado el módulo de escritura local de **CSV por bloques de 4096 filas**, con comprobación de columnas, gestión de errores de escritura y aborto del archivo incompleto. La ventana se marca como terminada en `manifest.json` **solo después de exportar y comprobar el número de filas de ambos archivos**, terreno y vegetación. Los bloques anteriores permanecen en disco si la ejecución se cancela o falla.

- [Prueba práctica LiDAR v263](PRUEBA-LIDAR-v263.md)
- [Código GitHub v263](https://github.com/marioromar/ocarto/tree/ocarto-v263)
- [ZIP del mismo código v263](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v263.zip)
- [Pruebas automáticas LAS/LAZ, exportación y lanzador](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml)

**Sigue pendiente:** comprobar en el PC el LAZ PNOA de millones de puntos, generar un MDT continuo interpolado con halos, unir curvas entre ventanas, validar la vegetación real, importar COPC por jerarquía y procesar LAS/LAZ en el ejecutable Flutter. La lectura de la fuente que intersecta múltiples ventanas **todavía se repite por ventana**.

### Índice espacial de fuentes y precisión de ventanas

Para áreas extensas, Ocarto ahora lee **una única vez los primeros 227 bytes** de cada LAS/LAZ para obtener sus límites y selecciona solo los archivos que intersectan cada bloque. Los archivos con cabecera ilegible no se omiten silenciosamente: pasan al procesador para devolver un error verificable. El `manifest.json` incluye el resumen de archivos indexados y la lista de fuentes utilizadas en cada ventana.

Además, las fronteras de las ventanas se alinean simultáneamente con las dos resoluciones elegidas (por ejemplo, 0,5 m de terreno y 0,7 m de vegetación), para evitar celdas duplicadas en las uniones. **Esto no crea todavía halo ni garantiza continuidad de curvas.**

## LiDAR v262 · Procesamiento por ventanas con salida a disco

Se añadió la herramienta **Área extensa · procesar por teselas**. Con un polígono georreferenciado seleccionado y varios archivos LAS/LAZ, Ocarto planifica bloques de tamaño controlado para superficies de hasta 4–9 km² a 0,5 m, procesa las celdas por ventana y escribe **CSV independientes de terreno y vegetación**, más un `manifest.json`, en la carpeta elegida en Chrome/Edge. Así se evita almacenar en memoria todas las celdas del área completa. Ahora también se corrigen errores previos de finalización de mosaico y del cálculo de extensión de un polígono.

**No produce todavía un MDT continuo ni curvas unidas:** faltan halo, interpolación, unión entre teselas y pruebas de rendimiento con el LAZ PNOA grande. El origen LAS/LAZ puede volver a leerse varias veces. Se conservan límites de seguridad por ventana.

- [Guía para abrir y usar LiDAR v262](PRUEBA-LIDAR-v262.md)
- [ZIP idéntico al código de la rama v262](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v262.zip)
- [Pruebas automáticas](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml)

## LiDAR v261 · Saltar teselas fuera del área y abrir el panel correcto

Si se selecciona un polígono de trabajo antes de importar varias teselas LAS/LAZ, el Worker ahora lee primero la cabecera (227 bytes) de cada archivo para comprobar sus límites. Si toda la tesela está **fuera del área**, omite el resto del archivo **antes de reservar memoria y descomprimir LAZ**. Si la tesela toca el área o la cabecera no permite descartar con seguridad, continúa la lectura normal. El recorte exacto de puntos se mantiene dentro de las teselas parcialmente coincidentes. Las pruebas verifican ambos casos con archivos reales.

Se corrigieron los accesos **LiDAR, Capas y Símbolos**: ahora activan el espacio de trabajo del panel derecho, en vez de desplazar la página hacia tarjetas que estaban ocultas.

[ZIP del mismo código GitHub v261](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v261.zip) · [Pruebas LiDAR y lanzador Windows](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml)

**Límites:** no aumenta el límite de un millón de celdas por modelo ni habilita aún 4–9 km² continuos a 0,5 m; tampoco valida el LAZ PNOA de millones de puntos, ni implementa el procesado LiDAR nativo de Flutter. Para teselas **que intersectan** el área todavía se lee/descomprime el archivo entero y se conservan únicamente los puntos del polígono.

## LiDAR v260 · Validación de extremo a extremo

La versión **v260** incluye además una prueba de integración completa entre el selector de archivos del navegador y el Worker, con transferencia por varios bloques, confirmaciones ACK, lectura LAS y descompresión real LAZ sin servicios externos. Estas pruebas evitan que vuelvan a publicarse cambios que funcionan en el procesador aislado pero se bloquean durante la importación desde la interfaz.

[Ver los resultados de LiDAR y el lanzador Windows](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml) · [Descargar exactamente la misma rama de GitHub](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v260.zip)

**Sigue pendiente** comprobar el archivo LAZ PNOA real de millones de puntos, mosaicos extensos de 4–9 km² a 0,5 m, curvas reglamentarias, calidad de vegetación y toda la edición profesional. En Windows Flutter todavía no se procesan LAS/LAZ.

## LiDAR v258 · Volver a poder importar LAS/LAZ

Se ha restaurado el archivo **lidar-worker.js** ausente, el decodificador **laz-perf 3.4.0** y su WebAssembly local, y se ha conectado con la lectura por bloques del editor web. La validación incluye pruebas sobre archivos LAS y LAZ reales y modelos pequeños controlados; **no demuestra aún la fiabilidad con áreas de 4–9 km² ni con el LAZ PNOA de millones de puntos**.

**Para abrir esta versión en Windows:** descomprime el ZIP de la rama v261 y ejecuta **ABRIR-OCARTO.bat**; el navegador se abrirá en un servidor local. Abrir index.html directamente puede bloquear los Workers.

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
