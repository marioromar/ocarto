# Ocarto — versión recuperada v14

Fecha: 2026-10-14. Base: recuperación v13.

## Mejoras

- Al cargar un LAS/LAZ nuevo, la nube anterior se conserva hasta completar la operación. Una carga fallida o cancelada ya no borra la nube existente en el Worker.
- La interfaz no descarta el mapa de puntos ni los candidatos tras un error/cancelación; el nombre de la nueva nube se actualiza solo cuando termina la carga.
- Progreso y botones se restablecen tras errores o cancelación. No se permite iniciar otra carga desde el selector mientras trabaja el Worker.
- Corregido el contador de puntos muestreados en la vista (antes mostraba el triple por contar coordenadas).
- Pruebas automáticas añadidas para conservar la nube tras error y cancelación.

## Prueba con LAZ real

Archivo de biblioteca usado como dato de prueba (NO incluido en el ZIP ni subido a GitHub): `PNOA_2024_AND_279-4085_H30_NPC01.laz` (62.112.830 bytes).

Comando: `npm run test:real -- /ruta/archivo.laz`

Resultados observados en entorno de prueba: 7.585.022 puntos, formato 8, extensiones X 279000–279999.999, Y 4084000–4084999.999, 40.000 celdas, 6 teselas, 765 candidatos, lectura ~9,9 s y carga más análisis ~18 s, RSS máximo ~192 MiB. Son cifras dependientes del equipo y parámetros.

`npm test`: 9 grupos superados, incluidos 14 casos en el test del Worker.

**Pendiente:** probar importación, visualización, interrupción y navegación desde la interfaz gráfica completa y evaluar cargas de mayor tamaño. Los candidatos de máximo Z no representan aún detecciones cartográficas definitivas.
