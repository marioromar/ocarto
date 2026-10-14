/* Ocarto v20: conservative, optional contour smoothing. Original lines remain unchanged. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoContourSmoothing=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function smooth(features,opts={}) {
 if(!Array.isArray(features)||features.length>200000)throw Error('Curvas inválidas o demasiadas');
 const intensity=opts.intensity===undefined?25:Number(opts.intensity);
 const protectedAngle=opts.protectedAngle===undefined?55:Number(opts.protectedAngle);
 const maxShift=opts.maxShift===undefined?Infinity:Number(opts.maxShift);
 if(!Number.isFinite(intensity)||intensity<0||intensity>100)throw Error('Intensidad fuera de 0–100');
 if(!Number.isFinite(protectedAngle)||protectedAngle<0||protectedAngle>180)throw Error('Ángulo de protección inválido');
 if(!(maxShift===Infinity||(Number.isFinite(maxShift)&&maxShift>0)))throw Error('Desplazamiento máximo inválido');
 let moved=0,protectedVertices=0,skipped=0;
 const output=features.map(f=>{
  const original=f?.geometry?.coordinates, props=f?.properties||{};
  if(f?.geometry?.type!=='LineString'||!Array.isArray(original)||original.length<2||original.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))||!Number.isFinite(props.elevation))throw Error('Curva inválida');
  const points=original.map(p=>[p[0],p[1]]);const closed=points.length>=4&&Math.hypot(points[0][0]-points[points.length-1][0],points[0][1]-points[points.length-1][1])<1e-8;
  const n=closed?points.length-1:points.length;
  if(n<3||intensity===0){skipped++;return {type:'Feature',properties:{...props,smoothed:false,smoothingIntensity:0},geometry:{type:'LineString',coordinates:points}}}
  const result=points.map(p=>p.slice()),fraction=Math.min(.45,intensity*.0045);
  for(let i=0;i<n;i++){
   if(!closed&&(i===0||i===n-1))continue;
   const p=points[i],prev=points[(i+n-1)%n],next=points[(i+1)%n];
   const ax=prev[0]-p[0],ay=prev[1]-p[1],bx=next[0]-p[0],by=next[1]-p[1];
   const al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
   if(al<1e-9||bl<1e-9){protectedVertices++;continue}
   const angle=Math.acos(Math.max(-1,Math.min(1,(ax*bx+ay*by)/(al*bl))))*180/Math.PI;
   const turn=180-angle; // Small interior detail: sharp change of direction.
   if(turn>=protectedAngle){protectedVertices++;continue}
   const tx=(prev[0]+next[0])/2-p[0],ty=(prev[1]+next[1])/2-p[1];
   const shift=Math.hypot(tx,ty)*fraction;
   const clamp=shift===0?0:Math.min(1,maxShift/shift);
   result[i]=[p[0]+fraction*clamp*tx,p[1]+fraction*clamp*ty];
   if(Math.hypot(result[i][0]-p[0],result[i][1]-p[1])>1e-9)moved++;
  }
  if(closed)result[result.length-1]=result[0].slice();
  return {type:'Feature',properties:{...props,smoothed:true,smoothingIntensity:intensity,smoothingProtectedAngle:protectedAngle,review_required:true},geometry:{type:'LineString',coordinates:result}};
 });
 return {features:output,moved,protectedVertices,skipped,method:'v20: Laplaciano limitado, extremos fijos, vértices angulosos protegidos; requiere revisión topológica y cartográfica'};
}
return {smooth};
});
