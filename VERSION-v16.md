# Ocarto v16 — primera rejilla de suelo LiDAR

- Nuevo análisis `terrain` del Worker para LAS/LAZ: solo clase 2 (suelo).
- Por cada celda cuadrada XY conserva la cota **mínima observada**, coordenadas del punto y cantidad de puntos; umbral mínimo configurable.
- Exportación CSV x,y,z_min,n_puntos, sin suponer un CRS que no conste en el archivo.
- Tope de 100.000 celdas para proteger memoria, progreso y cancelación.
- Pruebas automáticas para LAS y ejecución con LAZ real PNOA 2024 Andalucía, formato 8, 7.585.022 puntos; 4.080.114 puntos clasificados como suelo, 39.961 celdas a 5 unidades XY.

**Limitación importante:** es una rejilla de mínimos muestreados, NO un MDT interpolado ni curvas de nivel. Las celdas sin suelo no se rellenan, y hay que validar las clases y las unidades del archivo antes de utilizar resultados cartográficos.
