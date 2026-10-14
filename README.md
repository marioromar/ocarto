Warning: truncated output (original token count: 6501)
Total output lines: 132

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

El archivo `.ocarto` conserva el modelo local de vegetación y los parámetros de análisis LiDAR, curvas de nivel y vaguadas. Al abrir un proyecto, Ocarto valida los valores y recupera los predeterminados cuando faltan o no son válidos. Mientras trabajas, guarda una copia automática local tras un breve periodo sin cambios. Durante la carga de un proyecto no reemplaza la copia anterior; tras abrirlo correctamente, actualiza la copia. Si IndexedDB no está disponible, utiliza una copia alternativa limitada por el espacio del navegador. La interfaz muestra el nombre del proyecto y la fecha de la copia. Puedes restaurarla directamente, con validación antes de reemplazar el mapa, o descargarla como `.ocarto`. Incluye prueba de integración de navegador para comprobar restauración válida y rechazo de copias dañadas. Los modelos también se pueden exportar/importar en JSON. Las predicciones requieren revisión cartográfica.

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

- Lienzo con zoom, desplazamiento y controles de dibujo; la rueda desplaza la vista verticalmente, Mayús + rueda la desplaza horizontalmente y Ctrl + rueda acerca o aleja manteniendo bajo el cursor el mismo punto del mapa; con «Seleccionar», el doble clic en una zona vacía acerca sobre esa zona y Mayús + doble clic aleja; en modo «Seleccionar», dos dedos acercan, alejan y desplazan el mapa; en PC, mantén Espacio y arrastra para desplazar el mapa desde cualquier herramienta; los botones de zoom centran el cambio; selección, movimiento y eliminación individual o múltiple de puntos, líneas, áreas y candidatos. Añade o quita objetos con Mayús+clic como en OCAD, o usa «Selección por área» para encerrarlos arrastrando con ratón, Pen o dedo; los objetos elegidos se pueden mover juntos o borrar. En una línea o área seleccionada, arrastra un vértice para corregir su geometría, insértalo en un segmento cercano o quítalo (respetando el mínimo de puntos para líneas y áreas). Con `Mayús + Ctrl` + clic en un tramo insertas un vértice normal; `Ctrl` + clic sobre un vértice lo elimina, con el mismo mínimo. `Ctrl + Espacio` + clic recorre los tipos normal, esquina y dash; el ciclo de clics breves sin modificadores también se mantiene para Pen y táctil. «Seleccionar varios vértices» permite encerrarlos con un rectángulo, moverlos juntos arrastrando uno seleccionado o quitarlos en grupo sin dejar una geometría demasiado pequeña. El «Ajuste a vértices» opcional acerca el vértice o grupo movido al vértice visible más cercano dentro de 12 px y marca el punto de destino; ignora objetos y capas ocultos y puede apagarse para mover libremente. Al dibujar líneas o áreas por nodos, mantener Alt restringe el siguiente tramo a horizontal o vertical; `Ctrl` + clic en una línea o borde de área existente y arrastrar hasta el final sigue su geometría; puedes soltar Ctrl tras el clic inicial y deja el trazado preparado para continuar. Con los controles «Anterior» y «Siguiente» se recorren los vértices uno a uno con Pen; también puedes cambiar su tipo con los botones. Los clics o toques breves repetidos sobre el mismo vértice recorren normal → esquina → discontinuidad (dash) → normal; mantener pulsado y arrastrar mueve el vértice sin cambiar su tipo. Los botones Deshacer/Rehacer del editor de vértices restauran movimientos, inserciones, eliminaciones y cambios de tipo sin interferir con el deshacer del dibujo. Los controles generales Deshacer/Rehacer (también Ctrl+Z y Ctrl+Y) llevan un historial separado para crear, mover y borrar objetos del mapa, además de limpiar, importar, generar, aceptar o descartar candidatos LiDAR y crear, renombrar, colorear, ocultar, activar o quitar capas vectoriales. Mientras dibujas líneas o áreas por nodos, Deshacer quita el último nodo y Rehacer lo repone; al terminar, ambas acciones trabajan sobre el objeto completo. El tipo se guarda en el proyecto y se exporta como metadato GeoJSON. En líneas discontinuas, los vértices esquina reinician el patrón con un trazo completo y los vértices dash colocan un trazo centrado en el vértice; normal no altera el patrón. La barra inferior muestra en tiempo real las coordenadas X/Y bajo el cursor o el Pen: usa el CRS configurado si el mapa está georreferenciado, coordenadas LiDAR si se está trabajando sobre una nube, o coordenadas locales en un mapa sin referencia. En modo «Seleccionar», mantener el Pen quieto 5 segundos abre un menú contextual equivalente al botón derecho, con opciones para insertar un vértice en una línea o área editable, cambiar o quitar el vértice y activar el ajuste a otros vértices, duplicar y editar el elemento. Al activar «Insertar vértice», el siguiente clic en un tramo coloca un nodo normal. «Cambiar tipo de vértice» avanza entre normal, esquina y dash; «Quitar vértice» respeta el mínimo de 2 puntos en líneas y 3 en áreas. «Ajustar a vértices» activa el mismo ajuste de 12 px que el control del editor. `Ctrl/⌘ + A` selecciona todos los objetos visibles y editables; `Ctrl/⌘ + D` duplica la selección en el mismo lugar, lista para arrastrar…2501 tokens truncated… la edición de curvas Bézier y la conversión de polilíneas a curvas y viceversa.
2. Ampliar el intercambio CAD con DGN de MicroStation y más entidades DXF; incorporar GeoTIFF y más conversiones CRS. KML/KMZ vectorial básico ya se importa y exporta.
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

