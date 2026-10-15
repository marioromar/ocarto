# v78 — Candidatos de copas en plantaciones regulares

- Añade una herramienta LiDAR que busca copas repetidas en dos direcciones dentro de un intervalo de separación configurable.
- Exporta GeoJSON con puntos de las celdas de copa que coinciden con ambos patrones e informa de separaciones y orientaciones estimadas.
- Guarda los límites de separación en los ajustes del proyecto.
- Los resultados son candidatos: pueden corresponder a frutales, plantaciones u otro arbolado regular. No delimitan el cultivo ni identifican la especie. La resolución de celda debe ser suficiente para el espaciamiento que se quiere reconocer.
- Limita el número de comparaciones para evitar cargas excesivas con rejillas muy finas.

Verificación: `npm test` y comprobación sintáctica del script principal.
