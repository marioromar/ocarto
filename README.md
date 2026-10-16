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

## Ocarto Windows — GPS, plantilla georreferenciada y símbolos (v253)

La [rama ocarto-v253](https://github.com/marioromar/ocarto/tree/ocarto-v253) continúa la aplicación Flutter **dentro del mismo proyecto**, incorporando una columna derecha de símbolos de colores, favoritos fijados arriba y selección de herramientas de punto/línea/área. La estrella, clic derecho y pulsación larga permiten marcar favoritos; las preferencias de símbolo se conservan en el archivo `.ocarto`.

Mantiene los avances de v252 (GPS Bluetooth COM, grabación GPX, PNG+PGW con EPSG UTM y autoguardado protegido). **El catálogo Flutter aún es provisional y no reemplaza el catálogo completo OCAD/ISOM ni el editor cartográfico web.**

- [Código Windows v253](ocarto_app/)
- [Instrucciones, georreferenciación y símbolos](ocarto_app/README-GPS-Windows.md)
- [Compilaciones y pruebas Windows](https://github.com/marioromar/ocarto/actions/workflows/flutter-windows-gps.yml)
- [ZIP del código fuente de la rama v253](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v253.zip)

La versión web **v249** y su ZIP original siguen separados e intactos. Un ejecutable Windows solo debe darse por listo cuando las pruebas y el job build-windows pasen; en ese caso aparecerá en el apartado **Artifacts** de GitHub Actions. Falta comprobación con receptor GNSS físico.
