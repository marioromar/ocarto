# Ocarto v280 — Comprobación real de LiDAR en Chromium

Esta rama deriva de **ocarto-v279-vegetation-height-vector** (no de main v249).
No altera la interfaz, símbolos, GPS, Bézier, modelos LiDAR ni datos de usuario.

GitHub Actions instala Chromium en un entorno aislado del instalador Electron.
Abre el editor por HTTP local, verifica el acceso real al Web Worker y WASM
offline, y utiliza la entrada LAS/LAZ correcta (#pointFile) con los archivos
1815.las y 1815.laz que ya están en el repositorio. Espera la confirmación
«Carga completa» enviada por el Worker después de leer/descomprimir los puntos,
y comprueba que se habilita «Preparar rejilla de terreno».

Esto detecta fallos que las pruebas de Node o los enlaces HTTP no detectan.
En caso de fallo, GitHub conserva trazas y capturas de Chromium.

**Límites:** no es una prueba de Windows Flutter ni del LAZ PNOA de 7,6 millones
de puntos; tampoco verifica 4–9 km² ni calidad profesional del MDT. Hasta probar
ese archivo real no debe afirmarse que el LiDAR completo funciona en campo.

[Ver las pruebas en GitHub Actions](https://github.com/marioromar/ocarto/actions/workflows/lidar-browser-smoke.yml).
