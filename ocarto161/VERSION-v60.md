# Ocarto v60 — validación CRT desde el mapa OCAD

- Se puede cargar un mapa `.ocd` para leer su índice de símbolos sin importar ni modificar su cartografía.
- Ocarto muestra símbolos de área disponibles y valida que cada código CRT introducido exista como área en el mapa elegido.
- Se proponen coincidencias por descripción: terreno abierto, carrera lenta, difícil y muy difícil; se pueden corregir manualmente desde la lista de símbolos disponibles.
- La exportación CRT se bloquea para los códigos no encontrados o que correspondan a símbolos que no sean de área.
- El lector se limita a OCAD 12 y OCAD 2018, formatos comprobados con mapas de la biblioteca.
- La lectura conjunta de ortofoto y LiDAR ayuda a interpretar claros, altura y densidad de vegetación; la propuesta sigue pendiente de revisión cartográfica de campo.

Verificación: `npm test`, incluyendo lector OCAD sintético y casos truncados/corruptos. Prueba de navegador no disponible cuando Chromium no está instalado.
