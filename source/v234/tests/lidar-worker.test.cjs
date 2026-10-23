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
 async function load(name,sessionId) {
  const bytes=fs.readFileSync(path.join(root,'tests/fixtures',name));
  return loadBytes(bytes,sessionId);
 }
 async function loadBytes(bytes,sessionId) {
  const id1=++id;
  await send({type:'load-start',jobId:id1,fileSize:bytes.length,sessionId});
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

test('LAZ 1.4 real usa recuento extendido y el descompresor WebAssembly',async()=>{
 const w=makeWorker();
 const result=await w.load('point-time-1.4.las.laz');
 assert.equal(result.version,'1.4 LAZ');
 assert.equal(result.count,1065);
 assert.equal(result.format,1);
 assert(result.preview.length>=3);
});
function syntheticLas14Format6() {
 const bytes=new Uint8Array(375+3*30);
 const d=new DataView(bytes.buffer);
 d.setUint32(0,0x4653414c,true); // LASF
 d.setUint8(24,1);d.setUint8(25,4);
 d.setUint16(94,375,true);d.setUint32(96,375,true);
 d.setUint8(104,6);d.setUint16(105,30,true);
 d.setUint32(107,0,true); // LAS 1.4 moderno: recuento antiguo cero
 d.setBigUint64(247,3n,true); // recuento extendido
 for(const off of [131,139,147])d.setFloat64(off,.01,true);
 const points=[
  {x:1000,y:2000,z:100,cls:2},
  {x:1000,y:2000,z:103,cls:3},
  {x:1005,y:2005,z:99,cls:2},
 ];
 for(let i=0;i<points.length;i++) {
   const p=points[i],at=375+i*30;
   d.setInt32(at,p.x*100,true);d.setInt32(at+4,p.y*100,true);
   d.setInt32(at+8,p.z*100,true);d.setUint8(at+14,1);
   d.setUint8(at+16,p.cls); // Clase LAS 1.4 formato 6 (no offset +15)
 }
 return bytes;
}
test('LAS 1.4 formato 6 obtiene suelo y vegetación de las nuevas posiciones',async()=>{
 const w=makeWorker(), result=await w.loadBytes(syntheticLas14Format6());
 assert.equal(result.version,'1.4');
 assert.equal(result.format,6);
 assert.equal(result.count,3);
 await w.send({type:'terrain',jobId:500,options:{cell:1,minCount:1}});
 const terrain=w.messages.findLast(m=>m.jobId===500 && (m.type==='terrain'||m.type==='error'));
 assert.equal(terrain.type,'terrain',JSON.stringify(terrain));
 assert.equal(terrain.matchingPoints,2);
 await w.send({type:'vegetation',jobId:501,options:{cell:1}});
 const veg=w.messages.findLast(m=>m.jobId===501 && (m.type==='vegetation'||m.type==='error'));
 assert.equal(veg.type,'vegetation',JSON.stringify(veg));
 assert.equal(veg.classifiedPoints,3);
 const pair=veg.rows.find(row=>row.x===1000.5&&row.y===2000.5);
 assert(pair);
 assert.equal(pair.ground_points,1);
 assert.equal(pair.vegetation_points,1);
 assert.equal(pair.canopy_max_above_ground_m,3);
});

test('dos ventanas de un área admiten LAS 0,5m sin duplicar puntos en su frontera',async()=>{
 const rectangle={rings:[[[990,1990],[1020,1990],[1020,2020],[990,2020]]]};
 const windows=[{minX:990,maxX:1005,minY:1990,maxY:2020},
   {minX:1005,maxX:1020,minY:1990,maxY:2020}];
 const totals=[];
 for(let k=0;k<windows.length;k++){
   const w=makeWorker(),sessionId=850+k;
   await w.send({type:'area-start',sessionId,terrainCell:.5,vegetationCell:1,
     aoi:rectangle,window:windows[k]});
   const ready=w.messages.findLast(m=>m.type==='area-ready');
   assert(ready,'No se creó la tesela '+k);
   assert(ready.capacity.terrainCells<1000000);
   await w.loadBytes(syntheticLas());
   await w.send({type:'area-add',sessionId,jobId:900+k});
   const tile=w.messages.findLast(m=>m.jobId===900+k&&m.type==='area-tile-done');
   assert(tile&&!tile.skipped);
   await w.send({type:'area-finish',sessionId,jobId:920+k});
   const result=w.messages.findLast(m=>m.type==='area-finished');
   assert(result);
   assert.equal(result.window.minX,windows[k].minX);
   totals.push(result.points);
 }
 assert.deepEqual(totals,[3,1]);
 assert.equal(totals.reduce((a,b)=>a+b,0),4);
});

test('una selección de 9 km² admite sesión con ventana pequeña de 0,5m',async()=>{
 const w=makeWorker(),aoi={rings:[[[0,0],[3000,0],[3000,3000],[0,3000]]]};
 await w.send({type:'area-start',sessionId:990,terrainCell:.5,vegetationCell:1,aoi,
   window:{minX:500,maxX:800,minY:500,maxY:800}});
 const ready=w.messages.findLast(m=>m.type==='area-ready');
 assert(ready);
 assert(ready.capacity.terrainCells<1000000);
 await w.send({type:'area-abort',sessionId:990});
 await w.send({type:'area-start',sessionId:991,terrainCell:.5,vegetationCell:1,aoi});
 const error=w.messages.findLast(m=>m.type==='error');
 assert(error);
 assert.match(error.message,/millón de celdas/);
});

test('mosaico LAZ solo lee cabecera en carga y descomprime al calcular el área',async()=>{
 const w=makeWorker(),sessionId=273;
 await w.send({type:'area-start',sessionId,terrainCell:4,vegetationCell:4});
 const before=w.messages.length;
 const loaded=await w.load('1815.laz',sessionId);
 assert.equal(loaded.headerOnly,true);
 assert.equal(loaded.preview.length,0);
 assert(loaded.count>0);
 assert(loaded.bounds.maxX>=loaded.bounds.minX);
 assert.equal(w.messages.slice(before).filter(m=>m.stage==='decompress').length,0,
   'El mosaico no debe descomprimir LAZ para generar una vista previa descartable');
 assert.equal(w.messages.slice(before).filter(m=>m.stage==='read').length,0);
 await w.send({type:'area-add',sessionId,jobId:275});
 const tile=w.messages.findLast(m=>m.type==='area-tile-done');
 assert(tile,'El segundo paso debe analizar la nube');
 assert.equal(tile.points,loaded.count);
 assert.equal(w.messages.filter(m=>m.stage==='area').length>0,true,
   'La descompresión ocurre únicamente al procesar el área');
 await w.send({type:'area-finish',sessionId,jobId:276});
 const area=w.messages.findLast(m=>m.type==='area-finished');
 assert(area&&area.points===loaded.count);
});

test('carga LiDAR independiente mantiene la vista previa tras optimizar mosaicos',async()=>{
 const w=makeWorker(),loaded=await w.load('1815.laz');
 assert.equal(loaded.headerOnly,undefined);
 assert(loaded.preview.length>3);
 assert(w.messages.some(m=>m.stage==='decompress'));
});

test('mosaico LAS omite la lectura preliminar aun con más de un archivo',async()=>{
 const w=makeWorker(),sessionId=277;
 await w.send({type:'area-start',sessionId,terrainCell:4,vegetationCell:4});
 for(let i=0;i<2;i++){
   const before=w.messages.length;
   const loaded=await w.load('1815.las',sessionId);
   assert.equal(loaded.headerOnly,true);
   assert(!w.messages.slice(before).some(m=>m.type==='progress'));
   await w.send({type:'area-add',sessionId,jobId:278+i});
 }
 await w.send({type:'area-finish',sessionId,jobId:280});
 const area=w.messages.findLast(m=>m.type==='area-finished');
 assert(area&&area.tiles===2);
});

function vegetationHeightHarness(){
 const start=workerSource.indexOf('function vegetationBin(');
 const end=workerSource.indexOf('async function analysis(',start);
 assert(start>=0&&end>start,'No existe el motor de altura de vegetación');
 const script=workerSource.slice(start,end)+'\n({vegetationBin,vegetationRows})';
 const {vegetationBin,vegetationRows}=vm.runInNewContext(script);
 const grid={cell:.5,cells:new Map(),insert(x,y,make,update){
  const i=Math.floor(x/this.cell),j=Math.floor(y/this.cell),key=i+','+j;
  let row=this.cells.get(key);
  if(!row){row=make(i,j);this.cells.set(key,row)}
  update(row);
 }};
 const point=(i,j,z,cls)=>vegetationBin(grid,(i+.5)*grid.cell,
  (j+.5)*grid.cell,z,cls);
 const find=(i,j)=>vegetationRows(grid).find(r=>
  r.x===(i+.5)*grid.cell&&r.y===(j+.5)*grid.cell);
 return {point,find,grid,vegetationRows};
}
test('copa sin suelo en su celda recibe altura desde suelo vecino consistente (0,5 m)',()=>{
 const h=vegetationHeightHarness();
 h.point(0,0,100,2);h.point(0,1,100,2);
 h.point(1,0,100,2);h.point(2,0,100,2);
 h.point(1,1,110,5);
 const r=h.find(1,1);
 assert.equal(r.ground_min_z,null,'El suelo observado original sigue ausente');
 assert.equal(r.estimated_ground_z_m,100);
 assert.equal(r.ground_height_source,'nearby_estimate');
 assert.equal(r.canopy_max_above_ground_m,10);
 assert.equal(r.canopy_mean_above_ground_m,10);
 assert(r.ground_estimation_support_cells>=3);
 const streamed=[];
 const result=h.vegetationRows(h.grid,row=>streamed.push(row));
 assert.equal(result,null,'Feature Map no reserva otro vector de filas');
 assert.equal(streamed.length,h.grid.cells.size);
 assert.equal(JSON.stringify(streamed.map(x=>x.x).sort((a,b)=>a-b)),
  JSON.stringify(h.vegetationRows(h.grid).map(x=>x.x).sort((a,b)=>a-b)));
});
test('suelo medido prevalece y nunca se sustituye por interpolación',()=>{
 const h=vegetationHeightHarness();
 h.point(0,0,99,2);h.point(0,0,109,5);
 h.point(1,0,101,2);h.point(0,1,100,2);
 const r=h.find(0,0);
 assert.equal(r.ground_min_z,99);
 assert.equal(r.ground_height_source,'observed');
 assert.equal(r.estimated_ground_z_m,null);
 assert.equal(r.canopy_max_above_ground_m,10);
});
test('no inventa alturas de vegetación sin suelo cercano o sobre terreno contradictorio',()=>{
 const isolated=vegetationHeightHarness();
 isolated.point(7,7,114,5);
 assert.equal(isolated.find(7,7).canopy_max_above_ground_m,null);
 assert.equal(isolated.find(7,7).ground_height_source,'unknown');
 const steep=vegetationHeightHarness();
 steep.point(0,0,100,2);
 steep.point(0,1,106,2);
 steep.point(1,0,111,2);
 steep.point(1,1,115,5);
 assert.equal(steep.find(1,1).canopy_max_above_ground_m,null,
  'No estimar altura en terreno escarpado sin base fiable');
});
test('Feature Map comparte alturas de vegetación locales sin modificar LiDAR original',()=>{
 assert(workerSource.includes('vegetationRows(grid,r=>{'),
  'Feature Map debe usar la altura de suelo cercano con control de calidad');
 assert(workerSource.includes('if(!Number.isFinite(h)||r.vegetation_points<=0)return;'));
 assert(workerSource.includes("vegetationBin(grid,x,y,z,cls,cloud.meta.minor>=4),'feature-ground'"),
  'No tratar clase 11 de LAS anterior a 1.4 como carretera');
 assert(workerSource.includes('measuredGroundCells:measuredCells,estimatedGroundCells:estimatedCells'),
  'Feature Map debe informar alturas de suelo medido y estimado');
});

test('CSV LiDAR conserva columna de suelo y distingue alturas estimadas',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert(html.includes("k==='ground_z_min'?(r.ground_min_z??'')"),
  'La columna ground_z_min no debe quedar vacía al exportar');
 assert(html.includes("'vegetation_return_fraction','ground_height_source','estimated_ground_z_m','ground_estimation_support_cells'"),
  'Las teselas deben exportar la procedencia de la altura de vegetación');
 assert(html.includes('row.ground_height_source,row.estimated_ground_z_m,row.ground_estimation_support_cells'),
  'Los valores de teselas deben coincidir con su cabecera');
 assert(html.includes('function vegetationHeightQuality(rows)'),
  'La interfaz debe resumir suelo medido, estimado y desconocido');
 assert(html.includes('vegetationHeightQuality(vegetationRows)'));
});

