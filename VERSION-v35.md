# Ocarto v35 — Fecha y proyecto de la copia local

## Implementado
- Continúa desde v34 con IndexedDB y alternativa localStorage limitada.
- Muestra en la interfaz la fecha y hora de la copia local más reciente.
- Identifica el proyecto en la descripción accesible del estado.
- Conserva la descarga de la copia como un archivo `.ocarto` estándar.
- Expone metadatos mínimos del guardado para actualizar el estado sin volver a leer/cargar el proyecto completo.
- Mantiene la copia anterior protegida durante cargas, errores y límites de almacenamiento.

## Validación
- `npm test`
- Compilación de scripts inline y comprobación sintáctica del módulo de copias.
