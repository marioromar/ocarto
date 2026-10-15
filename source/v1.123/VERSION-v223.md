# Ocarto v1.123 (v223)

Se añade un detector de depresiones candidatas a partir del MDT de suelo LiDAR. Permite ajustar el desnivel mínimo entre el fondo y el borde y el radio de comparación. Exporta puntos de inspección en GeoJSON con cotas, relieve local, parámetros y advertencias de revisión.

Solo usa anillos completos de celdas observadas; descarta huecos, celdas interpoladas y bordes incompletos para reducir falsos positivos. No modifica el MDT ni añade símbolos automáticamente: los candidatos pueden ser ruido, errores de clasificación del suelo o depresiones reales y requieren comprobación.

Verificación: suite completa de pruebas del proyecto, incluyendo casos de depresión, anillo incompleto y parámetros inválidos.
