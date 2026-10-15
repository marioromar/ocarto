# Ocarto v76 — marcado continuo y mínimos medidos

- Modos persistentes de conservar y quitar: se activan en un botón, se tocan tantas áreas como haga falta y se pulsa el mismo botón para finalizar. Cada toque aplica inmediatamente esa decisión.
- Al finalizar el modo conservar, Ocarto toma el menor área y ancho equivalente de las superficies conservadas y actualiza los dos campos mínimos a esos valores. Las áreas conservadas siguen forzadas y las quitadas siguen excluidas.
- Se puede cambiar directamente del modo conservar al modo quitar o viceversa.

Verificación: prueba unitaria del cálculo de mínimos, contrato de interfaz, `npm test` y validación sintáctica inline.
