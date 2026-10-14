# Ocarto LiDAR: LAS y LAZ

## Recorte de un mosaico al área seleccionada (v47)

Selecciona primero un polígono del mapa y luego carga dos o más ficheros LAS/LAZ. Para cada archivo, Ocarto comprueba la extensión declarada en su cabecera y omite las teselas exteriores sin reservar el búfer completo. En las teselas que cruzan el área, filtra los puntos y solo suma al terreno y vegetación los que caen dentro del polígono (respetando sus huecos). Si no hay un área seleccionada, mantiene el mosaico por extensión completa.

El recorte reduce los puntos agregados, los modelos exportados y la lectura de teselas exteriores. Para una tesela que cruza el área, el lector aún consume el archivo completo en bloques y luego decodifica todos sus puntos para filtrar el polígono. Se detectan encuadres de teselas solapados y se avisa de que los puntos repetidos se cuentan más de una vez. No se deduplican automáticamente porque una deduplicación exacta de millones de registros exigiría conservar claves de puntos y elevaría mucho la memoria. Ver [VERSION-v47.md](VERSION-v47.md).

## Mosaico de archivos LAS/LAZ (v41)

Selecciona varios archivos LAS/LAZ al mismo tiempo. Ocarto procesa cada tesela por separado, combina las cotas mínimas de suelo y los indicadores de vegetación por celda, y libera el búfer LAZ de esa tesela antes de cargar la siguiente. La memoria retenida por los modelos depende del número de celdas, no de la suma de puntos de todos los archivos.

Las teselas deben compartir CRS y unidades. El área se define por la unión de sus extensiones, sin recorte por polígono todavía. Si los archivos se solapan, los recuentos de puntos pueden duplicarse. Cada modelo admite hasta 100.000 celdas; aumenta el tamaño de celda para áreas grandes.

## Recuperación de laz-perf/WebAssembly

El worker usa la API oficial de **laz-perf 3.4.0** de Hobu, fijada a esa versión y publicada bajo licencia Apache-2.0. La distribución JS/WASM se instala localmente en `vendor/`; la aplicación no carga código ejecutable desde CDN.

Desde esta carpeta, ejecuta:

```sh
npm run vendor:laz-perf
```

El script descarga `js/src/laz-perf.js` y `js/src/laz-perf.wasm` desde la etiqueta `3.4.0` del repositorio oficial y comprueba ambos SHA-256 antes de guardarlos. Después sirve el prototipo por HTTP local, no mediante `file://`.

## Decodificación y análisis en lotes

Desde la v40, el navegador lee el archivo con avance y cancelación y envía bloques al Worker con confirmación entre bloques. Para LAZ, el Worker copia cada bloque directamente a la asignación final en memoria WASM; no se construye un ArrayBuffer JavaScript completo ni se vuelve a copiar el fichero al final. Para LAS sin compresión, los bloques se montan en el Worker.

El Worker detecta la compresión por los bits altos del formato LAS, crea `new Module.LASZip()`, copia el fichero a memoria Emscripten y valida conteo, longitud del registro y formato. Lee X/Y/Z en los offsets oficiales 0/4/8 y aplica escalas y offsets LAS. Al cargar, calcula la extensión y genera una vista de hasta 60.000 puntos; no mantiene tres arrays `Float64` del tamaño de la nube. El archivo original permanece en el Worker para análisis posteriores.

LAS y LAZ se recorren por lotes de 100.000 puntos. El análisis conserva máximos por celda en una retícula global y opcionalmente compara vecinos 3×3, lo que evita falsos máximos en bordes de tesela. La interfaz muestra avance y permite cancelar carga o análisis. Al analizar LAZ, el archivo se vuelve a descomprimir; esto ahorra memoria a costa de tiempo adicional. El decodificador y sus búferes se liberan también al cancelar o fallar.

Desde la v39, la copia comprimida se conserva en WASM y se reutiliza en los análisis siguientes. La carga de LAZ necesita su tamaño completo en WASM más la memoria temporal del decodificador y el resumen del análisis; la memoria disponible del navegador y del equipo sigue limitando el tamaño práctico. No hay un límite fijo de puntos para LAS/LAZ. CSV/XYZ conserva el límite de 250.000 puntos del prototipo. La detección sigue siendo experimental y no clasifica profesionalmente árboles, rocas u otros elementos.

## Pruebas realizadas

```sh
npm test
npm run test:real -- ruta/al/archivo.laz
```

La suite sintética comprueba lectura LAS, análisis por celdas, cancelación entre lotes y la API laz-perf simulada. `test:real` usa el WASM oficial, exige al menos 2 millones de puntos y recorre el flujo completo.

El 13 de octubre de 2026, el archivo `PNOA_2024_AND_279-4085_H30_NPC01.laz` (7.585.022 puntos, formato 8) terminó con 40.000 celdas, 6 teselas y 765 máximos locales en dos ejecuciones completas. La segunda ejecución tardó 7,1 s en cargar y 14,2 s hasta completar el análisis; el proceso alcanzó 197 MiB de RSS máximo. Son mediciones puntuales, no un límite de memoria o rendimiento garantizado.

## Referencias y licencia

- Código fuente y distribución oficial: <https://github.com/hobuinc/laz-perf/tree/3.4.0>
- Licencia Apache-2.0: <https://github.com/hobuinc/laz-perf/blob/3.4.0/COPYING>
