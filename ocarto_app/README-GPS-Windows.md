# Ocarto Windows — GPS y precisión geográfica Bézier (v257)

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

## Columna de símbolos y favoritos — v253

El prototipo Windows recupera una **columna derecha de símbolos**, con iconos grandes, sólidos y coloreados. Los favoritos ocupan el área superior, independientemente del desplazamiento del catálogo general. Para añadir o quitar un favorito, pulsa la **estrella** de su ficha, haz **clic derecho** o mantén la **pulsación larga**. Toca un símbolo para activar la herramienta de punto, línea o área de su categoría. La selección y los favoritos se conservan en el archivo de proyecto `.ocarto` (esquema versión 4), incluidos en el autoguardado.

**Importante:** el catálogo incorporado a Flutter es aún **preliminar**. Contiene representaciones visuales de categorías cartográficas, pero **NO** sustituye el catálogo completo OCAD/ISOM ni reproduce todavía grosores, patrones y prioridades de impresión oficiales. Los nombres de categoría sin código numérico son identificadores internos. La aplicación Windows sigue sin implementar las herramientas completas de dibujo Bézier y áreas del editor web.

Al seleccionar uno de los símbolos lineales admitidos por el GPS (506, 504, 101, 304, 416 o GPS) también se actualiza la selección para una siguiente grabación GPS. Un track ya iniciado conserva su símbolo.

**Compatibilidad:** los proyectos antiguos sin favoritos permanecen legibles; la v249 del editor web y la v252 de Windows siguen conservadas en sus respectivas ramas.

## Geometrías vectoriales editables — v254

En **Herramientas** o mediante un símbolo de la columna derecha, selecciona punto, línea o área. Al usar línea o área, **cada clic añade un vértice al mismo objeto**, no crea un objeto nuevo. Termina el trazado con **doble clic** o el botón **Terminar** del panel. Para cancelar un trazado sin guardar, utiliza la X del panel. Las líneas exigen al menos dos vértices distintos y las áreas al menos tres que no formen una superficie degenerada. Al terminar, el objeto se añade al proyecto y se autoguarda.

Con la herramienta **Seleccionar**, pulsa o arrastra un vértice para modificarlo; se admite también la edición de vértices GPS después de detener su grabación. Los puntos, líneas y áreas se guardan como geometrías reales en el formato de proyecto `.ocarto` (esquema 5). La representación de contornos naturales usa cúbicas Bézier de suavizado automático; los elementos definidos como angulares conservan las esquinas (edificios y muros, entre otros). **Todavía no se pueden manipular tiradores Bézier manualmente**.

Cuando existe origen cartográfico/GPS, los nuevos vértices se almacenan como longitud/latitud WGS84; si no lo hay, se almacenan como **coordenadas locales del lienzo**. Las últimas no deben confundirse con georreferenciación verdadera y pueden variar de posición aparente al cambiar el tamaño del área de dibujo. Los formatos heredados de v253 siguen leyéndose. Se conservan GPS, PNG+PGW, catálogo provisional y favoritos.

**Pendiente:** herramientas profesionales de suavizado por vértice, esquinas individuales, importación y edición CART/OCAD/OMAP y comprobaciones de campo. Los iconos de esta versión aún no reproducen todos los estilos oficiales IOF.

## Edición manual de Bézier — v255

La edición de los trazados vectoriales incorpora **dos tiradores por vértice**, entrante y saliente, y tres modos:

- **Editar tiradores Bézier:** seleccionar la herramienta **Seleccionar**, hacer clic sobre el vértice de una línea o área terminada y pulsar este botón en **Herramientas**. Aparecen dos controles amarillos unidos al vértice. Arrastrar uno para modificar la curvatura; el opuesto se refleja respecto al vértice, conservando una tangente continua.
- **Vértice de esquina:** el vértice seleccionado pierde sus tiradores y vuelve a comportarse como esquina. Los edificios, muros y vallados mantienen sus lados rectos de manera predeterminada.
- **Suavizado automático:** elimina los ajustes manuales del vértice y devuelve el cálculo automático de curvatura. La nueva interpolación limita la longitud y orientación de las tangentes en curvas cerradas, evitando los retrocesos que provocaban los cálculos Catmull-Rom sin restricción.

