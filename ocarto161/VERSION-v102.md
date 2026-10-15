# Ocarto v1.02 — Aprendizaje conjunto de LiDAR, ortofoto y símbolos IOF

- El modelo aprende etiquetas de vegetación a partir de áreas dibujadas y símbolos vectoriales de orientación.
- Con una plantilla local georreferenciada y alineada, Ocarto toma color y textura de la ortofoto en las mismas celdas LiDAR y entrena un segundo clasificador visual.
- Combina las predicciones LiDAR y de ortofoto; si discrepan, la superficie queda marcada como dudosa para revisión. Los ejemplos y modelos se guardan en el proyecto.
- Las salidas asignan códigos candidatos según la modalidad seleccionada: ISOM 2017-2, ISSprOM 2019-2 o ISMTBOM 2022. En MTBO se dejan sin código las clases que la norma no define con correspondencia directa.
- Se corrigen las referencias de áreas mínimas IOF para áreas abiertas dispersas y las clases de vegetación 407–410 según escala y modalidad. Los umbrales siguen siendo editables.

El aprendizaje de ortofoto requiere una imagen local georreferenciada en el CRS del mapa. Los resultados son propuestas cartográficas; la clasificación de transitabilidad y la incorporación al mapa requieren revisión.

Verificación: `npm test` completo; incluye aprendizaje y persistencia del modelo visual, simbología por modalidad, exportaciones y compatibilidad de proyectos. Prueba automatizada de navegador omitida por falta de Chromium.
