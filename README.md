# Ocarto — editor cartográfico de orientación

**Editor web: v249 · Aplicación Windows Flutter: v255.** Ambas aplicaciones permanecen en este mismo repositorio Ocarto; Windows sigue en desarrollo y todavía no integra todas las herramientas del editor web.

## Descargar la aplicación

- **[Ocarto v249 — ZIP de la aplicación](versions/ocarto-v249-final.zip)**
- **[Código y versiones de Ocarto](source/v234/index.html)**
- **[Cambios y comprobaciones OCAD v249](source/v234/OCAD-v249.md)**

Para usar Ocarto desde un ordenador, descarga el ZIP, descomprímelo y abre el archivo **`index.html`** con el navegador. GitHub muestra el código fuente; no ejecuta por sí mismo el editor. El archivo `index.html` de la raíz del repositorio también conduce a la versión actual del editor en `source/v234/index.html`.

## Revisión OCAD 2018

En **Archivo → Revisar símbolos y tintas OCAD…** se puede abrir un archivo de Bobadilla y comprobar en modo **solo lectura** símbolos, colores CMYK y orden provisional de impresión. La auditoría permite descargar un informe JSON, y **no sustituye los símbolos, colores ni las prioridades actuales**. Falta verificar el resultado visualmente contra OCAD 2018 antes de aprobar nuevos predeterminados.

El desarrollo sigue en la rama `ocarto-v249`, sincronizada con `main`. La versión del ZIP se construye a partir de los mismos archivos fuente del editor.

## Ocarto Windows — tiradores Bézier editables (v255)

La [rama ocarto-v255](https://github.com/marioromar/ocarto/tree/ocarto-v255) continúa la aplicación Flutter para Windows en **el mismo proyecto Ocarto**. Incorpora edición de curvas vectoriales mediante **tiradores Bézier entrantes y salientes**, que se pueden arrastrar sobre los vértices. El usuario puede alternar entre suavizado automático, tiradores manuales o **esquina**. Los controles Bézier se guardan en los proyectos `.ocarto` (esquema 6) sin romper la lectura de versiones anteriores.

Mantiene el catálogo lateral de símbolos con favoritos, la creación de líneas/áreas editables, GPS Bluetooth por COM, GPX, importación PNG/PGW, EPSG UTM y guardado protegido de proyectos. **El catálogo Flutter sigue siendo provisional** y todavía faltan herramientas completas CART/OCAD/OMAP y validación física del GPS.

- [Código Windows v255](ocarto_app/)
- [Manual breve, edición y limitaciones](ocarto_app/README-GPS-Windows.md)
- [GitHub Actions: pruebas y compilaciones](https://github.com/marioromar/ocarto/actions/workflows/flutter-windows-gps.yml)
- [ZIP del código fuente idéntico a la rama v255](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v255.zip)

La aplicación web v249 y las ramas Windows anteriores permanecen intactas. Solo se considera lista una compilación ejecutable Windows cuando **ambos jobs de GitHub Actions** —pruebas Flutter y build Windows— terminan correctamente; los archivos resultantes se publican en **Artifacts**.
