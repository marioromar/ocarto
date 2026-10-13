# Ocarto · Guía de atajos de teclado

Esta guía recoge los atajos que están implementados actualmente en el editor. Pulsa Tab hasta enfocar el lienzo para usar sus atajos; no se ejecutan mientras el foco está en un campo o botón.

## Atajos

| Teclas | Acción | Alcance y notas |
|---|---|---|
| `Ctrl + S` o `⌘ + S` | Guardar proyecto | Descarga el proyecto `.ocarto` actual al dispositivo. |
| `Ctrl + O` o `⌘ + O` | Abrir proyecto | Abre el selector para cargar un archivo `.ocarto`. La vista actual solo se reemplaza si el archivo se valida y carga completo. |
| `Ctrl + A` o `⌘ + A` | Seleccionar todo | Selecciona objetos cartográficos visibles y editables y candidatos LiDAR; omite símbolos ocultos, capas ocultas y símbolos protegidos. |
| `Ctrl + D` o `⌘ + D` | Duplicar selección | Crea una copia en el mismo lugar y la deja seleccionada; arrástrala para separarla. Se deshace en una sola acción. |
| `Ctrl + C` o `⌘ + C` | Copiar selección | Copia objetos seleccionados al portapapeles interno; los símbolos protegidos se omiten. |
| `Ctrl + X` o `⌘ + X` | Cortar selección | Copia y elimina los objetos editables seleccionados. Se deshace en una sola acción. |
| `Ctrl + V` o `⌘ + V` | Pegar | Pega bajo el cursor en la capa activa; los candidatos LiDAR siguen siendo candidatos. |
| `Ctrl + Z` o `⌘ + Z` | Deshacer | Mientras hay un trazado por nodos en curso, deshace el último cambio del trazado. Si no hay trazado, deshace la última edición del mapa. |
| `Ctrl + Mayús + Z` o `⌘ + Mayús + Z` | Rehacer | Rehace el último cambio del trazado en curso o, si no lo hay, la última edición deshecha del mapa. |
| `Ctrl + Y` o `⌘ + Y` | Rehacer | Alternativa a `Ctrl/⌘ + Mayús + Z`. |
| `Supr` o `Retroceso` | Quitar el último cambio del trazado; si no hay trazado, eliminar la selección | En líneas y áreas por nodos, y en trazados Bézier, deshace el último nodo añadido. Sin trazado activo, elimina el objeto o los objetos seleccionados. |
| `Esc` | Cancelar el modo o trazado actual | Cancela primero la inserción de vértice; si no, la selección rectangular de vértices; si no, el trazado en curso. Si no hay ninguna acción activa, quita la selección actual. Los elementos terminados se conservan. |
| `Enter` | Terminar trazado | Termina la línea o el área por nodos o Bézier en curso. No afecta al dibujo a mano alzada. |
| `←` `→` `↑` `↓` | Mover selección o mapa | Con uno o varios vértices seleccionados, los mueve 1 píxel de pantalla. Si hay objetos seleccionados, los mueve 1 píxel. Sin selección, desplaza la vista 1 píxel. Con `Mayús`, el paso es de 10 píxeles. El movimiento se puede deshacer con `Ctrl/⌘ + Z`. |
| `Ctrl` + clic y arrastrar sobre línea o área existente | Seguir objeto | Con la herramienta Línea o Área por nodos, copia el tramo desde el punto inicial hasta donde sueltas el ratón; puedes soltar Ctrl tras iniciar el gesto. El trazado nuevo queda activo para seguir añadiendo vértices. |
| `Ctrl + +` / `Ctrl + -` | Acercar / alejar | Cambia el zoom un 20 %. También se admiten `+`, `=`, `-` y las teclas equivalentes del teclado numérico sin Ctrl. |
| `0` | Restablecer vista | Vuelve al 100 % y centra el mapa. También funciona `0` del teclado numérico. |
| `P` | Última herramienta de dibujo | Activa la herramienta de dibujo usada más recientemente. |
| `A` / `V` | Seleccionar | Activa el modo de selección y edición de objetos o vértices. |
| `F2` | Alternar transparencia del área | Cambia entre mostrar u ocultar el relleno de las áreas seleccionadas; el contorno se conserva. |
| `F5` | Redibujar | Actualiza la visualización del mapa. |
| Mantener `Espacio` + arrastrar con botón izquierdo | Desplazar el mapa | Funciona desde cualquier herramienta. Suelta Espacio para volver a dibujar o editar.

