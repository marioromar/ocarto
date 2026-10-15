# Ocarto v37 — Pruebas de integración de restauración

## Implementado
- Continúa desde v36 con restauración directa y validación antes de aplicar.
- Añade una prueba de navegador que guarda una copia válida, la restaura sin descargar y comprueba el mapa.
- Verifica también que una copia con coordenadas inválidas muestra el error y no sustituye el mapa abierto.
- La prueba usa Playwright/Chromium cuando está instalado; si no hay navegador disponible, se omite con un aviso claro.
- Añade el comando `npm run test:browser`.

## Validación
- `npm test`
- Scripts inline y módulo IndexedDB compilados.
- La prueba real de navegador requiere un ejecutable Chromium disponible.
