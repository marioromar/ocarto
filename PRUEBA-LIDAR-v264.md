# Ocarto v264 — Comprobar el MDT preliminar con halo entre teselas

Esta revisión corresponde al **editor web completo de Ocarto en Windows**, no a la app Flutter nativa (que todavía no procesa LAS/LAZ).

## Apertura

Descarga el [ZIP completo v264](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v264.zip), **extráelo** a una carpeta y abre `ABRIR-OCARTO.bat`. La aplicación aparecerá en Chrome o Edge mediante `http://127.0.0.1:8787/`. No abras directamente `index.html` con `file://`.

## Primera fase: obtener las teselas de suelo y vegetación

1. Abre un mapa correctamente georreferenciado en el mismo sistema UTM que tus datos LiDAR.
2. Dibuja un polígono que delimite el área de trabajo y **déjalo seleccionado**.
3. Abre el menú **LiDAR** y ajusta la resolución del terreno (por ejemplo, **0,5 m**) y la de vegetación.
4. Pulsa **«Área extensa · procesar por teselas»** y selecciona uno o varios archivos LAS/LAZ.
5. Pulsa **«Elegir carpeta y procesar»** y elige dónde guardar. Se creará una carpeta `ocarto_teselas_...`.
6. Comprueba el archivo `manifest.json`: su propiedad `state` debe indicar `complete` y la cantidad de bloques en `completed` debe coincidir con `plan.total`.

## Segunda fase nueva: halo entre teselas

1. Sin necesidad de volver a cargar los LAZ, pulsa **«MDT preliminar · unir bordes»**.
2. Selecciona **la propia carpeta `ocarto_teselas_...`** (no la carpeta superior).
3. La aplicación leerá los CSV de terreno con flujo secuencial. Para cada tesela utilizará también los datos de sus vecinas en una franja de **dos celdas de halo**.
4. Obtendrás archivos `tesela_001_001_mdt_preliminar.asc`, etc., en formato **ESRI ASCII Grid**; incluyen ubicación UTM, resolución y valor `NODATA_value -9999`.
5. `manifest.json` incorporará un bloque independiente `dtmSeams`, con estado `complete`, `cancelled` o `error` y un resumen por tesela de celdas medidas, interpoladas y sin datos.
6. Puedes pulsar **«Detener MDT»**. Los archivos ASC de teselas ya terminadas se conservarán.

## Cómo evaluar la continuidad del MDT

Comprueba un tramo cercano a la frontera entre dos teselas. Una cota **medida** no se modifica; un hueco de hasta dos celdas puede rellenarse si existen **al menos tres medidas próximas**. El cálculo de ambos lados debe usar las mismas muestras vecinas y el polígono completo. Donde falte evidencia, seguirá apareciendo NODATA. El archivo ASC puede abrirse en otras herramientas GIS, pero **todavía no se superpone automáticamente en el editor Ocarto**.

Los tests comparan una interpolación de **dos teselas** contra una rejilla global equivalente, verifican huecos interiores del polígono, detección de CSV incorrectos y cancelación segura.

## Importante: limitaciones actuales

- No se ha hecho aún la prueba práctica con `PNOA_2024_AND_279-4085_H30_NPC01.laz` (aproximadamente 7,6 millones de puntos) ni una inspección visual de curvas y vaguadas.
- El archivo de terreno es una **rejilla preliminar de mínimas alturas de suelo**, con interpolación IDW local y sin modelo de incertidumbre. No representa todavía un MDT continuo profesional de orientación.
- Siguen pendientes: curvas oficiales y auxiliares continuas, suavizado que proteja vaguadas/espolones, exportación GeoTIFF/PNG de la nueva rejilla, vectorización CART y evaluación de vegetación.
- **COPC** y el procesamiento LiDAR nativo Flutter continúan pendientes.
- Esta segunda fase no vuelve a descomprimir LAZ, pero los CSV se leen por flujo para reconstruir la franja de cada tesela.

Si falla, el texto bajo el botón MDT señalará la operación y el error. **No se marca el modelo como terminado** si una tesela falla.

[Ver pruebas automatizadas LiDAR y Windows](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml).
