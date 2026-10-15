# Ocarto v67 — previsualizar clases aprendidas en el mapa

- Nueva acción para añadir los áreas del modelo de vegetación directamente al mapa abierto.
- Crea una capa independiente por categoría aprendida (bosque blanco, verdes, abierto/cultivo, matorral, frutales, rayado u otras etiquetas disponibles).
- Las áreas son editables, mantienen sus huecos, se pueden ocultar por clase y la incorporación completa se revierte con Deshacer.
- Requiere análisis LiDAR y modelo de ejemplos cargado o aprendido; convierte las coordenadas con la georreferenciación activa de la nube/mapa.
- La adición es una propuesta visual: no sustituye la revisión de ortofoto ni asigna automáticamente la simbología definitiva del mapa.

Verificación: `npm test` y revisión sintáctica del JavaScript inline. Prueba visual completa pendiente por falta de Chromium.
