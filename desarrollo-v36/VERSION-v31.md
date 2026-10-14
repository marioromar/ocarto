# Ocarto v31 — Validación centralizada de ajustes de proyecto

## Implementado
- Continúa desde v30, guardando los parámetros LiDAR y el modelo de vegetación dentro de `.ocarto`.
- Centraliza la normalización de ajustes del proyecto en un módulo reutilizable.
- Recupera valores predeterminados para proyectos antiguos o campos incompletos.
- Descarta valores fuera de rango, clases no admitidas, enteros incorrectos y una altura máxima menor que la mínima.
- Añade pruebas unitarias con datos válidos, antiguos y manipulados.

## Validación
- `npm test`
- Compilación de scripts inline de `index.html`.
