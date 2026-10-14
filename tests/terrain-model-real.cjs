const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = process.argv[2];
if (!file) throw new Error('Uso: npm run test:real -- ruta/al/archivo.laz');
for (const asset of ['vendor/laz-perf.js', 'vendor/laz-perf.wasm']) {
  if (!fs.existsSync(asset)) throw new Error('Falta ' + asset + '; ejecuta npm run vendor:laz-perf');
}
const source = fs.readFileSync('lidar-worker.js', 'utf8');
const lazSource = fs.readFileSync('vendor/laz-perf.js', 'utf8');
const messages = [];
const {buildModel}=require('../terrain-grid.js');
const {generate}=require('../contours.js');
const started = Date.now();
const context = {
  console, WebAssembly, Uint8Array, Int8Array, Int32Array, Float32Array,
  Float64Array, ArrayBuffer, DataView, Math, Number, Error, Promise, Map,
  Set, BigInt, process, require, __dirname: path.resolve('vendor'), setTimeout,
  TextDecoder, TextEncoder,
  postMessage(message) {
    messages.push(message);
    if (message.type === 'progress') console.log(`Descomprimidos ${message.done.toLocaleString('es-ES')} puntos`);
  },
};
context.self = context;
vm.createContext(context);
context.importScripts = name => {
  if (name !== 'vendor/laz-perf.js') throw new Error('Script inesperado: ' + name);
  vm.runInContext(lazSource, context);
};
vm.runInContext(source, context);
const input = fs.readFileSync(file);
const buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
(async () => {
  await context.onmessage({ data: { type: 'load', buffer } });
  const loaded = messages.at(-1);
  if (loaded.type !== 'loaded') throw new Error(loaded.message || 'No se pudo leer el LAZ');
  if (loaded.count < 2_000_000) throw new Error(`Solo se leyeron ${loaded.count} puntos; se esperaban al menos 2 millones`);
  if (![loaded.bounds.minX, loaded.bounds.maxX, loaded.bounds.minY, loaded.bounds.maxY].every(Number.isFinite)) throw new Error('Extensión espacial inválida');
  const loadSeconds = (Date.now() - started) / 1000;
  await context.onmessage({ data: { type: 'terrain', options: { cell: 5, minZ: -Infinity, maxZ: Infinity, minCount: 1 } } });
  const detected = messages.at(-1);
  if (detected.type !== 'terrain') throw new Error(detected.message || 'Falló el análisis por celdas');
  const model=buildModel(detected.candidates,5);
  console.log('MDT provisional:',JSON.stringify({observed:model.observed,filled:model.filled,unfilled:model.unfilled,rows:model.rows.length}));
  const contours=generate(model.rows,5,5);
  console.log('Curvas sin suavizar:',JSON.stringify({segments:contours.segments,squares:contours.squares,skipped:contours.skipped,interval:contours.interval}));
  if(!contours.segments || !contours.features.every(f=>f.geometry.coordinates.every(x=>x.every(Number.isFinite))))throw Error('Curvas inválidas');
  if(model.observed!==detected.candidates.length)throw Error('Pérdida de celdas observadas');
  if(model.rows.length>100000)throw Error('MDT excesivo');
  console.log(JSON.stringify({
    file: path.basename(file), points: loaded.count, format: loaded.format,
    bounds: loaded.bounds, cells: detected.cells, tiles: detected.tiles,
    groundPoints: detected.matchingPoints, terrainCells: detected.candidates.length, loadSeconds: Number(loadSeconds.toFixed(1)),
    loadAndDetectSeconds: Number(((Date.now() - started) / 1000).toFixed(1)),
    peakRssMiB: Math.round(process.memoryUsage().rss / 1048576),
  }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
