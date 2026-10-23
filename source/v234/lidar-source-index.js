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
  // EPSG declarado en VLR GeoTIFF (34735) de LAS/LAZ; comprueba CRS
  // antes de descomprimir los millones de puntos. No inventar CRS si falta.
  function parseCrs(buffer) {
    if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<227)return null;
    const d=new DataView(buffer);
    if(d.getUint32(0,true)!==0x4653414c||d.getUint8(24)!==1)return null;
    const headerBytes=d.getUint16(94,true),numVlr=d.getUint32(100,true),
      pointOffset=d.getUint32(96,true);
    if(headerBytes<227||headerBytes>buffer.byteLength||numVlr>1000||
       pointOffset<headerBytes||pointOffset>buffer.byteLength)return null;
    let at=headerBytes;
    const declared={projected:new Set(),geographic:new Set()};
    for(let n=0;n<numVlr;n++){
      if(at+54>pointOffset)return null;
      const uid=Array.from(new Uint8Array(buffer,at+2,16))
        .map(x=>String.fromCharCode(x)).join('').replace(/\0.*$/,'').trim();
      const id=d.getUint16(at+18,true),length=d.getUint16(at+20,true);
      if(at+54+length>pointOffset)return null;
      if(uid==='LASF_Projection'&&id===34735&&length>=8){
        const geo=at+54,count=d.getUint16(geo+6,true);
        if(8+8*count>length)return null;
        for(let k=0;k<count;k++){
          const i=geo+8+k*8,key=d.getUint16(i,true),
            tag=d.getUint16(i+2,true),copies=d.getUint16(i+4,true),
            value=d.getUint16(i+6,true);
          if([3072,2048].includes(key)&&tag===0&&copies===1&&
             value>=1024&&value<=32766){
            // En GeoTIFF pueden aparecer simultáneamente 3072 (UTM) y
            // 2048 (el datum geográfico de base). Siempre preferir 3072.
            (key===3072?declared.projected:declared.geographic).add('EPSG:'+value);
          }
        }
      }
      at+=54+length;
    }
    if(declared.projected.size>1||declared.geographic.size>1)return null;
    return [...declared.projected][0]||[...declared.geographic][0]||null;
  }
  async function readCrs(file) {
    const start=await file.slice(0,375).arrayBuffer();
    if(start.byteLength<227)return null;
    const d=new DataView(start),offset=d.getUint32(96,true);
    if(offset>65536||offset<227||offset>file.size)return null;
    return parseCrs(await file.slice(0,offset).arrayBuffer());
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
  // Solo dibujar un envolvente automático cuando las teselas de origen forman
  // un conjunto geográfico conectado: nunca mezclar áreas remotas ni rellenar
  // miles de kilómetros cuadrados entre archivos no contiguos.
  function connectedUnionBounds(entries,tolerance=0.01) {
    const b=unionBounds(entries);
    if(!b)return null;
    if(!Number.isFinite(tolerance)||tolerance<0||tolerance>1)
      throw Error('Tolerancia de unión LAZ no válida');
    const visited=new Set([0]),pending=[0];
    while(pending.length){
      const current=entries[pending.pop()].bounds;
      for(let i=0;i<entries.length;i++){
        if(visited.has(i))continue;
        const next=entries[i].bounds;
        if(current.minX<=next.maxX+tolerance&&current.maxX+tolerance>=next.minX&&
           current.minY<=next.maxY+tolerance&&current.maxY+tolerance>=next.minY){
          visited.add(i);pending.push(i);
        }
      }
    }
    return visited.size===entries.length?b:null;
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
  return Object.freeze({parseBounds,indexFiles,parseCrs,readCrs,intersects,forWindow,
    unionBounds,connectedUnionBounds,envelopeAoi,needsTiling});
});
