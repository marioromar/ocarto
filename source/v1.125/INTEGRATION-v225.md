# Integración Ocarto v1.125

El paquete completo está en `ocarto-v225-final.zip`. Esta carpeta contiene los módulos añadidos para el estampado de símbolos y sus pruebas.

El paquete carga `stamp-tools.js` antes de `stamp-tools-ui-v225.js`; el módulo de interfaz usa las funciones de `OcartoTopologyTools` desde `topology-tools.js` y el estado global del editor.
