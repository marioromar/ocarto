## Trazados rectos, edificios y ruinas (v57)

Los trazos punto a punto crean segmentos rectos con vértices de esquina; el dibujo a mano alzada mantiene las curvas naturales. Edificios y ruinas conservan las esquinas. «Continuar línea» y «Ampliar área» ahora admiten geometrías Bézier y conservan sus tiradores existentes. Ver [VERSION-v157.md](VERSION-v157.md).

## Validación topológica de áreas (v59)

El dibujo a mano alzada convierte ahora el trazo final en curvas Bézier editables para que las líneas y áreas naturales no queden como una sucesión de rectas. Los símbolos de edificios y ruinas conservan segmentos rectos y vértices de esquina; los trazados punto a punto también permanecen rectos con esquinas. Ver [VERSION-v161.md](VERSION-v161.md).

«Validar geometría» revisa líneas y áreas, incluyendo anillos exteriores e interiores, agujeros fuera del contorno, cruces con el borde, solapes entre agujeros y auto-intersecciones de líneas. También muestrea contornos Bézier antes de revisar su forma. Los hallazgos se presentan como elementos a revisar porque algunos cruces o retrocesos pueden ser intencionales. La validación se limita a 2.500 vértices por geometría para mantener la interfaz interactiva; en geometrías mayores, simplifica primero. Ver [VERSION-v160.md](VERSION-v160.md).

## v1.60: validar líneas abiertas

- «Validar geometría» también examina líneas abiertas: detecta vértices duplicados, extremos coincidentes, retrocesos y cruces entre segmentos no vecinos.
- Los hallazgos se anuncian como **Revisar geometrías**, con un resumen de hasta cuatro elementos. Un cruce puede ser intencional y requiere criterio cartográfico.
- El límite interactivo de 2.500 vértices se aplica tanto a líneas como a áreas; las curvas Bézier se revisan tras muestrear el trazo.
- Pruebas: líneas simples, cruces, retrocesos, duplicados, límite de complejidad, agujeros topológicos y sintaxis inline.

## Simplificación de geometrías (v58)

Selecciona una o varias líneas/áreas rectas y pulsa «Simplificar selección». La tolerancia se introduce en píxeles de pantalla; los extremos y los vértices marcados como esquina o discontinuidad se conservan. Las áreas se validan y, si hace falta, Ocarto reduce la tolerancia para evitar autointersecciones. Curvas Bézier, áreas con huecos y elementos protegidos quedan intactos. La acción se puede deshacer. Ver [VERSION-v158.md](VERSION-v158.md).

## Vegetación vectorial y raster para orientación (v56)

Aunque todavía no haya ejemplos, Ocarto vectoriza las coberturas preliminares y exporta un DXF con áreas separadas en capas `LIDAR_OPEN`, `LIDAR_LOW`, `LIDAR_SPARSE` y `LIDAR_DENSE`; puedes asignar a cada capa el símbolo de área correspondiente en OCAD. Con ejemplos dibujados y revisados sobre el mapa, aprende clases de bosque blanco, verde 1/2/3, terreno abierto y matorral; exporta GeoJSON, DXF por capas y tabla `.ocdCrt` con candidatos de símbolo. También exporta PNG + PGW clasificado con leyenda. Los códigos ISOM son candidatos: bosque blanco 405, verdes 406/408/410, terreno abierto 401; matorral queda sin símbolo único. El DXF omite áreas con huecos para no rellenar claros interiores; el GeoJSON sí conserva sus huecos. Los ZIP de imagen incluyen un PRJ WKT real para EPSG:25828–25838, EPSG:32601–32660, EPSG:32701–32760, EPSG:4258 y EPSG:4326. Si el proyecto no declara EPSG, se omite el PRJ para no etiquetar coordenadas de forma falsa. Ocarto puede importar áreas de mapas `.ocd` compatibles como una plantilla protegida, inspeccionar los símbolos reconocidos y usar esas áreas como ejemplos de aprendizaje de vegetación. Esta lectura se limita a áreas compatibles; no importa todos los tipos de objeto ni la simbología completa del mapa. Al importar DXF, Ocarto conserva cada capa como capa vectorial editable independiente para preparar la asignación de símbolos con CRT en OCAD. La CRT propone de inicio los símbolos de área comprobados en los mapas La Muela y Algodonales (401, 406, 408 y 410); los números se pueden editar antes de exportar. Ver [VERSION-v60.md](VERSION-v60.md): carga un mapa OCAD para comprobar símbolos disponibles y validar la CRT.

