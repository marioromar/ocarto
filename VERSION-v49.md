# Ocarto v49 — lectura espacial de COPC

## Cambios
- Añade lectura directa de COPC en el mosaico LiDAR por área. Detecta el VLR copc sin depender de que el archivo se llame .copc.laz.
- Usa la jerarquía octree para leer por rangos y descomprimir solo los bloques que cruzan la zona seleccionada; mantiene el recorte exacto del polígono y sus huecos.
- Conserva la vía existente para archivos LAS/LAZ estándar. Un único COPC también puede procesarse como modelo de área cuando hay un polígono seleccionado.
- Añade la biblioteca local copc 0.0.9 bajo MIT, el aviso de licencia y una prueba con un COPC real.

## Verificación
- npm test: incluye la prueba COPC sintética de páginas candidatas, filtrado del polígono y omisión exterior.
- Prueba real con COPC público de 100.000 puntos mediante npm run test:copc-real -- ruta/al/archivo.copc.laz: en el área ensayada se leyeron 78.619 puntos de dos bloques y se acumularon 112 puntos interiores.
- El archivo PNOA LAZ estándar continúa por la ruta anterior. No se convierte automáticamente a COPC; el usuario puede importar COPC ya preparado.
