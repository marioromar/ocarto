# Ocarto v262 — Prueba de áreas LiDAR extensas

Esta es la **aplicación web de Ocarto en Windows** con el nuevo procesado por ventanas. **La aplicación Flutter nativa v257 no dispone aún de LiDAR.**

## 1. Abrir y probar LAS/LAZ
1. Descarga [Ocarto v262 ZIP](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v262.zip) y descomprímelo **por completo**.
2. Abre **ABRIR-OCARTO.bat** (no abras `index.html` directamente). Se iniciará el servidor local y el editor en Chrome o Edge.
3. Pulsa el menú **LiDAR**. En **Cargar datos LiDAR**, elige un archivo **LAS o LAZ pequeño**. Comprueba que se muestran los puntos y los límites correctos.

## 2. Exportar un área extensa por ventanas
1. Abre un mapa correctamente georreferenciado en las **mismas coordenadas métricas UTM** que tus archivos LAS/LAZ.
2. Dibuja o selecciona un **polígono de área** que delimite la zona de estudio y mantén ese polígono seleccionado.
3. En LiDAR, elige resolución de terreno **0,5 m** y de vegetación **0,5 m** o **1 m**.
4. Pulsa **«▦ Área extensa · procesar por teselas»** y selecciona los archivos LAS/LAZ. Se admiten múltiples archivos, pero todavía no COPC jerárquico.
5. Vuelve a pulsar el botón, ahora llamado **«Elegir carpeta y procesar»**, y elige una carpeta de destino. Chrome/Edge pueden pedir permiso de lectura y escritura local.
6. Ocarto procesará la selección por ventanas; para cada una escribirá un archivo `tesela_NNN_NNN_mdt.csv` con cotas mínimas de suelo y otro `tesela_NNN_NNN_vegetacion.csv` con datos de vegetación. El archivo `manifest.json` describe el área, la resolución, los bloques y el progreso.
7. **«Detener al finalizar bloque»** solicita cancelar el análisis en curso; los CSV ya escritos permanecerán en la carpeta.

**Importante:** los archivos de origen LAS/LAZ se vuelven a leer para cada ventana que los intersecta. En mapas de 4–9 km² puede ser lento. El cálculo limita cada ventana a una fracción del millón de celdas permitido por el procesador, pero la memoria efectiva también depende del archivo LAZ original, del navegador y del ordenador.

## Lo que realmente produce
- CSV de **suelo mínimo por celda**, extraído de puntos clasificados como suelo (clase 2). No es un MDT interpolado continuo.
- Indicadores provisionales de vegetación por celda y conteos de clases LAS.
- Bloques espaciales deterministas, sin duplicar puntos situados justo en fronteras; omite archivos completamente fuera de cada ventana.
- Un manifiesto de resultados que identifica los bloques terminados o cancelados, para no confundir una ejecución parcial con una completa.

**Todavía no implementado:** halo entre ventanas, interpolación del MDT, unión de rásteres, curvas de nivel continuas, calidad final de Feature Map/vegetación, exportación CART de esos modelos y procesamiento COPC jerárquico.

## Comprobaciones
Las pruebas automáticas verifican lectura LAS/LAZ real, comunicación con el Worker, recorte por polígono, unión de distintas teselas de entrada en una ventana, planificación de **4–9 km² a 0,5 m**, ausencia de duplicados en bordes y estructuras de exportación. **No equivalen a una prueba de rendimiento con tu archivo `PNOA_2024_AND_279-4085_H30_NPC01.laz` de unos 7,6 millones de puntos** ni a una comprobación cartográfica profesional de los modelos generados.

[GitHub Actions — pruebas LiDAR y apertura Windows](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml).
