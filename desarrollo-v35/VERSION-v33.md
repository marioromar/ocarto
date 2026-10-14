# Ocarto v33 — Copia local protegida durante cargas

## Implementado
- Continúa desde v32 con copia automática local en IndexedDB y descarga de la última copia como `.ocarto`.
- Suspende la escritura automática mientras se valida y carga un proyecto, aunque tarde más que el intervalo de espera.
- Solo reemplaza la copia previa cuando el proyecto se abrió correctamente; los archivos inválidos no la alteran.
- Actualiza la copia con el proyecto recién abierto una vez completada la restauración.
- Evita iniciar una copia automática durante el arranque de la página, antes de que haya actividad del usuario.
- Añade comprobaciones para protección durante carga y actualización tras apertura correcta.

## Validación
- `npm test`
- Compilación de scripts inline y comprobación sintáctica del módulo IndexedDB.
