# Ocarto v275 — Auditar las uniones del MDT LiDAR

Esta revisión corresponde al **editor web de Ocarto** que se abre en Windows con Chrome o Edge. No es el ejecutable Flutter, cuyo procesado LiDAR sigue pendiente.

## Abrir la versión

Descarga [Ocarto v275 completo](https://github.com/marioromar/ocarto/archive/refs/heads/ocarto-v275.zip), extrae todos sus archivos y ejecuta **ABRIR-OCARTO.bat**. Mantén abierta la ventana del servidor local. No abras el archivo HTML por `file://`.

## Preparar las rejillas

Primero hay que completar las dos fases anteriores del panel LiDAR:

1. **Área extensa · procesar por teselas**, seleccionando un polígono UTM y los archivos LAS/LAZ; se crean los CSV de suelo y vegetación.
2. **MDT preliminar · unir bordes**, seleccionando la carpeta `ocarto_teselas_...`. Se generan los archivos `*_mdt_preliminar.asc` y se registra `dtmSeams.state: "complete"`.

Ninguna de estas fases produce todavía un MDT profesional validado ni curvas reglamentarias.

## Tercera fase nueva: auditar las uniones

1. En LiDAR, pulsa **«Auditar uniones del MDT»**.
2. Elige **la carpeta `ocarto_teselas_...`** que ya contiene `manifest.json` y todos los archivos `.asc`.
3. Ocarto lee los ASC por flujo y conserva solamente sus filas y columnas de borde. Así no necesita cargar todas las rejillas en RAM.
4. Compara las cotas junto a cada frontera, registra dónde hay datos en un lado pero faltan en el otro y señala **cambios bruscos de gradiente** superiores a **1,5 m por celda**. La comprobación utiliza las pendientes locales a ambos lados, no solo la diferencia directa de alturas.
5. En la carpeta aparecerá **`mdt_auditoria_bordes.json`**, con las uniones examinadas, recuentos, máximos y hasta ocho coordenadas UTM de ejemplo por unión. En `manifest.json` se añadirá `dtmAudit` con su estado y un resumen.
6. Puedes utilizar **Detener auditoría**; no se modifica ningún archivo MDT original y el estado queda marcado como cancelado.

**Importante:** una alerta no significa automáticamente un error. Un cortado, una ladera pronunciada, un espolón o una vaguada pueden producir cambios legítimos. La herramienta **identifica zonas a inspeccionar** y no suaviza ni altera las alturas.

## Qué validan las pruebas

- Una pendiente lineal, incluso pronunciada, no se etiqueta automáticamente como discontinuidad.
- Una interrupción artificial entre dos teselas sí queda marcada.
- Se distingue una celda sin datos de un salto de cota.
- Se verifican la extensión UTM, la resolución y el tamaño de cada ASC respecto al manifiesto.
- Los archivos truncados, incompletos o con cotas inválidas dan un error verificable.
- La auditoría admite cancelación sin alterar las rejillas.

[Ver GitHub Actions](https://github.com/marioromar/ocarto/actions/workflows/lidar-worker.yml).

## Pendiente de validar en cartografía real

No se ha inspeccionado en tu ordenador el archivo `PNOA_2024_AND_279-4085_H30_NPC01.laz` de unos 7,6 millones de puntos. Tampoco están terminadas las curvas oficiales y auxiliares, la detección fiable de vaguadas/espolones, los rásteres definitivos georreferenciados, el entrenamiento de vegetación ni el motor LiDAR Flutter.

El siguiente paso es probar este informe sobre una zona real de Bobadilla y corregir los problemas que señale, antes de considerar apto el MDT para producir curvas profesionales.
