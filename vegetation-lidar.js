/* Ocarto v23. Derived per-cell LiDAR vegetation descriptors.
   Ground-relative canopy proxy, point distribution and intensity; NOT passability labels. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoVegetation=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create(cell,opts={}){
 cell=Number(cell);const maxCells=opts.maxCells===undefined?100000:Number(opts.maxCells);
 if(!Number.isFinite(cell)||cell<=0||!Number.isInteger(maxCells)||maxCells<1||maxCells>250000)throw Error('Tamaño de celda o límite de memoria inválido');
 const bins=new Map();let processed=0;
 const add=(x,y,z,code,intensity=0,returnNumber=0)=>{
  if(![x,y,z,intensity,returnNumber].every(Number.isFinite))throw Error('Punto LiDAR no finito');
  if(![2,3,4,5,6,14,15].includes(code))return;
  const i=Math.floor(x/cell),j=Math.floor(y/cell),key=i+','+j;
  let b=bins.get(key);if(!b){if(bins.size>=maxCells)throw Error('Demasiadas celdas de vegetación: aumenta la resolución de celda');b={i,j,ground:0,groundMin:Infinity,vegetation:0,vegMax:-Infinity,vegSum:0,intensitySum:0,firstReturns:0,classes:{3:0,4:0,5:0},building:0,roofMin:Infinity,roofMax:-Infinity,wire:0,tower:0};bins.set(key,b)}
  processed++;
  if(code===2){b.ground++;b.groundMin=Math.min(b.groundMin,z)}else if(code===6){b.building++;b.roofMin=Math.min(b.roofMin,z);b.roofMax=Math.max(b.roofMax,z)}else if(code===14){b.wire++}else if(code===15){b.tower++}else{b.vegetation++;b.vegMax=Math.max(b.vegMax,z);b.vegSum+=z;b.intensitySum+=intensity;b.classes[code]++;if(returnNumber===1)b.firstReturns++}
 };
 const finish=()=>{
  const rows=[],features=[];
  for(const b of bins.values()){
   const hasGround=b.ground>0,hasVeg=b.vegetation>0,usable=hasGround&&hasVeg;
   const total=b.ground+b.vegetation,cover=total?b.vegetation/total:0;
   const h=usable?Math.max(0,b.vegMax-b.groundMin):null;
   const meanH=usable?Math.max(0,b.vegSum/b.vegetation-b.groundMin):null;
   // Return fractions and intensity depend on capture settings; NOT calibrated runnability.
   const status=!hasGround?'sin-suelo-local':!hasVeg?'sin-vegetacion-clasificada':b.ground<3||b.vegetation<5?'muestra-reducida':'estimacion-observada';
   const properties={kind:'indicadores-vegetacion-lidar',ground_points:b.ground,vegetation_points:b.vegetation,ground_z_min:hasGround?+b.groundMin.toFixed(3):null,canopy_max_above_ground_m:h===null?null:+h.toFixed(3),canopy_mean_above_ground_m:meanH===null?null:+meanH.toFixed(3),vegetation_return_fraction:+cover.toFixed(4),first_vegetation_returns:b.firstReturns,mean_vegetation_intensity:hasVeg?+(b.intensitySum/b.vegetation).toFixed(2):null,low_veg_points:b.classes[3],medium_veg_points:b.classes[4],high_veg_points:b.classes[5],building_points:b.building,building_roof_range_m:b.building?+(b.roofMax-b.roofMin).toFixed(3):null,building_height_above_ground_m:hasGround&&b.building?+Math.max(0,b.roofMax-b.groundMin).toFixed(3):null,wire_points:b.wire,tower_points:b.tower,quality:status,map_color:null,passability:null,review_required:true,warning:'Altura y densidad LiDAR no equivalen a penetrabilidad. Intensidad no comparable entre vuelos sin calibrar.'};
   rows.push({x:(b.i+.5)*cell,y:(b.j+.5)*cell,...properties});
   if(usable)features.push({type:'Feature',properties,geometry:{type:'Polygon',coordinates:[[[b.i*cell,b.j*cell],[(b.i+1)*cell,b.j*cell],[(b.i+1)*cell,(b.j+1)*cell],[b.i*cell,(b.j+1)*cell],[b.i*cell,b.j*cell]]]}});
  }
  rows.sort((a,b)=>a.y-b.y||a.x-b.x);
  return {cellSize:cell,cells:bins.size,processed,quality:'Indicadores no calibrados; requieren cartografía de entrenamiento.',rows,geojson:{type:'FeatureCollection',name:'Ocarto v23 indicadores de vegetacion',properties:{cellSize:cell,nonAutomatic:true},features}};
 };
 return {add,finish};
}
return {create};
});
