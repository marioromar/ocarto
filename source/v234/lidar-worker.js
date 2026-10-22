/* Ocarto web LiDAR worker. LAS 1.0–1.4 and LAZ via vendored laz-perf 3.4.0.
   Analysis is by batches: compressed files remain compressed between jobs. */
'use strict';
let cloud = null, transfer = null, busy = null, area = null;
const MAX_CELLS = 1000000, BATCH = 50000, MAX_POINTS = 200000000;
const pause = () => new Promise(resolve => setTimeout(resolve, 0));
const send = data => postMessage(data);
function fail(error, operation, extra = {}) {
  send({type:'error', operation, message:String(error && error.message || error), ...extra});
}
function header(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 227) throw Error('Cabecera LAS incompleta (mínimo 227 bytes)');
  const d = new DataView(buffer);
  if (d.getUint32(0,true) !== 0x4653414c) throw Error('Archivo LAS/LAZ inválido: falta la firma LASF');
  const major=d.getUint8(24), minor=d.getUint8(25);
  if (major!==1 || minor>4) throw Error('Versión LAS no soportada: '+major+'.'+minor);
  const flags=d.getUint8(104), format=flags&63, compressed=(flags&192)!==0;
  const sizes=[20,28,26,34,57,63,30,36,38,59,67];
  const recordLength=d.getUint16(105,true), offset=d.getUint32(96,true);
  let count=d.getUint32(107,true);
  if (minor>=4 && buffer.byteLength>=255) {
    const extended=Number(d.getBigUint64(247,true));if(extended)count=extended;
  }
  if (!sizes[format] || recordLength<sizes[format]) throw Error('Formato de puntos LAS '+format+' inválido');
  if (!Number.isSafeInteger(count) || count<1 || count>MAX_POINTS) throw Error('Número de puntos fuera del límite de seguridad');
  if (offset>=buffer.byteLength || (!compressed && offset+count*recordLength>buffer.byteLength))
    throw Error('Datos de puntos truncados o desplazamiento LAS incorrecto');
  const scale=[d.getFloat64(131,true),d.getFloat64(139,true),d.getFloat64(147,true)];
  const origin=[d.getFloat64(155,true),d.getFloat64(163,true),d.getFloat64(171,true)];
  if (!scale.every(v=>Number.isFinite(v)&&v!==0) || !origin.every(Number.isFinite))
    throw Error('Escalas o desplazamientos LAS incorrectos');
  return {major,minor,format,compressed,recordLength,offset,count,scale,origin};
}
let lazPromise = null;
async function lazPerf() {
  if (!lazPromise) lazPromise=(async()=>{
    importScripts('vendor/laz-perf.js');
    const factory=self.createLazPerf;
    if (typeof factory!=='function') throw Error('El decodificador LAZ no está disponible');
    const mod=await factory({locateFile: filename=>'vendor/'+filename});
    if (!mod.LASZip || !mod._malloc || !mod._free || !mod.HEAPU8) throw Error('Versión LAZ incompatible');
    return mod;
  })();
  try { return await lazPromise; }
  catch(error) { lazPromise=null;throw Error('No se puede cargar el decodificador LAZ local: '+error.message); }
}
function pointClass(view,format,offset) {
  return format<=5 ? view.getUint8(offset+15)&31 : view.getUint8(offset+16);
}
function returnNumber(view,format,offset) {
  return format<=5 ? view.getUint8(offset+14)&7 : view.getUint8(offset+14)&15;
}
async function forPoints(record, job, visitor, stage='read') {
  const {buffer,meta}=record, n=meta.count, d=new DataView(buffer);
  let mod=null, decoder=null, input=0, point=0;
  try {
    let v=d, pos=meta.offset;
    if (meta.compressed) {
      mod=await lazPerf();
      input=mod._malloc(buffer.byteLength);
      if (!input) throw Error('Memoria insuficiente para descomprimir el LAZ');
      mod.HEAPU8.set(new Uint8Array(buffer),input);
      decoder=new mod.LASZip();decoder.open(input,buffer.byteLength);
      point=mod._malloc(meta.recordLength);
      if(!point) throw Error('Memoria insuficiente para los registros LAZ');
      v=new DataView(mod.HEAPU8.buffer);
      pos=point;
    }
    for (let i=0;i<n;i++) {
      if (job.cancelled) throw Object.assign(Error('Operación cancelada'),{name:'AbortError'});
      if (meta.compressed) {
        decoder.getPoint(point);
        if (v.buffer!==mod.HEAPU8.buffer) v=new DataView(mod.HEAPU8.buffer);
      } else pos=meta.offset+i*meta.recordLength;
      const x=v.getInt32(pos,true)*meta.scale[0]+meta.origin[0];
      const y=v.getInt32(pos+4,true)*meta.scale[1]+meta.origin[1];
      const z=v.getInt32(pos+8,true)*meta.scale[2]+meta.origin[2];
      if (!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z)) throw Error('Punto con coordenadas no finitas: '+i);
      visitor(x,y,z,pointClass(v,meta.format,pos),returnNumber(v,meta.format,pos),i);
      if ((i+1)%BATCH===0 || i===n-1) {
        send({type:'progress',done:i+1,total:n,stage});
        await pause();
      }
    }
  } finally {
    if(decoder) try{decoder.delete()}catch(_){}
    if(mod && point) mod._free(point);
    if(mod && input) mod._free(input);
  }
}
function bounds() { return {minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity}; }
function addBounds(b,x,y) {b.minX=Math.min(b.minX,x);b.maxX=Math.max(b.maxX,x);b.minY=Math.min(b.minY,y);b.maxY=Math.max(b.maxY,y);}
/// Read just the LAS header bounds (not the point cloud). When a tile is
/// wholly outside a requested polygon, do not allocate its full file buffer.
/// A corrupt/unknown bounding box is never enough to discard a tile: the
/// ordinary importer will validate/decode it and report any real file error.
function fileOutsideAoi(probe, aoi) {
  if (!aoi?.rings?.[0]?.length || probe.byteLength < 227) return false;
  const d=new DataView(probe.buffer,probe.byteOffset,probe.byteLength);
  if (d.getUint32(0,true)!==0x4653414c || d.getUint8(24)!==1 ||
      d.getUint8(25)>4) return false;
  const tile={maxX:d.getFloat64(179,true),minX:d.getFloat64(187,true),
    maxY:d.getFloat64(195,true),minY:d.getFloat64(203,true)};
  if (![tile.minX,tile.maxX,tile.minY,tile.maxY].every(Number.isFinite) ||
      tile.minX>tile.maxX || tile.minY>tile.maxY) return false;
  const selection=bounds();
  for (const p of aoi.rings[0]) addBounds(selection,p[0],p[1]);
  if (area?.window) {
    selection.minX=Math.max(selection.minX,area.window.minX);
    selection.maxX=Math.min(selection.maxX,area.window.maxX);
    selection.minY=Math.max(selection.minY,area.window.minY);
    selection.maxY=Math.min(selection.maxY,area.window.maxY);
  }
  return tile.maxX<selection.minX || tile.minX>selection.maxX ||
      tile.maxY<selection.minY || tile.minY>selection.maxY;
}
function makeGrid(cell,limit=MAX_CELLS) {
  cell=Number(cell);
  if(!Number.isFinite(cell)||cell<0.1) throw Error('Celda LiDAR mínima: 0,1 m');
  const cells=new Map();
  return {cell,cells,insert(x,y,make,update) {
    const i=Math.floor(x/cell), j=Math.floor(y/cell),key=i+','+j;
    let v=cells.get(key);
    if (!v) {if(cells.size>=limit) throw Error('Demasiadas celdas LiDAR. Selecciona un área menor o aumenta la resolución de celda.');v=make(i,j);cells.set(key,v)}
    update(v);
  }};
}
function previewFor(record) {
  const sample=new Float32Array(Math.min(60000,record.meta.count)*3);
  let at=0;
  const stride=Math.max(1,Math.ceil(record.meta.count/(sample.length/3)));
  const b=bounds();
  return {sample,b,stride,accept(x,y,z,i) {
    addBounds(b,x,y);
    if(i%stride===0 && at+2<sample.length) {sample[at++]=x;sample[at++]=y;sample[at++]=z;}
  },finish(){return {preview:sample.slice(0,at),bounds:b}}};
}
const canceled=job=>job.cancelled;
async function loadEnd(message) {
  if(!transfer || transfer.id!==message.jobId) throw Error('Carga LiDAR no iniciada');
  const t=transfer;transfer=null;
  if (t.skipped) {
    send({type:'loaded',jobId:t.id,sessionId:t.sessionId,
      skipped:true,count:0,bounds:null,preview:new Float32Array(0),
      reason:'Tesela fuera del polígono seleccionado: descartada antes de leer/descomprimir toda la nube'});
    return;
  }
  if(t.received!==t.size) throw Error('Archivo incompleto: '+t.received+'/'+t.size+' bytes');
  const buffer=t.bytes.buffer,meta=header(buffer);
  const record={buffer,meta};
  // A tile in a mosaic does not require a preview. Its compressed source is
  // decoded during area-add; decoding all points here as well meant doing
  // every LAZ tile TWICE, a major cost for 7+ million point PNOA files.
  if(area && area.id===t.sessionId) {
    const view=new DataView(buffer);
    const spatialBounds={maxX:view.getFloat64(179,true),minX:view.getFloat64(187,true),
      maxY:view.getFloat64(195,true),minY:view.getFloat64(203,true)};
    if(!Object.values(spatialBounds).every(Number.isFinite) ||
        spatialBounds.minX>spatialBounds.maxX ||
        spatialBounds.minY>spatialBounds.maxY)
      throw Error('Límites espaciales LAS/LAZ inválidos en la cabecera');
    cloud=record;
    send({type:'loaded',jobId:t.id,sessionId:t.sessionId,count:meta.count,
      version:meta.major+'.'+meta.minor+(meta.compressed?' LAZ':''),
      headerOnly:true,preview:new Float32Array(0),
      bounds:spatialBounds,format:meta.format});
    return;
  }
  const out=previewFor(record),job={cancelled:false,id:t.id};
  busy=job;
  try {
    await forPoints(record,job,(x,y,z,cls,r,i)=>out.accept(x,y,z,i),meta.compressed?'decompress':'read');
    cloud=record;
    const data=out.finish();
    send({type:'loaded',jobId:t.id,sessionId:t.sessionId,count:meta.count,
      version:meta.major+'.'+meta.minor+(meta.compressed?' LAZ':''),
      ...data,format:meta.format});
  } finally {if(busy===job) busy=null;}
}
function inside(x,y,aoi) {
  if(area?.window && (x<area.window.minX || y<area.window.minY ||
      x>=area.window.maxX || y>=area.window.maxY))return false;
  if(!aoi?.rings?.length) return true;
  function inRing(ring) {
    let yes=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
      const a=ring[i],b=ring[j],dy=b[1]-a[1];
      if(((a[1]>y)!==(b[1]>y)) && x < (b[0]-a[0])*(y-a[1])/dy+a[0])yes=!yes;
    }return yes;
  }
  if(!inRing(aoi.rings[0]))return false;
  for(const ring of aoi.rings.slice(1))if(inRing(ring))return false;
  return true;
}
function terrainBin(grid,x,y,z,cls,i) {
  if(cls!==2)return;
  grid.insert(x,y,(ii,jj)=>({i:ii,j:jj,x:(ii+0.5)*grid.cell,y:(jj+0.5)*grid.cell,z,n:0}),
    p=>{p.n++;if(z<p.z)p.z=z;});
}
function vegetationBin(grid,x,y,z,cls) {
  if(![2,3,4,5,6,9,11,14,15].includes(cls))return;
  grid.insert(x,y,(ii,jj)=>({i:ii,j:jj,x:(ii+0.5)*grid.cell,y:(jj+0.5)*grid.cell,
    ground_points:0,vegetation_points:0,building_points:0,water_points:0,road_points:0,wire_points:0,tower_points:0,
    ground_min_z:Infinity,canopy_max_z:-Infinity,canopy_sum_z:0}),
  p=>{
    if(cls===2){p.ground_points++;p.ground_min_z=Math.min(p.ground_min_z,z)}
    else if(cls>=3&&cls<=5){p.vegetation_points++;p.canopy_max_z=Math.max(p.canopy_max_z,z);p.canopy_sum_z+=z}
    else if(cls===6)p.building_points++;
    else if(cls===9)p.water_points++;
    else if(cls===11)p.road_points++;
    else if(cls===14)p.wire_points++;
    else if(cls===15)p.tower_points++;
  });
}
function vegetationRows(grid) {
  return [...grid.cells.values()].map(p=>{
    const g=Number.isFinite(p.ground_min_z)?p.ground_min_z:null;
    const h=g!==null && Number.isFinite(p.canopy_max_z) ? Math.max(0,p.canopy_max_z-g):null;
    const n=p.ground_points+p.vegetation_points;
    return {x:p.x,y:p.y,ground_points:p.ground_points,vegetation_points:p.vegetation_points,
      building_points:p.building_points,water_points:p.water_points,road_points:p.road_points,
      wire_points:p.wire_points,tower_points:p.tower_points,
      ground_min_z:g,canopy_max_above_ground_m:h,
      canopy_mean_above_ground_m:g!==null&&p.vegetation_points?Math.max(0,p.canopy_sum_z/p.vegetation_points-g):null,
      vegetation_return_fraction:n?p.vegetation_points/n:0};
  });
}
async function analysis(type,m) {
  if(!cloud) throw Error('Primero importa LAS o LAZ');
  const job={id:m.jobId,cancelled:false};if(busy)throw Error('Hay otra operación LiDAR en curso');busy=job;
  const options=m.options||{},cell=Math.max(.1,Number(options.cell)||.5);
  try {
    if(type==='terrain') {
      const grid=makeGrid(cell);let matchingPoints=0;
      await forPoints(cloud,job,(x,y,z,cls,i)=>{if(cls===2){matchingPoints++;terrainBin(grid,x,y,z,cls,i)}},'terrain');
      const minCount=Math.max(1,Number(options.minCount)||1);
      send({type:'terrain',jobId:m.jobId,cellSize:cell,cells:grid.cells.size,matchingPoints,
        candidates:[...grid.cells.values()].filter(p=>p.n>=minCount).map(p=>[p.x,p.y,p.z])});
    } else if(type==='vegetation') {
      const grid=makeGrid(cell);let classifiedPoints=0;
      await forPoints(cloud,job,(x,y,z,cls)=>{if([2,3,4,5,6,9,11,14,15].includes(cls)){classifiedPoints++;vegetationBin(grid,x,y,z,cls)}},'vegetation');
      send({type:'vegetation',jobId:m.jobId,cellSize:cell,cells:grid.cells.size,classifiedPoints,
        rows:vegetationRows(grid),quality:'preliminar; solo celdas observadas'});
    } else if(type==='feature-map') {
      const grid=makeGrid(cell);
      await forPoints(cloud,job,(x,y,z,cls)=>vegetationBin(grid,x,y,z,cls),'feature-ground');
      const minHeight=Math.max(0,Number(options.minHeight)||0);
      const maxHeight=Number.isFinite(Number(options.maxHeight))?Number(options.maxHeight):Infinity;
      const data={i:[],j:[],height:[]};let selected=0;
      for(const p of grid.cells.values()){
        if(!Number.isFinite(p.ground_min_z)||!Number.isFinite(p.canopy_max_z))continue;
        const h=Math.max(0,p.canopy_max_z-p.ground_min_z);
        if(h>=minHeight&&h<=maxHeight){data.i.push(p.i);data.j.push(p.j);data.height.push(h);selected+=p.vegetation_points}
      }
      if(!data.i.length)throw Error('No hay celdas con suelo y vegetación para Feature Map');
      send({type:'feature-map',jobId:m.jobId,cellSize:cell,cells:data,selectedPoints:selected,minHeight,maxHeight});
    } else if(type==='detect') {
      const grid=makeGrid(cell),minZ=Number(options.minZ),maxZ=Number(options.maxZ),filter=options.classFilter||'all';
      let matchingPoints=0;const matches=cls=>(filter==='all'||filter==='ground'&&cls===2||
        filter==='vegetation'&&cls>=3&&cls<=5||filter==='unclassified'&&(cls===0||cls===1));
      await forPoints(cloud,job,(x,y,z,cls,i)=>{
        if(!matches(cls)||(!Number.isNaN(minZ)&&z<minZ)||(!Number.isNaN(maxZ)&&z>maxZ))return;
        matchingPoints++;
        grid.insert(x,y,(ii,jj)=>({i:ii,j:jj,x:(ii+.5)*cell,y:(jj+.5)*cell,z,n:0}),p=>{
          p.n++;if(z>p.z)p.z=z;
        });
      },'detect');
      const minCount=Math.max(1,Number(options.minCount)||1);
      const matchesGrid=[...grid.cells.values()].filter(p=>p.n>=minCount);
      let candidates=matchesGrid;
      if(options.localMax) {
        const keys=grid.cells;
        candidates=matchesGrid.filter(p=>{
          for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){
            if(!di&&!dj)continue;
            const q=keys.get((p.i+di)+','+(p.j+dj));
            if(q&&q.z>p.z)return false;
          }return true;
        });
      }
      send({type:'detected',jobId:m.jobId,cells:grid.cells.size,tiles:1,matchingPoints,
        candidates:candidates.map(p=>[p.x,p.y,p.z,p.n])});
    }
  }finally{if(busy===job)busy=null;}
}
async function addAreaTile(m) {
  if(!area || area.id!==m.sessionId) throw Error('Sesión de mosaico LiDAR no iniciada');
  if(!cloud)throw Error('No se ha cargado la tesela');
  const job={id:m.jobId,cancelled:false};if(busy)throw Error('Proceso LiDAR ocupado');busy=job;
  const b=bounds();let used=0;
  try {
    await forPoints(cloud,job,(x,y,z,cls,i)=>{
      if(!inside(x,y,area.aoi))return;
      used++;addBounds(b,x,y);
      terrainBin(area.terrain,x,y,z,cls,i);
      vegetationBin(area.vegetation,x,y,z,cls);
    },'area');
    if(used){area.tiles++;area.points+=used;}
    send({type:'area-tile-done',sessionId:m.sessionId,jobId:m.jobId,skipped:used===0,
      points:used,bounds:used?b:null,nodes:0,visitedPoints:cloud.meta.count});
    cloud=null; // Release the decoded tile's original compressed bytes.
  }finally{if(busy===job)busy=null;}
}
function finishArea(m) {
  if(!area || area.id!==m.sessionId)throw Error('Sesión de mosaico inexistente');
  const terrain=[...area.terrain.cells.values()].map(p=>[p.x,p.y,p.z]);
  const rows=vegetationRows(area.vegetation);
  send({type:'area-finished',sessionId:m.sessionId,jobId:m.jobId,points:area.points,window:area.window,
    tiles:area.tiles,terrain,vegetationRows:rows,terrainCells:terrain.length,vegetationCells:rows.length});
  area=null;
}
onmessage=async event=>{
  const m=event.data||{},type=m.type;
  try {
    if(type==='cancel') {
      if(busy?.id===m.jobId)busy.cancelled=true;
      if(transfer?.id===m.jobId){transfer=null;send({type:'cancelled',jobId:m.jobId,operation:'load'});}
      return;
    }
    if(type==='area-abort') {area=null;cloud=null;return;}
    if(type==='load-start') {
      if(transfer || busy)throw Error('Ya hay una carga LiDAR activa');
      const fileSize=Number(m.fileSize);
      if(!Number.isSafeInteger(fileSize)||fileSize<227||fileSize>1500000000)
        throw Error('Tamaño de archivo LAS/LAZ no admitido. Máximo 1,5 GB por tesela.');
      const checkArea=area?.id===m.sessionId && !!area?.aoi;
      transfer={id:m.jobId,sessionId:m.sessionId,size:fileSize,received:0,
        bytes:checkArea?null:new Uint8Array(fileSize),checkArea,
        headerProbe:checkArea?new Uint8Array(227):null,
        heldChunks:checkArea?[]:null,skipped:false};
      send({type:'load-ready',jobId:m.jobId});return;
    }
    if(type==='load-chunk') {
      if(!transfer||transfer.id!==m.jobId)throw Error('Bloque sin sesión de carga activa');
      if(m.offset!==transfer.received || !(m.chunk instanceof Uint8Array) ||
          m.chunk.byteLength===0 || m.chunk.byteLength+transfer.received>transfer.size)
        throw Error('Bloque LAS/LAZ fuera de secuencia o con longitud inválida');
      const t=transfer;
      // Keep only the initial chunks until the first 227 bytes are known.
      // No large ArrayBuffer is reserved for a file that can be skipped.
      if (t.checkArea && !t.bytes) {
        t.heldChunks.push({offset:t.received,bytes:m.chunk});
        const need=Math.max(0,227-t.received);
        if (need>0) t.headerProbe.set(m.chunk.subarray(0,need),t.received);
        t.received+=m.chunk.byteLength;
        if (t.received>=227) {
          if (fileOutsideAoi(t.headerProbe,area.aoi)) {
            t.skipped=true;t.heldChunks=null;t.headerProbe=null;
            send({type:'load-skip',jobId:m.jobId,
              reason:'La extensión LAS/LAZ está fuera del polígono'});
            send({type:'load-skip-ack',jobId:m.jobId,sequence:m.sequence});
            return;
          }
          t.bytes=new Uint8Array(t.size);
          for (const piece of t.heldChunks)
            t.bytes.set(piece.bytes,piece.offset);
          t.heldChunks=null;t.headerProbe=null;
        }
      } else {
        t.bytes.set(m.chunk,t.received);
        t.received+=m.chunk.byteLength;
      }
      send({type:'load-chunk-ack',jobId:m.jobId,sequence:m.sequence});
      return;
    }
    if(type==='load-end') {await loadEnd(m);return;}
    if(type==='area-start') {
      if(area||busy||transfer)throw Error('Ya hay un mosaico LiDAR abierto');
      const aoi=m.aoi;
      if(aoi && (!Array.isArray(aoi.rings)||!aoi.rings.length||
          aoi.rings.some(r=>!Array.isArray(r)||r.length<3||r.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))))
        throw Error('El área seleccionada no forma un polígono válido');
      const terrain=makeGrid(m.terrainCell),vegetation=makeGrid(m.vegetationCell);
      let capacity;
      const window=m.window??null;
      if(window && (![window.minX,window.maxX,window.minY,window.maxY].every(Number.isFinite) ||
          window.maxX<=window.minX||window.maxY<=window.minY))
        throw Error('Ventana de tesela LiDAR no válida');
      if(aoi?.rings?.length||window){
        const extent=window?{...window}:{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
        if(!window)for(const ring of aoi.rings)for(const p of ring)addBounds(extent,p[0],p[1]);
        const estimate=cell=>Math.ceil((extent.maxX-extent.minX)/cell+1)*Math.ceil((extent.maxY-extent.minY)/cell+1);
        capacity={terrainCells:estimate(terrain.cell),vegetationCells:estimate(vegetation.cell),maxCells:MAX_CELLS};
        if(capacity.terrainCells>MAX_CELLS || capacity.vegetationCells>MAX_CELLS)
          throw Error('El área seleccionada excede el máximo de un millón de celdas por modelo. Aumenta la celda o recorta el área.');
      }
      area={id:m.sessionId,aoi,window,terrain,vegetation,tiles:0,points:0};
      send({type:'area-ready',sessionId:m.sessionId,...(capacity?{capacity}:{})});return;
    }
    if(type==='area-add') {await addAreaTile(m);return;}
    if(type==='area-finish'){finishArea(m);return;}
    if(type==='area-add-copc') throw Error('COPC por jerarquía todavía no está implementado en el procesador recuperado. Usa LAS/LAZ convencional para esta prueba.');
    if(['detect','terrain','vegetation','feature-map'].includes(type)) {await analysis(type,m);return;}
    throw Error('Operación LiDAR desconocida: '+type);
  }catch(error){
    if(error.name==='AbortError'){
      send({type:'cancelled',jobId:m.jobId,operation:type==='load-end'?'load':type});
    }else fail(error,type.startsWith('load-')?'load':type.startsWith('area-')?'area':type,
      {jobId:m.jobId,sessionId:m.sessionId});
    if(type.startsWith('load-'))transfer=null;
    if(type==='area-start')area=null;
  }
};
