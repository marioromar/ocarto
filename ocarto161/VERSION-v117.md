# Ocarto v1.17

## Vegetación LiDAR: altura, densidad y rayado

- La franja de retornos bajos alineados e intensos se conserva como propuesta de **vegetación baja rayada** (evidencia naranja), aunque el usuario no la haya dibujado manualmente.
- Se detectan también zonas **semiabiertas con árboles dispersos** como candidatos revisables de vegetación abierta/sparse, sin confundirlas con bosque continuo.
- La vegetación de más de 4 m se propone como blanco cuando la cobertura no es muy densa; las copas altas muy densas pasan a candidato verde 3.
- La vegetación baja de 2–4 m se separa por densidad en verde 1/verde 2; toda propuesta queda marcada para conservar o quitar.
- La altura mínima blanca y el límite de cobertura son editables.

Las propuestas son inventario de interpretación LiDAR, no aceptación automática de simbología IOF/OCAD.
