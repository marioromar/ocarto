const fs=require('fs'),vm=require('vm'),assert=require('assert');
const messages=[];
const ctx={postMessage:m=>messages.push(m),Float64Array,DataView,Uint8Array,Map,Number,Math,Error,Promise,setTimeout};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../lidar-worker.js'),'utf8'),ctx);
function las(points){const size=227+points.length*20,b=new ArrayBuffer(size),d=new DataView(b);d.setUint32(0,0x4653414c,true);d.setUint8(24,1);d.setUint8(25,2);d.setUint8(104,0);d.setUint16(105,20,true);d.setUint32(96,227,true);d.setUint32(107,points.length,true);for(const off of [131,139,147])d.setFloat64(off,1,true);points.forEach((p,i)=>p.forEach((v,j)=>d.setInt32(227+i*20+j*4,v,true)));return b;}
async function send(data){await ctx.onmessage({data});return messages.at(-1)}
(async()=>{
 const loaded=await send({type:'load',buffer:las([[127,0,10],[128,0,20],[0,5,8]])});assert.equal(loaded.type,'loaded');assert.equal(loaded.count,3);
 let out=await send({type:'detect',options:{cell:1,minZ:0,maxZ:100,minCount:1,localMax:true}});assert.equal(out.type,'detected');assert.equal(out.candidates.length,2,'Halo debe comparar celdas en bordes de tesela');assert.equal(out.tiles,2);
 out=await send({type:'detect',options:{cell:1,minZ:0,maxZ:100,minCount:1,localMax:false}});assert.equal(out.candidates.length,3);
 // LAS 1.2 classes are at offset 15 and use the low five bits.
 const classesLas=las([[0,0,10],[1,0,11],[2,0,12],[3,0,13]]);
 const classesView=new DataView(classesLas);
 [2,3,5,1].forEach((c,i)=>classesView.setUint8(227+i*20+15,c));
 await send({type:'load',buffer:classesLas});
 for(const [classFilter,expected] of [['all',4],['ground',1],['vegetation',2],['unclassified',1]]){
  const result=await send({type:'detect',options:{cell:1,minZ:0,maxZ:100,minCount:1,classFilter}});
  assert.equal(result.candidates.length,expected,'Filtro de clase '+classFilter);
  assert.equal(result.matchingPoints,expected,'Conteo de puntos filtrados '+classFilter);
 }
 // Terrain grid must retain the LOWEST ground elevation per cell, not local maxima.
 const terrainLas=las([[0,0,20],[0,0,9],[0,0,4],[1,0,15],[1,0,8],[2,0,5]]);
 const terrainView=new DataView(terrainLas);
 [2,2,3,2,2,1].forEach((c,i)=>terrainView.setUint8(227+i*20+15,c));
 await send({type:'load',buffer:terrainLas});
 let terrain=await send({type:'terrain',jobId:29,options:{cell:1,minCount:2,minZ:-Infinity,maxZ:Infinity}});
 assert.equal(terrain.type,'terrain');assert.equal(terrain.matchingPoints,4);assert.equal(terrain.cells,2);
 assert.equal(terrain.candidates.length,2);assert.equal(terrain.candidates.find(p=>p[0]===0)[2],9);
 assert.equal(terrain.candidates.find(p=>p[0]===1)[2],8);
 terrain=await send({type:'terrain',jobId:30,options:{cell:1,minCount:3,minZ:-Infinity,maxZ:Infinity}});
 assert.equal(terrain.candidates.length,0,'No exportar celdas con menos puntos de los exigidos');
 await send({type:'load',buffer:classesLas});
 out=await send({type:'detect',options:{cell:1,minZ:0,maxZ:100,minCount:1,classFilter:'bad'}});assert.equal(out.type,'error');
 // LAS 1.4 classes are full bytes at offset 16; class 34 must not become ground class 2.
 const modern=new ArrayBuffer(375+3*30),modernView=new DataView(modern);
 modernView.setUint32(0,0x4653414c,true);modernView.setUint8(24,1);modernView.setUint8(25,4);modernView.setUint8(104,6);modernView.setUint16(105,30,true);modernView.setUint32(96,375,true);modernView.setUint32(107,3,true);
 for(const off of [131,139,147])modernView.setFloat64(off,1,true);
 for(let i=0;i<3;i++){modernView.setInt32(375+i*30,i,true);modernView.setUint8(375+i*30+16,[2,34,4][i]);}
 await send({type:'load',buffer:modern});
 out=await send({type:'detect',options:{cell:1,minZ:0,maxZ:100,minCount:1,classFilter:'ground'}});assert.equal(out.matchingPoints,1);
 out=await send({type:'detect',options:{cell:1,minZ:0,maxZ:100,minCount:1,classFilter:'vegetation'}});assert.equal(out.matchingPoints,1);
 await send({type:'load',buffer:las([[127,0,10],[128,0,20],[0,5,8]])});
 out=await send({type:'detect',options:{cell:0,minZ:0,maxZ:100,minCount:1}});assert.equal(out.type,'error');
 out=await send({type:'load',buffer:new ArrayBuffer(5)});assert.equal(out.type,'error');
 out=await send({type:'detect',options:{cell:1,minZ:0,maxZ:100,minCount:1}});assert.equal(out.type,'detected','Debe conservar la nube anterior tras una carga fallida');assert.equal(out.candidates.length,3);
 for(const [fmt,len] of [[4,57],[5,63],[9,59],[10,67]]){
  const b=new ArrayBuffer(375+len),d=new DataView(b);d.setUint32(0,0x4653414c,true);d.setUint8(24,1);d.setUint8(25,4);d.setUint8(104,fmt);d.setUint16(105,len,true);d.setUint32(96,375,true);d.setUint32(107,1,true);for(const off of [131,139,147])d.setFloat64(off,1,true);d.setInt32(375,25,true);d.setInt32(379,30,true);d.setInt32(383,35,true);const r=await send({type:'load',buffer:b});assert.equal(r.type,'loaded');assert.equal(r.count,1);assert.equal(r.format,fmt);
 }
 for(const flag of [0x40,0x80]){const b=las([[1,2,3]]),d=new DataView(b);d.setUint8(104,flag);const r=await send({type:'load',buffer:b});assert.equal(r.type,'error');assert.match(r.message,/laz-perf/i,'El indicador de compresión debe dirigir al decodificador LAZ');}
 const count=200001,b=new ArrayBuffer(227+count*20),d=new DataView(b);d.setUint32(0,0x4653414c,true);d.setUint8(24,1);d.setUint8(25,2);d.setUint16(105,20,true);d.setUint32(96,227,true);d.setUint32(107,count,true);for(const off of [131,139,147])d.setFloat64(off,1,true);
 const loading=ctx.onmessage({data:{type:'load',jobId:77,buffer:b}});await new Promise(resolve=>setTimeout(resolve,0));await ctx.onmessage({data:{type:'cancel',jobId:77}});await loading;assert.equal(messages.at(-1).type,'cancelled','La lectura LAS debe aceptar cancelación entre lotes');
 out=await send({type:'detect',options:{cell:1,minZ:0,maxZ:100,minCount:1}});assert.equal(out.type,'detected','Debe conservar la nube previa tras cancelar la carga');
 const largeLoad=await send({type:'load',buffer:b});assert.equal(largeLoad.type,'loaded');const pending=ctx.onmessage({data:{type:'detect',jobId:78,options:{cell:1,minZ:0,maxZ:100,minCount:1}}});await new Promise(resolve=>setTimeout(resolve,0));await ctx.onmessage({data:{type:'cancel',jobId:78}});await pending;assert.equal(messages.at(-1).type,'cancelled','El análisis debe aceptar cancelación entre lotes');
 const streamed=las([[12,34,56],[20,40,60]]),jobId=88;await ctx.onmessage({data:{type:'load-start',jobId,fileSize:streamed.byteLength}});assert.equal(messages.at(-1).type,'load-ready');
 const halves=[new Uint8Array(streamed,0,113),new Uint8Array(streamed,113)];let offset=0,sequence=0;for(const chunk of halves){sequence++;await ctx.onmessage({data:{type:'load-chunk',jobId,sequence,offset,chunk}});offset+=chunk.byteLength;assert.equal(messages.at(-1).type,'load-chunk-ack')}
 await ctx.onmessage({data:{type:'load-end',jobId}});assert.equal(messages.at(-1).type,'loaded','El Worker monta LAS a partir de fragmentos');assert.equal(messages.at(-1).jobId,jobId);assert.equal(messages.at(-1).count,2);
 console.log('OK: 21 comprobaciones de carga LAS, halo, detección, parámetros y errores');
})().catch(e=>{console.error(e);process.exitCode=1});
