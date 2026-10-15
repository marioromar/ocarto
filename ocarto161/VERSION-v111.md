# Ocarto v1.11 — Arbustos y matorral desde LiDAR

- La detección conjunta incluye ahora áreas de vegetación baja, arbustos/matorral candidatos y otras coberturas vegetales detectables por altura y proporción de retornos LiDAR.
- Se diferencian de claros y arbolado alto para que aparezcan como propuestas separadas en el inventario.
- Las áreas de matorral/arbusto se describen como evidencia estructural. Requieren contraste con ortofoto, mapa guía o campo antes de elegir símbolo y evaluar transitabilidad.

Verificación: `npm test` completo y validación sintáctica de la interfaz. La prueba de navegador se omitió porque el entorno no incluye Chromium.
