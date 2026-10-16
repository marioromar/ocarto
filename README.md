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

## Ocarto Windows — GPS y plantilla PNG/PGW (v252)

La rama [ocarto-v252](https://github.com/marioromar/ocarto/tree/ocarto-v252) continúa **el mismo proyecto Ocarto**. Mantiene GPS Bluetooth SPP por COM, tracks editables, GPX y el guardado protegido de v251. Incorpora además una **plantilla ráster PNG+PGW** con EPSG UTM indicado expresamente (25829/30/31 o 32629/30/31), opacidad y proyección coherente de los tracks sobre el mapa.

- [Código de Ocarto Windows](ocarto_app/)
- [Instrucciones GPS y PNG/PGW](ocarto_app/README-GPS-Windows.md)
- [Compilaciones y pruebas Windows](https://github.com/marioromar/ocarto/actions/workflows/flutter-windows-gps.yml)
- [ZIP del código de la rama v252](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v252.zip)

La versión web del editor **v249** y su catálogo de símbolos siguen sin alterarse. La aplicación Windows Flutter todavía **no es el editor cartográfico completo**; el GPS con plantilla necesita ensayos físicos de precisión. El ZIP de esta rama es el código fuente, mientras que un paquete ejecutable Windows solo está disponible en Artifacts si GitHub Actions ha terminado correctamente.