Cuando un vértice se mueve, sus controles manuales se trasladan la misma distancia, para no deformar la curva accidentalmente. Los tiradores se guardan como coordenadas absolutas en el **mismo sistema que el vértice** (lienzo local o longitud/latitud WGS84) dentro del archivo `.ocarto`, cuyo esquema pasa a **versión 6**. Los archivos de versiones anteriores sin tiradores continúan siendo legibles.

**Limitaciones:** los tiradores manuales mantienen una tangente simétrica de entrada/salida; todavía faltan los tiradores independientes de longitud, control de ángulos y otros tratamientos avanzados de curvas del editor cartográfico profesional. Los recorridos grabados con GPS siguen siendo polilíneas editables por vértices, pero **no** utilizan estos tiradores Bézier. Se requieren pruebas visuales sobre cartografía real antes de darlo por terminado para producción.

## Tiradores Bézier independientes — v256

Al seleccionar un vértice de una línea/área editada, en **Herramientas → Edición Bézier**, además de crear tiradores, definir esquinas y restaurar el suavizado automático, se pueden seleccionar tres **modos de acoplamiento**:

- **Simétricos:** ambos tiradores mantienen la misma longitud y dirección opuesta. Era el comportamiento de v255.
- **Alineados:** conservan la misma dirección tangencial, pero la longitud del tirador opuesto se mantiene al arrastrar uno. Permite suavizar sin hacer simétrica la distancia a cada lado.
- **Libres:** cada tirador se mueve independientemente, tanto en ángulo como en longitud. El opuesto no cambia al arrastrar.

Al cambiar a Simétricos o Alineados, el tirador saliente determina la dirección; el modo Alineados conserva la longitud previa del entrante. Al seleccionar una esquina no se aplican tiradores. Mover el vértice desplaza los controles con él. El sistema guarda los modos en cada vértice en el esquema **7** de `.ocarto`; los mapas anteriores sin modo se leen como **Simétricos**, sin perder sus controles.

También se ha corregido la selección de un vértice cuando sus tiradores se encuentran muy cerca: se da preferencia a arrastrar el vértice si está más cerca del cursor que un tirador.

**Compatibilidad:** versiones nuevas leen proyectos anteriores, pero un editor anterior a v256 podría ignorar los nuevos modos al abrirlos; conserva un respaldo antes de usar un editor más antiguo. Las curvas Bézier aún no reproducen todos los detalles de OCAD/OMAP y deben revisarse visualmente con ejemplos cartográficos reales.

## Corrección métrica de curvas georreferenciadas — v257

Cuando hay una **plantilla PNG/PGW cargada con EPSG UTM correcto**, las siguientes operaciones Bézier calculan las distancias en **metros UTM**, aunque los vértices y tiradores se sigan almacenando en longitud/latitud WGS84 en el proyecto:

- Inicialización de tiradores al activar la edición manual.
- Ajuste de dirección/longitud mediante los modos Simétricos, Alineados y Libres.
- Arrastre de cualquiera de los dos tiradores.
- Desplazamiento del vértice, trasladando con él sus tiradores sin alterar la forma en metros.

Las zonas admitidas siguen siendo **ETRS89/UTM 29N–31N (25829–25831)** y **WGS84/UTM 29N–31N (32629–32631)**. Se conserva la posibilidad de trabajar sin imagen georreferenciada; en ese caso los dibujos con coordenadas locales usan sus unidades de lienzo habituales. **Los proyectos .ocarto mantienen el esquema 7** porque no cambia la forma de almacenamiento; la actualización corrige cómo se calculan las operaciones.

La transformación utiliza la aproximación existente WGS84/ETRS89 del proyecto, no sustituye una transformación geodésica profesional con rejillas oficiales, ni demuestra por sí sola la precisión de un receptor GNSS o del PGW usado. Una plantilla trasladada o con EPSG incorrecto seguirá dando un desplazamiento cartográfico erróneo. Se han añadido pruebas para distintas zonas y para desplazamientos de tiradores en metros.
