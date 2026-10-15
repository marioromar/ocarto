/* Ocarto v82: local-relief rock-like protrusion candidates from observed ground cells. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoRocks=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function detect(rows,cell,opts={}){
 cell=Number(cell);const prominence=Number(opts.minProminence??.35),radius=Number(opts.radius??2),minPoints=Number(opts.minPoints??1),maxFeatures=Number(opts.maxFeatures??10000);
 if(!Array.isArray(rows)||rows.length>200000||!Number.isFinite(cell)||cell<=0)throw Error('Rejilla LiDAR no válida');
 if(!Number.isFinite(prominence)||prominence<=0||!Number.isInteger(radius)||radius<1||radius>5||!Number.isInteger(minPoints)||minPoints<1||minPoints>100000||!Number.isInteger(maxFeatures)||maxFeatures<1||maxFeatures>30000)throw Error('Parámetros de rocas inválidos');
 const cells=new Map();for(const row of rows){if(!Array.isArray(row)||row.length<4||!row.slice(0,4).every(Number.isFinite)||row[3]<0)throw Error('Celda de suelo no válida');if(row[4]&&row[4]!=='observado')continue;const i=Math.round(row[0]/cell-.5),j=Math.round(row[1]/cell-.5);if(Math.abs(row[0]-(i+.5)*cell)>cell*1e-5||Math.abs(row[1]-(j+.5)*cell)>cell*1e-5)throw Error('Rejilla incompatible con tamaño de celda');const key=i+','+j;if(cells.has(key))throw Error('Celdas de suelo duplicadas');cells.set(key,{i,j,x:row[0],y:row[1],z:row[2],n:row[3]})}
 const features=[],offsets=[];for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(dx||dy)offsets.push([dx,dy]);
 for(const p of cells.values()){
  if(p.n<minPoints)continue;const neighbors=offsets.map(([dx,dy])=>cells.get((p.i+dx)+','+(p.j+dy)));if(neighbors.some(q=>!q||q.n<minPoints))continue;
  if(neighbors.some(q=>q.z>=p.z))continue;
  const ring=neighbors.filter(q=>Math.max(Math.abs(q.i-p.i),Math.abs(q.j-p.j))===radius);if(ring.length<Math.max(5,radius===1?5:8))continue;
  const elevations=ring.map(q=>q.z).sort((a,b)=>a-b),mid=elevations.length>>1,base=elevations.length%2?elevations[mid]:(elevations[mid-1]+elevations[mid])/2,relief=p.z-base;if(relief<prominence)continue;
  if(features.length>=maxFeatures)throw Error('Demasiadas rocas candidatas; aumenta el desnivel mínimo o el radio');
  features.push({type:'Feature',geometry:{type:'Point',coordinates:[p.x,p.y,p.z]},properties:{kind:'roca-candidata-relieve-lidar',source:'máximo local sobre celdas de suelo observadas',ground_points:p.n,local_prominence_m:+relief.toFixed(3),min_prominence_m:prominence,neighborhood_radius_cells:radius,review_required:true,auto_accept:false,warning:'La prominencia local también puede corresponder a un tocón, escalón del terreno o error de clasificación; confirmar con ortofoto y cartografía.'}})
 }
 features.sort((a,b)=>b.properties.local_prominence_m-a.properties.local_prominence_m);
 return{type:'FeatureCollection',name:'Ocarto · rocas candidatas LiDAR · revisar',properties:{cellSize:cell,minProminenceM:prominence,radiusCells:radius,minGroundPoints:minPoints,features:features.length,method:'máximo local respecto a mediana del anillo exterior; solo suelo observado',nonAutomatic:true},features};
}
return{detect};
});
