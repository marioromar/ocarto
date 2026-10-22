# Ocarto v281 — Detección vectorial LiDAR + ortofoto (primera fase)

Esta rama deriva de **ocarto-v280-chromium-lidar-smoke**, descendiente de
**ocarto-v279-vegetation-height-vector**. No parte de \`main\` (v249)
ni sustituye las herramientas anteriores.

## 1. Abrir el editor web local en Windows

1. [Descarga el ZIP íntegro de v281](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v281-auto-vector-elements.zip).
2. Descomprime todo en una carpeta.
3. Ejecuta **ABRIR-OCARTO.bat** y mantén abierta la ventana negra del servidor.
4. Abre Ocarto y confirma la proyección UTM (por ejemplo **EPSG:25830**).
5. Trabaja inicialmente sobre una zona recortada del LAZ.

**No abras** \`index.html\` mediante \`file://\`: algunos navegadores bloquean el Worker LiDAR.

## 2. Detectar edificios, vías, agua, vegetación y relieve desde LAZ

1. En **LiDAR e IA**, carga archivos **LAS/LAZ** o utiliza
   **Área extensa · procesar por teselas** cuando haya varios archivos.
2. Ejecuta **Analizar vegetación LAS/LAZ** para calcular la rejilla de retornos
   (incluye clases 6, 9 y 11 si aparecen), y **Preparar rejilla de terreno**
   para los detectores de relieve. En mosaicos por teselas se generan
   los modelos de suelo y vegetación cuando termina el procesamiento.
3. Pulsa **Detectar todos los elementos disponibles → inventario**.
4. Se muestran candidatos sin aceptar. Guarda como **plantilla** o
   **abre como mapa editable** solo después de revisarlos; usa **Exportar inventario**
   para obtener GeoJSON.

La versión v281 añade:

- **Clase 11, superficie vial**: eje vectorial aproximado mediante esqueleto de
  celdas contiguas. No diferencia automáticamente autopista, carretera,
  pista ni sendero. No se interpreta como vía en LAS 1.3 o anteriores,
  donde esa clase estaba reservada.
- **Clase 9, agua**: polígonos georreferenciados conservando huecos e islas.
  La clase no garantiza que exista agua en la fecha actual del mapa.
- **Edificios clase 6, vegetación baja/media/alta, claros, muros,
  rocas y vaguadas**: se mantienen los detectores anteriores sin modificar
  sus símbolos predeterminados.
- Si la nube carece de clases 9/11, **no se inventan** esas entidades.

## 3. Reforzar candidatos de caminos con ortofoto + LiDAR

1. Añade una **ortofoto local** como plantilla, georreferenciada y con el
   **mismo CRS UTM** que el LAZ/mapa.
2. Calcula **vegetación LAS/LAZ** previamente (para contar con celdas LiDAR).
3. Dentro de la sección **Ajuste experimental de caminos**,
   selecciona el color de referencia del camino y pulsa
   **Detectar caminos/senderos → GeoJSON y mapa**.
4. El extractor de ortofoto ya existente propone ejes por color y continuidad.
   v281 añade un **contraste espacial LiDAR** que anota cada eje como:
   - \`apoyo-clase11\`: ortofoto y clase 11 de vías coinciden parcialmente.
   - \`superficie-despejada-no-confirma\`: solo se observan puntos de suelo
     despejado; podría tratarse de tierra de cultivo o suelo descubierto.
   - \`cubierta-vegetal-no-descarta-camino\`: cubierta vegetal, no descarta
     un sendero bajo copas.
   - \`insuficiente\`: no hay evidencia segura en las celdas disponibles.
5. El recuento de ejes con clase 11 aparece en el estado de la herramienta;
   exporta el GeoJSON anotado y revisa la vista previa antes de aceptar.

La **ortofoto nunca sustituye la revisión**: coincidencia de color puede marcar
suelos agrícolas, sombras o parcelas como caminos. El sistema no aplica la
clasificación de transitabilidad ISOM a partir de altura sola.

## Limitaciones que siguen pendientes

- **No se ha probado todavía el archivo real** \`PNOA_2024_AND_279-4085_H30_NPC01.laz\`
  de unos 7,6 millones de puntos ni un mosaico completo de 4–9 km².
- La extracción de caminos por ortofoto es todavía un prototipo por coincidencia
  de color y eje morfológico. No es una IA semántica entrenada.
- Faltan un detector geométrico avanzado que proponga caminos sin clase 11,
  clasificación fiable de carreteras/senderos por anchura, detección de
  márgenes de vías, identificación de ríos con agua frente a cauces secos y
  entrenamiento con los ejemplos guardados del usuario.
- Los contornos de edificios y carreteras requieren revisión frente a
  ortofoto, vuelos LiDAR y campo. Nada se acepta automáticamente.
- La prueba automática verifica módulos y ejemplos sintéticos; la calidad
  cartográfica final requiere validación visual y de campo.

## Pruebas

\`node --test source/v234/tests/lidar-transport-water.test.cjs\`

[Ver el flujo LiDAR de GitHub Actions](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml).