## Exportación de plantillas LiDAR para OCAD (v54)

El MDT y la altura de copa pueden exportarse como PNG con world file PGW en ZIP; OCAD puede usar el PNG como plantilla de fondo configurando el mismo CRS. Las curvas conectadas también se pueden exportar como DXF ASCII, con cada cota en una capa y Z. Son salidas preliminares para revisar: la paleta de raster no es simbología cartográfica y el DXF no asigna símbolos OCAD. CSV y GeoJSON siguen disponibles para análisis e intercambio SIG. Ver [VERSION-v54.md](VERSION-v54.md).

## Rendimiento al unir curvas largas (v53)

La unión de curvas conserva un único índice espacial de extremos y sigue revisando celdas vecinas para empalmar dentro de tolerancia. La prueba de estrés conecta 10.000 segmentos consecutivos. Ver [VERSION-v53.md](VERSION-v53.md).

## Unión de curvas a través de bordes (v52)

La unión busca extremos cercanos en celdas espaciales vecinas, por lo que un pequeño error numérico no deja una curva cortada al caer a ambos lados de una división de búsqueda. Solo une la misma cota; si hay más de un extremo posible, conserva el caso como ambiguo y no adivina. Ver [VERSION-v52.md](VERSION-v52.md).

## COPC: jerarquía y conteos más robustos (v51)

El recorrido deduplica páginas de jerarquía al encolarlas, limita también la cola a 100.000 páginas y rechaza sumas de puntos o finales de bloque que excedan los enteros seguros de JavaScript. La lectura en dos pasadas y el progreso por puntos candidatos se mantienen. Ver [VERSION-v51.md](VERSION-v51.md).

## Lectura espacial de COPC para mosaicos (v50)

Al crear modelos para un área seleccionada, Ocarto detecta archivos COPC por su VLR y consulta su jerarquía espacial. Lee y descomprime solo los bloques que pueden cruzar el área y después aplica el filtro exacto del polígono. Los LAS/LAZ estándar mantienen el flujo anterior. Ver [VERSION-v49.md](VERSION-v49.md), [VERSION-v50.md](VERSION-v50.md) y [README-LAZ.md](README-LAZ.md).

COPC es un formato LAZ con índice espacial. Para aprovechar esta ruta con un LAZ estándar, hay que convertirlo previamente a COPC; Ocarto conserva la importación del LAZ original. El avance se calcula sobre los bloques candidatos al área; una pasada ligera suma sus puntos y la segunda decodifica, sin guardar la lista completa de bloques en memoria. Ver [VERSION-v50.md](VERSION-v50.md).

## Recorte de modelos LiDAR por área cartográfica (v48)

Selecciona un polígono en el mapa y carga varios archivos LAS/LAZ juntos. Ocarto comprueba el encuadre de cada tesela y omite las que quedan fuera. En las demás, descarta primero los puntos exteriores al rectángulo envolvente y comprueba el polígono exacto antes de acumular terreno y vegetación. Antes de leerlas, muestra el máximo teórico de celdas y, al terminar, avisa si los encuadres se solapan: los registros coincidentes se cuentan de nuevo. Ver [VERSION-v48.md](VERSION-v48.md).

Los archivos deben compartir CRS y unidades. Los solapes pueden duplicar recuentos de densidad. Cada modelo tiene un límite provisional de 100.000 celdas; para áreas mayores, aumenta el tamaño de celda.

## Carga LiDAR por bloques directamente al Worker (v40)

La lectura del archivo se confirma bloque a bloque con el Worker y permite cancelarla mientras avanza. Para LAZ, los bytes llegan directamente a su asignación definitiva en memoria WASM: Ocarto no crea antes un ArrayBuffer JavaScript con el tamaño completo ni vuelve a copiar el archivo comprimido al terminar. LAS sin compresión se monta en el Worker por bloques. Ver [VERSION-v40.md](VERSION-v40.md).

## LAZ reutilizable durante el análisis (v39)

Tras cargar un LAZ, el Worker conserva la única copia comprimida en memoria WASM y la reutiliza al preparar terreno, detectar máximos o analizar vegetación. Ver [VERSION-v39.md](VERSION-v39.md).

## Importación LiDAR cancelable (v38)

