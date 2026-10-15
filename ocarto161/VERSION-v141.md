# Ocarto v1.41

## Protección completa de elementos bloqueados

- Las herramientas avanzadas respetan ahora el bloqueo de objetos.
- Paralelas, unión y prolongación de líneas no modifican elementos bloqueados.
- Cierre de huecos, suavizado, modificación de tramos, corte y agujeros quedan protegidos.
- Unión y ajuste de bordes entre áreas ignoran la edición de áreas bloqueadas.
- Recortes de líneas y áreas se rechazan si alguno de los objetos está bloqueado.
- Se mantiene el historial de edición y los mensajes de estado para cada operación.

## Verificación

- Pruebas automatizadas del proyecto superadas.
- La prueba de navegador queda condicionada a disponer del ejecutable Chromium.
