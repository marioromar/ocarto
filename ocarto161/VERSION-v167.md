# Ocarto v1.67 — aprendizaje LiDAR con mapas OCAD grandes

- El aprendizaje de vegetación admite mapas con miles de áreas guía en vez de detenerse al superar 200 polígonos.
- Una cuadrícula espacial localiza las celdas LiDAR candidatas dentro de cada área; conserva la exclusión de huecos y el control de solapes entre etiquetas.
- La ortofoto queda indicada como opcional: el modelo de clases puede entrenarse con las métricas LiDAR y las áreas de un mapa OCAD. La interfaz señala qué etiquetas no reunieron celdas LiDAR válidas suficientes.
- Se incorpora una prueba reproducible que decodifica LAZ reales, resume las clases LiDAR y, si se pasa un OCAD, aprende y vectoriza áreas candidatas.
- Se retiraron comandos de prueba real que apuntaban a scripts ausentes.

## Verificación

- `npm test`: 60 pruebas superadas.
- `npm run test:vegetation-real -- <archivo.laz> <mapa.ocd>`: probado con una tesela de 11,3 millones de puntos y un OCAD con más de 4.000 áreas; produjo clases y áreas candidatas con revisión obligatoria.
