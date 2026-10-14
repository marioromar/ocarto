# Ocarto v17 — MDT preliminar conservador

- Nueva exportación de rejilla de terreno con centros de celda, fuente y cantidad de puntos.
- Rellena exclusivamente huecos de **una celda** cuando sus cuatro vecinos cardinales contienen medidas de suelo observadas. No se utilizan valores interpolados como vecinos, ni se extrapolan bordes.
- Mantiene celdas sin observación en blanco cuando no hay respaldo suficiente.
- No equivale a un MDT validado: la altura procede del mínimo de puntos clasificados como suelo, pendiente de comprobar clasificación, CRS y unidades.
- Exportación CSV compatible con herramientas externas.
- No incorpora aún extracción de curvas de nivel ni un algoritmo robusto de interpolación espacial para huecos extensos.
- Pruebas nuevas para interpolación, restricciones y límites.

Prueba PNOA real: 39.961 celdas observadas, 15 huecos cerrados interpolados, 822 posibles huecos/bordes sin rellenar.