Los archivos LAS/LAZ se leen desde el navegador por bloques, con indicador de avance y cancelación durante la lectura. Cancelar una carga conserva la nube anterior. El archivo completo sigue siendo necesario en memoria para el decodificador LAZ; la compatibilidad con archivos muy grandes depende del navegador y del equipo. Ver [VERSION-v38.md](VERSION-v38.md).

## Restauración directa verificada (v37)

El archivo `.ocarto` conserva el modelo local de vegetación y los parámetros de análisis LiDAR, curvas de nivel y vaguadas. Al abrir un proyecto, Ocarto valida los valores y recupera los predeterminados cuando faltan o no son válidos. Mientras trabajas, guarda una copia automática local tras un breve periodo sin cambios. Durante la carga de un proyecto no reemplaza la copia anterior; tras abrirlo correctamente, actualiza la copia. Si IndexedDB no está disponible, utiliza una copia alternativa limitada por el espacio del navegador. La interfaz muestra el nombre del proyecto y la fecha de la copia. Puedes restaurarla directamente, con validación antes de reemplazar el mapa, o descargarla como `.ocarto`. Incluye prueba de integración de navegador para comprobar restauración válida y rechazo de copias dañadas. Los modelos también se pueden exportar/importar en JSON. Las predicciones requieren revisión cartográfica. El dibujo punto a punto produce segmentos rectos con vértices de esquina; el dibujo a mano alzada conserva curvas Bézier editables. Edificios y ruinas conservan esquinas. Las geometrías importadas no se deforman.

# Ocarto · prototipo local

La guía de atajos está disponible en [PDF](atajos-teclado.pdf) y en [Markdown editable](atajos-teclado.md).

Primera base interactiva del editor cartográfico. No necesita instalación:

1. Abre `index.html` en un navegador del PC.
2. Carga una imagen PNG, JPG o WebP como plantilla de referencia.
3. Ajusta la opacidad y coloca símbolos en el lienzo.
4. Para probar LiDAR, importa un CSV/XYZ con columnas `X`, `Y`, `Z` y usa «Buscar máximos locales».
5. Usa «Guardar proyecto» para descargar un archivo `.ocarto`; «Abrir proyecto» lo recupera en otra sesión. Antes de sustituir el mapa actual, comprueba su estructura, coordenadas y plantillas; si algo falla, conserva abierto el mapa actual.
6. Para georreferenciar la plantilla, carga un world file (JGW/PGW/TFW/WLD) o marca al menos tres puntos reconocibles e introduce sus coordenadas; indica el CRS en «Escala y coordenadas».

## Qué funciona en esta versión

