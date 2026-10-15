# v93 — Buscar primero georreferenciación, después ajustar

Al añadir una plantilla, Ocarto usa primero la georreferenciación GeoTIFF incrustada y busca los world files y PRJ que se seleccionen junto con ella. Si encuentra una transformación, coloca la imagen usando esas coordenadas y sale del modo de ajuste. Si no encuentra georreferenciación, activa automáticamente la calibración por parejas de clics en la imagen y el mapa (mínimo tres).

Si se carga manualmente un world file mientras la calibración está preparada, la georreferenciación asociada toma prioridad y cancela el ajuste pendiente. Por seguridad del navegador, los sidecars locales solo se pueden emparejar automáticamente cuando se seleccionan junto con la imagen; también se pueden cargar después desde «Cargar archivo geográfico».

Verificación: `npm test`, sintaxis de scripts y pruebas de cálculo GeoTIFF.
