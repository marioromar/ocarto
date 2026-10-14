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
  const bounds={minX:h.min[0],maxX:h.max[0],minY:h.min[1],maxY:h.max[1]},queue=[rootPage],seenPages=new Set(),session=options.session;
  const aoiBounds=session.aoi?.bounds;
  if(aoiBounds&&(bounds.minX>aoiBounds.maxX||bounds.maxX<aoiBounds.minX||bounds.minY>aoiBounds.maxY||bounds.maxY<aoiBounds.minY))return{bounds,points:0,acceptedPoints:0,nodes:0,pages:0,meta,skipped:true};
  const mod=await options.getDecoder();
  let visitedPoints=0,acceptedPoints=0,visitedNodes=0;
  let pageIndex=0;while(pageIndex<queue.length){
   if(options.cancelled())throw Object.assign(Error('Mosaico cancelado'),{name:'AbortError'});
   const page=queue[pageIndex++],pageId=page.pageOffset+':'+page.pageLength;
   if(seenPages.has(pageId))continue;
   seenPages.add(pageId);if(seenPages.size>100000)throw Error('La jerarquía COPC supera el límite de 100.000 páginas');
   const {nodes,pages}=await api.loadHierarchyPage(get,page);
   for(const [key,node] of Object.entries(nodes)){
    if(!node.pointCount||!intersectsNode(key,copc.info,session.aoi?.bounds))continue;
    if(!Number.isSafeInteger(node.pointDataOffset)||!Number.isSafeInteger(node.pointDataLength)||node.pointDataOffset<0||node.pointDataLength<1||node.pointDataOffset+node.pointDataLength>file.size)throw Error('Un bloque de puntos COPC contiene offsets no válidos');
    if(++visitedNodes>1000000)throw Error('COPC supera el límite de 1.000.000 de bloques');
    const data=await api.loadPointDataBuffer(get,h,node,mod),dv=new DataView(data.buffer,data.byteOffset,data.byteLength);
    if(data.byteLength!==node.pointCount*recordLength)throw Error('El bloque COPC descomprimido tiene una longitud inesperada');
    for(let i=0;i<node.pointCount;i++){
     if(options.cancelled())throw Object.assign(Error('Mosaico cancelado'),{name:'AbortError'});
     const p=i*recordLength,x=dv.getInt32(p,true)*meta.sx+meta.ox,y=dv.getInt32(p+4,true)*meta.sy+meta.oy,z=dv.getInt32(p+8,true)*meta.sz+meta.oz;
     const cls=dv.getUint8(p+16),intensity=dv.getUint16(p+12,true),ret=dv.getUint8(p+14)&15;
     if(options.addPoint(x,y,z,cls,intensity,ret))acceptedPoints++;
     visitedPoints++;
     if(visitedPoints%50000===0){options.progress(visitedPoints,h.pointCount,acceptedPoints);await options.yield()}
    }
    options.progress(visitedPoints,h.pointCount,acceptedPoints);
   }
   for(const [key,childPage] of Object.entries(pages))if(intersectsNode(key,copc.info,session.aoi?.bounds))queue.push(childPage);
   await options.yield();
  }
  return{bounds,points:visitedPoints,acceptedPoints,nodes:visitedNodes,pages:seenPages.size,meta};
 }
 root.OcartoCopcArea={process};
})(typeof self!=='undefined'?self:globalThis);