function syntheticPnoa14Format8() {
  // LAS 1.4 / formato 8 (38 bytes por punto), como las teselas PNOA.
  // Los puntos son artificiales para validar la decodificación de clase y altura.
  const originX=384000,originY=4114000,originZ=650,cell=.5;
  const points=[
    {i:0,j:0,z:650,cls:2},{i:0,j:1,z:650,cls:2},
    {i:1,j:0,z:650,cls:2},{i:2,j:0,z:650,cls:2},
    {i:1,j:1,z:658,cls:5},
    {i:3,j:0,z:651,cls:6}, // Edificio, nunca copa.
    {i:3,j:1,z:650,cls:9}, // Agua.
    {i:3,j:2,z:652,cls:11} // Carretera, clase LAS 1.4.
  ];
  const buf=new Uint8Array(375+points.length*38),dv=new DataView(buf.buffer);
  dv.setUint32(0,0x4653414c,true);
  dv.setUint8(24,1);dv.setUint8(25,4);
  dv.setUint16(94,375,true);dv.setUint32(96,375,true);
  dv.setUint8(104,8);dv.setUint16(105,38,true);
  dv.setBigUint64(247,BigInt(points.length),true);
  for(const i of [131,139,147])dv.setFloat64(i,.001,true);
  dv.setFloat64(155,originX,true);dv.setFloat64(163,originY,true);
  dv.setFloat64(171,originZ,true);
  for(const [k,p] of points.entries()) {
    const at=375+k*38,x=originX+(p.i+.5)*cell,y=originY+(p.j+.5)*cell;
    dv.setInt32(at,Math.round((x-originX)/.001),true);
    dv.setInt32(at+4,Math.round((y-originY)/.001),true);
    dv.setInt32(at+8,Math.round((p.z-originZ)/.001),true);
    dv.setUint8(at+14,1);
    dv.setUint8(at+16,p.cls);
  }
  dv.setFloat64(179,originX+2,true);
  dv.setFloat64(187,originX,true);
  dv.setFloat64(195,originY+2,true);
  dv.setFloat64(203,originY,true);
  dv.setFloat64(211,660,true);
  dv.setFloat64(219,649,true);
  return buf;
}
test('formato 8 PNOA LAS 1.4 calcula el suelo cercano, alturas y Feature Map a 0,5 m',async()=>{
 const worker=makeWorker(),loaded=await worker.loadBytes(syntheticPnoa14Format8());
 assert.equal(loaded.version,'1.4');
 assert.equal(loaded.format,8);
 assert.equal(loaded.count,8);
 await worker.send({type:'terrain',jobId:1200,options:{cell:.5,minCount:1}});
 const terrain=worker.messages.findLast(m=>m.jobId===1200&&(m.type==='terrain'||m.type==='error'));
 assert.equal(terrain.type,'terrain',JSON.stringify(terrain));
 assert.equal(terrain.matchingPoints,4);
 assert.equal(terrain.candidates.length,4);
 await worker.send({type:'vegetation',jobId:1201,options:{cell:.5}});
 const veg=worker.messages.findLast(m=>m.jobId===1201&&(m.type==='vegetation'||m.type==='error'));
 assert.equal(veg.type,'vegetation',JSON.stringify(veg));
 assert.equal(veg.classifiedPoints,8);
 assert.match(veg.quality,/estimado/);
 const cell=veg.rows.find(r=>r.vegetation_points===1);
 assert(cell,'La copa sin retorno de suelo debe formar una celda');
 assert.equal(cell.ground_min_z,null,'Suelo original nunca alterado');
 assert.equal(cell.estimated_ground_z_m,650);
 assert.equal(cell.ground_height_source,'nearby_estimate');
 assert.equal(cell.canopy_max_above_ground_m,8);
 assert(cell.ground_estimation_support_cells>=3);
 assert.equal(veg.rows.reduce((n,r)=>n+r.building_points,0),1);
 assert.equal(veg.rows.reduce((n,r)=>n+r.water_points,0),1);
 assert.equal(veg.rows.reduce((n,r)=>n+r.road_points,0),1);
 await worker.send({type:'feature-map',jobId:1202,
   options:{cell:.5,minHeight:1,maxHeight:20}});
 const feature=worker.messages.findLast(m=>m.jobId===1202&&(m.type==='feature-map'||m.type==='error'));
 assert.equal(feature.type,'feature-map',JSON.stringify(feature));
 assert.equal(feature.cells.height.length,1);
 assert.equal(feature.cells.height[0],8);
 assert.equal(feature.measuredGroundCells,0);
 assert.equal(feature.estimatedGroundCells,1);
 assert.equal(feature.cells.i[0],Math.round(cell.x/.5-.5));
 assert.equal(feature.cells.j[0],Math.round(cell.y/.5-.5));
});
