# v80 — Candidatos vectoriales de elementos del terreno

- Mantiene la extracción de edificios (clase LAS 6), tendidos eléctricos (clase 14) y celdas de apoyos (clase 15) como GeoJSON.
- Añade ejes candidatos de muros o escarpes a partir de cambios bruscos y continuos de cota en el MDT observado. Permite ajustar desnivel y longitud mínimos; ignora celdas interpoladas.
- Actualiza la herramienta de ortofoto para proponer ejes de caminos y senderos como líneas GeoJSON.
- Reutiliza el trazado de vaguadas para exportar líneas candidatas de arroyos, canales o surcos. LiDAR no distingue automáticamente su tipo ni confirma agua presente.
- Todos los resultados quedan marcados para revisión; los escarpes también pueden ser taludes, rocas, riberas o terrazas.

Verificación: `npm test` y comprobación sintáctica del script principal.
