# Ocarto v70 — áreas mínimas de vegetación según ISOM

- El umbral inicial sigue la referencia del símbolo ISOM 406: 1 × 1 mm en el mapa. Se convierte a superficie de terreno según la escala configurada (100 m² a 1:10 000; 225 m² a 1:15 000).
- El selector ofrece referencias ISOM para 405, 406, 407/409, 408, 410, 401 y 402/413. La norma varía según el símbolo; no hay un mínimo único para todas las clases.
- El valor se puede editar: reducirlo conserva áreas pequeñas o estrechas, aumentarlo generaliza y filtra manchas, y 0 evita descartar por superficie.
- La referencia y el valor personalizado se guardan en el proyecto y se aplican a la vectorización de vegetación, claros y arbolado alto.

Verificación: `npm test` y validación sintáctica de JavaScript inline. Requiere coordenadas métricas. Las candidatas LiDAR siguen necesitando revisión cartográfica.
