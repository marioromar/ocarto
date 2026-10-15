# Ocarto v1.64 — proyección precisa sobre curvas

- «Ajustar bordes» refina la posición proyectada sobre el segmento Bézier con una búsqueda numérica local después de localizar la zona más cercana.
- La tolerancia se aplica a la distancia real aproximada sobre la curva, sin depender solo de puntos de muestra espaciados.
- Se descartan rápidamente segmentos cuyas cajas de control quedan fuera de la tolerancia.
- Se conservan los tiradores relativos y los metadatos del vértice desplazado.

## Verificación

- Prueba con una curva larga y un punto ubicado entre muestras; comprueba una proyección con error inferior a 0,00001 unidades.
- `npm test`: 60 pruebas superadas.
