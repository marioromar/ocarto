# Ocarto v261 — Comprobación de LiDAR en Windows

Esta revisión corresponde al **editor cartográfico web completo** de Ocarto (GPS + LiDAR); no es el prototipo nativo Flutter.

## Apertura

1. Descarga [el ZIP de la misma rama v261](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v261.zip).
2. Extrae todo su contenido en una carpeta de tu PC. **No ejecutes directamente desde dentro del ZIP.**
3. Abre `ABRIR-OCARTO.bat`. Mantén la ventana de PowerShell abierta. El editor se abrirá en `http://127.0.0.1:8787/`.
4. Entra en el **menú LiDAR** o pulsa **LiDAR e IA**. El panel derecho debe cambiar a LiDAR sin desplazar barras horizontales.
5. En **Cargar datos LiDAR**, importa **un LAZ pequeño**. Comprueba nombre, número de puntos y vista previa.

**No abrir index.html por doble clic**: el protocolo `file://` puede bloquear los Web Workers y el decodificador WebAssembly. El lanzador funciona en el ordenador local; no sube tu nube a Internet.

## Prueba de funcionamiento, por orden

- **1. Apertura y nube:** abrir un LAS o LAZ pequeño y comprobar que el contador y la nube aparecen sin errores.
- **2. MDT:** utilizar el botón de terreno con celdas de 0,5 m a 1 m en un área pequeña. La rejilla inicial usa puntos LAS clasificados como suelo (clase 2).
- **3. Vegetación:** obtener el resumen de alturas y densidades basado en clases LAS; comparar un sector de suelo y otro arbolado.
- **4. Feature Map:** generar el sombreado sobre celdas donde coexisten evidencias de suelo y vegetación.
- **5. Mosaico:** seleccionar un polígono de trabajo georreferenciado y varios LAS/LAZ convencionales; las teselas que no intersecten el área deben omitirse leyendo solo su cabecera (227 bytes). Las que intersecten se leen y se filtran punto a punto.
- **6. Archivo PNOA real:** probar `PNOA_2024_AND_279-4085_H30_NPC01.laz` con aproximadamente 7,6 millones de puntos, observando progreso, memoria, cancelación y resultados. **Esta prueba todavía no se ha realizado automáticamente**.

### Qué está validado

Las pruebas GitHub Actions ejecutan el lector de archivos real conectado al Worker con archivos LAS/LAZ reales y verifican carga por bloques, descompresión LAZ local, datos resultantes, rechazos de archivos inválidos y **descarte temprano de teselas fuera de un área**. También prueban el arranque del servidor local con un ejecutor Windows. [Ver resultados](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml).

### Qué continúa pendiente

- No se ha probado el LAZ de PNOA grande en tu ordenador ni el rendimiento con 4–9 km² completos.
- Un modelo admite como máximo **1.000.000 de celdas**, por protección de memoria. A 0,5 m, un área de 4–9 km² excede ese límite. Es necesario implementar cálculo por teselas y unión de modelos para llegar a esa escala.
- **COPC jerárquico** sigue pendiente; usar LAS/LAZ convencional.
- Las curvas de nivel reglamentarias y la calidad cartográfica de vegetación/detecciones necesitan pruebas visuales con tus datos reales.
- El **Flutter Windows v257** no procesa LAS/LAZ.
- El diseño completo de la interfaz aún necesita mejoras; se ha corregido el acceso al panel LiDAR, pero no se ha terminado el rediseño.

**Cuando aparezca un fallo**, anota la operación y el mensaje exacto mostrado por Ocarto. Para corregirlo serán especialmente útiles un pantallazo y el nombre del archivo.
