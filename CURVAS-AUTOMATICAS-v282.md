# Ocarto v282 — contornos naturales curvos y editables

**Base:** \`ocarto-v281-auto-vector-elements\`, que a su vez desciende de
v280 y v279. El trabajo existente no se ha sustituido por el \`main\` antiguo.

## Qué cambia

- Los **polígonos naturales detectados** (vegetación, claros, frutales, agua)
  y los **ejes de caminos/senderos** pasan por un suavizado protegido.
- En el apartado **LiDAR e IA → Detectar todos los elementos disponibles**
  hay un selector de intensidad: **Bajo / Medio / Alto**. El valor inicial es **Medio**.
- La geometría del editor utiliza **Bézier cúbicas reales**, con tangentes
  editables, no un filtro de visualización o una imagen.
- Los **edificios, ruinas, muros, tendidos, vallados y postes** conservan las
  esquinas y segmentos rectos originales. Las líneas de tipo ambiguo
  muro/escarpe permanecen sin redondear hasta verificar su naturaleza.
- También se aplica a las áreas de **vegetación por clases**, **vegetación
  por alturas** y la incorporación al mapa de polígonos procedentes de
  imágenes PNG+PGW de altura de vegetación.
- El botón **Guardar detecciones como plantilla**, la apertura como mapa
  **editable**, Deshacer, los símbolos y el proyecto **.cart** permanecen.

## Protección de detalles y huecos

Antes de convertir el objeto:

1. Se respeta cada vértice original, incluidas las esquinas marcadas por el editor.
2. Las tangentes quedan limitadas respecto a la resolución de la rejilla LiDAR
   (si está disponible); no se desplazan los puntos medidos del contorno.
3. Se comprueba con muestras de cada Bézier que no haya auto-intersecciones,
   que los agujeros continúen dentro del perímetro exterior ni se crucen
   con otros agujeros, y que la curva no se aleje excesivamente de la
   polilínea original.
4. Si el primer nivel no es seguro, se prueban tangentes más pequeñas.
   Si tampoco son seguras, **se conserva el contorno original**, sin
   deformarlo ni rellenar los huecos.
5. Para contornos muy extensos que no se pueden validar con garantías
   en esta primera fase se mantiene asimismo la polilínea original.
   Esto es intencionado y evita que la vectorización automática
   corrompa áreas de vegetación o agua.

**Nota:** el suavizado es un proceso de presentación y edición cartográfica:
no añade precisión geométrica al dato ráster ni confirma el tipo de
vegetación, la existencia actual de agua o la categoría de un camino.

## Uso

1. Descarga [Ocarto v282](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v282-natural-bezier.zip)
   y descomprime el archivo completo.
2. En Windows ejecuta \`ABRIR-OCARTO.bat\` (servidor local), no \`index.html\`
   desde el explorador de archivos.
3. Abre el LiDAR LAS/LAZ y calcula las rejillas de terreno y vegetación,
   según la categoría a detectar.
4. En **LiDAR e IA**, selecciona **Suavizado de curvas**
   (Bajo / Medio / Alto).
5. Pulsa **Detectar todos los elementos disponibles → inventario**.
   Las propuestas se ven sobre el mapa, sin aprobar.
6. Inspecciona las curvas y los agujeros. Utiliza **Abrir detecciones
   como mapa editable** para ajustar vértices y tangentes, o
   **Guardar detecciones como plantilla** si solo quieres compararlas.
7. Guarda el proyecto CART.

## Verificación

Pruebas de regresión:
\`\`\`sh
node --test source/v234/tests/lidar-auto-natural-bezier.test.cjs
\`\`\`

La implementación se ha comprobado con áreas de vegetación y agua
sintéticas, polígonos con hueco interior, caminos, edificios, muros
y geometrías complejas para verificar los límites de seguridad.

**Pendiente:** pruebas de la interfaz Chromium y validación visual con
el LAZ PNOA real de varios millones de puntos, incluido el uso de
teselas y áreas de 4–9 km². No se ha declarado producción cartográfica
completamente validada.
