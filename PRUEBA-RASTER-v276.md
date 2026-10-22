# Ocarto v276 — Vectorizar una imagen TIFF / GeoTIFF / PNG

Esta función se encuentra en el **editor web completo**. No requiere abrir un LAS/LAZ y no forma parte todavía del prototipo nativo Flutter Windows.

## Abrirlo en Windows

1. Descarga el [ZIP Ocarto v276](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v276.zip) y extrae todos sus archivos.
2. Abre `ABRIR-OCARTO.bat`, manteniendo abierta la ventana local del servidor. Se abrirá Ocarto en el navegador (Chrome o Edge).
3. Entra en **Plantillas → Abrir plantilla**. Selecciona el TIFF, GeoTIFF o PNG. Si los datos geográficos se encuentran en otro archivo, selecciona también su `.tfw` o `.wld` y, cuando corresponda, el `.prj`.
4. Comprueba que el TIFF se visualiza bien y que el sistema de coordenadas del mapa y de la plantilla coincide. Puedes cambiar de plantilla activa en el panel **Plantillas**.
5. En el mismo panel pulsa **Vectorizar TIFF / colores → áreas editables**.
6. Elige **Colores máximos** (inicialmente 6) y el **Área mínima** (35 píxeles de la imagen de trabajo). Si se crean demasiadas motas, aumenta el área mínima.
7. El programa crea una **capa vectorial independiente** llamada `Vector TIFF · ...`. Las zonas aparecen con sus colores de origen y puedes seleccionar sus polígonos y modificar sus vértices. Los huecos interiores se conservan.

## Lo que hace realmente

Separa grupos de píxeles de color parecido, obtiene sus bordes y los convierte en áreas vectoriales. La imagen original continúa disponible como plantilla y no se modifica. Guarda también el color de origen y el nombre de la imagen como metadatos de cada área, para revisión.

**No reconoce automáticamente** las clases cartográficas ISOM/ISSprOM: el mismo verde de dos rásteres distintos puede representar cosas distintas. Debes revisar y asignar el símbolo IOF correcto después de la vectorización. Se usa provisionalmente el símbolo genérico de área `vegetation` sin crear símbolos falsos ni duplicados.

## Limitaciones y seguridad

- El GeoTIFF original se visualiza hasta un máximo de 6.000 píxeles por lado; para vectorizar, la imagen se analiza como máximo a 1.200 píxeles por lado. Es un trazado **aproximado**, no equivalente a digitalizar a resolución completa. Es posible que se pierdan áreas pequeñas.
- Esta opción crea **áreas por colores**, no extrae automáticamente líneas finas, caminos, curvas, símbolos de punto ni texto. Esas tareas necesitan un tratamiento específico.
- El TIFF debe poder leerse desde el navegador. Imágenes enormes o comprimidas de forma poco habitual pueden agotar memoria durante la apertura, antes incluso de iniciar la vectorización.
- Si falta georreferenciación, las áreas se crean en el lienzo local, no en coordenadas UTM. Comprueba el CRS antes de exportar un mapa georreferenciado.
- La clasificación se limita a un máximo de ocho colores dominantes y un límite de polígonos/vértices para proteger el navegador.
- Las pruebas automáticas comprueban áreas, colores separados y huecos, pero **no sustituyen una prueba con el TIFF grande de Bobadilla**, que no se ha podido ejecutar aquí.

## Pruebas de funcionamiento

[GitHub Actions de Ocarto v276](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml) comprueba que se generan áreas editables, que se conservan huecos y que el menú realmente ofrece la opción. Las funciones GPS y LiDAR previas deben seguir intactas.

Si la herramienta no genera polígonos, anota el mensaje que aparece bajo el botón `Vectorizar TIFF / colores`, además de las dimensiones del archivo.
