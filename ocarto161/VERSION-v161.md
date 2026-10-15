# Ocarto v1.61 — curvas naturales al cerrar trazos

- Al terminar un dibujo a mano alzada, Ocarto convierte el trazo simplificado en curvas Bézier editables para líneas y áreas naturales.
- Edificios, construcciones y ruinas mantienen contornos rectos; sus vértices quedan marcados como esquinas.
- Los modos de dibujo punto a punto mantienen sus segmentos rectos con vértices de esquina.
- Se conserva intacta la geometría de origen y el suavizado no se aplica a elementos importados.

## Verificación

- Pruebas de curvas Bézier naturales y excepciones de edificios/ruinas.
- Comprobación del cierre del trazo a mano alzada y sus esquinas.
- `npm test` y comprobación de sintaxis JavaScript inline.
