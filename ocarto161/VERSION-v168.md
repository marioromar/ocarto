# Ocarto v1.68

## Símbolos OCAD 11 en el validador CRT

- El lector de símbolos reconoce archivos OCAD 11 además de OCAD 12 y 2018.
- Comprueba códigos, tipos y descripciones de símbolos de área sin modificar el mapa de destino.
- Validado con el archivo `bobadilla E 7 oct ocd11.ocd`: leyó 218 símbolos, 52 de área y verificó que los 19 códigos de área usados por los 4.278 objetos existan en la tabla de símbolos.
- La prueba automatizada cubre la versión 11, los códigos/descripciones, índices circulares y registros fuera de rango.

## Verificación

- `npm test`: 60 pruebas pasadas.
- Prueba real de OCAD 11: 4.278 áreas leídas; ningún código de área sin símbolo correspondiente.
