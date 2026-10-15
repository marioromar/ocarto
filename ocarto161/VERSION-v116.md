# Ocarto v1.16 — Regla de altura para blanco y verdes

- El umbral inicial para proponer bosque blanco pasa a 4 m de altura de copa.
- Entre 2 y 4 m, la vegetación se propone como verde 1 o verde 2 según cobertura LiDAR.
- Un dosel alto con cobertura muy densa no se fuerza a blanco: permanece como candidato a verde 3/impenetrable.
- Se puede ajustar en la interfaz tanto la altura mínima de arbolado alto como la cobertura máxima para proponer blanco.

Verificación: `npm test` completo, con pruebas para bosque blanco por encima de 4 m y dosel denso como verde oscuro. La prueba de navegador se omitió porque el entorno no incluye Chromium.
