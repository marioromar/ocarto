/* Ocarto LiDAR worker: streamed LAS + laz-perf WebAssembly LAZ decoder. */
let cloud=null,activeDetection=null,activeLoad=null;
const fail=(message,operation)=>postMessage({type:'error',message,operation});
const yieldWorker=()=>new Promise(resolve=>setTimeout(resolve,0));
function readHeader(buffer){
 if(!buffer||typeof buffer.byteLength!=="number"||buffer.byteLength<227)throw Error('Cabecera LAS incompleta (mínimo 227 bytes)');
 const d=new DataView(buffer);if(d.getUint32(0,true)!==0x4653414c)throw Error('Cabecera LAS inválida');
 const major=d.getUint8(24),minor=d.getUint8(25),flags=d.getUint8(104),format=flags&63,compressed=!!(flags&0xc0),recordLength=d.getUint16(105,true);
 const offset=d.getUint32(96,true);let count=d.getUint32(107,true);
 if(major===1&&minor>=4&&d.byteLength>=255){const extended=Number(d.getBigUint64(247,true));if(extended)count=extended}
 const minLength={0:20,1:28,2:26,3:34,4:57,5:63,6:30,7:36,8:38,9:59,10:67}[format];
 if(!minLength)throw Error(`Formato de punto LAS ${format} no soportado todavía`);
 if(!Number.isSafeInteger(count)||count<1||recordLength<minLength||offset>=buffer.byteLength)throw Error('Cabecera LAS inconsistente o archivo incompleto');
 const sx=d.getFloat64(131,true),sy=d.getFloat64(139,true),sz=d.getFloat64(147,true),ox=d.getFloat64(155,true),oy=d.getFloat64(163,true),oz=d.getFloat64(171,true);
 if(![sx,sy,sz,ox,oy,oz].every(Number.isFinite)||!sx||!sy||!sz)throw Error('Escalas u offsets LAS inválidos');
 if(!compressed&&offset+count*recordLength>buffer.byteLength)throw Error('Tamaño de registros LAS inconsistente o archivo incompleto');
 return{major,minor,format,compressed,recordLength,offset,count,sx,sy,sz,ox,oy,oz};
}
function previewWriter(count){const stride=Math.max(1,Math.ceil(count/60000)),preview=new Float64Array(Math.ceil(count/stride)*3);let at=0;return{preview,add(i,x,y,z){if(i%stride===0){preview[at++]=x;preview[at++]=y;preview[at++]=z}}}}
function finishLoad(bounds,meta,buffer,sample,storedCloud=null){const previous=cloud;cloud=storedCloud||{buffer,meta,bounds};if(previous&&previous!==cloud)releaseCloud(previous);postMessage({type:'loaded',count:meta.count,bounds,preview:sample.preview,format:meta.format,version:`${meta.major}.${meta.minor}${meta.compressed?' LAZ':''}`},[sample.preview.buffer])}
function releaseCloud(state){if(state?.laz?.mod&&state.laz.input){state.laz.mod._free(state.laz.input);state.laz.input=0}}
function openStoredLAZ(state){const laz=state?.laz;if(!laz?.mod||!laz.input||!laz.byteLength)throw Error('El LAZ conservado en memoria ya no está disponible');const decoder=new laz.mod.LASZip();try{decoder.open(laz.input,laz.byteLength);return{mod:laz.mod,decoder}}catch(e){try{decoder.delete()}catch(_){}throw e}}
async function readLAS(buffer,meta,job){const d=new DataView(buffer),sample=previewWriter(meta.count);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;const batch=100000;for(let start=0;start<meta.count;start+=batch){if(job.cancelled)break;const end=Math.min(meta.count,start+batch);for(let i=start,p=meta.offset+start*meta.recordLength;i<end;i++,p+=meta.recordLength){const x=d.getInt32(p,true)*meta.sx+meta.ox,y=d.getInt32(p+4,true)*meta.sy+meta.oy,z=d.getInt32(p+8,true)*meta.sz+meta.oz;if(![x,y,z].every(Number.isFinite))throw Error(`Coordenada LAS no finita en punto ${i}`);if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;sample.add(i,x,y,z)}postMessage({type:'progress',done:end,total:meta.count,stage:'read'});await yieldWorker()}if(job.cancelled){postMessage({type:'cancelled',jobId:job.id,operation:'load'});return}finishLoad({minX,maxX,minY,maxY},meta,buffer,sample)}
// laz-perf 3.4.0 is vendored locally under Apache-2.0; no remote scripts are fetched.
let lazModulePromise;
async function lazModule(){
 if(!lazModulePromise)lazModulePromise=(async()=>{
  try{importScripts('vendor/laz-perf.js')}catch(e){throw Error('Falta vendor/laz-perf.js. Ejecuta npm run vendor:laz-perf para instalar laz-perf 3.4.0 y su WASM.')}
  const factory=self.createLazPerf;
  if(typeof factory!=='function')throw Error('laz-perf 3.4.0 no expone createLazPerf');
  const mod=await factory({locateFile:name=>'vendor/'+name});
  if(!mod.LASZip||!mod._malloc||!mod._free||!mod.HEAPU8)throw Error('API de laz-perf 3.4.0 incompatible');
  return mod;
 })();
 try{return await lazModulePromise}catch(e){lazModulePromise=null;throw e}
}
async function readLAZ(buffer,meta,job){
 const count=meta.count,recordLength=meta.recordLength,format=meta.format,sample=previewWriter(count);
 const mod=await lazModule();if(job.cancelled){postMessage({type:'cancelled',jobId:job.id,operation:'load'});return}let input=0,point=0,decoder=null,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,keepInput=false;
 try{
  input=mod._malloc(buffer.byteLength);if(!input)throw Error('Memoria insuficiente para descomprimir LAZ');
  mod.HEAPU8.set(new Uint8Array(buffer),input);
  decoder=new mod.LASZip();decoder.open(input,buffer.byteLength);
  const decodedCount=decoder.getCount(),decodedLength=decoder.getPointLength(),decodedFormat=decoder.getPointFormat();
  if(decodedCount!==count)throw Error(`El número de puntos LAZ no coincide: ${decodedCount} frente a ${count}`);
  if(decodedLength!==recordLength||decodedFormat!==format)throw Error('La cabecera LAZ no coincide con el decodificador');
  point=mod._malloc(decodedLength);if(!point)throw Error('Memoria insuficiente para registros LAZ');
  for(let i=0;i<count;i++){
   if(job.cancelled)break;
   decoder.getPoint(point);
   const v=new DataView(mod.HEAPU8.buffer,point,decodedLength);
   const xx=v.getInt32(0,true)*meta.sx+meta.ox,yy=v.getInt32(4,true)*meta.sy+meta.oy,zz=v.getInt32(8,true)*meta.sz+meta.oz;
   if(!Number.isFinite(xx)||!Number.isFinite(yy)||!Number.isFinite(zz))throw Error(`Coordenada LAZ no finita en punto ${i}`);
   if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(yy<minY)minY=yy;if(yy>maxY)maxY=yy;
   sample.add(i,xx,yy,zz);if(i&&i%100000===0){postMessage({type:'progress',done:i,total:count,stage:'decompress'});await yieldWorker()}
  }
  keepInput=!job.cancelled;
 }finally{
  if(decoder){try{decoder.delete()}catch(_){}}
  if(point)mod._free(point);if(input&&!keepInput)mod._free(input);
 }
 if(job.cancelled){postMessage({type:'cancelled',jobId:job.id,operation:'load'});return}
 finishLoad({minX,maxX,minY,maxY},meta,null,sample,{buffer:null,meta,bounds:{minX,maxX,minY,maxY},laz:{mod,input,byteLength:buffer.byteLength}});
}
// LAS classification is stored at byte 15 (formats 0–5, low five bits)
// or byte 16 (formats 6–10, full eight bits).
function pointClass(v,format){return format<=5?v.getUint8(15)&31:v.getUint8(16)}
function acceptsClass(code,filter){
 if(filter==='all')return true;
 if(filter==='ground')return code===2;
 if(filter==='vegetation')return code>=3&&code<=5;
 if(filter==='unclassified')return code===0||code===1;
 throw Error('Filtro de clasificación LAS inválido');
}
function detectorFor(opts){
 const cell=Number(opts.cell),minZ=Number(opts.minZ),maxZ=Number(opts.maxZ),minCount=Number(opts.minCount);
 if(!Number.isFinite(cell)||cell<=0||Number.isNaN(minZ)||Number.isNaN(maxZ)||maxZ<minZ||!Number.isInteger(minCount)||minCount<1)throw Error('Parámetros LiDAR inválidos');
 opts={...opts,cell,minZ,maxZ,minCount};
 if(opts.mode==='terrain'&&opts.classFilter!=='ground')throw Error('El modelo de terreno requiere puntos clasificados como suelo (clase 2)');
 acceptsClass(0,opts.classFilter||'all');
 let terrainCellCount=0;const bins=new Map(),get=(x,y)=>bins.get(x)?.get(y);
 return{addPoint(x,y,z,i){if(z<opts.minZ||z>opts.maxZ)return;const cx=Math.floor(x/opts.cell),cy=Math.floor(y/opts.cell);let row=bins.get(cx);if(!row)bins.set(cx,row=new Map());let b=row.get(cy);if(!b){if(opts.mode==='terrain'&&terrainCellCount>=100000)throw Error('Demasiadas celdas de terreno: aumenta el tamaño de celda (máximo 100 000)');row.set(cy,{x,y,z,i,n:1,cx,cy});if(opts.mode==='terrain')terrainCellCount++}else{b.n++;if(opts.mode==='terrain'?(z<b.z||(z===b.z&&i<b.i)):(z>b.z||(z===b.z&&i<b.i)))Object.assign(b,{x,y,z,i})}},finish(){const candidates=[],tiles=new Map();for(const row of bins.values())for(const b of row.values()){const tx=Math.floor(b.cx/128),ty=Math.floor(b.cy/128),key=tx+','+ty;if(!tiles.has(key))tiles.set(key,[]);tiles.get(key).push(b)}for(const group of tiles.values())for(const b of group){if(b.n<opts.minCount)continue;if(opts.localMax){let ok=true;for(let dy=-1;dy<=1&&ok;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const n=get(b.cx+dx,b.cy+dy);if(n&&n.n>=opts.minCount&&(n.z>b.z||(n.z===b.z&&n.i<b.i))){ok=false;break}}if(!ok)continue}candidates.push([b.x,b.y,b.z,b.n])}return{candidates,cells:[...bins.values()].reduce((n,r)=>n+r.size,0),tiles:tiles.size}}};
}
async function detect(opts,job){
 if(activeLoad)throw Error('Espera a que termine la carga LAS/LAZ');
 if(!cloud)throw Error('Importa primero una nube LAS o LAZ');
 const {buffer,meta}=cloud,det=detectorFor(opts),batch=100000;let decoder=null,mod=null,point=0,matchingPoints=0;const classFilter=opts.classFilter||'all';
 try{let d=null,v=null;if(meta.compressed){const opened=openStoredLAZ(cloud);mod=opened.mod;decoder=opened.decoder;point=mod._malloc(meta.recordLength);if(!point)throw Error('Memoria insuficiente para registros LAZ');v=new DataView(mod.HEAPU8.buffer,point,meta.recordLength)}else d=new DataView(buffer);
 for(let start=0;start<meta.count;start+=batch){if(job.cancelled)break;const end=Math.min(meta.count,start+batch);for(let i=start;i<end;i++){let x,y,z;if(meta.compressed){decoder.getPoint(point);x=v.getInt32(0,true)*meta.sx+meta.ox;y=v.getInt32(4,true)*meta.sy+meta.oy;z=v.getInt32(8,true)*meta.sz+meta.oz;if(!acceptsClass(pointClass(v,meta.format),classFilter))continue}else{const p=meta.offset+i*meta.recordLength;x=d.getInt32(p,true)*meta.sx+meta.ox;y=d.getInt32(p+4,true)*meta.sy+meta.oy;z=d.getInt32(p+8,true)*meta.sz+meta.oz;if(!acceptsClass((meta.format<=5?d.getUint8(p+15)&31:d.getUint8(p+16)),classFilter))continue}matchingPoints++;det.addPoint(x,y,z,i)}postMessage({type:'progress',done:end,total:meta.count,stage:opts.mode==='terrain'?'terrain':'detect'});await yieldWorker()}
 }finally{if(decoder){try{decoder.delete()}catch(_){}}if(point)mod._free(point)}
 if(job.cancelled){postMessage({type:'cancelled',jobId:job.id});return}postMessage({type:opts.mode==='terrain'?'terrain':'detected',jobId:job.id,matchingPoints,classFilter,cellSize:opts.cell,...det.finish()});
}


