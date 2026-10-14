/* Ocarto v22: diagnostic candidates for potentially under-resolved incised gullies.
   Never edits the source DTM: depth suggestion is an unverified hypothesis. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoValleys=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function detect(rows,cell,opts={}){
 if(!Number.isFinite(cell)||cell<=0||!Array.isArray(rows)||rows.length>200000)throw Error('MDT o celda inválidos');
 const minIncision=opts.minIncision===undefined?.6:Number(opts.minIncision);
 const maxProposal=opts.maxProposal===undefined?1:Number(opts.maxProposal);
 const minGround=opts.minGround===undefined?1:Number(opts.minGround);
 if(!Number.isFinite(minIncision)||minIncision<=0||!Number.isFinite(maxProposal)||maxProposal<=0||maxProposal>2||!Number.isInteger(minGround)||minGround<1)throw Error('Parámetros de vaguada inválidos');
 const m=new Map();
 for(const r of rows){if(!Array.isArray(r)||r.length<4||!r.slice(0,4).every(Number.isFinite))throw Error('Celda MDT inválida');const i=Math.round(r[0]/cell-.5),j=Math.round(r[1]/cell-.5);if(Math.abs(r[0]-(i+.5)*cell)>cell*1e-5||Math.abs(r[1]-(j+.5)*cell)>cell*1e-5)throw Error('Celda fuera de rejilla');const k=i+','+j;if(m.has(k))throw Error('Celda duplicada');m.set(k,{i,j,x:r[0],y:r[1],z:r[2],n:r[3],source:r[4]||'observado'});}
 const get=(i,j)=>m.get(i+','+j);let skipped=0;const features=[];
 for(const p of m.values()){
  if(p.source!=='observado'||p.n<minGround){skipped++;continue}
  const n=get(p.i,p.j+1),s=get(p.i,p.j-1),e=get(p.i+1,p.j),w=get(p.i-1,p.j);
  // Opposite shoulders must both have observed ground; no extrapolation or synthetic cells.
  const axes=[{axis:'NS',a:e,b:w,along:[n,s]},{axis:'EW',a:n,b:s,along:[e,w]}];
  let best=null;
  for(const a of axes){if(!a.a||!a.b||a.a.source!=='observado'||a.b.source!=='observado'||a.a.n<minGround||a.b.n<minGround)continue;
   const left=a.a.z-p.z,right=a.b.z-p.z;
   if(left<minIncision||right<minIncision)continue;
   // The valley must have continuity along its axis. Reject isolated depressions/holes.
   if(a.along.filter(q=>q&&q.source==='observado'&&q.n>=minGround).length!==2)continue;
   // Verify the cross-section remains incised in BOTH adjacent cells along the valley.
   // A one-cell pit otherwise looks like a V in either cross-section.
   const alongDirs=a.axis==='NS'?[[0,1],[0,-1]]:[[1,0],[-1,0]];
   const sideDirs=a.axis==='NS'?[[1,0],[-1,0]]:[[0,1],[0,-1]];
   const continuous=alongDirs.every(([dx,dy])=>{
    const q=get(p.i+dx,p.j+dy),side1=get(q.i+sideDirs[0][0],q.j+sideDirs[0][1]),side2=get(q.i+sideDirs[1][0],q.j+sideDirs[1][1]);
    return side1&&side2&&side1.source==='observado'&&side2.source==='observado'&&side1.n>=minGround&&side2.n>=minGround&&side1.z-q.z>=minIncision&&side2.z-q.z>=minIncision;
   });
   if(!continuous)continue;
   const steepness=Math.min(left,right),longSlope=Math.abs(a.along[0].z-a.along[1].z)/(2*cell);
   const score=steepness/(1+longSlope);
   if(!best||score>best.score)best={axis:a.axis,incision:steepness,score,shoulders:[a.a.z,a.b.z],along:a.along.map(q=>q.z)};
  }
  if(!best){skipped++;continue}
  // Max 1m by default, only an upper envelope for inspection, NOT measured depth.
  const suggestion=Math.min(maxProposal,best.incision*.25);
  features.push({type:'Feature',properties:{kind:'possible-underresolved-valley',axis:best.axis,ground_z:p.z,shoulder_min_z:Math.min(...best.shoulders),incision_m:best.incision,possible_extra_depth_max_m:+suggestion.toFixed(3),source:'observed-ground-only',confidence:'unverified',review_required:true,apply_automatically:false,warning:'Posible vaguada; comprobar puntos originales y terreno. La profundidad adicional NO está medida.'},geometry:{type:'Point',coordinates:[p.x,p.y]}});
 }
 return {type:'FeatureCollection',name:'Ocarto v22: vaguadas candidatas para revisión',properties:{cellSize:cell,source:'MDT original sin modificar',uncertainty:'El fondo real puede diferir del MDT. Cota adicional orientativa, nunca modificación automática.',candidateCount:features.length,skipped},features};
}
return {detect};
});
