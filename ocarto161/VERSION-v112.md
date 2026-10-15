# Ocarto v1.12 — Frutales dentro de la detección conjunta

- La detección conjunta incorpora áreas candidatas de frutales cuando el proyecto contiene un modelo local aprendido con ejemplos etiquetados como **Frutales**.
- Emplea los indicadores LiDAR y, cuando esté disponible, la información de ortofoto ya aprendida; no exige ni mide una separación fija entre árboles.
- Los frutales se añaden al mismo inventario de revisión junto a vegetación, elementos humanos y relieve.

Verificación: `npm test` completo y validación sintáctica de la interfaz. La prueba de navegador se omitió porque el entorno no incluye Chromium.
