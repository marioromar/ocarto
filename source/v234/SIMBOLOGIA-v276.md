# Ocarto v276 (preliminar) — simbología en el editor web

## Alcance implantado
- Partiendo de la rama v275 **y conservando la corrección de Bézier**.
- Paleta continua por código efectivo en el tipo de mapa seleccionado, con búsqueda por código, nombre y categoría.
- Vistas previas dibujadas por Canvas para símbolos de punto, línea y área, tanto en la paleta principal como en favoritos.
- Dibujos de puntos diferenciados: árboles, rocas, hoyos, manantiales, torres, hitos, pozos y cruces, entre otros.
- Marcas en líneas (vallas, taludes, cortados y ferrocarril) y distinción entre líneas discontinuas y punteadas.
- Código de curva ordinaria **101**, curva maestra/índice **102** y auxiliar/de forma **103** (antes estaban intercambiadas algunas entradas).
- Código 109 montículo pequeño, 111 depresión, 112 hoyo, 311 pozo, 416 límite de vegetación, 519 cruce, 524 torre, 526 hito, 530 elemento especial construido (círculo), etc.
- Nuevas entradas de referencia: **202** cortado franqueable, **208** campo de bloques, **402** abierto con árboles, **404** abierto áspero con árboles, **508** estrecha franja, **514** muro derruido, **518** valla infranqueable, **523** ruina (contorno).
- Los elementos exclusivos de Ocarto que no corresponden inequívocamente con un símbolo reglamentario figuran como **Personalizado**, sin código oficial ficticio.
- Se respeta la capa, la visibilidad, el símbolo seleccionado, su estado (normal/protegido/oculto), y la edición de objetos con geometría compatible.
- Se corrige el tamaño oficial predeterminado de la roca grande y se añaden comprobaciones automáticas del catálogo y los dibujos.

## Fuente normativa
International Orienteering Federation (IOF), *ISOM 2017-2, revisión 6 (2024)* y O-Map Wiki: https://orienteering.sport/iof/mapping/ y https://omapwiki.orienteering.sport/specifications/isom/

**Importante:** Las formas de los símbolos de esta versión son representaciones vectoriales de trabajo; **no constituyen una biblioteca OCAD ni una reproducción certificada de todas las dimensiones, tintas CMYK, prioridades y tramas de la normativa**. Algunos símbolos de sprint y MTBO requieren validación separada. Es imprescindible comparar el resultado impreso y el archivo OCAD de referencia de Bobadilla antes de usarlos en mapas definitivos de competición.

## Pruebas de aceptación pendientes con interfaz real
1. Elegir símbolos de las tres categorías y verificar que cada uno dibuja su forma en el mapa.
2. Comprobar con zoom alto y bajo, en curva/área con huecos, paleta de favoritos y capas personalizadas.
3. Abrir un mapa OCAD real y comparar apariencia, grosores, colores, tramas, orden de impresión y dimensiones oficiales.
4. Confirmar exportaciones a OMAP, GeoJSON y OCAD cuando exista su conversor definitivo.
5. Verificar simbología en la aplicación Flutter/Windows nativa: sus iconos y herramientas usan un catálogo independiente. **No se ha sincronizado ese catálogo en este cambio.**

## Paquete
GitHub Actions genera el artefacto **Ocarto-v276-preview-Simbolos-y-Bezier** a partir de la carpeta `source/v234`. Extraer el ZIP y abrir `index.html` en el navegador. El nombre v276 es **preliminar**, no una publicación final.
