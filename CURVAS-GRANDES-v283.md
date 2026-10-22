# Ocarto v283 — curvas Bézier para contornos naturales grandes

**Base:** rama avanzada `ocarto-v282-natural-bezier`. No se ha usado `main` ni se han sustituido los menús, símbolos, GPS o la edición Bézier existente.

## Nueva mejora

La versión v282 evitaba suavizar contornos que superaban **2.300 puntos muestreados** durante la validación de cruces. La v283 incorpora un índice espacial por celdas que compara únicamente tramos cercanos. Esto permite generar curvas **Bézier cúbicas editables** en áreas de vegetación, claros y agua, incluso cuando tienen miles de vértices.

La nueva validación:

- Comprueba cada perímetro exterior y cada agujero interior, tanto contra sí mismo como entre sí.
- Mantiene el sentido de los anillos y la pertenencia de los huecos.
- Limita el desplazamiento respecto a la polilínea observada en el LiDAR.
- Conserva los vértices originales y sus etiquetas de esquina; los tiradores Bézier son editables.
- Mantiene edificios, ruinas, muros y elementos rectilíneos sin curva automática.
- Utiliza **límites explícitos de memoria y operaciones**. Si una geometría supera los límites, no se fuerza el suavizado; conserva la polilínea original con una advertencia.

Los parámetros **Bajo, Medio y Alto** siguen disponibles en `LiDAR e IA`, sin alterar la manera de importar las detecciones.

Al pulsar **Detectar todos los elementos disponibles → inventario**, Ocarto indica cuántos objetos se convirtieron en curvas Bézier y cuántos contornos permanecieron como polilíneas por motivos de seguridad.

## Pruebas

```bash
node --test source/v234/tests/lidar-auto-natural-bezier.test.cjs
```

Se verifican con datos de prueba:

- Curvas naturales de 3.000 y 8.000 vértices.
- Polígonos con islas y huecos interiores, sin alteración del original.
- Conservación de edificios, muros y vértices de esquina.
- Detección de polígonos que se cruzan y agujeros exteriores.
- Conservación de la polilínea para geometrías demasiado extensas (prueba de 18.000 vértices).
- Conservación de los flujos de **candidatos**, plantillas y mapa editable.

La comprobación espacial usa presupuestos de **100.000 puntos muestreados**, **400.000 inserciones de tramos** y **600.000 comparaciones** como barreras de seguridad, no como garantías de rendimiento para todas las geometrías.

## Descarga y uso

[Descargar la rama completa Ocarto v283](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v283-scalable-natural-curves.zip).

Descomprime el ZIP en Windows, ejecuta **ABRIR-OCARTO.bat** y abre la aplicación a través del servidor local. No abras `index.html` directamente con `file://`.

Carga LAS/LAZ, calcula las rejillas y usa **Detectar todos los elementos disponibles** con el suavizado deseado. Verifica las propuestas antes de convertirlas en cartografía definitiva.

**Pendiente:** ejecución confirmada de Chromium y pruebas visuales sobre el LAZ PNOA real de millones de puntos y mosaicos grandes. Estas pruebas sintéticas no prueban todavía la calidad topográfica del resultado.
