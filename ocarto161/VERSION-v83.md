# v83 — Revisión previa de candidatos vectoriales

- Las detecciones de rocas, edificios, tendidos, apoyos, muros/escarpes, caminos y cauces aparecen primero en una vista previa naranja.
- El usuario decide cuándo incorporarlas o descartarlas con los controles de candidatos existentes; los objetos aceptados se agrupan en capas separadas por clase.
- La exportación de candidatos pendientes conserva geometrías de punto, línea y área, además de sus propiedades de revisión.
- La acción Deshacer puede revertir la incorporación completa; quitar una capa candidata aceptada retira sus objetos.

Verificación: `npm test` y comprobación sintáctica del script principal.
