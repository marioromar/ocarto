# Ocarto v1.56 — esquinas en trazados rectos

- El dibujo punto a punto crea segmentos rectos y marca sus vértices como esquinas.
- El dibujo a mano alzada conserva el suavizado de curvas naturales.
- Edificios y ruinas mantienen sus esquinas también con la herramienta Bézier; se añade el símbolo «Ruina (contorno angular)» sin atribuirle un código OCAD no verificado.

## Verificación

- Pruebas unitarias cubren edificios y ruinas.
- `npm test` y comprobación de sintaxis JavaScript inline.
