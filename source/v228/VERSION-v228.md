# Ocarto v228

Se añade **Ajustar calles zona** para ampliar el ancho de calles y estrechar edificios únicamente dentro de un área urbana seleccionada:

- Selecciona un área editable georreferenciada como límite urbano y activa la herramienta.
- Elige el aumento total de anchura de calles en milímetros de impresión (valor inicial: 1 mm) y cuánto retraer cada borde de edificio (inicial: 0,15 mm).
- Las calles lineales que atraviesan el borde se separan en tramos; solo se ensancha el tramo interior. Se admiten líneas de calle y caminos, además de áreas pavimentadas contenidas en la zona.
- Los edificios se estrechan solo cuando quedan dentro de la zona; las formas que colapsan o producen contornos inválidos se omiten.
- Cada ajuste es una acción única de Deshacer/Rehacer. Las anchuras de línea se conservan en el proyecto y en la exportación GeoJSON/OMAP.

Verificación: offset geométrico hacia fuera/dentro, polígonos inválidos y suite completa de pruebas.
