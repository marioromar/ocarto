/* Ocarto: candidate closed depressions from observed LiDAR ground cells. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoDepressions=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function detect(rows,cell,opts={}){
 const minRelief=Number(opts.minRelief??0.5),radius=Number(opts.radius??2),minGround=Number(opts.minGround??1);
 if(!Array.isArray(rows)||rows.length>1000000||!Number.isFinite(cell)||cell<=0)throw Error('MDT o tamaño de celda inválidos');
 if(!Number.isFinite(minRelief)||minRelief<=0||!Number.isInteger(radius)||radius<1||radius>8||!Number.isInteger(minGround)||minGround<1)throw Error('Parámetros de depresiones no válidos');
 const cells=new Map();
 for(const r of rows){if(!Array.isArray(r)||r.length<4||!r.slice(0,4).every(Number.isFinite)||r[3]<0)throw Error('Celda MDT no válida');const i=Math.round(r[0]/cell-.5),j=Math.round(r[1]/cell-.5);if(Math.abs(r[0]-(i+.5)*cell)>cell*1e-5||Math.abs(r[1]-(j+.5)*cell)>cell*1e-5)throw Error('Celda fuera de rejilla');const key=i+','+j;if(cells.has(key))throw Error('Celdas MDT duplicadas');cells.set(key,{i,j,x:r[0],y:r[1],z:r[2],n:r[3],source:r[4]||'observado'});}
 const features=[];let skipped=0;
 for(const p of cells.values()){
  if(p.source!=='observado'||p.n<minGround){skipped++;continue;}
  let lower=false,ringMin=Infinity,ringMax=-Infinity,valid=0;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
   if(!dx&&!dy)continue;const q=cells.get((p.i+dx)+','+(p.j+dy));if(!q||q.source!=='observado'||q.n<minGround)continue;
   valid++;ringMin=Math.min(ringMin,q.z);ringMax=Math.max(ringMax,q.z);if(q.z<=p.z+1e-9)lower=true;
  }
  // Require a complete observed ring: interpolation edges and missing cells are not evidence.
  const expected=(radius*2+1)**2-1;if(valid!==expected||lower||ringMin-p.z<minRelief)continue;
  features.push({type:'Feature',geometry:{type:'Point',coordinates:[p.x,p.y]},properties:{kind:'depresion-candidata-lidar',ground_elevation_m:+p.z.toFixed(3),rim_min_elevation_m:+ringMin.toFixed(3),rim_max_elevation_m:+ringMax.toFixed(3),local_relief_m:+(ringMin-p.z).toFixed(3),radius_cells:radius,cell_size_m:cell,source:'MDT de celdas observadas',confidence:'candidata',review_required:true,auto_accept:false,warning:'Mínimo cerrado local del MDT; puede ser ruido, hueco, extracción deficiente del suelo o depresión real. Confirmar con puntos LiDAR y terreno.'}});
 }
 return{type:'FeatureCollection',name:'Ocarto · depresiones candidatas LiDAR · revisar',properties:{cellSize:cell,minReliefM:minRelief,radiusCells:radius,source:'MDT original; solo celdas observadas',candidateCount:features.length,skipped,nonAutomatic:true,warning:'Los candidatos son indicios geométricos y no se convierten automáticamente en símbolos cartográficos.'},features};
}
return{detect};
});
