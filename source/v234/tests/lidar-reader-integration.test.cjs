/* End-to-end browser file-reader/worker protocol smoke test.
   Reads fixture bytes through File.stream()/Blob.stream() in chunks and verifies
   load-start, acknowledgments and the real LAS/LAZ decoder output. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'ocarto-runtime-v248-5.js'),'utf8');
const start=runtime.indexOf('/* lidar-file-reader.js */');
const end=runtime.indexOf('/* lidar-detection-catalog.js */',start);
assert(start>=0 && end>start,'No se localizó el lector por bloques');
const readerExports={};
const readerContext={
  module:{exports:readerExports},Uint8Array,ArrayBuffer,DataView,
  AbortController,Promise,Error,Number,Math,
  setTimeout,clearTimeout,
};
vm.runInNewContext(runtime.slice(start,end),readerContext,{timeout:5000});
const reader=readerContext.module.exports;
assert.equal(typeof reader.streamFileToWorker,'function');

function bridge() {
 const listeners=new Set(),events=[],queued=[];
 const context=vm.createContext({
   self:null,ArrayBuffer,Uint8Array,Float32Array,DataView,
   setTimeout,clearTimeout,TextEncoder,TextDecoder,Blob,Response,WebAssembly,console,
   location:{href:'http://127.0.0.1:8787/source/v234/lidar-worker.js'},
   fetch:async name=>{
     const p=path.resolve(root,String(name));
     if(!p.startsWith(root+path.sep))throw Error('Unsafe WASM path');
     return new Response(fs.readFileSync(p),{status:200,
       headers:{'content-type':'application/wasm'}});
   },
   postMessage(data) {
     events.push(data);
     queueMicrotask(()=>{for(const cb of [...listeners])cb({data});});
   },
   importScripts(...paths) {
     for(const name of paths) {
       const p=path.resolve(root,name);
       if(!p.startsWith(root+path.sep))throw Error('Unsafe JS path');
       vm.runInContext(fs.readFileSync(p,'utf8'),context,{filename:p,timeout:20000});
     }
   },
 });
 context.self=context;
 vm.runInContext(fs.readFileSync(path.join(root,'lidar-worker.js'),'utf8'),
   context,{filename:'lidar-worker.js',timeout:20000});
 let errors=[];
 const mock={
   addEventListener(event,fn){if(event==='message')listeners.add(fn);else if(event==='error')errors.push(fn);},
   removeEventListener(event,fn){if(event==='message')listeners.delete(fn);},
   postMessage(data){
     queued.push(data.type);
     queueMicrotask(async()=>{try{await context.onmessage({data});}
       catch(error){for(const cb of errors)cb({message:error.message});}});
   },
 };
 return {worker:mock,events,queued};
}
function fileFixture(name) {
 const buffer=fs.readFileSync(path.join(root,'tests','fixtures',name));
 return Object.assign(new Blob([buffer]),{name});
}
async function loadUsingReader(name,chunkSize=2048) {
 const b=bridge(),progress=[];
 const result=await reader.streamFileToWorker(fileFixture(name),b.worker,{
   jobId:17,chunkSize,onProgress:(done,total)=>progress.push([done,total]),
 });
 assert(result);
 assert.equal(result.type,'loaded');
 assert.equal(result.jobId,17);
 assert.equal(b.queued[0],'load-start');
 assert.equal(b.queued.at(-1),'load-end');
 assert(b.queued.filter(t=>t==='load-chunk').length>1,'Debe transmitir múltiples fragmentos');
 assert.equal(b.events.filter(m=>m.type==='load-chunk-ack').length,
   b.queued.filter(t=>t==='load-chunk').length);
 assert.equal(progress.at(-1)[0],progress.at(-1)[1]);
 assert(result.count>0);
 return {result,bridge:b};
}
test('lector real -> worker real: LAS en múltiples fragmentos con ACK',async()=>{
 const {result}=await loadUsingReader('1815.las',1024);
 assert(result.preview.length>0);
 assert(result.version.startsWith('1.'));
});
test('lector real -> worker real: LAZ descomprimido sin enlaces externos',async()=>{
 const {result}=await loadUsingReader('1815.laz',1024);
 assert.match(result.version,/LAZ/);
 assert(result.bounds.maxX>=result.bounds.minX);
});
test('lector web transmite LAS y LAZ con igual extensión espacial',async()=>{
 const las=await loadUsingReader('1815.las'),laz=await loadUsingReader('1815.laz');
 assert.equal(las.result.count,laz.result.count);
 for(const key of ['minX','minY','maxX','maxY']){
   assert(Math.abs(las.result.bounds[key]-laz.result.bounds[key])<.001,key);
 }
});

