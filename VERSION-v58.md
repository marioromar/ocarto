# Ocarto v58 — asignación de capas LiDAR con CRT

- La exportación vegetal admite una tabla de códigos OCAD por capa DXF mediante los campos `LIDAR_OPEN`, `LIDAR_LOW`, `LIDAR_SPARSE` y `LIDAR_DENSE`.
- Los códigos se dejan vacíos inicialmente; el cartógrafo introduce los números exactos que existan en su mapa. Se valida el formato antes de exportar.
- El ZIP de vegetación incluye `ocarto-vegetacion.crt` y conserva además el nombre `.ocdCrt` como copia compatible. OCAD relaciona símbolo y nombre de capa usando la CRT al importar el DXF.
- Las clases aprendidas conservan los códigos ISOM candidatos ya existentes; las provisionales no reciben equivalencias inventadas.
- Pruebas cubren CRT generado por capas, normalización decimal y rechazo de códigos inválidos.

Verificación: `npm test` completo; sintaxis del script de interfaz validada. El navegador automatizado se omite cuando Chromium no está instalado.
