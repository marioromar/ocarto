# Integración Ocarto v1.124

El paquete completo de la aplicación es `ocarto-v224-final.zip`. Esta carpeta conserva los archivos de implementación añadidos en v1.124 y sus pruebas.

En `index.html`, cargar `editor-tools-v224.js` tras los scripts base de Ocarto y antes de actualizar el estado visible de versión. El módulo usa `OcartoTopologyTools.differenceConvexArea` y `clipLineOutsidePolygon`, añadidas en `topology-tools.js`.
