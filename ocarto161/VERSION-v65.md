# Ocarto v65 — clase de vegetación baja rayada

- Añade «Vegetación baja rayada» como etiqueta independiente para ejemplos cartográficos revisados.
- El aprendizaje propone sus polígonos en la capa `VEG_RAYADO_REVISAR`, aparte de cultivos, frutales y categorías de bosque.
- El código OCAD de área es opcional, editable y se valida contra el mapa `.ocd` cargado. No se presupone un número de símbolo.
- Las pruebas verifican el entrenamiento de la clase, su exportación por capa y la CRT cuando se proporciona un código.

Verificación: `npm test`. La forma rayada del símbolo final depende de la biblioteca OCAD de destino y requiere revisión cartográfica.
