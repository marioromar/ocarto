/* Ocarto v286: curvas preliminares de toda la zona LiDAR, nunca desde TIFF.
   Cada cuadrado de MDT pertenece a una sola tesela (esquina inferior izquierda).
   Lee hasta 4 ASC contiguos para generar los segmentos que cruzan las fronteras.
   Streaming GeoJSON: las curvas se enlazan dentro de cada bloque sin agotar RAM.
   Las curvas de bloques adyacentes comparten vértices, pero aún pueden ser
   objetos editables separados: NO afirmar unión topológica total ni suavizado. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoLidarMosaicContours=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const NODATA=-9999,MAX_CELLS=1000000,MAX_SEGMENTS_TILE=1000000;
 function check(signal){
   if(signal?.aborted)throw Object.assign(Error('Curvado LiDAR cancelado'),{name:'AbortError'});
 }
 function ascGeometry(tile,cell){
   const w=tile.window;
   if(!w||!Number.isFinite(cell)||cell<.1)throw Error('Tesela MDT inválida');
   return {width:Math.ceil((w.maxX-w.minX)/cell-1e-8),
     height:Math.ceil((w.maxY-w.minY)/cell-1e-8)};
 }
 async function readAsc(file,expected,cell,signal){
   check(signal);
   const text=await file.text();
   const nl=text.indexOf('\n',0);
   if(nl<0)throw Error('ASC sin cabecera');
   const rows=text.split(/\r?\n/);
   if(rows.length<7)throw Error('ASC sin seis líneas de cabecera');
   const h={};
   for(let i=0;i<6;i++){
     const m=rows[i].trim().match(/^([A-Za-z_]+)\s+([-+0-9.eE]+)$/);
     if(!m||!Number.isFinite(Number(m[2])))throw Error('Cabecera ASC inválida');
     h[m[1].toLowerCase()]=Number(m[2]);
   }
   const width=h.ncols,height=h.nrows;
   if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
      width*height>MAX_CELLS||Math.abs(h.cellsize-cell)>1e-8)
     throw Error('Rejilla ASC de resolución o tamaño incompatible');
   if(!expected||width!==expected.width||height!==expected.height||
      Math.abs(h.xllcorner-expected.x)>cell*1e-5||
      Math.abs(h.yllcorner-expected.y)>cell*1e-5)
     throw Error('ASC no coincide con su tesela georreferenciada');
   const nodata=Number.isFinite(h.nodata_value)?h.nodata_value:NODATA;
   const grid=new Float64Array(width*height);
   for(let r=0;r<height;r++){
     check(signal);
     const line=(rows[6+r]||'').trim(),tokens=line.split(/\s+/);
     if(tokens.length!==width)throw Error('Fila ASC incompleta en '+r);
     for(let col=0;col<width;col++){
       const v=Number(tokens[col]);
       if(!Number.isFinite(v))throw Error('Cota ASC no finita en fila '+r);
       grid[r*width+col]=v===nodata?NaN:v;
     }
   }
   if(rows.slice(6+height).some(x=>x.trim()))
     throw Error('ASC contiene filas adicionales ajenas a la tesela');
   return {width,height,x:expected.x,y:expected.y,cell,grid};
 }
 function at(raster,x,y) {
   if(!raster)return NaN;
   const u=(x-raster.x)/raster.cell-.5,v=(y-raster.y)/raster.cell-.5;
   const col=Math.round(u),row=Math.round(v);
   if(Math.abs(u-col)>1e-5||Math.abs(v-row)>1e-5||
     col<0||row<0||col>=raster.width||row>=raster.height)return NaN;
   return raster.grid[(raster.height-row-1)*raster.width+col];
 }
 function edgesAt(values,x,y,cell,interval,segments,limit=MAX_SEGMENTS_TILE){
   if(values.some(v=>!Number.isFinite(v)))return {squares:0,missing:1};
   const lo=Math.min(...values),hi=Math.max(...values);
   if((hi-lo)/interval>3000)throw Error('Cambio de altura excesivo en una celda');
   const points=[[x,y],[x+cell,y],[x+cell,y+cell],[x,y+cell]];
   const first=Math.ceil((lo-1e-9)/interval),last=Math.floor((hi+1e-9)/interval);
   for(let k=first;k<=last;k++){
     const level=Number((k*interval).toFixed(6)),edges=[];
     for(let n=0;n<4;n++){
       const next=(n+1)%4,a=values[n],b=values[next];
       if((a<level&&b>=level)||(b<level&&a>=level)){
         const t=(level-a)/(b-a);
         edges.push([points[n][0]+t*(points[next][0]-points[n][0]),
           points[n][1]+t*(points[next][1]-points[n][1])]);
       }
     }
     if(edges.length===2)
       segments.push({z:level,coords:edges});
     else if(edges.length===4){
       const middle=(values[0]+values[1]+values[2]+values[3])/4;
       const pairs=(values[0]>=level)===(middle>=level)?
         [[0,1],[2,3]]:[[0,3],[1,2]];
       for(const [a,b] of pairs)segments.push({z:level,coords:[edges[a],edges[b]]});
     }else if(edges.length!==0)
       throw Error('Cruce de curvas ambiguo: revisar valores del MDT');
     if(segments.length>limit)throw Error('Demasiados segmentos de curvado en un bloque');
   }
   return {squares:1,missing:0};
 }
 function sameWindow(a,b,axis,cell){
   const epsilon=cell*1e-6;
   if(axis==='right')
     return Math.abs(a.maxX-b.minX)<epsilon &&
       Math.abs(a.minY-b.minY)<epsilon;
   if(axis==='up')
     return Math.abs(a.maxY-b.minY)<epsilon &&
       Math.abs(a.minX-b.minX)<epsilon;
   if(axis==='diagonal')
     return Math.abs(a.maxX-b.minX)<epsilon &&
       Math.abs(a.maxY-b.minY)<epsilon;
   return false;
 }
 function neighbors(manifest,tile){
   const cell=manifest.cellTerrain,n={self:tile,right:null,up:null,diagonal:null};
   for(const candidate of manifest.completed){
     if(candidate===tile)continue;
     for(const axis of ['right','up','diagonal'])
       if(!n[axis]&&sameWindow(tile.window,candidate.window,axis,cell))
         n[axis]=candidate;
   }
   return n;
 }
 function sourceFor(manifest,tile){
   const stats=manifest.dtmSeams.completed.find(s=>
     s.tile===tile.name||s.name===tile.name+'_mdt_preliminar.asc');
   if(!stats)throw Error('No se encuentra MDT con halo de '+tile.name);
   if(!/^tesela_\d{3}_\d{3}_mdt_preliminar\.asc$/.test(stats.name))
     throw Error('Nombre ASC inválido: '+stats.name);
   return stats;
 }
 async function tileSegments(directory,manifest,tile,interval,{signal,maxSegments}={}){
   check(signal);
   const cell=manifest.cellTerrain;
   if(!Number.isFinite(interval)||interval<.1||interval>100)
     throw Error('Equidistancia de curvas inválida');
   const parts=neighbors(manifest,tile),loaded={};
   for(const [axis,source] of Object.entries(parts)){
     if(!source)continue;
     check(signal);
     const stats=sourceFor(manifest,source),expected=ascGeometry(source,cell);
     const raster=await readAsc(
       await(await directory.getFileHandle(stats.name)).getFile(),
       {width:expected.width,height:expected.height,
         x:source.window.minX,y:source.window.minY},cell,signal);
     loaded[axis]=raster;
   }
   const own=loaded.self;
   const resolve=(x,y)=>{
     for(const key of ['self','right','up','diagonal']){
       const z=at(loaded[key],x,y);
       if(Number.isFinite(z))return z;
     }
     return NaN;
   };
   let squares=0,missing=0;
   const segments=[],count=own.width*own.height;
   for(let j=0;j<own.height;j++){
     check(signal);
     const y=own.y+(j+.5)*cell;
     for(let i=0;i<own.width;i++){
       const x=own.x+(i+.5)*cell;
       const values=[resolve(x,y),resolve(x+cell,y),
         resolve(x+cell,y+cell),resolve(x,y+cell)];
       const result=edgesAt(values,x,y,cell,interval,segments,maxSegments);
       squares+=result.squares;missing+=result.missing;
     }
   }
   return {segments,squares,missing,cells:count};
 }
 function validManifest(manifest){
   if(manifest?.state!=='complete'||manifest.dtmSeams?.state!=='complete'||
     !manifest.completed?.length||manifest.completed.length!==manifest.plan?.total)
     throw Error('El mosaico y su MDT con halo deben estar completos antes del curvado');
   if(!/^EPSG:\d+$/.test(manifest.crs))throw Error('CRS LiDAR no confirmado');
   return manifest;
 }
 async function exportGeojson(directory,manifest,name,interval,options={}){
   validManifest(manifest);
   if(!/^zona_completa_curvas_[\w-]+\.geojson$/.test(name))
     throw Error('Nombre del curvado del mosaico inválido');
   const stream=await(await directory.getFileHandle(name,{create:true})).createWritable();
   const union=options.connect;
   let segments=0,lines=0,squares=0,missing=0,first=true;
   try{
     await stream.write(JSON.stringify({type:'FeatureCollection',
       name:'Curvas de nivel de toda la zona LiDAR',crs:{
         type:'name',properties:{name:manifest.crs}},
       metadata:{interval_m:interval,source:'MDT preliminar LiDAR de todos los LAZ',
         classification:'clase 2 suelo; estimaciones conservadoras con halo',
         georeferencing:manifest.crs,unsmoothed:true,review_required:true,
         tile_parts_connected:'geometrically continuous across shared nodes; editable curves may remain separate features'}})
       .replace(/}$/,',"features":['));
     for(let i=0;i<manifest.completed.length;i++){
       check(options.signal);
       const tile=manifest.completed[i];
       const result=await tileSegments(directory,manifest,tile,interval,options);
       let features=result.segments.map(s=>({
         type:'Feature',properties:{elevation:s.z},
         geometry:{type:'LineString',coordinates:s.coords}}));
       if(union&&features.length){
         const joined=union(features,{tolerance:Math.max(1e-8,manifest.cellTerrain*1e-6)});
         features=joined.features;
       }
       const output=[];
       for(const feature of features){
         feature.properties={...feature.properties,source:'MDT LiDAR preliminar',
           unsmoothed:true,review_required:true,
           tile:tile.name,interval_m:interval};
         output.push(JSON.stringify(feature));
         if(output.length===256){
           await stream.write((first?'':',')+output.join(','));
           first=false;output.length=0;
         }
       }
       if(output.length){await stream.write((first?'':',')+output.join(','));first=false;}
       segments+=result.segments.length;lines+=features.length;
       squares+=result.squares;missing+=result.missing;
       options.onProgress?.({completed:i+1,total:manifest.completed.length,
         tile:tile.name,segments,lines});
       await new Promise(resolve=>setTimeout(resolve,0));
     }
     await stream.write(']}\n');
     await stream.close();
   }catch(error){try{await stream.abort()}catch(_){}throw error;}
   return {name,interval_m:interval,features:lines,segments,squares,missing,
     source:'MDT LiDAR de zona completa (provisional)',
     format:'GeoJSON georreferenciado de curvas no suavizadas; revisar y unir topológicamente para edición'};
 }
 return Object.freeze({readAsc,at,edgesAt,neighbors,tileSegments,exportGeojson,validManifest});
});
