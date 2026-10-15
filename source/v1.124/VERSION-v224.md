# Ocarto v1.124 (v224)

Se incorporan herramientas de edición inspiradas en la barra de OCAD:

- **Rellenar contorno** crea una nueva área editable con el símbolo de área activo dentro de una línea cerrada o área seleccionada. Conserva el borde original y coloca el relleno por debajo. Valida contornos rectos y permite deshacer la operación.
- **Voltear 180°** gira de inmediato los objetos seleccionados alrededor del centro de cada objeto y actualiza la orientación de los símbolos puntuales.
- **Recortar línea exterior** conserva los tramos de una línea que quedan fuera de un área, incluidos los límites definidos por huecos.
- **Recortar área exterior** resta un área convexa de otra área convexa y crea piezas editables para las partes desconectadas. Mantiene las fuentes y permite deshacer.

Los recortes de área exterior requieren contornos rectos, convexos y sin huecos. Los recortes no modifican el área usada como límite.

Verificación: pruebas de intersección y diferencia de polígonos convexos, conservación de tramos exteriores, comprobación de versión y suite completa del proyecto.
