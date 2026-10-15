# Ocarto v51 — jerarquía COPC y conteos seguros

## Cambios

- Deduplica las páginas de jerarquía al encolarlas, para no guardar referencias repetidas antes de procesarlas.
- Aplica el límite de 100.000 páginas también a la cola pendiente.
- Rechaza sumas de puntos de bloques que excedan el rango entero seguro de JavaScript, además del conteo declarado en la cabecera.
- Comprueba que el final del rango de datos de cada bloque sea un entero seguro antes de leerlo.
- Conserva el recorrido en dos pasadas de v50 y el progreso calculado sobre los puntos candidatos.

## Verificación

- `npm test` cubre páginas compartidas, avance exacto, omisión exterior y rechazo de conteos fuera del rango seguro.
- La prueba COPC real sigue disponible con `npm run test:copc-real -- ruta/al/archivo.copc.laz`.
- La integración de navegador puede omitirse si Chromium no está instalado.
