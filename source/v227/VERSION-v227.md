# Ocarto v227

Se incorpora **Edificios OSM** para cargar contornos de edificios registrados en OpenStreetMap sin dibujarlos uno por uno:

- Selecciona un área editable que cubra la zona urbana y activa el botón **Edificios OSM**.
- Ocarto consulta las huellas de edificios dentro de ese polígono y las añade como áreas editables con el símbolo de edificio (521).
- Los objetos y la capa conservan su identificador OSM y atribución «© OpenStreetMap contributors · ODbL».
- Los edificios quedan en una capa separada para revisar, corregir o eliminar. La cobertura depende de los datos disponibles en OpenStreetMap.
- Se mantienen los edificios de clase LAS 6 como alternativa LiDAR. Street View sigue disponible por clic en mapas georreferenciados.

Verificación: consulta Overpass, lectura de huellas OSM, conservación de identificador, atribución y marcas de revisión; suite completa de pruebas.