- Lienzo con zoom, desplazamiento y controles de dibujo; la rueda desplaza la vista verticalmente, Mayús + rueda la desplaza horizontalmente y Ctrl + rueda acerca o aleja manteniendo bajo el cursor el mismo punto del mapa; con «Seleccionar», el doble clic en una zona vacía acerca sobre esa zona y Mayús + doble clic aleja; en modo «Seleccionar», dos dedos acercan, alejan y desplazan el mapa; en PC, mantén Espacio y arrastra para desplazar el mapa desde cualquier herramienta; los botones de zoom centran el cambio; selección, movimiento y eliminación individual o múltiple de puntos, líneas, áreas y candidatos. Añade o quita objetos con Mayús+clic como en OCAD, o usa «Selección por área» para encerrarlos arrastrando con ratón, Pen o dedo; los objetos elegidos se pueden mover juntos o borrar. En una línea o área seleccionada, arrastra un vértice para corregir su geometría, insértalo en un segmento cercano o quítalo (respetando el mínimo de puntos para líneas y áreas). Con `Mayús + Ctrl` + clic en un tramo insertas un vértice normal; `Ctrl` + clic sobre un vértice lo elimina, con el mismo mínimo. `Ctrl + Espacio` + clic recorre los tipos normal, esquina y dash; el ciclo de clics breves sin modificadores también se mantiene para Pen y táctil. «Seleccionar varios vértices» permite encerrarlos con un rectángulo, moverlos juntos arrastrando uno seleccionado o quitarlos en grupo sin dejar una geometría demasiado pequeña. El «Ajuste a vértices» opcional acerca el vértice o grupo movido al vértice visible más cercano dentro de 12 px y marca el punto de destino; ignora objetos y capas ocultos y puede apagarse para mover libremente. Al dibujar líneas o áreas por nodos, mantener Alt restringe el siguiente tramo a horizontal o vertical; `Ctrl` + clic en una línea o borde de área existente y arrastrar hasta el final sigue su geometría; puedes soltar Ctrl tras el clic inicial y deja el trazado preparado para continuar. Con los controles «Anterior» y «Siguiente» se recorren los vértices uno a uno con Pen; también puedes cambiar su tipo con los botones. Los clics o toques breves repetidos sobre el mismo vértice recorren normal → esquina → discontinuidad (dash) → normal; mantener pulsado y arrastrar mueve el vértice sin cambiar su tipo. Los botones Deshacer/Rehacer del editor de vértices restauran movimientos, inserciones, eliminaciones y cambios de tipo sin interferir con el deshacer del dibujo. Los controles generales Deshacer/Rehacer (también Ctrl+Z y Ctrl+Y) llevan un historial separado para crear, mover y borrar objetos del mapa, además de limpiar, importar, generar, aceptar o descartar candidatos LiDAR y crear, renombrar, colorear, ocultar, activar o quitar capas vectoriales. Mientras dibujas líneas o áreas por nodos, Deshacer quita el último nodo y Rehacer lo repone; al terminar, ambas acciones trabajan sobre el objeto completo. El tipo se guarda en el proyecto y se exporta como metadato GeoJSON. En líneas discontinuas, los vértices esquina reinician el patrón con un trazo completo y los vértices dash colocan un trazo centrado en el vértice; normal no altera el patrón. La barra inferior muestra en tiempo real las coordenadas X/Y bajo el cursor o el Pen: usa el CRS configurado si el mapa está georreferenciado, coordenadas LiDAR si se está trabajando sobre una nube, o coordenadas locales en un mapa sin referencia. En modo «Seleccionar», mantener el Pen quieto 5 segundos abre un menú contextual equivalente al botón derecho, con opciones para insertar un vértice en una línea o área editable, cambiar o quitar el vértice y activar el ajuste a otros vértices, duplicar y editar el elemento. Al activar «Insertar vértice», el siguiente clic en un tramo coloca un nodo normal. «Cambiar tipo de vértice» avanza entre normal, esquina y dash; «Quitar vértice» respeta el mínimo de 2 puntos en líneas y 3 en áreas. «Ajustar a vértices» activa el mismo ajuste de 12 px que el control del editor. `Ctrl/⌘ + A` selecciona todos los objetos visibles y editables; `Ctrl/⌘ + D` duplica la selección en el mismo lugar, lista para arrastrar. Los símbolos protegidos u ocultos y las capas ocultas se excluyen de «Seleccionar todo». El estado normal, protegido u oculto de un símbolo se cambia con el botón derecho o manteniendo el Pen 5 segundos sobre el símbolo del cuadro; también se elige en el selector de estado activo; se guarda en el proyecto y se puede deshacer. Los objetos protegidos permanecen visibles y seleccionables, pero no se pueden mover, borrar ni editar sus vértices; el menú contextual bloquea esas acciones. Los objetos ocultos no se dibujan, no interceptan clics ni aparecen en la exportación. `F2` alterna el relleno de las áreas seleccionadas entre transparente y visible, conservando el contorno. Capas vectoriales con nombre, color de referencia y visibilidad independientes. El botón derecho o una pulsación larga del Pen sobre el lienzo permite copiar, cortar, duplicar en el mismo lugar o pegar en el punto indicado, además de insertar vértices en líneas y áreas y editar el objeto. El menú permite crear, activar, renombrar, colorear, ocultar o quitar capas; el dibujo nuevo se asigna a la activa. Si se quita una capa, sus objetos pasan a otra capa para no perderlos. Deshacer/Rehacer incluye estos cambios, y el proyecto guarda capas, visibilidad, color, selección activa y pertenencia de cada objeto; GeoJSON incluye sus metadatos. Importa GeoJSON `FeatureCollection` o `Feature` con geometrías Point, MultiPoint, LineString, MultiLineString, Polygon y MultiPolygon, además de KML/KMZ vectoriales WGS84 con puntos, líneas, polígonos y huecos, y DXF ASCII básico (POINT, LINE, polilíneas, círculos y arcos); exporta el mapa georreferenciado a KMZ para Google Earth, convirtiendo UTM admitido a EPSG:4326; conserva anillos interiores de áreas al importar, guardar/abrir y exportar; los proyectos abiertos validan su geometría. Cada archivo se procesa antes de añadir nada, las coordenadas deben ser numéricas, las geometrías o componentes defectuosos se omiten y toda la importación válida se deshace como una sola acción.
- Líneas y áreas Bézier: marca los vértices y arrastra con ratón, dedo o lápiz Pen para orientar sus tangentes; un toque breve fija el nodo sin crear una tangente accidental y la tolerancia al movimiento distingue la deriva del dedo o el Pen del gesto de arrastre. Al seleccionar la geometría puedes mover los tiradores. Durante el trazado, Retroceso/Backspace o Suprimir/Delete quita el último nodo; Deshacer/Rehacer lo retira y recupera. Doble clic termina el trazado; en un área Bézier, al acercarte al primer nodo se resalta el destino y se previsualiza el tramo de cierre; terminar allí elimina el duplicado y usa la curva hasta el inicio. Las acciones de la barra permiten convertir una polilínea seleccionada a Bézier y volver a polilínea, y mostrar una línea continua o discontinua para probar el efecto de los tipos de vértice. Al insertar un vértice sobre la curva, la posición más cercana se refina numéricamente y se divide el segmento conservando exactamente su forma; si se elimina ese nuevo vértice, se restauran los tiradores anteriores. El proyecto conserva los puntos de control y GeoJSON exporta una aproximación segmentada junto con los anclajes y tangentes para recuperar la curva. La herramienta «Continuar línea» prolonga una línea existente desde cualquiera de sus extremos. «Ampliar área» empieza en un vértice del contorno y termina en otro del mismo contorno; añade el nuevo borde, conserva el resto del área y rechaza contornos que se cruzan. Las dos acciones mantienen el mismo objeto y se pueden deshacer/rehacer desde el editor de vértices.
- Dibujo a mano alzada con ratón, dedo o lápiz Pen en pantallas táctiles: mantén pulsado y recorre la pantalla para trazar; al soltar termina la línea o cierra el área. Se capturan muestras de alta frecuencia y el punto final; al acabar, una simplificación Ramer–Douglas–Peucker ajustable reduce vértices cercanos y conserva la forma general. La tolerancia (0–6 px) se guarda en el proyecto; 0 conserva todas las muestras. La captura de puntero evita interrupciones por contactos secundarios; si el sistema interrumpe el Pen a mitad del trazo, se conserva la parte dibujada en vez de perderla. Al editar con dedo se amplía la zona para seleccionar vértices y se muestran tiradores mayores; con Pen el ajuste es intermedio. Los botones de edición de vértices tienen tamaño táctil y una disposición compacta. En móvil, la paleta de dibujo se muestra en una fila horizontal desplazable bajo el mapa y centra automáticamente la herramienta seleccionada para liberar altura al lienzo.
- Cuadro de símbolos con búsqueda por nombre, código o grupo y filtro por puntos, líneas y áreas. Al elegir un símbolo se activa la herramienta de dibujo correspondiente; cada objeto conserva el símbolo con el que se creó. Con botón derecho o una pulsación de Pen de 5 segundos se abre el menú para marcarlo Normal, Protegido u Oculto: los protegidos se ven pero no se editan, y los ocultos no se dibujan ni se incluyen en la exportación cartográfica. El selector del símbolo activo ofrece los mismos estados. Los puntos permiten ajustar tamaño y grosor; los valores se guardan por símbolo, junto con el símbolo activo, sus estados y los objetos, al guardar el proyecto `.ocarto`.
- Varias plantillas de imagen como capas independientes: visibilidad, modo opaco o transparente y deslizador de opacidad propio. Se puede elegir la plantilla activa para calibrarla; su configuración se guarda en el proyecto. Las plantillas georreferenciadas comparten encuadre para superponerse por coordenadas.
- Escala de impresión y CRS; con plantilla georreferenciada, los símbolos se dibujan según su tamaño y grosor en milímetros y la escala 1:n. Cada símbolo permite ajustar esos valores, que se guardan en el proyecto. En mapas locales, los símbolos mantienen un tamaño visual práctico. La imagen puede georreferenciarse con world file o mediante una transformación afín a partir de tres o más puntos de control; después se pueden añadir puntos para afinarla. «Quitar georreferenciación y puntos» permite corregir y volver a calibrar la plantilla activa. La imagen fuente queda intacta. Cada plantilla puede tener una calibración distinta, pero para superponerlas deben compartir CRS y unidades.
- Símbolos de prueba y exportación/importación básica de puntos GeoJSON.
- Lectura CSV/XYZ con columnas X/Y/Z, separador decimal español en CSV con punto y coma y visualización de hasta 250 000 puntos; filtros por altura, tamaño de celda XY y puntos mínimos.
- Revisión de candidatos: se pueden añadir a la cartografía, descartar o exportar por separado; los puntos movidos conservan las coordenadas corregidas al exportar.
- Exportación de candidatos con sus coordenadas XYZ originales y código de símbolo provisional `417`.
- Guardar y abrir proyectos `.ocarto`, con plantillas, capas vectoriales, vista, elementos y candidatos detectados.

