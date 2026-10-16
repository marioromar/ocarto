# Ocarto — editor cartográfico de orientación

**Versión actual: v249.** Este es el repositorio principal del mismo proyecto Ocarto; no existe un proyecto paralelo.

## Descargar la aplicación

- **[Ocarto v249 — ZIP de la aplicación](versions/ocarto-v249-final.zip)**
- **[Código y versiones de Ocarto](source/v234/index.html)**
- **[Cambios y comprobaciones OCAD v249](source/v234/OCAD-v249.md)**

Para usar Ocarto desde un ordenador, descarga el ZIP, descomprímelo y abre el archivo **`index.html`** con el navegador. GitHub muestra el código fuente; no ejecuta por sí mismo el editor. El archivo `index.html` de la raíz del repositorio también conduce a la versión actual del editor en `source/v234/index.html`.

## Revisión OCAD 2018

En **Archivo → Revisar símbolos y tintas OCAD…** se puede abrir un archivo de Bobadilla y comprobar en modo **solo lectura** símbolos, colores CMYK y orden provisional de impresión. La auditoría permite descargar un informe JSON, y **no sustituye los símbolos, colores ni las prioridades actuales**. Falta verificar el resultado visualmente contra OCAD 2018 antes de aprobar nuevos predeterminados.

El desarrollo sigue en la rama `ocarto-v249`, sincronizada con `main`. La versión del ZIP se construye a partir de los mismos archivos fuente del editor.

## Ocarto Windows — GPS Bluetooth (v251)

La rama [ocarto-v251](https://github.com/marioromar/ocarto/tree/ocarto-v251) mantiene el menú **GPS** de Ocarto Flutter para Windows (receptores Bluetooth SPP por COM y USB NMEA, posicionamiento, grabación editable de tracks y GPX) e incorpora **guardado temporal con respaldo y recuperación ante escrituras interrumpidas**. [Código Windows](ocarto_app/) · [Instrucciones y límites de GPS](ocarto_app/README-GPS-Windows.md) · [Compilaciones Windows](https://github.com/marioromar/ocarto/actions/workflows/flutter-windows-gps.yml).

La versión web v249 y sus símbolos actuales no se modifican en esta rama. Windows Flutter sigue siendo un prototipo separado dentro de **este mismo repositorio**, aún sin mapa georreferenciado completo ni integración de todo el editor web. La conexión GPS debe probarse con hardware físico. El paquete de Actions, cuando la ejecución finaliza correctamente, es una compilación portable, no un instalador.
