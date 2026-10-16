# Ocarto — editor cartográfico de orientación

**Editor web: v249 · Aplicación Windows Flutter: v256.** Ambas aplicaciones permanecen en este mismo repositorio Ocarto; Windows sigue en desarrollo y todavía no integra todas las herramientas del editor web.

## Descargar la aplicación

- **[Ocarto v249 — ZIP de la aplicación](versions/ocarto-v249-final.zip)**
- **[Código y versiones de Ocarto](source/v234/index.html)**
- **[Cambios y comprobaciones OCAD v249](source/v234/OCAD-v249.md)**

Para usar Ocarto desde un ordenador, descarga el ZIP, descomprímelo y abre el archivo **`index.html`** con el navegador. GitHub muestra el código fuente; no ejecuta por sí mismo el editor. El archivo `index.html` de la raíz del repositorio también conduce a la versión actual del editor en `source/v234/index.html`.

## Revisión OCAD 2018

En **Archivo → Revisar símbolos y tintas OCAD…** se puede abrir un archivo de Bobadilla y comprobar en modo **solo lectura** símbolos, colores CMYK y orden provisional de impresión. La auditoría permite descargar un informe JSON, y **no sustituye los símbolos, colores ni las prioridades actuales**. Falta verificar el resultado visualmente contra OCAD 2018 antes de aprobar nuevos predeterminados.

El desarrollo sigue en la rama `ocarto-v249`, sincronizada con `main`. La versión del ZIP se construye a partir de los mismos archivos fuente del editor.

## Ocarto Windows — Bézier libre, alineado y simétrico (v256)

La [rama ocarto-v256](https://github.com/marioromar/ocarto/tree/ocarto-v256) continúa el desarrollo Flutter en **el mismo proyecto Ocarto**. Ahora los dos tiradores de cada vértice admiten **tres modos**: simétricos, alineados con longitudes distintas o completamente libres, además de los vértices de esquina y el suavizado automático. El modo Bézier de cada vértice se conserva en el archivo `.ocarto` (esquema 7); los archivos anteriores siguen siendo legibles.

Se mantiene la creación de líneas/áreas con vértices editables, GPS Bluetooth COM, tracks, GPX, plantillas PNG+PGW, EPSG UTM, autoguardado protegido, tema oscuro y columna de símbolos con favoritos arriba. **Windows todavía no contiene el catálogo cartográfico oficial completo ni todas las herramientas del editor web.**

- [Código Windows v256](ocarto_app/)
- [Manual: tiradores y limitaciones](ocarto_app/README-GPS-Windows.md)
- [GitHub Actions: pruebas y compilaciones](https://github.com/marioromar/ocarto/actions/workflows/flutter-windows-gps.yml)
- [ZIP del mismo código de GitHub v256](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v256.zip)

Las ramas Windows anteriores y la versión web v249 están intactas. El ejecutable Windows se considera verificado cuando GitHub Actions termina **flutter-tests** y **build-windows** con éxito; entonces aparece en **Artifacts**. La conexión GPS requiere pruebas con receptor real.
