/* Ocarto v264: conservative seam-aware preliminary MDT raster from observed
   LiDAR ground cells. Per-tile ESRI ASCII Grid, using adjacent exported CSVs
   as a short halo. Never treats interpolated elevations as source observations.
   NO continuous contours, GeoTIFF, advanced feature protection yet. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.OcartoLidarSeams=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const NODATA=-9999;
 const checkAbort=signal=>{
   if(signal?.aborted)throw Object.assign(Error('Interpolación MDT cancelada'),{name:'AbortError'});
 };
 const intersects=(a,b)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minY<b.maxY&&a.maxY>b.minY;
 function inRing(x,y,ring){
   let hit=false;
   for(let i=0,j=ring.length-1;i<ring.length;j=i++){
     const a=ring[i],b=ring[j];
     if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
   }
   return hit;
 }
 function inPolygon(x,y,aoi){
   if(!aoi?.rings?.length)return true;
   if(!inRing(x,y,aoi.rings[0]))return false;
   for(const hole of aoi.rings.slice(1))if(inRing(x,y,hole))return false;
   return true;
 }
 function tileGridGeometry(window,cell){
   const v=[window.minX,window.maxX,window.minY,window.maxY,cell];
   if(v.some(x=>!Number.isFinite(x))||cell<.1||cell>100||
       window.maxX<=window.minX||window.maxY<=window.minY)
     throw Error('Extensión o resolución MDT no válida');
   const ncols=Math.ceil((window.maxX-window.minX)/cell-1e-8),
         nrows=Math.ceil((window.maxY-window.minY)/cell-1e-8);
   if(ncols<1||nrows<1||ncols*nrows>1000000)
     throw Error('La tesela excede 1.000.000 de celdas para el MDT');
   return {ncols,nrows,cell,x0:window.minX,y0:window.minY};
 }
 function centerKey(x,y,cell){
   const i=Math.round(x/cell-.5),j=Math.round(y/cell-.5);
   if(Math.abs((i+.5)*cell-x)>1e-5 || Math.abs((j+.5)*cell-y)>1e-5)
     throw Error('Celda de terreno desalineada con la resolución UTM del proyecto');
   return i+','+j;
 }
 // Parse newline-delimited CSV without materializing entire files.
 // Exported terrain CSV never contains quoted line breaks: x,y,z numeric.
 async function readTerrainCsv(file,onRow,{signal}={}){
   if(!file || typeof onRow!=='function')throw Error('Archivo MDT CSV no válido');
   const reader=file.stream().getReader();
   const decoder=new TextDecoder();
   let pending='',row=0;
   try{
     while(true){
       checkAbort(signal);
       const part=await reader.read();
       if(part.done)break;
       pending+=decoder.decode(part.value,{stream:true});
       let pos;
       while((pos=pending.indexOf('\n'))>=0){
         const line=pending.slice(0,pos).replace(/\r$/,'');pending=pending.slice(pos+1);
         if(row++===0){
           if(line!=='x_utm,y_utm,min_ground_z_m')throw Error('Cabecera CSV MDT incorrecta');
           continue;
         }
         if(!line)continue;
         const fields=line.split(',');
         if(fields.length!==3)throw Error('Fila MDT con columnas incorrectas');
         const x=Number(fields[0]),y=Number(fields[1]),z=Number(fields[2]);
         if(!fields.every(s=>s.trim()!=='')||![x,y,z].every(Number.isFinite))
           throw Error('Cota MDT vacía o no finita en CSV');
         onRow(x,y,z);
       }
       if(pending.length>16384)throw Error('Fila CSV excesivamente larga');
     }
     pending+=decoder.decode();
     if(pending.trim()){
       if(row++===0)throw Error('CSV MDT sin datos ni final de cabecera');
       const fields=pending.trim().split(',');
       if(fields.length!==3||fields.some(x=>!x.trim())||
          fields.some(v=>!Number.isFinite(Number(v))))throw Error('Última fila CSV MDT inválida');
       onRow(...fields.map(Number));
     }
     if(!row)throw Error('CSV MDT vacío');
   }finally{reader.releaseLock();}
 }
 function interpolation(observed,i,j,{radius=2,minNeighbors=3}={}){
   const key=i+','+j;
   if(observed.has(key))return {z:observed.get(key),measured:true};
   const r2=radius*radius;
   let count=0,weight=0,sum=0;
   for(let dj=-radius;dj<=radius;dj++)
     for(let di=-radius;di<=radius;di++){
       const dist=di*di+dj*dj;
       if(!dist||dist>r2)continue;
       const z=observed.get((i+di)+','+(j+dj));
       if(z===undefined)continue;
       const w=1/dist;weight+=w;sum+=w*z;count++;
     }
   if(count<minNeighbors)return {z:NODATA,measured:false};
   return {z:sum/weight,measured:false};
 }
 function intersectingTiles(manifest,tile,haloMetres){
   const w=tile.window;
   const expanded={minX:w.minX-haloMetres,maxX:w.maxX+haloMetres,
     minY:w.minY-haloMetres,maxY:w.maxY+haloMetres};
   return manifest.completed.filter(other=>intersects(other.window,expanded));
 }
 async function exportTile(directory,manifest,tile,{radiusCells=2,onProgress,signal}={}){
   checkAbort(signal);
   if(!Number.isInteger(radiusCells)||radiusCells<1||radiusCells>4)
     throw Error('Halo MDT: radio de 1 a 4 celdas');
   if(!manifest?.completed?.length || !manifest?.selectedArea?.rings)
     throw Error('El manifiesto necesita el área seleccionada y las teselas terminadas');
   const cell=manifest.cellTerrain;
   const grid=tileGridGeometry(tile.window,cell);
   const halo=radiusCells*cell;
   const candidates=intersectingTiles(manifest,tile,halo);
   const observed=new Map();
   const expanded={minX:tile.window.minX-halo,maxX:tile.window.maxX+halo,
     minY:tile.window.minY-halo,maxY:tile.window.maxY+halo};
   for(let n=0;n<candidates.length;n++){
     checkAbort(signal);
     const other=candidates[n];
     const handle=await directory.getFileHandle(other.terrainFile);
     const file=await handle.getFile();
     await readTerrainCsv(file,(x,y,z)=>{
       if(x<expanded.minX||x>expanded.maxX||y<expanded.minY||y>expanded.maxY)return;
       const key=centerKey(x,y,cell);
       if(observed.has(key)&&Math.abs(observed.get(key)-z)>1e-5)
         throw Error('Celdas MDT duplicadas con cotas incompatibles en '+other.terrainFile);
       observed.set(key,z);
     },{signal});
     onProgress?.({stage:'halo',file:n+1,total:candidates.length,tile:tile.name});
   }
   const name=tile.name+'_mdt_preliminar.asc';
   const handle=await directory.getFileHandle(name,{create:true});
   const writer=await handle.createWritable();
   const stats={name,rows:grid.nrows,columns:grid.ncols,measured:0,
     interpolated:0,noData:0,neighborTiles:candidates.length,
     radiusCells,method:'IDW distance^-2, >=3 neighboring observed ground cells',
     status:'preliminary-not-contours'};
   try{
     const header='ncols '+grid.ncols+'\n'+'nrows '+grid.nrows+'\n'+
       'xllcorner '+grid.x0+'\n'+'yllcorner '+grid.y0+'\n'+
       'cellsize '+cell+'\n'+'NODATA_value '+NODATA+'\n';
     await writer.write(header);
     // ASCII Grid starts in northwest corner. Half-open boundaries prevent
     // duplicate output cells. Every global cell has one unique owner.
     for(let row=grid.nrows-1;row>=0;row--){
       checkAbort(signal);
       const y=grid.y0+(row+.5)*cell,iy=Math.round(y/cell-.5);
       const buffer=[];
       for(let col=0;col<grid.ncols;col++){
         const x=grid.x0+(col+.5)*cell,ix=Math.round(x/cell-.5);
         let v={z:NODATA,measured:false};
         if(x<tile.window.maxX-1e-9&&y<tile.window.maxY-1e-9&&
             inPolygon(x,y,manifest.selectedArea))
           v=interpolation(observed,ix,iy,{radius:radiusCells});
         if(v.z===NODATA)stats.noData++;
         else if(v.measured)stats.measured++;
         else stats.interpolated++;
         buffer.push(v.z===NODATA?String(NODATA):String(Number(v.z.toFixed(4))));
       }
       await writer.write(buffer.join(' ')+'\n');
       if((grid.nrows-row)%128===0)onProgress?.({stage:'raster',row:grid.nrows-row,
         total:grid.nrows,tile:tile.name});
     }
     await writer.close();
     if(stats.measured+stats.interpolated+stats.noData!==grid.nrows*grid.ncols)
       throw Error('Número de celdas del raster MDT incorrecto');
     return stats;
   }catch(error){try{await writer.abort()}catch(_){}throw error;}
 }
 async function exportAll(directory,manifest,{signal,onProgress}={}){
   if(manifest?.state!=='complete'||
       manifest.completed.length!==manifest.plan.total)
     throw Error('Primero termina todas las teselas LiDAR antes de reconstruir el MDT');
   if(!Number.isFinite(manifest.cellTerrain))throw Error('Resolución de terreno ausente');
   const results=[];
   for(let i=0;i<manifest.completed.length;i++){
     checkAbort(signal);
     const tile=manifest.completed[i];
     const stats=await exportTile(directory,manifest,tile,{signal,
       onProgress:p=>onProgress?.({...p,index:i+1,tiles:manifest.completed.length})});
     results.push(stats);
     onProgress?.({stage:'finished',index:i+1,tiles:manifest.completed.length,
       tile:tile.name,stats});
   }
   return results;
 }
 return Object.freeze({inPolygon,readTerrainCsv,interpolation,intersectingTiles,
   tileGridGeometry,exportTile,exportAll,NODATA});
});
