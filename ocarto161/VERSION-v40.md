# Ocarto v40 — carga LAS/LAZ por bloques al Worker

## Implementado
- El navegador lee LAS/LAZ en bloques, con avance y cancelación, y espera confirmación del Worker antes de enviar el bloque siguiente.
- Para LAZ, los bloques se copian directamente a una única asignación de memoria WASM; se elimina el ArrayBuffer JavaScript completo intermedio y la segunda copia del archivo comprimido.
- LAS sin compresión se monta por bloques dentro del Worker antes del análisis.
- La carga fallida o cancelada libera la asignación parcial y conserva la nube anterior.
- La copia LAZ en WASM se mantiene para análisis repetidos, como en v39.

## Límites
- La descompresión requiere la copia comprimida completa en WASM, además de memoria temporal del decodificador y estructuras del análisis. No se establece un máximo fijo de puntos; el tamaño práctico depende del navegador, la memoria disponible y los datos.
- La vista previa conserva hasta 60.000 puntos. El análisis LAS/LAZ procesa todos los puntos por lotes.

## Validación
- `npm test`.
- Pruebas del Worker: ensamblado LAS por bloques, LAZ dirigido a memoria WASM, reutilización y liberación de la asignación.
- Archivo real `PNOA_2024_AND_279-4085_H30_NPC01.laz`: 7.585.022 puntos; terreno, vegetación, estructuras y vaguadas completados. Esta ejecución: 28,4 s y 406 MiB de RSS máximo en la prueba Node.
- La prueba de navegador queda pendiente en este entorno porque no tiene Chromium instalado.
