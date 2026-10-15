# Ocarto v1.51

## Guardado nativo OMAP

- Añadida la opción **Guardar OMAP** en la barra superior y en Archivo.
- Exporta un archivo OMAP XML v9 editable en OpenOrienteering Mapper.
- Conserva geometrías de puntos, líneas, áreas y multiparte, códigos y nombres de símbolo.
- Convierte las coordenadas georreferenciadas a unidades nativas OMAP según la escala del mapa.
- Incluye CRS, origen de coordenadas y escala en el archivo para facilitar la continuidad del trabajo.
- Se añadió una prueba automatizada de estructura, símbolos y cierre de áreas.

La exportación OCAD binaria nativa requiere conservar una biblioteca de símbolos OCAD completa; OMAP es el formato editable nativo implementado en esta versión y permite continuar el mapa sin perder la geometría.
