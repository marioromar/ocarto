# Ocarto — editor cartográfico de orientación

**Editor web: v249 · Aplicación Windows Flutter: v254.** Ambas aplicaciones permanecen en este mismo repositorio Ocarto; Windows sigue en desarrollo y todavía no integra todas las herramientas del editor web.

## Descargar la aplicación

- **[Ocarto v249 — ZIP de la aplicación](versions/ocarto-v249-final.zip)**
- **[Código y versiones de Ocarto](source/v234/index.html)**
- **[Cambios y comprobaciones OCAD v249](source/v234/OCAD-v249.md)**

Para usar Ocarto desde un ordenador, descarga el ZIP, descomprímelo y abre el archivo **`index.html`** con el navegador. GitHub muestra el código fuente; no ejecuta por sí mismo el editor. El archivo `index.html` de la raíz del repositorio también conduce a la versión actual del editor en `source/v234/index.html`.

## Revisión OCAD 2018

En **Archivo → Revisar símbolos y tintas OCAD…** se puede abrir un archivo de Bobadilla y comprobar en modo **solo lectura** símbolos, colores CMYK y orden provisional de impresión. La auditoría permite descargar un informe JSON, y **no sustituye los símbolos, colores ni las prioridades actuales**. Falta verificar el resultado visualmente contra OCAD 2018 antes de aprobar nuevos predeterminados.

El desarrollo sigue en la rama `ocarto-v249`, sincronizada con `main`. La versión del ZIP se construye a partir de los mismos archivos fuente del editor.

## Ocarto Windows — objetos vectoriales editables (v254)

La [rama ocarto-v254](https://github.com/marioromar/ocarto/tree/ocarto-v254) sigue el desarrollo Flutter en **el mismo repositorio Ocarto**, ahora con **líneas y áreas formadas por varios vértices**, terminadas con doble clic o botón, y **vértices seleccionables y desplazables**. Los trazados naturales usan curvas Bézier automáticas; elementos angulares como edificios conservan esquinas. Las coordenadas geográficas WGS84 se conservan cuando existe un origen GPS/cartográfico y se diferencian de las coordenadas locales de un lienzo sin georreferencia.

La v254 mantiene GPS Bluetooth COM, tracks editables, GPX, PNG+PGW con EPSG, autoguardado protegido y símbolos favoritos fijados en la columna derecha.

- [Código Windows v254](ocarto_app/)
- [Instrucciones de edición y limitaciones](ocarto_app/README-GPS-Windows.md)
- [Pruebas y compilaciones Windows](https://github.com/marioromar/ocarto/actions/workflows/flutter-windows-gps.yml)
- [ZIP del código de la misma rama v254](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v254.zip)

El editor cartográfico web **v249** y las versiones Windows anteriores están intactos. El catálogo Flutter sigue siendo provisional. Falta implementar los tiradores Bézier profesionales, la edición CART completa y pruebas de hardware GNSS. El paquete ejecutable Windows se publica solo si GitHub Actions termina sus pruebas y su compilación con éxito.
