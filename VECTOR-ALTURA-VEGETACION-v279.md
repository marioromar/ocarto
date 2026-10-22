# Ocarto v279 — Vectorizar imágenes LiDAR de altura de vegetación

Esta función se incorpora al **editor cartográfico web** basado en la rama `ocarto-v278-pnoa-lidar-sources`. No modifica por defecto los símbolos oficiales ni la aplicación Windows Flutter.

## Apertura

Descarga el [ZIP completo de la rama v279](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v279-vegetation-height-vector.zip), extráelo completamente y ejecuta **ABRIR-OCARTO.bat** en Windows. El editor se abrirá en el navegador, mediante un servidor local. No ejecutes el archivo `index.html` directamente desde el ZIP.

## Vectorización PNG de altura de vegetación

1. Abre un mapa de Ocarto **georreferenciado**. Selecciona la referencia de tu zona, por ejemplo `EPSG:25830` para ETRS89 / UTM 30N. Un **PGW no almacena el EPSG**, por lo que debe confirmarse.
2. Abre **LiDAR e IA** y despliega **Vectorizar imagen LiDAR de altura de vegetación · PNG + PGW**.
3. Selecciona el PNG coloreado de altura y su archivo `.pgw` (también admite `.pngw` o `.wld`). Ambos deben tener el **mismo nombre base**, por ejemplo `altura.png` y `altura.pgw`.
4. Revisa en LiDAR los cuatro colores y alturas de la **paleta de altura de copa**. Predeterminados: 0 m amarillo, 0,30 m rojo, 2 m verde y 5 m blanco. Ajusta la tolerancia de color si la imagen tiene compresión o una paleta diferente.
5. Configura **área mínima en m²**. Activa **Blanco puro = sin datos** solo si el fondo blanco es realmente transparente/sin vegetación; si el blanco representa copas superiores a 5 m, deja la opción desactivada.
6. Pulsa **Vectorizar PNG**. La herramienta propone áreas por banda: 0–0,30 m, 0,30–2 m, 2–5 m y ≥5 m. Calcula polígonos en el PGW, **conservando los huecos interiores** y eliminando manchas inferiores al área mínima.
7. Puedes pulsar **Exportar GeoJSON** para guardar los polígonos georreferenciados. Si has abierto un mapa georreferenciado, activa una capa vectorial editable y pulsa **Incorporar áreas editables**. Ocarto incorpora las superficies con un símbolo genérico pendiente de revisión; **no asigna automáticamente IOF 401/405/406/408/410**, pues la altura sola no determina la penetrabilidad.

## Qué se ha implementado

- Lectura de imagen PNG RGBA y PGW de seis parámetros, incluida rotación o sesgo de la imagen.
- Deducción de bandas a partir del degradado de color configurable, con tolerancia para píxeles intermedios.
- Segmentación por regiones contiguas, conversión a polígonos GeoJSON, eliminación opcional de regiones pequeñas y conservación de huecos interiores.
- Exportación GeoJSON no destructiva y **incorporación explícita** a una capa editable mediante el motor de edición de Ocarto.
- Integridad de las versiones antiguas y de la importación LAS/LAZ, GPS y LiDAR existente.

## Limitaciones y siguientes mejoras

La función se ha probado con **imágenes sintéticas pequeñas** en las pruebas automáticas. Aún falta contrastarla con tus PNG de altura reales. El color de un PNG no siempre representa inequívocamente una altura (por ejemplo, blanco puede indicar ausencia de datos o copa alta). **Las cuatro clases son estimaciones de altura**, no verde de transitabilidad, zonas cultivadas o bosque blanco IOF.

Por protección de memoria, un PNG se limita a **2,5 millones de píxeles por operación**; usa recortes/teselas grandes por separado. Todavía falta vectorizar GeoTIFF de altura directamente, unir polígonos entre teselas y ofrecer suavizado de contornos y aprendizaje supervisado por ejemplos. La importación requiere PNG+PGW y revisión del CRS.

[Pruebas automáticas de esta rama](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml).
