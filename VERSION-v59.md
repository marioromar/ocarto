# Ocarto v59 — CRT inicial según los mapas OCAD de Mario

Se inspeccionaron los índices de símbolos de estos archivos OCAD guardados:

- `La Muela 2026 final.ocd`
- `base muela.ocd`
- `base algodoales.ocd`
- `Puente la Nava 2026.ocd`

Los cuatro incluyen estos símbolos de área, con número y descripción coincidentes:

| Capa DXF LiDAR | Símbolo OCAD propuesto | Descripción del mapa |
| --- | ---: | --- |
| `LIDAR_OPEN` | 401.000 | Terreno abierto |
| `LIDAR_LOW` | 406.000 | Vegetación, carrera lenta |
| `LIDAR_SPARSE` | 408.000 | Vegetación: carrera difícil |
| `LIDAR_DENSE` | 410.000 | Vegetación: carrera muy difícil |

- Los cuatro campos CRT aparecen prellenados con estos códigos; se pueden editar o vaciar antes de exportar.
- El ZIP genera `ocarto-vegetacion.crt` con los mapeos que estén rellenados. El archivo asigna las capas al importar el DXF en OCAD.
- La asociación es una propuesta de partida por correspondencia entre clases LiDAR y símbolos de área. Requiere revisión cartográfica; los códigos existen en esos mapas, pero los datos LiDAR no prueban por sí solos la transitabilidad real.

Verificación: `npm test` y sintaxis del script de interfaz. Prueba de navegador omitida por falta de Chromium.
