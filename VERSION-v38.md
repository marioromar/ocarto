# Ocarto v38 — Importación LAS/LAZ cancelable por bloques

## Implementado
- LAS/LAZ se lee desde el navegador en bloques con progreso antes de transferir el archivo al Worker LiDAR.
- Cancelar durante la lectura detiene el flujo de bytes; no se inicia un análisis parcial ni se reemplaza la nube cargada anteriormente.
- Se muestra el avance de lectura y se puede cancelar antes de iniciar el Worker.
- No se ha añadido un límite de puntos a LAS/LAZ. La lectura y los análisis del Worker siguen procesando la nube por lotes.
- El decodificador LAZ todavía necesita el archivo comprimido completo en memoria y una copia en memoria WASM durante el análisis; esta mejora no garantiza la apertura de archivos de 1 GB en cualquier equipo.
- CSV/XYZ conserva el límite existente de 250.000 puntos.

## Validación
- Prueba específica de contenido, avance, tamaño no válido y cancelación de lectura.
- `npm test`.
- La prueba real con LAZ depende de disponer del archivo de muestra local; no hay una nube de 1 GB en este paquete.
