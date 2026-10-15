# Ocarto v66 — asignación de clases LiDAR a símbolos del mapa OCAD

- La exportación aprendida separa bosque blanco, verdes 1–3, terreno abierto/cultivo, matorral, frutales y vegetación baja rayada en capas identificables.
- Al cargar el `.ocd`, propone símbolos de área por descripción para las clases conocidas y permite editar los códigos; los códigos introducidos se validan contra ese mapa antes de crear la CRT.
- Las clases matorral, frutales y rayado no reciben códigos por defecto. El usuario elige los símbolos específicos disponibles en el `.ocd`.
- La tabla CRT puede incluir varias clases aprendidas en la misma exportación DXF. Sin mapa OCAD, las clases ISOM conocidas mantienen sus códigos candidatos previamente definidos.
- Corregido el cierre HTML de la entrada de asignación `LIDAR_DENSE`.

Verificación: `npm test` y validación sintáctica de los bloques JavaScript de `index.html`. La comprobación visual en navegador requiere Chromium.