## Límites conocidos

- El proyecto se puede guardar y abrir manualmente como archivo `.ocarto`; también existe una copia automática local recuperable.
- «Continuar línea» y «Ampliar área» admiten geometrías Bézier; conviene revisar visualmente las transiciones recién dibujadas.
- Se conserva la plantilla y la lista de candidatos, pero no la nube LiDAR completa. Al reabrir un proyecto, hay que volver a importar la nube para ejecutar detecciones.
- Sin world file o puntos de control, la plantilla y los dibujos permanecen en coordenadas locales.
- Al importar GeoJSON estándar (EPSG:4326), Ocarto convierte coordenadas al CRS UTM admitido del mapa (EPSG:25828–25838, 32601–32660 o 32701–32760). Otros CRS distintos se bloquean; no hay reproyección general. Para EPSG:258xx aproxima WGS84/ETRS89 y avisa de que no aplica una rejilla de datum.
- La escala se aplica a los símbolos cuando el mapa está georreferenciado; la conversión presupone unidades lineales en metros. Si el CRS usa otras unidades, la vista a escala no será correcta. Ocarto aún no reproyecta datos entre CRS distintos; para superponer LiDAR, el usuario debe indicar el mismo CRS que el mapa. En mapas sin georreferenciar, los símbolos conservan tamaño de pantalla.
- Los máximos locales son una heurística demostrativa, no IA ni detección forestal validada.
- KML/KMZ se importan como vectores WGS84; se usa `doc.kml` (o el único KML del archivo), con límite de 100 MB para KMZ y 25 MB para el KML extraído. En archivos con varios KML sin `doc.kml`, se solicita reorganizar el archivo. Estilos, GroundOverlay, NetworkLink e imágenes incrustadas no se aplican al mapa. DXF se limita a ASCII: no admite DXF binario; importa POINT, LINE, polilíneas clásicas/LWPOLYLINE, CIRCLE y ARC; círculos, arcos y bulges se aproximan por segmentos, y se omiten otras entidades como textos, bloques, sombreados o splines. Si el mapa tiene CRS, se supone que el DXF usa ese mismo CRS; las unidades lineales declaradas se convierten a metros para CRS proyectados. No se adivina el CRS del DXF. La exportación KMZ exige un mapa georreferenciado en EPSG:4326 o una zona UTM compatible; convierte coordenadas a WGS84, conserva huecos y omite capas ocultas. Google Earth representa los símbolos con estilos sencillos, no reproduce exactamente la simbología Ocarto. La importación DGN de MicroStation sigue pendiente. GeoTIFF se puede cargar como plantilla rasterizada y georreferenciada; todavía no se procesa como rejilla de elevaciones multibanda. Ocarto puede guardar el mapa como OMAP XML v9 editable; todavía no escribe el formato binario nativo OCAD. LAS/LAZ sí se importan en el Worker; CSV/XYZ está limitado a 250.000 puntos.
- La paleta de símbolos es provisional y reducida. Los números mostrados para árbol y roca se deben validar antes de adoptar la biblioteca oficial. Cada detección requiere revisión del cartógrafo.
- La aplicación aún no tiene sincronización cloud ni una interfaz móvil con todas las funciones de escritorio; en móvil/tablet ya se pueden usar las herramientas de dibujo y el lápiz Pen.

