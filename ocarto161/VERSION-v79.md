# v79 — Detección de frutales sin separación fija

- Sustituye la búsqueda de espaciamientos regulares por una herramienta que usa la clase «Frutales» del modelo aprendido con ejemplos etiquetados.
- Vectoriza las celdas contiguas predichas como frutales y exporta sus áreas en GeoJSON.
- Respeta los mínimos configurables de superficie y ancho y las decisiones manuales de la vista previa.
- Si no hay un modelo aprendido, indica que primero se deben etiquetar ejemplos de frutales y generar las propuestas.
- Los resultados siguen siendo candidatos: revisar con ortofoto y cartografía; LiDAR no confirma la especie.

Verificación: `npm test` y comprobación sintáctica del script principal.