## Gestos de ratón relacionados

Estos gestos no son atajos de teclado, pero complementan la navegación y el dibujo:

- Rueda del ratón: desplaza la vista verticalmente. `Mayús` + rueda desplaza horizontalmente.
- `Ctrl` + rueda: acerca o aleja alrededor del cursor. `Ctrl` + `+` / `-` también cambia el zoom.
- Doble clic en una zona vacía con «Seleccionar»: acerca sobre ese lugar. `Mayús` + doble clic aleja.
- `Ctrl` + clic sobre un vértice: lo elimina, si se conserva el mínimo de 2 vértices en líneas o 3 en áreas.
- `Mayús + Ctrl` + clic en un tramo: inserta un vértice normal.
- Mantener `Alt` al colocar nodos de línea o área: restringe el siguiente tramo a horizontal o vertical.
- Con Línea o Área por nodos, `Ctrl` + clic y arrastrar por un objeto existente: copia el tramo recorrido; puedes soltar Ctrl después del clic inicial.
- `Ctrl + Espacio` + clic en un vértice: recorre normal → esquina → dash.
- Clics o toques repetidos en el mismo vértice (ratón, Pen o dedo): 1 clic lo deja normal, 2 lo cambia a esquina, 3 a dash y 4 vuelve a normal. Haz los clics seguidos, dentro de 900 ms; arrastrar el vértice lo mueve sin cambiar su tipo.
- Botón central + arrastrar: desplaza el mapa.
- Doble clic durante un trazado por nodos o Bézier: termina el trazado.

## Gestos de Pen y táctiles relacionados

- Mantener pulsado y arrastrar: dibuja a mano alzada con la herramienta correspondiente.
- Mantener el Pen quieto sobre el lienzo durante 5 segundos: abre el menú contextual, igual que el botón derecho del ratón. Incluye «Insertar vértice», «Cambiar tipo de vértice», «Quitar vértice» y «Ajustar a vértices», además de «Editar elemento» y «Editar vértices» cuando estén disponibles. «Cambiar tipo de vértice» avanza al siguiente estado: normal → esquina → dash → normal. «Insertar vértice» activa la herramienta; el siguiente clic sobre un tramo añade el nodo.
- En modo «Seleccionar», dos dedos: acercan, alejan y desplazan el mapa.
- El botón «Terminar trazado» permite acabar líneas y áreas por nodos sin hacer doble clic.

## Comandos disponibles desde menús

El estado normal, protegido u oculto se cambia desde el menú contextual del símbolo: botón derecho del ratón o mantener el Pen quieto durante 5 segundos sobre el símbolo. También está disponible el selector «Estado del símbolo activo», debajo del cuadro de símbolos. El estado se guarda en el proyecto y forma parte del historial Deshacer/Rehacer.

En el lienzo, el menú contextual del botón derecho o la pulsación larga del Pen ofrece «Copiar», «Cortar», «Duplicar» y «Pegar aquí». En una línea o área editable también permite activar «Insertar vértice»: después, haz clic sobre el tramo donde quieras añadirlo. Sobre un vértice, «Cambiar tipo de vértice» avanza normal → esquina → dash → normal y «Quitar vértice» lo elimina si la geometría conserva el mínimo de nodos (2 para líneas y 3 para áreas). «Ajustar a vértices» activa o desactiva el mismo radio de 12 px que el botón del editor. «Editar elemento» y «Editar vértices» aparecen cuando corresponda.
