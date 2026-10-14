# Ocarto LiDAR: LAS y LAZ

## Recuperación de laz-perf/WebAssembly

El worker usa la API oficial de **laz-perf 3.4.0** de Hobu, fijada a esa versión y publicada bajo licencia Apache-2.0. La distribución JS/WASM se instala localmente en `vendor/`; la aplicación no carga código ejecutable desde CDN.

Desde esta carpeta, ejecuta:

```sh
npm run vendor:laz-perf
```

El script descarga `js/src/laz-perf.js` y `js/src/laz-perf.wasm` desde la etiqueta `3.4.0` del repositorio oficial y comprueba ambos SHA-256 antes de guardarlos. Después sirve el prototipo por HTTP local, no mediante `file://`.

## Decodificación y análisis en lotes

En la v38, el navegador lee el archivo de forma progresiva con avance visible y cancelación real antes de transferirlo al Worker. El decodificador sigue necesitando el buffer LAZ completo; el análisis y descompresión se procesan por lotes.

El Worker detecta la compresión por los bits altos del formato LAS, crea `new Module.LASZip()`, copia el fichero a memoria Emscripten y valida conteo, longitud del registro y formato. Lee X/Y/Z en los offsets oficiales 0/4/8 y aplica escalas y offsets LAS. Al cargar, calcula la extensión y genera una vista de hasta 60.000 puntos; no mantiene tres arrays `Float64` del tamaño de la nube. El archivo original permanece en el Worker para análisis posteriores.

LAS y LAZ se recorren por lotes de 100.000 puntos. El análisis conserva máximos por celda en una retícula global y opcionalmente compara vecinos 3×3, lo que evita falsos máximos en bordes de tesela. La interfaz muestra avance y permite cancelar carga o análisis. Al analizar LAZ, el archivo se vuelve a descomprimir; esto ahorra memoria a costa de tiempo adicional. El decodificador y sus búferes se liberan también al cancelar o fallar.

La v39 conserva la copia comprimida en memoria WASM tras cargar el LAZ y la reutiliza en los análisis siguientes, evitando volver a copiar el archivo completo en cada operación. La carga inicial mantiene una copia de trabajo completa en memoria JavaScript mientras se copia a WASM. La memoria de análisis depende del tamaño del archivo, de los temporales de laz-perf y del número de celdas ocupadas; no hay un límite fijo de puntos en LAS/LAZ. CSV/XYZ conserva el límite de 250.000 puntos del prototipo. La detección sigue siendo experimental y no clasifica profesionalmente árboles, rocas u otros elementos.

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
