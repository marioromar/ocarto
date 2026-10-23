/* Ocarto v286: polígonos candidatos de 3 clases de Bobadilla desde
   celdas CLASIFICADAS del propio LAS/LAZ de la ZONA COMPLETA.
   No vectoriza colores ni TIFF. Conserva CRS, agujeros y continuidad entre
   teselas; las clases son HIPÓTESIS, nunca símbolos IOF confirmados.
   Ejecutar en mosaicos <=12 millones celdas; áreas mayores requieren salida
   escalable externa, y NO deben representarse como terminadas. */
(function(root,factory) {
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoLidarMosaicVector=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const CSV_HEADER='x_utm,y_utm,ground_points,vegetation_points,building_points,wire_points,tower_points,ground_min_z_m,canopy_max_above_ground_m,canopy_mean_above_ground_m,vegetation_return_fraction,ground_height_source,estimated_ground_z_m,ground_estimation_support_cells,water_points,road_points';
 const CLASSES=Object.freeze([
  {id:1,key:'verde_oscuro',name:'Posible verde oscuro (densidad alta; revisar penetrabilidad)',
   color:'#356c38',minAreaM2:35},
  {id:2,key:'rayado',name:'Posible vegetación rayada o dispersa (revisar)',
   color:'#8cae6e',minAreaM2:35},
  {id:3,key:'amarillo',name:'Posible zona abierta sin retornos vegetales (revisar)',
   color:'#e9cf49',minAreaM2:100}
 ]);
 function classifyColumns(c){
   if(c.length!==16)throw Error('Faltan clases de agua/carretera en celdas del LAZ');
   const n=i=>c[i].trim()?Number(c[i]):null;
   const ground=n(2),vegetation=n(3),building=n(4),wire=n(5),tower=n(6),
     h=n(8),density=n(10),water=n(14),road=n(15);
   const counts=[ground,vegetation,building,wire,tower,water,road];
   if(counts.some(v=>!Number.isSafeInteger(v)||v<0))
     throw Error('Contadores LAS/LAZ inválidos');
   if([building,wire,tower,water,road].some(v=>v>0))return 0;
   if(vegetation>0){
     if(!Number.isFinite(h)||h<0||!Number.isFinite(density)||density<0||density>1)
       return 0;
     if(h>=3&&density>=.7&&vegetation>=2)return 1;
     if(h>=.3&&((density>=.12&&density<.7) || h<3&&density>=.7))return 2;
     return 0;
   }
   // Una celda de suelo NO prueba un cultivo: solo propone grandes áreas
   // abiertas si hay suficientes retornos medidos y cero vegetación/estructuras.
   if(ground>=2&&c[11]==='observed')return 3;
   return 0;
 }
 const check=signal=>{if(signal?.aborted)throw Object.assign(
   Error('Vectorización LiDAR cancelada'),{name:'AbortError'});};
 function geometry(manifest,cell,maxPixels=12000000){
   const b=manifest?.selectedArea?.bounds||manifest?.plan?.bounds;
   if(!b||![b.minX,b.minY,b.maxX,b.maxY,cell].every(Number.isFinite)||
       cell<.1||cell>100||b.minX>=b.maxX||b.minY>=b.maxY)
     throw Error('Área de vectorización UTM inválida');
   const x0=Math.floor(b.minX/cell)*cell,y0=Math.floor(b.minY/cell)*cell;
   const width=Math.ceil(b.maxX/cell)-Math.floor(b.minX/cell),
     height=Math.ceil(b.maxY/cell)-Math.floor(b.minY/cell);
   if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
       width<1||height<1||width*height>maxPixels)
     throw Error('Vectorización LiDAR integral excede 12 millones de celdas; falta modo vectorial por bloques con unión de polígonos');
   return {x0,y0,width,height,cell};
 }
 async function loadMask(file,shape,{signal,onProgress}={}){
   check(signal);
   const n=shape.width*shape.height,mask=new Uint8Array(n),seen=new Uint8Array(n);
   const rdr=file.stream().getReader(),dec=new TextDecoder();
   let pending='',first=true,read=0,valid=0,count=[0,0,0,0];
   function consume(line){
     if(first){first=false;if(line!==CSV_HEADER)throw Error('CSV vectorial LiDAR sin clases completas');return;}
     if(!line)return;
     const c=line.split(','),x=Number(c[0]),y=Number(c[1]);
     if(![x,y].every(Number.isFinite))throw Error('Posición LiDAR no finita');
     const i=Math.round((x-shape.x0)/shape.cell-.5),
       j=Math.round((y-shape.y0)/shape.cell-.5);
     if(!Number.isSafeInteger(i)||!Number.isSafeInteger(j)||i<0||j<0||
        i>=shape.width||j>=shape.height||
        Math.abs(shape.x0+(i+.5)*shape.cell-x)>shape.cell*1e-5||
        Math.abs(shape.y0+(j+.5)*shape.cell-y)>shape.cell*1e-5)
       throw Error('Celda LiDAR fuera del mosaico georreferenciado');
     const index=j*shape.width+i;
     if(seen[index])throw Error('Celda LiDAR repetida entre los dos LAZ o bloques');
     seen[index]=1;
     const cls=classifyColumns(c);
     mask[index]=cls;read++;count[cls]++;if(cls)valid++;
   }
   try{
     while(true){
       check(signal);
       const {done,value}=await rdr.read();if(done)break;
       pending+=dec.decode(value,{stream:true});
       let pos;
       while((pos=pending.indexOf('\n'))>=0){
         consume(pending.slice(0,pos).replace(/\r$/,''));
         pending=pending.slice(pos+1);
       }
       if(pending.length>65536)throw Error('Fila CSV LiDAR demasiado larga');
       if(read&&read%100000===0)onProgress?.({stage:'reading',rows:read});
     }
     pending+=dec.decode();
     if(pending)consume(pending.replace(/\r$/,''));
     if(first)throw Error('Falta cabecera del mosaico LiDAR');
   }finally{try{await rdr.cancel()}catch(_){}try{rdr.releaseLock()}catch(_){}}
   return {mask,rows:read,valid,count};
 }

 // La densidad PNOA en 0,5 m puede ser <2 retornos por celda.
 // Clasificar cada medio metro crea salpicaduras y elimina manchas enteras al
 // aplicar el área mínima. Acumular observaciones reales en ventanas de 2 m,
 // SIN interpolar ni tomar colores del TIFF: la altura sigue medida en LAZ.
 function aggregationGeometry(manifest,{targetCell=2,maxPixels=12000000}={}){
   const source=Number(manifest?.cellVegetation);
   if(!Number.isFinite(source)||source<.1||source>100)
     throw Error('Resolución de vegetación LiDAR inválida');
   if(!Number.isFinite(targetCell)||targetCell<source||targetCell>100)
     throw Error('Celda de clasificación LiDAR inválida');
   let factor=Math.max(1,Math.ceil(targetCell/source-1e-8));
   // Limitar la memoria para varios kilómetros cuadrados sin recortar el
   // área seleccionada ni forzar al usuario a dividir sus archivos.
   while(true){
     const cell=Number((factor*source).toFixed(6));
     try {
       const output=geometry(manifest,cell,maxPixels);
       return {...output,sourceCell:source,aggregationFactor:factor,
         method:'suma de recuentos LAS/LAZ originales y altura de vegetación observada'};
     }catch(err){
       if(!String(err.message).includes('excede 12 millones'))throw err;
       if(++factor>1000||factor*source>100)
         throw Error('Área LiDAR demasiado extensa para una vectorización unificada');
     }
   }
 }
 async function loadAggregatedMask(file,shape,{signal,onProgress}={}){
   check(signal);
   if(!file?.stream||!Number.isFinite(shape?.sourceCell)||shape.sourceCell<=0)
     throw Error('Faltan celdas originales LAS/LAZ para clasificar');
   const n=shape.width*shape.height;
   const ground=new Uint32Array(n),vegetation=new Uint32Array(n),
     blocked=new Uint8Array(n),maxHeight=new Float32Array(n),
     hasHeight=new Uint8Array(n);
   const reader=file.stream().getReader(),decoder=new TextDecoder();
   let pending='',first=true,rows=0,measured=0;
   const consume=line=>{
     if(first){
       first=false;
       if(line!==CSV_HEADER)throw Error('CSV LiDAR de zona completa sin clases verificables');
       return;
     }
     if(!line)return;
     const c=line.split(',');
     if(c.length!==16)throw Error('CSV LiDAR incompleto para agregación');
     const x=Number(c[0]),y=Number(c[1]);
     if(!Number.isFinite(x)||!Number.isFinite(y))
       throw Error('Coordenada LiDAR no finita');
     const i=Math.floor((x-shape.x0)/shape.cell+1e-8),
           j=Math.floor((y-shape.y0)/shape.cell+1e-8);
     if(i<0||j<0||i>=shape.width||j>=shape.height)
       throw Error('Celda de origen fuera de la zona seleccionada');
     const at=j*shape.width+i;
     const count=k=>{
       if(c[k].trim()==='')return 0;
       const value=Number(c[k]);
       if(!Number.isSafeInteger(value)||value<0)
         throw Error('Conteo LiDAR inválido en columna '+k);
       return value;
     };
     const g=count(2),v=count(3);
     const excluded=[4,5,6,14,15].some(k=>count(k)>0);
     if(g>4294967295-ground[at]||v>4294967295-vegetation[at])
       throw Error('Exceso de retornos en celda de vectorización');
     ground[at]+=g;vegetation[at]+=v;
     if(excluded)blocked[at]=1;
     if(v>0&&c[8].trim()){
       const height=Number(c[8]);
       if(!Number.isFinite(height)||height<0)
         throw Error('Altura de vegetación LiDAR inválida');
       if(!hasHeight[at]||height>maxHeight[at])maxHeight[at]=height;
       hasHeight[at]=1;
     }
     if(g>0&&c[11]==='observed')measured++;
     rows++;
   };
   try{
     while(true){
       check(signal);
       const chunk=await reader.read();
       if(chunk.done)break;
       pending+=decoder.decode(chunk.value,{stream:true});
       let p;
       while((p=pending.indexOf('\n'))>=0){
         consume(pending.slice(0,p).replace(/\r$/,''));
         pending=pending.slice(p+1);
       }
       if(pending.length>65536)throw Error('Fila CSV LiDAR excesivamente larga');
       if(rows&&rows%250000===0)onProgress?.({stage:'aggregation',rows});
     }
     pending+=decoder.decode();
     if(pending)consume(pending.replace(/\r$/,''));
     if(first)throw Error('CSV LiDAR vacío');
   }finally{
     try{await reader.cancel()}catch(_){}
     try{reader.releaseLock()}catch(_){}
   }
   const mask=new Uint8Array(n),counts=[0,0,0,0];
   for(let i=0;i<n;i++){
     if((i&65535)===0)check(signal);
     if(blocked[i]){counts[0]++;continue;}
     const g=ground[i],v=vegetation[i];
     const height=hasHeight[i]?maxHeight[i]:null;
     const density=v+g?v/(v+g):0;
     let cls=0;
     // Verde oscuro: altura y predominio de retornos de vegetación.
     if(v>=5&&height!==null&&height>=3&&density>=.6)cls=1;
     // Rayado: presencia vegetal dispersa de 0,3 m o más.
     else if(v>=2&&height!==null&&height>=.3&&density>=.12)cls=2;
     // Amarillo: suelo realmente medido y ausencia de vegetación en 2 m.
     // No supone automáticamente un cultivo: la etiqueta sigue provisional.
     else if(g>=3&&v===0)cls=3;
     mask[i]=cls;counts[cls]++;
   }
   return {mask,rows,measured,count:counts,aggregatedCells:n,
     classifiedCells:n-counts[0],sourceCell:shape.sourceCell,
     classificationCell:shape.cell};
 }

 const pointKey=(x,y)=>x+','+y;
 function signedArea(r){
   let a=0;for(let i=0;i<r.length-1;i++)
     a+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1];
   return a/2;
 }
 function simplify(raw){
   if(raw.length<5)return raw;
   const pts=raw.slice(0,-1),out=[];
   for(let i=0;i<pts.length;i++){
     const a=pts[(i+pts.length-1)%pts.length],b=pts[i],c=pts[(i+1)%pts.length];
     if((b[0]-a[0])*(c[1]-b[1])===(b[1]-a[1])*(c[0]-b[0]))continue;
     out.push(b);
   }
   return out.length>=3?[...out,out[0]]:raw;
 }
 function curveRing(r,shape){
   // Contorno suave para objetos NATURALES; los edificios/vías no entran
   // en ninguna de estas clases. Una pasada de Chaikin con vértices nuevos.
   const pts=simplify(r).slice(0,-1),n=pts.length;
   const curved=[];
   if(n<3)return [];
   for(let i=0;i<n;i++){
     const a=pts[i],b=pts[(i+1)%n];
     curved.push([.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]]);
     curved.push([.25*a[0]+.75*b[0],.25*a[1]+.75*b[1]]);
   }
   curved.push(curved[0]);
   return curved.map(([x,y])=>[
     +(shape.x0+x*shape.cell).toFixed(5),
     +(shape.y0+y*shape.cell).toFixed(5)]);
 }
 function inside(p,r){
   let yes=false;
   for(let i=0,j=r.length-1;i<r.length;j=i++){
     const a=r[i],b=r[j];
     if((a[1]>p[1])!==(b[1]>p[1]) &&
       p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
   }
   return yes;
 }
 function boundaries(queue,size,mask,width,height,cls){
   const outgoing=new Map(),edges=[];
   function add(ax,ay,bx,by){
     const edge={a:[ax,ay],b:[bx,by],used:false},key=pointKey(ax,ay);
     const existing=outgoing.get(key);
     if(existing)existing.push(edge);else outgoing.set(key,[edge]);
     edges.push(edge);
   }
   for(let p=0;p<size;p++){
     const index=queue[p],i=index%width,j=Math.floor(index/width);
     if(j===0||mask[index-width]!==cls)add(i,j,i+1,j); // Sur
     if(i+1===width||mask[index+1]!==cls)add(i+1,j,i+1,j+1); // Este
     if(j+1===height||mask[index+width]!==cls)add(i+1,j+1,i,j+1); // Norte
     if(i===0||mask[index-1]!==cls)add(i,j+1,i,j); // Oeste
   }
   const rings=[];
   for(const start of edges){
     if(start.used)continue;
     const ring=[start.a],origin=pointKey(...start.a);
     let edge=start,steps=0;
     while(true){
       if(edge.used)throw Error('Borde vectorial repetido');
       edge.used=true;ring.push(edge.b);
       const end=pointKey(...edge.b);
       if(end===origin)break;
       const options=(outgoing.get(end)||[]).filter(e=>!e.used);
       if(!options.length)throw Error('Borde vectorial abierto');
       // Interior siempre a la izquierda, preferir giro antihorario.
       const vx=edge.b[0]-edge.a[0],vy=edge.b[1]-edge.a[1];
       options.sort((u,v)=>{
         const cross=e=>vx*(e.b[1]-e.a[1])-vy*(e.b[0]-e.a[0]);
         return cross(v)-cross(u);
       });
       edge=options[0];
       if(++steps>edges.length)throw Error('Ciclo vectorial demasiado largo');
     }
     const simple=simplify(ring);
     if(simple.length>=4&&Math.abs(signedArea(simple))>=.5)rings.push(simple);
   }
   const outer=rings.filter(r=>signedArea(r)>0).map(r=>({ring:r,holes:[],area:signedArea(r)}));
   for(const hole of rings.filter(r=>signedArea(r)<0)){
     const center=hole[0].map((v,i)=>(v+hole[1][i]+hole[2][i])/3);
     let owner=null;
     for(const o of outer)if(inside(center,o.ring)&&(!owner||o.area<owner.area))
       owner=o;
     if(owner)owner.holes.push(hole);
   }
   if(rings.length&&!outer.length)throw Error('Polígono LiDAR sin contorno exterior');
   return outer;
 }
 function vectorizeMask(mask,shape,{signal,maxFeatures=6000,minAreas=null,onProgress}={}){
   const n=shape.width*shape.height;
   if(!(mask instanceof Uint8Array)||mask.length!==n)
     throw Error('Mosaico de clases LiDAR incompatible');
   const visited=new Uint8Array(n),queue=new Uint32Array(n),features=[];
   const summary={cells:n,features:0,candidates:{verde_oscuro:0,rayado:0,amarillo:0},
     suppressedSmall:0,minAreaM2:CLASSES.map(c=>minAreas?.[c.key]??c.minAreaM2),
     reviewed:false,source:'puntos LAS/LAZ',assumption:'clases candidatas'};
   for(let seed=0;seed<n;seed++){
     if((seed&65535)===0)check(signal);
     const cls=mask[seed];
     if(!cls||visited[seed])continue;
     if(cls<1||cls>3)throw Error('Clase LiDAR no reconocida');
     let head=0,tail=1;queue[0]=seed;visited[seed]=1;
     while(head<tail){
       const p=queue[head++],i=p%shape.width,j=Math.floor(p/shape.width);
       const neighbors=[
         i>0?p-1:-1,i+1<shape.width?p+1:-1,
         j>0?p-shape.width:-1,j+1<shape.height?p+shape.width:-1
       ];
       for(const v of neighbors)if(v>=0&&!visited[v]&&mask[v]===cls){
         visited[v]=1;queue[tail++]=v;
       }
       if((head&65535)===0)check(signal);
     }
     const def=CLASSES[cls-1],minArea=minAreas?.[def.key]??def.minAreaM2;
     if(!Number.isFinite(minArea)||minArea<0)throw Error('Área mínima de vegetación inválida');
     if(tail*shape.cell*shape.cell<minArea){summary.suppressedSmall++;continue;}
     const polygons=boundaries(queue,tail,mask,shape.width,shape.height,cls);
     for(const polygon of polygons){
       if(features.length>=maxFeatures)throw Error('Demasiados polígonos: aumenta el área mínima');
       const coords=[curveRing(polygon.ring,shape),
         ...polygon.holes.map(h=>curveRing(h,shape))];
       const area=tail*shape.cell*shape.cell;
       features.push({type:'Feature',
         properties:{
           clase:def.key,label:def.name,visual_color:def.color,
           estimated_area_m2:+area.toFixed(2),
           source:'LAS/LAZ clasificado, no TIFF ni imagen de alturas',
           classification:'indicadores LiDAR por celda, no transitabilidad confirmada',
           provisional:true,review_required:true,iof_symbol:null,
           geometry_appearance:'contorno natural suavizado; verificar bordes y huecos',
           iof_status:'sin símbolo asignado; requiere revisión',
           area_min_m2:minArea
         },
         geometry:{type:'Polygon',coordinates:coords}});
       summary.candidates[def.key]++;
     }
     if(features.length%50===0)onProgress?.({regions:features.length,cells:seed});
   }
   summary.features=features.length;
   return {features,summary};
 }
 async function exportGeojson(directory,manifest,{signal,onProgress,maxPixels=12000000,targetCell=2}={}){
   if(manifest?.state!=='complete'||manifest.mosaic?.state!=='building'&&
     manifest.mosaic?.state!=='complete')
     throw Error('Primero termina el procesamiento conjunto de todos los LAZ');
   if(!/^EPSG:\d+$/.test(manifest.crs))throw Error('EPSG LiDAR no confirmado');
   const shape=aggregationGeometry(manifest,{maxPixels,targetCell});
   const file=await (await directory.getFileHandle('zona_completa_vegetacion_lidar.csv')).getFile();
   const loaded=await loadAggregatedMask(file,shape,{signal,onProgress});
   const {features,summary}=vectorizeMask(loaded.mask,shape,{signal,onProgress});
   const name='zona_completa_vegetacion_candidata_lidar.geojson';
   const fc={
     type:'FeatureCollection',
     crs:{type:'name',properties:{name:manifest.crs}},
     metadata:{
       crs:manifest.crs,sourceFiles:manifest.sourceFiles.map(f=>f.name),
       source:'celdas del LAS/LAZ clasificadas y combinadas; NO TIFF',
       cell_m:shape.cell,source_lidar_cell_m:manifest.cellVegetation,
       aggregation_factor:shape.aggregationFactor,
       requested_analysis_cell_m:targetCell,
       aggregation_method:shape.method,dimensions:[shape.width,shape.height],
       calculation:'verde oscuro, rayado, amarillo grande — reglas provisionales sin IA entrenada',
       limitations:'No clasifica transitabilidad, cultivos ni penetrabilidad con certeza; requiere revisión manual',
       noInventedClasses:['verde_claro','verde_intermedio'],
       ...summary,readCells:loaded.rows,counts:loaded.count
     },features
   };
   check(signal);
   const stream=await(await directory.getFileHandle(name,{create:true})).createWritable();
   try{await stream.write(JSON.stringify(fc));await stream.close();}
   catch(e){try{await stream.abort()}catch(_){}throw e;}
   return {name,features:features.length,crs:manifest.crs,
     analysisCellM:shape.cell,sourceCellM:shape.sourceCell,
     classes:summary.candidates,method:'criterios conservadores desde puntos LiDAR; revisión obligatoria'};
 }
 return Object.freeze({CSV_HEADER,CLASSES,classifyColumns,geometry,loadMask,
   aggregationGeometry,loadAggregatedMask,vectorizeMask,exportGeojson,curveRing});
});
