# Ocarto v286 · Dos LAZ de Bobadilla como una única zona

## Archivos de origen

- `PNOA_2024_AND_384-4115_H30_NPC01.laz`
- `PNOA_2024_AND_385-4115_H30_NPC01.laz`

Los dos LAZ **se seleccionan juntos**; no se digitaliza ni vectoriza un TIFF anterior. No se alteran los archivos de origen ni se suben a un servidor. El EPSG debe confirmarlo el usuario: para los ensayos de Bobadilla se trabaja con **ETRS89 / UTM 30N (EPSG:25830)**, pero la cabecera LAS por sí sola no verifica la definición del CRS.

## Cómo probar en Windows

1. Abrir Ocarto con **ABRIR-OCARTO.bat**; no abrir el `index.html` mediante `file://`.
2. Abrir el panel **LiDAR e IA** e introducir las resoluciones de terreno y vegetación, preferiblemente **0,5 m** en estas dos teselas. Elegir la equidistancia de curvas detalladas, por ejemplo **1 m**.
3. En **Importar nube(s) de puntos**, seleccionar **ambos LAZ en el mismo cuadro**. El programa lee las cabeceras, reconoce la extensión contigua aproximada de **2 km²** y prepara el plan por bloques (en la configuración de prueba 0,5 m / 0,5 m, aproximadamente **18 bloques internos**).
4. Confirmar el EPSG del mapa y marcar **«Confirmo que el EPSG indicado...»**. Pulsar **«Elegir carpeta y procesar 2 LAZ/LAS»** y seleccionar el directorio de salida. El procesamiento es uno solo, aunque se vea el avance por bloques.
5. Esperar el fin y abrir la subcarpeta `ocarto_teselas_...`. No es necesario unir manualmente los dos LAZ ni los bloques internos.

## Productos de la zona completa

| Nombre | Procedencia y contenido |
|---|---|
| `zona_completa_suelo_medido.csv` | Cotas de suelo clase 2 de todas las ventanas LAZ, conservadas sin inventar medidas |
| `zona_completa_mdt_preliminar.vrt` | MDT virtual unido de la zona: mosaico georreferenciado de las rejillas ASC con halo |
| `zona_completa_alturas_lidar.png` + `.pgw` + `.prj` | Imagen única de alturas de vegetación calculadas de los puntos LAZ, con celdas sin altura fiable transparentes |
| `zona_completa_alturas_lidar.vrt` | Mosaico virtual para toda la zona y para áreas mayores que la memoria apta para PNG |
| `zona_completa_feature_map_lidar.png` + `.pgw` + `.prj` | Sombreado único de máximos de retornos no suelo por celda con suelo medido o estimado de manera conservadora; altura por defecto 0–2 m |
| `zona_completa_feature_map_lidar.vrt` | Alternativa virtual por bloques georreferenciados, sin límite de PNG completo |
| `zona_completa_curvas_1m.geojson` | Curvas preliminares de toda la zona desde MDT; pueden cruzar bloques, con posibles objetos separados en las uniones |
| `zona_completa_vegetacion_candidata_lidar.geojson` | Áreas vectoriales candidatas de **verde oscuro**, **rayado** y **amarillo grande** calculadas desde celdas LAS/LAZ de todo el mosaico, con formas naturales curvadas |
| `zona_completa_vegetacion_lidar.csv` | Datos numéricos conjuntos por celda, con agua y caminos diferenciados para evitar falsas zonas abiertas |
| `manifest.json` | Inventario de datos de origen, bloques, productos terminados, advertencias y errores |

Los GeoJSON tienen georreferencia UTM confirmada. Las tres clases de vegetación se marcan como **`review_required: true`**, sin símbolos IOF definitivos. El amarillo detectado desde LiDAR es **candidato a terreno abierto, no confirmación de cultivo**. No se fuerzan clases verde claro ni verde intermedio en Bobadilla. Si no hay datos reales suficientes para una categoría, no se inventa.

El Feature Map **selecciona según la altura máxima del retorno no suelo por celda**. No demuestra que todos los retornos individuales de esa celda estén en el intervalo seleccionado y no equivale a una clasificación automática de piedras o muros.

## Mosaicos mayores

Para otros mapas, se pueden seleccionar **muchos LAZ contiguos**. El cálculo se divide en bloques georreferenciados para evitar agotar memoria. Los mosaicos VRT permiten disponer de una imagen lógica continua sin construir una única imagen gigantesca en memoria. El **vectorizador de zona completa** dispone actualmente de un límite de **12 millones de celdas**; si se supera, informa claramente de que esa vectorización queda pendiente en vez de afirmar que está terminada. El curvado GeoJSON es preliminar y requiere suavizado selectivo y revisión topológica.

Los `.vrt` necesitan permanecer **junto a los archivos de bloque** que referencian. Los `.png + .pgw + .prj` se pueden abrir como plantillas.

## Pruebas y estado real

Las pruebas automatizadas cubren la descompresión offline `laz-perf`, lectura LAS/LAZ reales **pequeños**, combinación de dos LAZ comprimidos en una misma sesión, modelos de altura, Feature Map de retornos no suelo, continuidad MDT/curvas por bordes y polígonos GeoJSON revisables. El programa Windows completo con los dos archivos PNOA de **aproximadamente 22,1 millones de puntos** **aún no se ha ejecutado y validado aquí**; no confundir el éxito automatizado con la generación ya realizada de esos productos.

La **v285 estable permanece intacta**. Todas estas modificaciones están únicamente en `ocarto-v286-cultivos-candidatos-revisables`.
