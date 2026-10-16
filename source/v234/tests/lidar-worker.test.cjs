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
  return loadBytes(bytes);
 }
 async function loadBytes(bytes) {
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
 return {send,load,loadBytes,messages,nextId:()=>++id};
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

function syntheticLas() {
 const points=[
  {x:1000,y:2000,z:100,cls:2},
  {x:1000,y:2000,z:104,cls:3},
  {x:1000,y:2000,z:108,cls:5},
  {x:1010,y:2010,z:99,cls:2},
 ];
 const bytes=new Uint8Array(227+points.length*20);
 const d=new DataView(bytes.buffer);
 d.setUint32(0,0x4653414c,true); // LASF
 d.setUint8(24,1);d.setUint8(25,2); // LAS 1.2
 d.setUint32(96,227,true);d.setUint8(104,0); // point format 0
 d.setUint16(105,20,true);d.setUint32(107,points.length,true);
 for(const at of [131,139,147])d.setFloat64(at,.01,true);
 for(let i=0;i<points.length;i++){
   const p=points[i],at=227+i*20;
   d.setInt32(at,p.x*100,true);d.setInt32(at+4,p.y*100,true);
   d.setInt32(at+8,p.z*100,true);d.setUint8(at+15,p.cls);
 }
 return bytes;
}
test('MDT y vegetación se calculan con clases LAS y suelo por celda',async()=>{
 const w=makeWorker(),result=await w.loadBytes(syntheticLas());
 assert.equal(result.count,4);
 await w.send({type:'terrain',jobId:100,options:{cell:1,minCount:1}});
 const terrain=w.messages.findLast(m=>m.jobId===100&&(m.type==='terrain'||m.type==='error'));
 assert.equal(terrain.type,'terrain',JSON.stringify(terrain));
 assert.equal(terrain.matchingPoints,2);
 assert.equal(terrain.candidates.length,2);
 await w.send({type:'vegetation',jobId:101,options:{cell:1}});
 const veg=w.messages.findLast(m=>m.jobId===101&&(m.type==='vegetation'||m.type==='error'));
 assert.equal(veg.type,'vegetation',JSON.stringify(veg));
 const row=veg.rows.find(r=>r.x===1000.5&&r.y===2000.5);
 assert(row,'falta celda con suelo y vegetación');
 assert.equal(row.ground_points,1);
 assert.equal(row.vegetation_points,2);
 assert.equal(row.canopy_max_above_ground_m,8);
 assert(Math.abs(row.vegetation_return_fraction-2/3)<1e-8);
 await w.send({type:'feature-map',jobId:102,options:{cell:1,minHeight:1,maxHeight:10}});
 const feature=w.messages.findLast(m=>m.jobId===102&&(m.type==='feature-map'||m.type==='error'));
 assert.equal(feature.type,'feature-map',JSON.stringify(feature));
 assert.equal(feature.cells.height.length,1);
 assert.equal(feature.cells.height[0],8);
});
test('mosaico de dos teselas LAS combina las celdas sin descargar más librerías',async()=>{
 const w=makeWorker();
 await w.send({type:'area-start',sessionId:200,terrainCell:1,vegetationCell:1});
 assert.equal(w.messages.at(-1).type,'area-ready');
 for(let t=0;t<2;t++){
   await w.loadBytes(syntheticLas());
   await w.send({type:'area-add',sessionId:200,jobId:201+t});
   const done=w.messages.findLast(m=>m.type==='area-tile-done');
   assert(done && !done.skipped);
 }
 await w.send({type:'area-finish',sessionId:200,jobId:210});
 const result=w.messages.findLast(m=>m.type==='area-finished');
 assert(result);
 assert.equal(result.tiles,2);
 assert.equal(result.points,8);
 assert.equal(result.terrain.length,2);
 assert.equal(result.vegetationRows.length,2);
});
test('rechaza areas excesivas antes de reservar millones de celdas',async()=>{
 const w=makeWorker();
 await w.send({type:'area-start',sessionId:300,terrainCell:.5,
   vegetationCell:1,aoi:{rings:[[[0,0],[1000,0],[1000,1000],[0,1000]]]}});
 const error=w.messages.findLast(m=>m.type==='error');
 assert(error);
 assert.equal(error.operation,'area');
 assert.match(error.message,/millón de celdas/);
});
test('HTML integra el worker y tiene JavaScript de interfaz sintácticamente válido',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert(html.includes("new Worker('lidar-worker.js')"));
 assert(html.includes('ABRIR-OCARTO.bat'));
 assert(html.includes("openEditorWorkspace('lidarWorkspace',$('lidarCard'))"),
   'El botón LiDAR debe abrir la pestaña y no desplazar contenido oculto');
 assert(html.includes("openEditorWorkspace('layersWorkspace'"),
   'El botón Capas debe activar su pestaña');
 const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
     .map(m=>m[1]).filter(Boolean);
 assert(inline.length>0);
 for(const [i,script] of inline.entries())
   assert.doesNotThrow(()=>new vm.Script(script,{filename:'inline-'+i+'.js'}));
});
