# Ocarto v1.15 — Verde 1 y verde 2 para vegetación baja

- Las áreas LiDAR de vegetación baja calculan y conservan altura media de copa y fracción media de retornos vegetales.
- En el inventario, la vegetación baja propone verde 1 (406) cuando es menos densa y verde 2 (408) cuando su cobertura media es mayor.
- El rayado se propone solo cuando hay ejemplos aprendidos que indiquen vegetación baja rayada; no se confunde con una zona baja de verde 1 o 2.

Verificación: `npm test` completo. La prueba de navegador se omitió porque el entorno no incluye Chromium.