## Próximo bloque de desarrollo

1. Mejorar el ajuste de curvas Bézier y ampliar la simplificación a geometrías curvas con preservación de forma.
2. Ampliar el intercambio CAD con DGN de MicroStation y más entidades DXF; incorporar procesamiento de bandas GeoTIFF y más conversiones CRS. KML/KMZ vectorial básico ya se importa y exporta.
3. Mejorar la detección LiDAR y validar sus resultados cartográficos; mantener cada resultado como candidato editable y sujeto a revisión humana.
4. Validar intercambios nativos OCAD/OOM y, después, añadir sincronización cloud y edición móvil.

El objetivo de producto sigue siendo independiente: reunir los flujos útiles de OCAD y OpenOrienteering Mapper, añadiendo GIS solo cuando ayude a la cartografía de orientación.

## Recuperación LiDAR (13 octubre 2026)

- LAS/LAZ se leen en el Worker; la aplicación conserva el archivo fuente allí y muestra una vista de hasta 60.000 puntos. El análisis recorre la nube por lotes de 100.000 puntos sin reservar tres arrays completos de coordenadas.
- El Worker muestra progreso y permite cancelar carga o análisis. LAZ se vuelve a descomprimir en cada análisis para reducir la memoria retenida; los recursos WASM se liberan al terminar, cancelar o fallar.
- La retícula agrupa máximos por celda y admite comparación local 3×3 con halo entre teselas de 128×128. Los candidatos son editables y exportables a GeoJSON; la detección sigue siendo experimental.
- El paquete incluye laz-perf 3.4.0 y WebAssembly oficiales, sujetos a Apache-2.0. Para servir el prototipo, utiliza HTTP local; `file://` puede impedir cargar el Worker.
- Se verificó el flujo con `PNOA_2024_AND_279-4085_H30_NPC01.laz`: 7.585.022 puntos, 40.000 celdas y 765 candidatos. Los detalles reproducibles están en [README-LAZ.md](README-LAZ.md).

