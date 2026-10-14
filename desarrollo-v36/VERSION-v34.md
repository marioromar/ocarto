# Ocarto v34 — Alternativa para copias locales

## Implementado
- Continúa desde v33 con copia automática protegida durante la carga de proyectos.
- Si IndexedDB no está disponible o falla, conserva la copia reciente en localStorage cuando cabe dentro del límite seguro (1,8 millones de caracteres).
- Al recuperar, compara fechas y devuelve la copia más reciente entre ambos almacenes.
- Si no cabe la copia alternativa, conserva la última copia válida y deja disponible el guardado manual `.ocarto`.
- Añade prueba de guardar/recuperar en alternativa, rechazo por tamaño y conservación ante error.

## Validación
- `npm test`
- Compilación de scripts inline y comprobación sintáctica del módulo de copias.
