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
  return Object.freeze({parseBounds,indexFiles,intersects,forWindow});
});
