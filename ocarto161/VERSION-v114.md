# Ocarto v1.14 — Paleta de interpretación LiDAR para rayado e impenetrable

- La imagen PNG de vegetación por clases usa una paleta de interpretación LiDAR más clara:
  - anaranjado: vegetación baja rayada aprendida;
  - rojo: vegetación muy densa o impenetrable aprendida (verde 3).
- Esta paleta ayuda a separar evidencias de densidad y altura antes de la revisión.
- Los colores de la imagen no sustituyen la simbología de orientación: al vectorizar, las propuestas mantienen sus clases y símbolos candidatos.

Verificación: `npm test` completo, incluida la comprobación de los píxeles de la paleta de interpretación. La prueba de navegador se omitió porque el entorno no incluye Chromium.
