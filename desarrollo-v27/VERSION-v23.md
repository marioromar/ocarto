# Ocarto v23 — vaguadas curvas, análisis LiDAR de vegetación y plantillas WMS

## Vaguadas

- El detector `valley-tracing.js` identifica ejes candidatos en ocho direcciones, incluidos giros y tramos diagonales.
- Filtro configurable de longitud mínima: **20 m**, y umbral de incisión local respecto a flancos (predeterminado 0,6 m).
- Exportación GeoJSON de **propuestas para revisión**, no modificación automática de elevaciones ni de curvas.
- La profundización correcta de vaguadas debe seguir el cauce y los giros del terreno; la deformación controlada de curvas queda pendiente de validación con ejemplos de mapas base y final.
- Sobre `PNOA_2024_AND_279-4085_H30_NPC01.laz`, con rejilla MDT de 5 m: **69 ejes candidatos de longitud ≥20 m**. No se han validado sobre el terreno.

## Vegetación LiDAR

- `vegetation-lidar.js` recopila indicadores por celda usando clases 2, 3, 4 y 5 del LAS/LAZ.
- Usa altura **relativa** a cota mínima de suelo local, retornos y media de intensidad, con etiqueta de calidad en celdas sin puntos de suelo o con muestras escasas.
- No infiere colores ISOM (blanco, verde 1/2/3, amarillo) ni la velocidad de progresión hasta recibir ejemplos cartográficos georreferenciados, contraste y verificación.
- Archivo real: 7.585.022 puntos LiDAR; 39.987 celdas analizadas; 37.801 con puntos de suelo y vegetación. Estos recuentos **no** son polígonos definitivos.

## Plantillas WMS (beta)

- Se pueden añadir ortofotos PNOA y Catastro INSPIRE a través de WMS y configurar un servicio HTTPS personalizado con el nombre de capa.
- Añadir WMS usando un BBOX manual o la extensión de una plantilla georreferenciada o del LAZ ya cargado.
- Capas independientes con visibilidad, orden actual de plantillas y transparencia; opción de solicitar una nueva imagen para la vista actual.
- El proyecto guarda configuración WMS, no incrusta las imágenes de Internet; vuelve a solicitarlas al abrirlo y mantiene el resto del mapa si el servicio no está disponible.
- Control estricto de CRS y orden de ejes EPSG:4326 para WMS 1.3.0; límite de imagen de 2048 px por dimensión y una solicitud GetMap por acción.
- Servicio remoto sujeto a disponibilidad, política CORS y licencias; los WMS no son imágenes originales para entrenar por sí solas ni objetos vectoriales.
- Se requieren pruebas visuales de interoperabilidad WMS en la app instalada; solo está verificada la construcción de peticiones y la integración del código.

## Pendiente

- Detectar y dibujar automáticamente caminos, senderos, carreteras, edificios, canales, muros, tendidos eléctricos y otros objetos, combinando ortofoto, LiDAR y capas vectoriales existentes.
- Aprendizaje de simbología y vegetación a partir de pares OCAD base/final georreferenciados.
- Profundización adaptativa de vaguadas con seguimiento del fondo y corrección cartográfica revisable.
- Capas raster persistentes de curva de 1 m superpuestas dentro de la interfaz (la v21 solo exporta las dos curvas).

## Pruebas

- `npm test`: 18 suites con el nuevo módulo WMS.
- `node tests/lidar-v23-real.cjs /ruta/al/archivo.laz`: validación real de MDT, ejes y vegetación; archivo LAZ de prueba no incluido en GitHub.
