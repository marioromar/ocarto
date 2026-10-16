/* Node smoke tests for the real v258 LiDAR Web Worker.
   Uses Apache-licensed LAS/LAZ fixtures from laz-perf 3.4.0. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const workerSource=fs.readFileSync(path.join(root,'lidar-worker.js'),'utf8');

function makeWorker() {
 const messages=[];
 let context;
 const globals={
   self:null,postMessage:m=>messages.push(m),setTimeout,clearTimeout,
   ArrayBuffer,Uint8Array,Float32Array,DataView,WebAssembly,console,
   fetch:async url=>{
     const name=String(url).replace(/^\.\//,'');
     const target=path.resolve(root,name);
     if(!target.startsWith(root+path.sep))throw Error('Invalid fixture path');
     return new Response(fs.readFileSync(target),{
       status:200,headers:{'Content-Type':'application/wasm'}});
   },
   importScripts:(...files)=>{
     for(const file of files){
       const target=path.resolve(root,file);
       if(!target.startsWith(root+path.sep))throw Error('Unsafe import path');
       vm.runInContext(fs.readFileSync(target,'utf8'),context,{
         filename:target,timeout:20000});
     }
   },
   location:{href:'http://localhost/source/v234/lidar-worker.js'},
   TextDecoder,TextEncoder,Response,Blob,
 };
 globals.self=globals;
 context=vm.createContext(globals);
 vm.runInContext(workerSource,context,{filename:'lidar-worker.js',timeout:20000});
 let id=0;
 async function send(data) {await context.onmessage({data});}
 async function load(name) {
  const bytes=fs.readFileSync(path.join(root,'tests/fixtures',name));
  const id1=++id;
  await send({type:'load-start',jobId:id1,fileSize:bytes.length});
  assert.equal(messages.at(-1).type,'load-ready');
  const data=Uint8Array.from(bytes);
  await send({type:'load-chunk',jobId:id1,sequence:1,offset:0,chunk:data});
  assert.equal(messages.at(-1).type,'load-chunk-ack');
  await send({type:'load-end',jobId:id1});
  const result=messages.findLast(m=>m.type==='loaded'&&m.jobId===id1);
  if(!result)throw Error('LAZ read failed: '+JSON.stringify(messages.slice(-5)));
  return result;
 }
 return {send,load,messages,nextId:()=>++id};
}

test('LAS real se lee por bloques y genera vista previa geográfica',async()=>{
 const w=makeWorker(),result=await w.load('1815.las');
 assert(result.count>0);
 assert(result.preview.length>=3);
 assert(result.bounds.maxX>=result.bounds.minX);
 assert(result.bounds.maxY>=result.bounds.minY);
 assert(!result.version.includes('LAZ'));
});
test('LAZ real se descomprime localmente mediante laz-perf WASM',async()=>{
 const w=makeWorker(),result=await w.load('1815.laz');
 assert(result.count>0);
 assert(result.version.includes('LAZ'));
 assert(result.preview.length>=3);
 assert(result.bounds.maxX>=result.bounds.minX);
});
test('LAS y LAZ reales tienen igual número de puntos y extensión',async()=>{
 const a=makeWorker(),b=makeWorker();
 const raw=await a.load('1815.las'),compressed=await b.load('1815.laz');
 assert.equal(raw.count,compressed.count);
 for(const key of ['minX','maxX','minY','maxY'])
   assert(Math.abs(raw.bounds[key]-compressed.bounds[key])<.001,key);
});
test('los modelos LiDAR devuelven estructura compatible con Ocarto',async()=>{
 const w=makeWorker();await w.load('1815.las');
 const id=w.nextId();
 await w.send({type:'terrain',jobId:id,options:{cell:4,minCount:1}});
 const m=w.messages.findLast(m=>m.jobId===id&&(m.type==='terrain'||m.type==='error'));
 assert(m);
 assert.equal(m.type,'terrain',JSON.stringify(m));
 assert(Array.isArray(m.candidates));
 assert(Number.isFinite(m.cells));
});
test('carga de archivo vacío indica error y no se queda bloqueada',async()=>{
 const w=makeWorker();await w.send({type:'load-start',jobId:1,fileSize:0});
 const err=w.messages.findLast(m=>m.type==='error');
 assert(err);assert.equal(err.operation,'load');
});
test('COPC se identifica como pendiente en lugar de fingir resultado',async()=>{
 const w=makeWorker();
 await w.send({type:'area-start',sessionId:10,terrainCell:.5,vegetationCell:1});
 await w.send({type:'area-add-copc',sessionId:10,jobId:11});
 const err=w.messages.findLast(m=>m.type==='error');
 assert(err);assert.equal(err.operation,'area');
 assert.match(err.message,/COPC/);
});
