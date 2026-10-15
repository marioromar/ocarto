# Ocarto v1.10 — Detección conjunta de información LiDAR

- Añadido el botón **Detectar todos los elementos disponibles → inventario**.
- Con la rejilla de terreno y/o vegetación preparada, reúne en una sola ejecución:
  - claros y arbolado alto;
  - edificios, tendidos eléctricos y apoyos cuando existan las clases LAS 6, 14 y 15;
  - muros o escarpes;
  - rocas o resaltes locales;
  - arroyos, canales y surcos candidatos.
- Usa los umbrales que el cartógrafo ya ha configurado para cada detector y añade únicamente los candidatos que los superan.
- Los resultados se incorporan al inventario existente para revisar, exportar como GeoJSON, usar como plantilla o abrir como mapa editable.

Verificación: `npm test` completo y validación de sintaxis de la interfaz. La prueba de navegador se omitió porque el entorno no incluye Chromium.
