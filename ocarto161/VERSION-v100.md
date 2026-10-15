# Ocarto v1.00 — Inspección de símbolos guía y zonas dudosas

- La vista previa LiDAR conserva como áreas grises las celdas con datos suficientes que el clasificador no puede asignar con confianza; avisa al abrirla y permite decidir la clase, conservar o quitar.
- Las respuestas a dudas se aplican a superficies seleccionadas y persisten al recalcular la vista previa, vectorizar y exportar.
- Se añade inspección de símbolos de área en geometrías vectoriales del mapa. Usa los símbolos conocidos para preparar ejemplos de entrenamiento sin editar ni cambiar la geometría del mapa: 401/403 abierto, 405 bosque blanco, 406–411 clases de verde/vegetación baja, 413 frutales y 414 cultivo en hileras.
- Los ejemplos de guía se pueden trazar sobre el mapa de trabajo, sobre una plantilla georreferenciada o sobre una imagen LiDAR. Si el OCAD solo está cargado como imagen, no se extrae automáticamente su geometría interna; se pueden dibujar y etiquetar áreas guía encima.
- Los claros candidatos aparecen amarillos y el arbolado alto blanco. Su color/categoría es orientativo; sigue siendo necesario revisar con ortofoto y cartografía.

Verificación: `npm test` completo, pruebas de clases dudosas, inspección de símbolos, exportaciones, guardado del proyecto y sintaxis del script. La prueba de navegador se omite si no está instalado Chromium de Playwright.
