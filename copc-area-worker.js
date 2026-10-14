/* COPC range reader for the Ocarto LiDAR worker.
 * COPC pages and point chunks are fetched by byte range from the browser File.
 */
(function(root){
 'use strict';
 function keyParts(key){return typeof key==='string'?key.split('-').map(Number):key}
 function intersectsNode(key,info,bounds){
  if(!bounds)return true;
  const [depth,nx,ny]=keyParts(key),cube=info.cube,side=cube[3]-cube[0],step=side/Math.pow(2,depth);
  const minX=cube[0]+nx*step,maxX=minX+step,minY=cube[1]+ny*step,maxY=minY+step;
  return minX<=bounds.maxX&&maxX>=bounds.minX&&minY<=bounds.maxY&&maxY>=bounds.minY;
 }
 function createGetter(file){
  return async function(begin,end){
   if(!Number.isSafeInteger(begin)||!Number.isSafeInteger(end)||begin<0||end<begin||end>file.size)throw Error('Rango COPC fuera del archivo');
   return new Uint8Array(await file.slice(begin,end).arrayBuffer());
  };
 }
 async function walkNodes(api,get,rootPage,info,bounds,options,onNode){
  const rootId=rootPage.pageOffset+':'+rootPage.pageLength,queue=[rootPage],seenPages=new Set(),queuedPages=new Set([rootId]);let pageIndex=0,nodes=0;
  while(pageIndex<queue.length){
   if(options.cancelled())throw Object.assign(Error('Mosaico cancelado'),{name:'AbortError'});
   const page=queue[pageIndex++],pageId=page.pageOffset+':'+page.pageLength;
   if(seenPages.has(pageId))continue;
   seenPages.add(pageId);if(seenPages.size>100000)throw Error('La jerarquía COPC supera el límite de 100.000 páginas');
   const parsed=await api.loadHierarchyPage(get,page);
   for(const [key,node] of Object.entries(parsed.nodes)){
    if(!node.pointCount||!intersectsNode(key,info,bounds))continue;
    if(!Number.isSafeInteger(node.pointCount)||node.pointCount<1)throw Error('Un bloque COPC contiene un conteo no válido');
    if(!Number.isSafeInteger(node.pointDataOffset)||!Number.isSafeInteger(node.pointDataLength)||node.pointDataOffset<0||node.pointDataLength<1)throw Error('Un bloque de puntos COPC contiene offsets no válidos');
    if(++nodes>1000000)throw Error('COPC supera el límite de 1.000.000 de bloques');
    await onNode(node);
   }
   for(const [key,childPage] of Object.entries(parsed.pages))if(intersectsNode(key,info,bounds)){
    const childId=childPage.pageOffset+':'+childPage.pageLength;
    if(!seenPages.has(childId)&&!queuedPages.has(childId)){
     queuedPages.add(childId);
     if(queuedPages.size>100000)throw Error('La jerarquía COPC supera el límite de 100.000 páginas');
     queue.push(childPage);
    }
   }
   await options.yield();
  }
  return{pages:seenPages.size,nodes};
 }
 async function process(file,options){
  if(!root.OcartoCopcLibrary?.Copc)throw Error('No se pudo cargar el lector COPC');
  if(!file||typeof file.slice!=='function'||!Number.isSafeInteger(file.size))throw Error('Archivo COPC no válido');
  const api=root.OcartoCopcLibrary.Copc,get=createGetter(file),copc=await api.create(get);
  const h=copc.header;
  if(h.majorVersion!==1||h.minorVersion!==4||h.pointDataRecordFormat<6||h.pointDataRecordFormat>8)throw Error('COPC requiere LAS 1.4 y formato de punto 6, 7 u 8');
  if(!Number.isSafeInteger(h.pointCount)||h.pointCount<1)throw Error('El conteo de puntos COPC no es válido');
  const rootPage=copc.info?.rootHierarchyPage;
  if(!rootPage||!Number.isSafeInteger(rootPage.pageOffset)||!Number.isSafeInteger(rootPage.pageLength)||rootPage.pageLength<32)throw Error('La jerarquía raíz COPC no es válida');
  const recordLength=h.pointDataRecordLength,meta={count:h.pointCount,recordLength,format:h.pointDataRecordFormat,sx:h.scale[0],sy:h.scale[1],sz:h.scale[2],ox:h.offset[0],oy:h.offset[1],oz:h.offset[2]};
  const bounds={minX:h.min[0],maxX:h.max[0],minY:h.min[1],maxY:h.max[1]},session=options.session,aoiBounds=session.aoi?.bounds;
  if(aoiBounds&&(bounds.minX>aoiBounds.maxX||bounds.maxX<aoiBounds.minX||bounds.minY>aoiBounds.maxY||bounds.maxY<aoiBounds.minY))return{bounds,points:0,acceptedPoints:0,nodes:0,pages:0,meta,skipped:true};
  let targetPoints=0;
  const candidateIndex=await walkNodes(api,get,rootPage,copc.info,aoiBounds,options,node=>{const next=targetPoints+node.pointCount;if(!Number.isSafeInteger(next)||next>h.pointCount)throw Error('La jerarquía COPC supera el conteo de la cabecera');targetPoints=next});
  if(!targetPoints)return{bounds,points:0,acceptedPoints:0,nodes:0,pages:candidateIndex.pages,meta,skipped:true};
  const mod=await options.getDecoder();
  let visitedPoints=0,acceptedPoints=0;
  const decodedIndex=await walkNodes(api,get,rootPage,copc.info,aoiBounds,options,async node=>{
    const dataEnd=node.pointDataOffset+node.pointDataLength;
    if(!Number.isSafeInteger(dataEnd)||dataEnd>file.size)throw Error('Un bloque de puntos COPC está fuera del archivo');
    const data=await api.loadPointDataBuffer(get,h,node,mod),dv=new DataView(data.buffer,data.byteOffset,data.byteLength);
    if(data.byteLength!==node.pointCount*recordLength)throw Error('El bloque COPC descomprimido tiene una longitud inesperada');
    for(let i=0;i<node.pointCount;i++){
     if(options.cancelled())throw Object.assign(Error('Mosaico cancelado'),{name:'AbortError'});
     const p=i*recordLength,x=dv.getInt32(p,true)*meta.sx+meta.ox,y=dv.getInt32(p+4,true)*meta.sy+meta.oy,z=dv.getInt32(p+8,true)*meta.sz+meta.oz;
     const cls=dv.getUint8(p+16),intensity=dv.getUint16(p+12,true),ret=dv.getUint8(p+14)&15;
     if(options.addPoint(x,y,z,cls,intensity,ret))acceptedPoints++;
     visitedPoints++;
     if(visitedPoints%50000===0){options.progress(visitedPoints,targetPoints,acceptedPoints);await options.yield()}
    }
    options.progress(visitedPoints,targetPoints,acceptedPoints);
  });
  if(visitedPoints!==targetPoints)throw Error('La jerarquía COPC cambió durante la lectura');
  return{bounds,points:visitedPoints,acceptedPoints,nodes:decodedIndex.nodes,pages:decodedIndex.pages,meta};
 }
 root.OcartoCopcArea={process};
})(typeof self!=='undefined'?self:globalThis);
