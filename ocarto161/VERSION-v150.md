# Ocarto v1.50 — salidas LiDAR listas para OCAD

## Cambios

- Se añade `scripts/export-lidar-real.cjs` para procesar teselas LAZ reales y generar las salidas actuales del motor.
- Se crea una carpeta `para-ocad` con PNG georreferenciados (PGW/PRJ) de MDT, altura de vegetación, densidad y evidencia de clases.
- Se generan DXF de curvado general, curvado suavizado, curvado detallado, vegetación, vaguadas, muros/escarpes, rocas y elementos humanos.
- La vegetación incluye una tabla CRT candidata para asignar símbolos en OCAD; todas las capas siguen marcadas como propuestas revisables.
- GeoJSON y CSV quedan como salidas técnicas complementarias, no como entrega principal.

Las imágenes y DXF de esta versión se probaron con las dos teselas PNOA reales aportadas por el usuario.
