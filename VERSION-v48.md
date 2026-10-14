# Ocarto v48 — filtro rápido por encuadre del polígono LiDAR

## Cambios
- En el mosaico LiDAR, las coordenadas de cada punto se comparan primero con el rectángulo envolvente del área seleccionada.
- Los puntos fuera de ese rectángulo se descartan antes de comprobar pertenencia exacta al polígono, reduciendo pruebas geométricas cuando el área es irregular o estrecha.
- Los puntos dentro del encuadre siguen pasando por la comprobación exacta del polígono y sus huecos antes de acumularse. El resultado no cambia.

## Límite actual
Las teselas que cruzan el área aún deben leerse y descomprimirse completas para localizar los puntos; el cambio reduce cálculos geométricos, pero no el tiempo de descompresión ni el tamaño de la copia LAZ temporal en memoria.

## Verificación
- La prueba del Worker incluye puntos dentro del rectángulo pero fuera del polígono, y puntos fuera del rectángulo; solo se acumulan los puntos interiores al polígono.
- La suite de pruebas sintéticas se ejecuta sin Chromium; la prueba de restauración de navegador requiere ese ejecutable.