## Recuperación 13 octubre — teselas con halo

Se ha añadido una opción de **máximos locales 3×3** al análisis LAS en Web Worker. Usa una retícula global y un halo de una celda entre teselas de 128×128, con desempate determinista para alturas iguales. La opción está desactivada por defecto para conservar los resultados anteriores de máximos por celda. Esta función **no** equivale a detección fiable de elementos cartográficos: sigue siendo experimental. La lectura LAZ comprimida usa laz-perf/WebAssembly; la clasificación cartográfica sigue siendo experimental.

## Importación KMZ

El paquete incluye JSZip 3.10.1, distribuido bajo MIT o GPL-3.0 (véase `vendor/JSZIP-LICENSE.markdown`). El lector abre el ZIP en memoria, extrae un solo KML y no extrae rutas ni recursos auxiliares. Se limita el archivo comprimido a 100 MB y el KML a 25 MB. Se respetan las geometrías vectoriales y anillos interiores; los estilos, iconos e imágenes GroundOverlay no se aplican.

## Exportación KMZ

«Exportar mapa georreferenciado a KMZ» genera un archivo `doc.kml` comprimido para Google Earth. Requiere un mapa georreferenciado con CRS EPSG:4326 o UTM EPSG:25828–25838, 32601–32660 o 32701–32760. Las coordenadas se escriben como longitud/latitud WGS84. Se incluyen elementos cartográficos y candidatos visibles, los anillos interiores y atributos básicos de símbolo/capa; las capas vectoriales ocultas quedan fuera. La apariencia de los símbolos se aproxima con estilos KML sencillos. No se exportan mapas sin referencia espacial para evitar asignarles coordenadas geográficas ficticias.

## Importación DXF

La versión actual lee DXF ASCII y convierte `POINT`, `LINE`, `LWPOLYLINE`, `POLYLINE`, `CIRCLE` y `ARC` a objetos editables. Los bulges de polilíneas, círculos y arcos se segmentan; entidades no admitidas se cuentan como omitidas. Cuando el mapa usa un CRS configurado, el DXF se interpreta en ese mismo CRS. Se reconocen unidades CAD comunes (`$INSUNITS`) y se pasan a metros para mapas proyectados; con unidades unitless se conservan los valores. No se importa texto, bloques, sombreado, referencias externas ni simbología CAD. El importador DXF binario y DGN siguen pendientes.


## Versión v16: rejilla inicial de terreno
En «LiDAR e IA», importa LAS/LAZ, ajusta «Tamaño de celda XY» y «Puntos mínimos por celda», pulsa «Preparar rejilla de terreno (suelo)» y exporta el CSV. Utiliza clase 2 y Z mínimo por celda. No sustituye un MDT ni genera curvas de nivel. `npm run test:terrain-real -- ruta/al/archivo.laz` permite comprobar la nube real.


## Ocarto v23: detección y WMS

Ver [VERSION-v23.md](VERSION-v23.md). Incorporados análisis preliminares de ejes de vaguadas >20 m, indicadores LiDAR de vegetación y plantillas WMS georreferenciadas (PNOA, Catastro INSPIRE o servicio HTTPS personalizado). Las detecciones aún necesitan revisión.

## v24: vegetación a áreas y corrección preliminar de caminos

