/* Convert natural LiDAR map lines and areas to editable cubic Bezier geometry. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoNaturalCurves=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function pointList(points,closed){
 if(!Array.isArray(points)||points.length<(closed?3:2))throw Error('Geometría natural inválida');
 const clean=points.map(p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Vértice natural inválido');return {...p}});
 if(closed&&clean.length>3){const a=clean[0],b=clean.at(-1);if(a.x===b.x&&a.y===b.y)clean.pop()}
 if(clean.length<(closed?3:2))throw Error('Geometría natural inválida');
 const n=clean.length;
 for(let i=0;i<n;i++){
  const prev=closed?clean[(i+n-1)%n]:clean[Math.max(0,i-1)],next=closed?clean[(i+1)%n]:clean[Math.min(n-1,i+1)],p=clean[i];
  let dx,dy,scale;
  if(!closed&&i===0){dx=next.x-p.x;dy=next.y-p.y;scale=1/3}
  else if(!closed&&i===n-1){dx=p.x-prev.x;dy=p.y-prev.y;scale=1/3}
  else{dx=next.x-prev.x;dy=next.y-prev.y;scale=1/6}
  let tx=dx*scale,ty=dy*scale;
  const mag=Math.hypot(tx,ty),before=Math.hypot(p.x-prev.x,p.y-prev.y),after=Math.hypot(next.x-p.x,next.y-p.y),cap=!closed&&i===0?after/3:!closed&&i===n-1?before/3:Math.min(before,after)/3;
  if(mag>cap&&mag>0){tx*=cap/mag;ty*=cap/mag}
  p.tangent={x:tx,y:ty};
 }
 return clean;
}
function isBuilding(feature,options){
 if(options.isBuilding)return true;
 const text=[feature?.candidateKind,feature?.candidateProperties?.kind,feature?.candidateProperties?.category,feature?.symbol,feature?.aiVegetationLabel].filter(Boolean).join(' ').toLowerCase();
 return /edificio|building|construcci[oó]n|ruina|ruin/.test(text);
}
function apply(feature,options={}){
 if(!feature||!['line','area'].includes(feature.type)||isBuilding(feature,options))return feature;
 const out={...feature};
 if(feature.type==='line')out.points=pointList(feature.points,false);
 else{
  out.points=pointList(feature.points,true);
  if(Array.isArray(feature.holes))out.holes=feature.holes.map(ring=>pointList(ring,true));
 }
 out.curve='bezier';
 out.naturalCurve='cubic-bezier';
 return out;
}
return {apply,pointList,isBuilding};
});
