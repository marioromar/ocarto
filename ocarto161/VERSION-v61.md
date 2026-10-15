# Ocarto v61 — prolongar vaguadas hasta la curva superior de 1 m

- Se añade una operación geométrica para prolongar un eje de vaguada seleccionado siguiendo celdas observadas del MDT LiDAR hasta su primer cruce con la siguiente curva de nivel superior, a 1 m.
- Solo se amplía la línea seleccionada; la rejilla MDT y las plantillas permanecen intactas.
- La modificación queda en el historial del mapa y se puede deshacer.
- Requiere LiDAR preparado, una línea seleccionada y georreferenciación coincidente.
- Pruebas sintéticas cubren cruce más cercano, nivel objetivo, ambos extremos, seguimiento de una vaguada curva, límite de distancia y conservación de datos de entrada.

Verificación: `npm test`. Requiere revisión visual en un mapa real antes de usar cartográficamente.