- Una vez analizada una nube LAS/LAZ con indicadores de vegetación, pulsa **«Vectorizar coberturas LiDAR → GeoJSON»**. Ocarto genera áreas fusionadas para revisar, con agujeros interiores y categorías estructurales, nunca transitabilidad ni símbolos definitivos.
- Para preparar una **propuesta** de ajuste de un camino: añade y georreferencia una ortofoto local, define el CRS UTM métrico, selecciona una línea existente (dibujada o importada), elige el color aproximado de la superficie y pulsa **«Proponer ajuste sobre ortofoto»**. El original queda intacto. Ajuste preliminar basado en color y continuidad, NO identifica caminos autónomamente. Servicios WMS solo como plantillas visuales por restricciones CORS y formatos.
- Pruebas: `npm test` y `node tests/lidar-v24-real.cjs /ruta/fichero.laz`. Detalles en `VERSION-v24.md`.

## v25: aprendizaje de vegetación mediante ejemplos dibujados

1. Importa LAS/LAZ y pulsa analizar vegetación; confirma que el mapa está correctamente georreferenciado.
2. Dibuja o importa una superficie de vegetación en el mapa y selecciónala.
3. En **IA por ejemplos de vegetación** asigna una etiqueta y pulsa **Etiquetar área seleccionada**. Repite con más superficies distintas (blanco, verde 1/2/3, amarillo, matorral).
4. Pulsa **Aprender ejemplos → Proponer áreas**. Se descargará un GeoJSON con áreas sugeridas y atributos de revisión obligatoria. Los símbolos ISOM no se adjudican ni se aplican automáticamente.

El entrenamiento compara patrones LiDAR, no lee directamente objetos de los ficheros OCAD existentes y NO constituye una clasificación ya calibrada de penetrabilidad. Requiere revisión experta.

## v26: candidatos a estructuras artificiales y acceso desde móvil

Tras cargar LAS/LAZ y analizar la vegetación, pulsa **«Extraer edificios y tendidos LiDAR → GeoJSON»**. Se obtienen áreas preliminares de edificaciones clase 6, líneas aproximadas de conductores clase 14 y celdas de torres clase 15 (si el origen dispone de esa clasificación). Son propuestas revisables; no se modifica el mapa ni se asigna símbolo ISOM automáticamente.

En Android, el botón **«Capas y LiDAR»** abre el panel de plantillas, WMS y herramientas LiDAR que permanecía oculto en pantallas estrechas.

Prueba real comprobada con 7,58 millones de puntos: 13 edificios candidatos; ninguna línea eléctrica clasificada en esa nube. Más detalles en `VERSION-v26.md`.

## v27: extraer posibles caminos directamente de una ortofoto

En **Capas y LiDAR → Ajuste experimental de caminos**, selecciona una ortofoto local previamente georreferenciada en CRS UTM, elige el color aproximado de la superficie (puede variar mucho), su tolerancia y la longitud mínima. Pulsa **«Detectar ejes de caminos SIN SHP»**. Se creará un GeoJSON con líneas candidatas que podrán importarse/editarse después de inspeccionarlas. Procesamiento en Web Worker cancelable.

**Limitaciones esenciales:** detector experimental por color, no aprende todavía de los mapas finales ni hace clasificación semántica; una superficie parecida puede producir falsos caminos. Los WMS son referencia visual, no fuente de píxeles para esta operación. Los caminos importados del SHP no son obligatorios para este detector.


## v1.62: ajuste de bordes

«Ajustar bordes» proyecta los vértices de una de dos áreas seleccionadas sobre los segmentos del otro contorno, dentro de la distancia indicada en unidades del mapa. Conserva los metadatos de vértice y puede deshacerse. Para proteger la geometría, esta operación se limita a áreas rectas sin huecos; las Bézier y áreas con agujeros se rechazan.

## Ajustar bordes en contornos Bézier (v63)

«Ajustar bordes» puede proyectar vértices al contorno curvo de la segunda área. Los tiradores del vértice desplazado mantienen su posición relativa y la forma continúa siendo Bézier. Sigue requiriendo dos áreas desbloqueadas y sin huecos. Ver [VERSION-v163.md](VERSION-v163.md).

## Proyección refinada sobre curvas Bézier (v64)

El ajuste a contornos curvos refina numéricamente la posición más cercana entre muestras y aplica la tolerancia sobre la distancia resultante. Ver [VERSION-v164.md](VERSION-v164.md).
