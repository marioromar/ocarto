# Ocarto v1.05 — Mapas OCAD como guía de vegetación

- Importa mapas OCAD 12 y OCAD 2018 como capas de plantilla protegidas.
- Recupera polígonos de área, códigos de símbolo y anillos interiores.
- Lee escala, origen y EPSG del mapa para alinear las áreas con LiDAR y ortofotos.
- Usa los códigos de vegetación reconocidos como ejemplos para inspección y aprendizaje; mantiene el mapa guía bloqueado frente a edición accidental.
- Las áreas permanecen con su símbolo; se pueden mostrar/ocultar y transferir de forma intencionada a la cartografía editable.
- Verificación con los mapas OCAD reales La Muela 2026 y base muela; pruebas sintéticas añadidas para OCAD 12/2018 y entradas inválidas.

Curvas de Bézier se aproximan al importar. Objetos cifrados, geometrías no compatibles y versiones OCAD distintas de 12/2018 no se importan.
