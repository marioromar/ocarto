# v94 — CRS predeterminado WGS 84 / UTM 30N

El CRS inicial del mapa es EPSG:32630 (WGS 84 / UTM zona 30N). El campo sigue siendo editable y ofrece las zonas UTM WGS 84 norte/sur como sugerencias sin impedir escribir otros EPSG. Los proyectos antiguos sin CRS declarado abren con el valor predeterminado. La interfaz avisa que cambiar la etiqueta CRS no reproyecta las coordenadas existentes; el mapa, los datos LiDAR y las plantillas deben compartir sistema de coordenadas.

Verificación: suite automatizada, prueba de importación de plantillas y sintaxis de scripts.
