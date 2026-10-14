/* Ocarto v17: conservative, non-extrapolating ground-grid interpolation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoTerrain=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function buildModel(points,cell,opts={}){
 if(!Number.isFinite(cell)||cell<=0)throw Error('Tamaño de celda inválido');
 if(!Array.isArray(points)||points.length>100000)throw Error('Rejilla demasiado grande');
 const maxOutput=Number.isInteger(opts.maxOutput)?opts.maxOutput:200000;
 const observed=new Map();let duplicate=0;
 for(const p of points){if(!Array.isArray(p)||p.length<4||![p[0],p[1],p[2],p[3]].every(Number.isFinite)||p[3]<1)throw Error('Celda de suelo inválida');
  const cx=Math.floor(p[0]/cell),cy=Math.floor(p[1]/cell),key=cx+','+cy;
  if(observed.has(key)){duplicate++;const old=observed.get(key);if(p[2]<old.z)old.z=p[2];old.n+=p[3]}
  else observed.set(key,{cx,cy,z:p[2],n:p[3],source:'observado'});
 }
 // Only one-cell enclosed gaps surrounded by four *observed* neighbours.
 // Do not recurse into interpolated cells or extrapolate outside coverage.
 const pending=new Set();for(const p of observed.values()){
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const cx=p.cx+dx,cy=p.cy+dy,key=cx+','+cy;if(!observed.has(key))pending.add(key)}
 }
 const out=[...observed.values()];let filled=0,unfilled=0;
 for(const key of pending){const [cx,cy]=key.split(',').map(Number),neighbors=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>observed.get((cx+dx)+','+(cy+dy)));
  if(neighbors.every(Boolean)){
   if(out.length>=maxOutput)throw Error('Demasiadas celdas MDT; aumenta el tamaño de celda');
   out.push({cx,cy,z:neighbors.reduce((n,p)=>n+p.z,0)/4,n:0,source:'interpolado'});filled++
  }else unfilled++;
 }
 out.sort((a,b)=>a.cy-b.cy||a.cx-b.cx);
 return{rows:out.map(p=>[(p.cx+.5)*cell,(p.cy+.5)*cell,p.z,p.n,p.source]),observed:observed.size,filled,unfilled,duplicates:duplicate,method:'vecinos cardinales 4, solo huecos internos de una celda; sin extrapolación'};
}
return{buildModel};
});