## v24: vegetación a polígonos y corrección preliminar de caminos

- Una vez analizada una nube LAS/LAZ con indicadores de vegetación, pulsa **«Vectorizar coberturas LiDAR → GeoJSON»**. Ocarto genera polígonos fusionados para revisar, con agujeros interiores y categorías estructurales, nunca transitabilidad ni símbolos definitivos.
- Para preparar una **propuesta** de ajuste de un camino: añade y georreferencia una ortofoto local, define el CRS UTM métrico, selecciona una línea existente (dibujada o importada), elige el color aproximado de la superficie y pulsa **«Proponer ajuste sobre ortofoto»**. El original queda intacto. Ajuste preliminar basado en color y continuidad, NO identifica caminos autónomamente. Servicios WMS solo como plantillas visuales por restricciones CORS y formatos.
- Pruebas: `npm test` y `node tests/lidar-v24-real.cjs /ruta/fichero.laz`. Detalles en `VERSION-v24.md`.

## v25: aprendizaje de vegetación mediante ejemplos dibujados

1. Importa LAS/LAZ y pulsa analizar vegetación; confirma que el mapa está correctamente georreferenciado.
2. Dibuja o importa una superficie de vegetación en el mapa y selecciónala.
3. En **IA por ejemplos de vegetación** asigna una etiqueta y pulsa **Etiquetar área seleccionada**. Repite con más superficies distintas (blanco, verde 1/2/3, amarillo, matorral).
4. Pulsa **Aprender ejemplos → Proponer polígonos**. Se descargará un GeoJSON con polígonos sugeridos y atributos de revisión obligatoria. Los símbolos ISOM no se adjudican ni se aplican automáticamente.

El entrenamiento compara patrones LiDAR, no lee directamente objetos de los ficheros OCAD existentes y NO constituye una clasificación ya calibrada de penetrabilidad. Requiere revisión experta.

## v26: candidatos a estructuras artificiales y acceso desde móvil

Tras cargar LAS/LAZ y analizar la vegetación, pulsa **«Extraer edificios y tendidos LiDAR → GeoJSON»**. Se obtienen polígonos preliminares de edificaciones clase 6, líneas aproximadas de conductores clase 14 y celdas de torres clase 15 (si el origen dispone de esa clasificación). Son propuestas revisables; no se modifica el mapa ni se asigna símbolo ISOM automáticamente.

En Android, el botón **«Capas y LiDAR»** abre el panel de plantillas, WMS y herramientas LiDAR que permanecía oculto en pantallas estrechas.

Prueba real comprobada con 7,58 millones de puntos: 13 edificios candidatos; ninguna línea eléctrica clasificada en esa nube. Más detalles en `VERSION-v26.md`.

## v27: extraer posibles caminos directamente de una ortofoto

En **Capas y LiDAR → Ajuste experimental de caminos**, selecciona una ortofoto local previamente georreferenciada en CRS UTM, elige el color aproximado de la superficie (puede variar mucho), su tolerancia y la longitud mínima. Pulsa **«Detectar ejes de caminos SIN SHP»**. Se creará un GeoJSON con líneas candidatas que podrán importarse/editarse después de inspeccionarlas. Procesamiento en Web Worker cancelable.

**Limitaciones esenciales:** detector experimental por color, no aprende todavía de los mapas finales ni hace clasificación semántica; una superficie parecida puede producir falsos caminos. Los WMS son referencia visual, no fuente de píxeles para esta operación. Los caminos importados del SHP no son obligatorios para este detector.
