/* LiDAR source index: inspect only the public LAS header to avoid re-reading
   LAZ files that are wholly outside a processing window. Unknown/corrupt
   headers are NOT skipped: the real decoder remains responsible for errors. */
(function(root,factory) {
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.OcartoLidarSourceIndex=api;
})(typeof globalThis!=='undefined'?globalThis:this,function() {
  'use strict';
  const BYTES=227;
  function parseBounds(buffer) {
    if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<BYTES)return null;
    const d=new DataView(buffer);
    if(d.getUint32(0,true)!==0x4653414c||d.getUint8(24)!==1||
      d.getUint8(25)>4)return null;
    const bounds={maxX:d.getFloat64(179,true),minX:d.getFloat64(187,true),
      maxY:d.getFloat64(195,true),minY:d.getFloat64(203,true)};
    if(!Object.values(bounds).every(Number.isFinite)||
        bounds.maxX<bounds.minX||bounds.maxY<bounds.minY)return null;
    return bounds;
  }
  async function indexFiles(files,options={}) {
    const entries=[];
    for(const file of files){
      if(options.signal?.aborted)throw Object.assign(
        Error('Indexación LAS/LAZ cancelada'),{name:'AbortError'});
      let bounds=null;
      try {bounds=parseBounds(await file.slice(0,BYTES).arrayBuffer());}
      catch(error) {
        if(options.signal?.aborted)throw Object.assign(
          Error('Indexación LAS/LAZ cancelada'),{name:'AbortError'});
      }
      entries.push({file,bounds,verified:!!bounds});
      options.onProgress?.(entries.length,files.length,file.name);
    }
    return entries;
  }
  function intersects(bounds,window) {
    // Half-open windows [min,max): preserve points exactly on lower limits.
    if(!bounds)return true; // Never discard an unverified file.
    if(!window||![window.minX,window.maxX,window.minY,window.maxY]
      .every(Number.isFinite))throw Error('Ventana LiDAR no válida');
    return bounds.maxX>=window.minX&&bounds.minX<window.maxX&&
      bounds.maxY>=window.minY&&bounds.minY<window.maxY;
  }
  function forWindow(entries,window){
    const selected=[],skipped=[];
    for(const entry of entries){
      (intersects(entry.bounds,window)?selected:skipped).push(entry.file);
    }
    return {selected,skipped};
  }
  // Bounds calculated from LAS/LAZ headers, never from a guessed map extent.
  // Unreadable headers must not silently define a geographic processing area.
  function unionBounds(entries) {
    if(!Array.isArray(entries)||!entries.length||entries.some(e=>!e?.verified||!e.bounds))
      return null;
    const b={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
    for(const e of entries){
      b.minX=Math.min(b.minX,e.bounds.minX);
      b.maxX=Math.max(b.maxX,e.bounds.maxX);
      b.minY=Math.min(b.minY,e.bounds.minY);
      b.maxY=Math.max(b.maxY,e.bounds.maxY);
    }
    if(!Object.values(b).every(Number.isFinite)||b.minX>=b.maxX||b.minY>=b.maxY)
      return null;
    return b;
  }
  function envelopeAoi(b){
    if(!b||![b.minX,b.maxX,b.minY,b.maxY].every(Number.isFinite)||
      b.maxX<=b.minX||b.maxY<=b.minY)return null;
    return {bounds:{...b},rings:[[
      [b.minX,b.minY],[b.maxX,b.minY],
      [b.maxX,b.maxY],[b.minX,b.maxY]
    ]]};
  }
  // Exact same capacity estimate used by the worker's area-start.
  function needsTiling(bounds,terrainCell,vegetationCell,maxCells=1000000){
    if(!bounds||![bounds.minX,bounds.maxX,bounds.minY,bounds.maxY].every(Number.isFinite)||
      bounds.maxX<=bounds.minX||bounds.maxY<=bounds.minY)
      throw Error('Extensión LiDAR no válida para planificar el mosaico');
    if(![terrainCell,vegetationCell].every(c=>Number.isFinite(c)&&c>=.1))
      throw Error('Resolución LiDAR no válida para planificar el mosaico');
    const cells=c=>
      Math.ceil((bounds.maxX-bounds.minX)/c+1)*
      Math.ceil((bounds.maxY-bounds.minY)/c+1);
    return cells(terrainCell)>maxCells||cells(vegetationCell)>maxCells;
  }
  return Object.freeze({parseBounds,indexFiles,intersects,forWindow,
    unionBounds,envelopeAoi,needsTiling});
});
