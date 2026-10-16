# Ocarto v258 · Prueba LiDAR en Windows

Esta es la **versión web v249 con el procesador LiDAR reparado en la rama v258**. No es la app nativa Flutter. El objetivo de la prueba es detectar lo que funciona de verdad y los límites del procesado.

## Abrir correctamente

1. [Descargar el ZIP de Ocarto v258](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v258.zip).
2. **Extraerlo por completo** en una carpeta (por ejemplo, el Escritorio). No usar Ocarto desde dentro del ZIP.
3. Hacer doble clic en **ABRIR-OCARTO.bat**. Aparecerá una ventana de PowerShell y el navegador abrirá **http://127.0.0.1:8787/**.
4. **Dejar abierta la ventana de PowerShell** mientras se usa Ocarto. Si se cierra, se interrumpe el servidor local. El servidor solo funciona en el ordenador propio.
5. Entrar en el menú **LiDAR**. Elegir **Importar nube(s) de puntos** y seleccionar un único archivo **LAS o LAZ** pequeño para comenzar.

**No abrir `index.html` directamente**: con `file://` los navegadores pueden bloquear los Web Workers y la carga LAS/LAZ. No hay que instalar Python ni depender de Internet una vez extraídos los archivos.

## Comprobación inicial

- [ ] Abre el editor sin mensajes de error.
- [ ] Accede al menú LiDAR sin buscarlo en una barra desplazable.
- [ ] Selecciona un **LAZ real pequeño** y muestra nombre, puntos y progreso.
- [ ] Se visualiza la nube preliminar en el mapa.
- [ ] Prueba **Terreno / MDT** con celda de 0,5 a 1 m en un área pequeña.
- [ ] Prueba **Indicadores de vegetación** (suelo/vegetación clasificados).
- [ ] Prueba **Feature Map** en una zona que tenga puntos de suelo y vegetación.
- [ ] Selecciona dos teselas ordinarias LAS/LAZ de un área pequeña y confirma que genera un mosaico.
- [ ] Carga el archivo de prueba PNOA de aproximadamente **7,6 millones de puntos** y comprueba memoria, progreso y cancelación.

Es importante hacer las pruebas una por una. Si algo falla, anotar **el botón exacto y el texto de error**; en v258 hay errores visibles en lugar de bloqueos silenciosos.

## Qué funciona en pruebas y qué sigue pendiente

Se ha recuperado `lidar-worker.js`, junto con **laz-perf 3.4.0** y su WebAssembly (Apache-2.0). GitHub Actions ejecuta pruebas con archivos LAS/LAZ reales y datos sintéticos controlados. Las pruebas confirman lectura, descompresión, rejilla de suelo, resumen básico de vegetación, Feature Map y mosaico de teselas LAS.

**No se considera terminado el LiDAR profesional.** No hemos probado todavía:

- Tu LAZ de millones de puntos en un navegador Windows.
- Todo el flujo de generación y suavizado de curvas de nivel cartográficas a partir de un MDT.
- La calidad cartográfica de las clasificaciones de vegetación, detectores de elementos y exportaciones.
- El acceso COPC por jerarquía: devuelve ahora un error explícito; usar LAS/LAZ normal.
- Áreas habituales de 4–9 km² a 0,5 m. El límite actual es **1.000.000 de celdas por modelo** (hasta aproximadamente 0,25 km² de área completamente cubierta a 0,5 m), para evitar agotamiento de memoria.
- La ejecución del lanzador de PowerShell en un Windows físico.

La app Windows Flutter v257 todavía solo representa las plantillas ráster PNG+PGW: **no procesa LAS/LAZ**. No confundir ambas aplicaciones.

## Seguridad y componentes

El servidor de prueba de Ocarto escucha solo en `127.0.0.1:8787`; la nube elegida se lee directamente desde el selector del navegador. No se suben los archivos LiDAR a un servidor remoto. El decodificador LAZ se incluye localmente en `source/v234/vendor/`; no se necesita una descarga externa.

El proyecto de código [Ocarto v258 en GitHub](https://github.com/marioromar/ocarto/tree/ocarto-v258) y [su ZIP](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v258.zip) contienen los mismos archivos. Las pruebas automáticas están en [GitHub Actions](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml).