// Two-stage reporting from the same original LAS/LAZ points, retaining only cell summaries.
// Ground minimum and vegetation maximum are relative within each raster cell.
async function analyzeVegetation(opts,job){
 if(activeLoad)throw Error('Espera a que termine la carga LAS/LAZ');
 if(!cloud)throw Error('Importa primero una nube LAS o LAZ');
 importScripts('vegetation-lidar.js');
 if(typeof self.OcartoVegetation?.create!=='function')throw Error('No está disponible vegetation-lidar.js');
 const {buffer,meta}=cloud,store=self.OcartoVegetation.create(Number(opts.cell)),batch=100000;
 let decoder=null,mod=null,point=0;
 try{
  let d=null,v=null;
  if(meta.compressed){const opened=openStoredLAZ(cloud);mod=opened.mod;decoder=opened.decoder;point=mod._malloc(meta.recordLength);if(!point)throw Error('Memoria insuficiente LAZ');v=new DataView(mod.HEAPU8.buffer,point,meta.recordLength)}else d=new DataView(buffer);
  for(let start=0;start<meta.count;start+=batch){if(job.cancelled)break;const end=Math.min(meta.count,start+batch);
   for(let i=start;i<end;i++){
    if(meta.compressed){decoder.getPoint(point);const cls=pointClass(v,meta.format);if(![2,3,4,5,6,14,15].includes(cls))continue;
     store.add(v.getInt32(0,true)*meta.sx+meta.ox,v.getInt32(4,true)*meta.sy+meta.oy,v.getInt32(8,true)*meta.sz+meta.oz,cls,v.getUint16(12,true),meta.format<=5?v.getUint8(14)&7:v.getUint8(14)&15);
    }else{const p=meta.offset+i*meta.recordLength,cls=meta.format<=5?d.getUint8(p+15)&31:d.getUint8(p+16);if(![2,3,4,5,6,14,15].includes(cls))continue;
     store.add(d.getInt32(p,true)*meta.sx+meta.ox,d.getInt32(p+4,true)*meta.sy+meta.oy,d.getInt32(p+8,true)*meta.sz+meta.oz,cls,d.getUint16(p+12,true),meta.format<=5?d.getUint8(p+14)&7:d.getUint8(p+14)&15);
    }
   }
   postMessage({type:'progress',done:end,total:meta.count,stage:'vegetation'});await yieldWorker();
  }
 }finally{if(decoder){try{decoder.delete()}catch(_){}}if(point)mod._free(point)}
 if(job.cancelled){postMessage({type:'cancelled',jobId:job.id,operation:'vegetation'});return}
 const result=store.finish();postMessage({type:'vegetation',jobId:job.id,cellSize:result.cellSize,cells:result.cells,classifiedPoints:result.processed,rows:result.rows,quality:result.quality});
}

onmessage=async e=>{const {type,jobId}=e.data;if(type==='cancel'){if(activeLoad?.id===jobId)activeLoad.cancelled=true;if(activeDetection?.id===jobId)activeDetection.cancelled=true;return}const loading=type==='load';let acceptedLoad=false;try{if(loading){if(activeLoad||activeDetection)throw Error('Espera a que termine la operación LiDAR actual');acceptedLoad=true;const b=e.data.buffer,meta=readHeader(b),job={id:jobId||0,cancelled:false};activeLoad=job;if(meta.compressed)await readLAZ(b,meta,job);else await readLAS(b,meta,job);if(activeLoad===job)activeLoad=null}else if(type==='detect'||type==='terrain'||type==='vegetation'){if(activeDetection)throw Error('Ya hay un análisis en curso');const job={id:jobId||0,cancelled:false};activeDetection=job;try{if(type==='vegetation')await analyzeVegetation(e.data.options,job);else await detect(type==='terrain'?{...e.data.options,mode:'terrain',classFilter:'ground',localMax:false}:e.data.options,job)}finally{if(activeDetection===job)activeDetection=null}}}catch(err){if(loading&&acceptedLoad){activeLoad=null}fail(err.message||String(err),loading?'load':type)}};
