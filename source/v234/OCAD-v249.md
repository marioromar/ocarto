# Ocarto v249 — Revisión del catálogo OCAD sin sustituir predeterminados

Continuación de `ocarto-v248` **dentro del repositorio marioromar/ocarto**.

## Uso
1. Descarga el ZIP completo de la rama `ocarto-v249` o abre el editor en `source/v234/index.html`.
2. En **Archivo → Revisar símbolos y tintas OCAD…** selecciona `bobadilla E.ocd` u otro archivo `.ocd` de OCAD 2018.
3. Examina **Símbolos** (código, descripción, tipo, tintas utilizadas y número de objetos) y **Tintas y orden** (CMYK, vista RGB, opacidad, sobreimpresión y posición).
4. Descarga el **informe JSON** para contrastarlo con la lista de símbolos y tabla de colores de OCAD 2018. La ventana se cierra **sin cambios**.

## Seguridad del catálogo
- El análisis llama a `OcartoEditableOcad.parse` y `OcartoOcadCatalogReview.inspect` con datos temporales del archivo local.
- **No modifica** `SYMBOL_CATALOG`, las tintas de impresión de Ocarto, `localStorage` ni geometrías del mapa activo.
- No existe aún botón para adoptar los símbolos como predeterminados. Eso queda pendiente de aprobación y pruebas sobre los originales de Bobadilla.
- La prioridad listada es **provisional** (posición de las tintas en el archivo). Es obligatorio contrastar su orden, sobreimpresión, símbolos complejos y texturas con OCAD antes de aplicar.
- Se detectan duplicados, tintas no definidas, tipos no reconocidos y objetos sin definición de símbolo.
- Se corrige el lector base para no transformar una opacidad OCAD real del 0 % en 100 %.
- El lector base requiere archivos con objetos OCAD editables; una plantilla vacía sin objetos podría no abrirse para revisión en esta fase.

## Comprobaciones
- Ejecutar `node source/v234/tests/ocad-editable.cjs` y `node source/v234/tests/ocad-catalog-review.cjs`.
- Para pruebas adicionales con originales, establecer `OCARTO_OCAD_REAL_DIR` apuntando a la carpeta con los archivos `.ocd` (no se suben a GitHub).
- Los resultados históricos de v248 documentan 218 símbolos y 45 tintas en los mapas de Bobadilla. **Esos valores no reemplazan una nueva comprobación visual y funcional de v249 sobre los originales.**

## Distribución
- Entrada del editor: `index.html` en la raíz, que redirige a `source/v234/index.html`.
- **GitHub (repositorio general):** https://github.com/marioromar/ocarto
- **Versión:** https://github.com/marioromar/ocarto/tree/ocarto-v249
- **ZIP de la misma rama:** https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v249.zip
