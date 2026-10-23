# Ocarto v285 — Vectorización selectiva de vegetación revisable

Base: `ocarto-v284-bezier-geojson-fix`, sin revertir ni reemplazar herramientas previas.

## Uso con el paquete Bobadilla v4

1. Abre Ocarto v285 y **un mapa georreferenciado** de Bobadilla.
2. Identifica el EPSG de la cartografía de origen (y del TIFF). **No basta con conocer las coordenadas X/Y**: el TIFF de ejemplo indica LOCAL_CS, sin código EPSG confirmado.
3. En el mapa, selecciona el EPSG correcto. Si no puedes confirmarlo, **no marques la casilla de coincidencia** ni incorpores polígonos como cartografía georreferenciada definitiva.
4. Abre **LiDAR e IA → Vegetación revisable · importar solo clases seleccionadas**.
5. Puedes seleccionar directamente **`Ocarto_Bobadilla_v4_capas_seleccionables.zip`**: Ocarto extraerá solamente `verde_oscuro.geojson`, `rayado.geojson` y `amarillo.geojson`, **sin abrir ni alterar el TIFF ni los PNG**. También puedes seleccionar los GeoJSON individuales.
6. Marca las clases que deseas traer. Las no seleccionadas se omiten incluso si están presentes en los archivos.
7. Confirma el CRS solo cuando esté comprobado que imagen, GeoJSON y mapa pertenecen al mismo sistema. Pulsa **Incorporar solo las clases seleccionadas**.
8. Opcionalmente marca **Importar como plantillas vectoriales protegidas** para colocar las tres clases como capas de solo lectura, visibles y con transparencia, sin alterar la capa editable activa.
9. Si no marcas esa opción, se crean **capas vectoriales independientes y editables**. Ambas modalidades conservan geometrías y huecos originales, con símbolos pendientes de revisión. Usa **Deshacer** si detectas un problema y guarda el proyecto CART después de revisarlo.

## Garantías

- No se modifica el TIFF original, los GeoJSON fuente, otros objetos ni las capas anteriores.
- La incorporación de las capas seleccionadas se valida antes de modificar el proyecto y genera **una sola operación Deshacer**.
- Los polígonos conservan el identificador de revisión y la etiqueta original; se rechaza su segunda incorporación si ese identificador ya existe en el mapa.
- No se confunde altura de vegetación con transitabilidad: «impasable», «rayado» y «terreno abierto» son **etiquetas provisionalmente interpretadas para Bobadilla**, no una clasificación LiDAR general ni símbolos IOF definitivos.
- Se admiten Polygon y MultiPolygon con anillos interiores.
- El EPSG del TIFF original permanece pendiente, y el Feature Map LiDAR real aún no se ha usado para recalcular los vectores.

## Limitaciones

- Esta versión importa **los polígonos GeoJSON ya vectorizados**, no lee directamente GeoTIFF para generar nuevas capas por rango de altura. La función antigua PNG + PGW continúa disponible.
- La asignación de símbolo y la precisión cartográfica requieren revisión manual; un color RGB por sí solo no determina la penetrabilidad.
- Se limita a 5.000 polígonos por importación, 10 MB por GeoJSON y 60 MB por ZIP (solo se descomprimen los GeoJSON de las tres clases).
- Si el EPSG original y el del mapa no están confirmados, puede mantenerse la revisión independiente en el visor externo, pero no debe declararse una superposición GIS exacta.
- La aplicación Windows Flutter no se modifica con este trabajo; el panel v285 se integra en el editor avanzado web/Electron.

## Pruebas

- `node --test source/v234/tests/lidar-vegetation-reviewed-layers.test.cjs`
- `node --test source/v234/tests/lidar-height-image-vector.test.cjs`
- Prueba Chromium: `tests/chromium/lidar-browser.spec.cjs`
- Integridad de LiDAR y arranque Windows: `.github/workflows/lidar-worker.yml`

Las pruebas automáticas usan geometrías sintéticas; todavía no constituyen validación de campo de los 111 polígonos de Bobadilla.

## Descargar

[ZIP completo de Ocarto v285](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v285-vegetacion-capas-seleccionadas.zip).
