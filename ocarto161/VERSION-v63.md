# Ocarto v63 — vectorización de claros y arbolado alto

- Nueva herramienta de exportación GeoJSON para polígonos candidatos de claros y arbolado alto.
- Los claros admiten celdas sin retornos vegetales clasificados si hay retornos de suelo suficientes; los umbrales de proporción vegetal y altura se pueden ajustar.
- El arbolado alto usa altura de copa y una proporción mínima de retornos vegetales, ambas configurables.
- Conserva huecos y áreas conectadas; requiere un área mínima y una rejilla de vegetación ya calculada.
- Las categorías quedan como candidatas revisables. «Arbolado alto» no confirma bosque blanco ni transitabilidad; los fallos de clasificación LAS pueden parecer claros.
- Pruebas sintéticas cubren claros sin retornos de vegetación, arbolado alto, geometrías vectoriales y compatibilidad con la vectorización anterior.

Verificación: `npm test`. Requiere comparación visual con ortofoto y mapa OCAD antes de aceptar polígonos.
