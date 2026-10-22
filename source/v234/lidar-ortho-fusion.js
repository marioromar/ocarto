/* Ocarto v281: non-destructive cross-check of orthophoto road proposals
   with LAS cell evidence. Without aligned samples there is NO claimed support.
   Coordinates must be UTM meters in the same CRS (validated by the caller). */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoOrthoLidarFusion=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function annotateRoads(collection,rows,cell,options={}){
 if(collection?.type!=='FeatureCollection'||!Array.isArray(collection.features))
   throw Error('Caminos de ortofoto inválidos');
 cell=Number(cell);
 if(!Array.isArray(rows)||!Number.isFinite(cell)||cell<.1||rows.length>1000000)
   throw Error('Celdas LiDAR para contraste no válidas');
 const map=new Map(),key=(i,j)=>i+','+j;
 for(const row of rows){
   if(!Number.isFinite(row.x)||!Number.isFinite(row.y))continue;
   const i=Math.round(row.x/cell-.5),j=Math.round(row.y/cell-.5);
   if(Math.abs(row.x-(i+.5)*cell)>cell*1e-5||Math.abs(row.y-(j+.5)*cell)>cell*1e-5)
     throw Error('Georreferenciación LiDAR incompatible con el tamaño de celda');
   const id=key(i,j);
   if(map.has(id))throw Error('Celdas LiDAR duplicadas en la fusión');
   map.set(id,row);
 }
 const step=Math.max(.5,cell),maxSamples=Number(options.maxSamples??1200);
 if(!Number.isInteger(maxSamples)||maxSamples<10||maxSamples>5000)
   throw Error('Límite de muestras inválido');
 let supported=0,inconclusive=0;
 const features=collection.features.map(f=>{
   if(f.geometry?.type!=='LineString'||!Array.isArray(f.geometry.coordinates))
     return f;
   const points=f.geometry.coordinates;
   let total=0,roadClass=0,openGround=0,canopy=0,missing=0;
   // Evenly sample long segments (bounded for a very complex road).
   for(let n=1;n<points.length&&total<maxSamples;n++){
     const a=points[n-1],b=points[n];
     if(![a?.[0],a?.[1],b?.[0],b?.[1]].every(Number.isFinite))continue;
     const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
     const slices=Math.max(1,Math.ceil(length/step));
     for(let k=0;k<slices&&total<maxSamples;k++){
       const t=k/slices,x=a[0]+t*(b[0]-a[0]),y=a[1]+t*(b[1]-a[1]);
       total++;
       const r=map.get(key(Math.floor(x/cell),Math.floor(y/cell)));
       if(!r){missing++;continue;}
       if(Number(r.road_points||0)>0)roadClass++;
       const ground=Number(r.ground_points||0),veg=Number(r.vegetation_points||0);
       if(ground>=1&&veg===0)openGround++;
       if(veg>ground && Number(r.canopy_max_above_ground_m)>=2)canopy++;
     }
   }
   const observed=total-missing;
   // Unclassified ground is weak corroboration only; not proof of a road.
   const direct=observed>0&&roadClass/observed>=.35&&roadClass>=2;
   const clear=observed>0&&openGround/observed>=.6&&openGround>=2;
   const obstructed=observed>0&&canopy/observed>=.5&&canopy>=2;
   const evidence=direct?'apoyo-clase11':clear?'superficie-despejada-no-confirma':
     obstructed?'cubierta-vegetal-no-descarta-camino':'insuficiente';
   if(direct)supported++;else inconclusive++;
   return {...f,properties:{...f.properties,
     kind:f.properties?.kind||'posible-camino-por-ortofoto',
     lidar_crosscheck:evidence,
     lidar_sampled:total,lidar_observed:observed,
     lidar_road_class11_samples:roadClass,
     lidar_open_ground_samples:openGround,
     lidar_canopy_obstruction_samples:canopy,
     source_detection:'ortofoto georreferenciada + contraste con clases/cobertura LiDAR',
     review_required:true,auto_accept:false,
     warning:direct?'Ortofoto y clase 11 coinciden en parte del eje. Revisar anchura, tipo de vía y continuidad.':
       clear?'Se observan puntos de suelo sin vegetación, pero esto NO confirma un camino. Revisar color/textura y continuidad.':
       obstructed?'Hay copas en el trazado; podrían ocultar un camino o ser una falsa detección. Revisar manualmente.':
       'No hay evidencia LiDAR suficiente o bien alineada: NO se confirma camino; inspeccionar ortofoto y campo.'}};
 });
 return {...collection,properties:{...(collection.properties||{}),
    lidar_crosscheck_applied:rows.length>0,corroborated_with_las_class11:supported,
    unconfirmed:inconclusive,method:'contraste espacial sin inferencia semántica ni aprobación automática',
    review_required:true},features};
}
return Object.freeze({annotateRoads});
});
