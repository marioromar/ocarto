# Ocarto v30 — Persistencia de ajustes LiDAR

## Implementado
- Continúa desde v29: los modelos locales siguen guardándose dentro del proyecto `.ocarto`.
- Guarda y restaura los ajustes de detección LiDAR, clases, rejilla, curvas, vaguadas y análisis de vegetación.
- Los proyectos anteriores sin estos ajustes se abren con valores predeterminados conocidos.
- Valida y acota los valores al abrir el proyecto; solo acepta las clases LiDAR admitidas.
- Añade prueba automatizada de persistencia, restauración y compatibilidad hacia atrás.

## Validación
- `npm test`
- Compilación de scripts inline de `index.html`.