test('mosaico ignora tesela LAS exterior leyendo solo la cabecera, sin reservar ni descomprimir toda la nube',async()=>{
 const b=bridge();
 b.worker.postMessage({type:'area-start',sessionId:90,
   terrainCell:1,vegetationCell:1,
   aoi:{rings:[[[1000000000,1000000000],[1000000010,1000000000],
     [1000000010,1000000010],[1000000000,1000000010]]]}});
 const file=fileFixture('1815.las'),size=file.size;
 const result=await reader.streamFileToWorker(file,b.worker,{
   jobId:91,sessionId:90,chunkSize:64
 });
 assert.equal(result.skipped,true);
 assert.equal(result.count,0);
 assert.equal(result.bounds,null);
 const chunks=b.queued.filter(x=>x==='load-chunk').length;
 assert(chunks>=4 && chunks<=5,'Se deben leer como máximo los primeros 320 bytes: '+chunks);
 assert(chunks*64<size,'La tesela fuera de área no debe transferirse entera');
 assert(b.events.some(m=>m.type==='load-skip'));
 assert(b.events.some(m=>m.type==='load-skip-ack'));
});
test('mosaico ignora tesela LAZ exterior sin cargar WebAssembly',async()=>{
 const b=bridge();
 b.worker.postMessage({type:'area-start',sessionId:92,
   terrainCell:1,vegetationCell:1,
   aoi:{rings:[[[1000000000,1000000000],[1000000004,1000000000],
     [1000000004,1000000004],[1000000000,1000000004]]]}});
 const result=await reader.streamFileToWorker(fileFixture('1815.laz'),b.worker,{
   jobId:93,sessionId:92,chunkSize:512
 });
 assert.equal(result.skipped,true);
 assert.equal(result.count,0);
 assert.equal(b.queued.filter(x=>x==='load-chunk').length,1);
 assert(!b.events.some(m=>m.stage==='decompress'));
});
test('mosaico no descarta tesela LAS si su cabecera intersecta el área',async()=>{
 const fixture=fileFixture('1815.las');
 const file=Buffer.from(await fixture.arrayBuffer());
 const d=new DataView(file.buffer,file.byteOffset,file.byteLength);
 const xmin=d.getFloat64(187,true),xmax=d.getFloat64(179,true);
 const ymin=d.getFloat64(203,true),ymax=d.getFloat64(195,true);
 const areaX=(xmin+xmax)/2,areaY=(ymin+ymax)/2;
 const b=bridge();
 b.worker.postMessage({type:'area-start',sessionId:94,
   terrainCell:4,vegetationCell:4,
   aoi:{rings:[[[areaX-5,areaY-5],[areaX+5,areaY-5],
     [areaX+5,areaY+5],[areaX-5,areaY+5]]]}});
 const result=await reader.streamFileToWorker(fixture,b.worker,{
   jobId:95,sessionId:94,chunkSize:128
 });
 assert(!result.skipped);
 assert(result.count>0);
 assert.equal(b.queued.filter(x=>x==='load-chunk').length,
   Math.ceil(fixture.size/128));
});

async function runAnalysisViaBridge(bridge,type,jobId,options={}) {
 return await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{
     bridge.worker.removeEventListener('message',listener);
     reject(Error('Tiempo de espera agotado en análisis '+type));
   },30000);
   const listener=({data})=>{
     if(data.jobId!==jobId || (data.type!==type&&data.type!=='error'))return;
     clearTimeout(timer);
     bridge.worker.removeEventListener('message',listener);
     resolve(data);
   };
   bridge.worker.addEventListener('message',listener);
   bridge.worker.postMessage({type,jobId,options});
 });
}
test('LAZ real pasa de lector a MDT y vegetación sin inventar alturas ausentes',async()=>{
 const loaded=await loadUsingReader('1815.laz',1024),bridge=loaded.bridge;
 const terrain=await runAnalysisViaBridge(bridge,'terrain',4001,{cell:25,minCount:1});
 assert.equal(terrain.type,'terrain',JSON.stringify(terrain));
 assert(terrain.matchingPoints>0,'La tesela real contiene puntos de suelo');
 assert(terrain.candidates.length>0,'El MDT debe tener celdas con puntos de suelo');
 const vegetation=await runAnalysisViaBridge(bridge,'vegetation',4002,{cell:25});
 assert.equal(vegetation.type,'vegetation',JSON.stringify(vegetation));
 assert(vegetation.rows.length>0);
 assert(vegetation.rows.every(row=>row.vegetation_points===0),
  'La tesela de prueba 1815.laz carece de clases vegetales 3-5');
 const feature=await runAnalysisViaBridge(bridge,'feature-map',4003,
   {cell:25,minHeight:0,maxHeight:30});
 assert.equal(feature.type,'error',
  'Sin copas de vegetación, no debe inventar un Feature Map de alturas');
 assert.match(feature.message,/No hay alturas de vegetación/);
});
