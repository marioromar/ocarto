# Ocarto v263 — Prueba LiDAR con menos descompresiones y exportación controlada

**Esta prueba utiliza el editor cartográfico web que funciona en Windows con Chrome/Edge. No utiliza la app nativa Flutter v257**, donde el procesamiento LAS/LAZ sigue pendiente.

## Abrir la versión correcta

Descarga el [ZIP completo v263](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v263.zip), descomprímelo completamente y abre `ABRIR-OCARTO.bat`. Se abrirá un navegador en la dirección local `http://127.0.0.1:8787/`. Deja abierta la ventana del servidor local. No abras `index.html` directamente por `file://`: ese protocolo puede bloquear el Worker.

## Prueba 1: archivo LAZ aislado

En el menú **LiDAR**, abre un archivo LAZ pequeño. Debes ver la vista previa y el número de puntos. Esta operación **sí** lee el archivo para producir una vista previa; no se debe perder esa función.

## Prueba 2: área extensa por ventanas

1. Abre un mapa georreferenciado con la misma referencia UTM que los archivos LAS/LAZ.
2. Dibuja y selecciona el polígono que define la zona, en el mapa.
3. En LiDAR, selecciona el tamaño de celda del terreno y la vegetación, por ejemplo **0,5 m** para ambos.
4. Pulsa **Área extensa · procesar por teselas**. Selecciona uno o varios LAS/LAZ convencionales. El botón cambiará a **Elegir carpeta y procesar**.
5. Pulsa de nuevo el botón y elige una carpeta. Es el segundo clic el que pide permiso al navegador para escribir en disco.
6. Se crea una subcarpeta `ocarto_teselas_...`, con un archivo `manifest.json` y dos CSV por ventana: `*_mdt.csv` y `*_vegetacion.csv`.
7. Si necesitas cancelar, utiliza **Detener al finalizar bloque**. Los CSV exportados anteriormente y su lista en el manifiesto permanecen guardados; el estado del manifiesto deberá indicar `cancelled`.

La v263 elimina una descompresión redundante: **al cargar cada fuente para un mosaico, se analiza primero la cabecera sin recorrer todos los puntos**; la pasada de puntos se hace durante la generación de los modelos. Además, se verifica que los dos CSV contienen exactamente tantas filas de datos como celdas declara el procesador, y solo entonces se registra el bloque como terminado.

## Qué comprobar al terminar

En `manifest.json`, `state: "complete"` significa que acabaron todas las ventanas; `error` o `cancelled` identifican una salida parcial. El número de entradas en `completed` debe coincidir con el número de bloques exportados. Los archivos CSV contienen celdas observadas por clasificación LAS (suelo mínimo y estadísticas de vegetación), **no** un MDT interpolado ni curvas de nivel continuas.

## Limitaciones todavía reales

- No he podido probar el archivo PNOA de unos **7,6 millones de puntos** en tu ordenador ni medir el uso real de RAM y tiempo en zonas de 4–9 km².
- Los archivos LAZ que intersectan múltiples ventanas todavía se vuelven a leer y descomprimir **una vez por ventana**; no existe indexado COPC jerárquico.
- Faltan interpolación del terreno, halos en bordes, unión de las curvas, generación de rásteres GeoTIFF/PNG completos y control cartográfico de la vegetación.
- La interfaz necesita seguir mejorándose; esta versión prioriza la lectura LiDAR y la protección de los resultados.
- La aplicación Windows Flutter v257 aún no admite directamente archivos LAS/LAZ.

[Comprobaciones automáticas en GitHub](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml) — comprueban archivos LAS/LAZ pequeños reales, lectura por bloques, modo mosaico, escritura y recuperación ante errores simulados, pero **no sustituyen una prueba con tu nube PNOA real**.
