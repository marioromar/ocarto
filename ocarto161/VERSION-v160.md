# Ocarto v1.60 — validar líneas abiertas

- «Validar geometría» revisa ahora líneas abiertas además de áreas: detecta coordenadas inválidas, vértices consecutivos duplicados, extremos coincidentes, retrocesos y cruces entre segmentos no vecinos.
- Los hallazgos se muestran como «Revisar geometrías» porque los cruces y retrocesos pueden ser intencionales según el contexto cartográfico.
- El aviso resume hasta cuatro elementos seleccionados e indica cuántos quedan fuera del resumen.
- El máximo interactivo de 2.500 vértices por geometría también se aplica a líneas; las geometrías mayores piden simplificación previa.
- Se conservan las comprobaciones de agujeros, anillos, contornos Bézier muestreados y solapes entre agujeros.

## Verificación

- Casos de línea abierta simple, auto-intersección, retroceso, duplicados y límite de complejidad.
- Casos existentes de área, agujeros dentro/fuera, cruces, solapes y anillos inválidos.
- `npm test` y comprobación de sintaxis JavaScript inline.
