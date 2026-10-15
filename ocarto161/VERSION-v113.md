# Ocarto v1.13 — Hileras de frutales como pista de revisión

- Cada área candidata de frutales informa si las celdas clasificadas muestran una alineación marcada, posible, insuficiente o sin patrón claro.
- Cuando existe, también se guarda una orientación aproximada de las hileras.
- La alineación no interviene en la decisión de detectar frutales y no usa una separación obligatoria entre árboles. Es una pista adicional para revisar sobre ortofoto y mapa.

Verificación: `npm test` completo, incluida la prueba de patrón lineal de frutales. La prueba de navegador se omitió porque el entorno no incluye Chromium.
