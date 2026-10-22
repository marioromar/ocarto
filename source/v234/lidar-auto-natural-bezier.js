/* Ocarto v282: guarded native cubic Bezier conversion for detected natural shapes.
   Never change the source geometry; return the original if the smoothed outline
   self-intersects, crosses a hole, or deviates excessively from sampled data.
   Building and constructed objects retain explicit straight/corner vertices. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoAutoNaturalBezier=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const EPS=1e-8;
const LEVELS={low:0.35,medium:0.7,high:1.0};
const artificial=/edificio|building|construcci[oó]n|ruina|ruin|vallado|cerca|fence|muro|wall|escarpe|power|tendido|apoyo|poste|torre|carretera-borde|road-edge/i;
function kindOf(f){return [f.candidateKind,f.candidateProperties?.kind,f.candidateProperties?.category,
 f.lidarProperties?.kind,f.symbol,f.source].filter(Boolean).join(' ');}
function shouldCurve(f){
 if(!f||!['area','line'].includes(f.type))return false;
 if(artificial.test(kindOf(f)))return false;
 if(f.curve==='bezier')return false; // Preserve existing user editing.
 return true;
}
function pointsOf(list,closed){
 if(!Array.isArray(list))return null;
 const out=list.map(p=>({...p}));
 if(closed&&out.length>3&&out[0].x===out.at(-1).x&&out[0].y===out.at(-1).y)out.pop();
 return out.length>=(closed?3:2)&&out.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))?out:null;
}
function distance(p,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
 if(d<EPS)return Math.hypot(p.x-a.x,p.y-a.y);
 const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d));
 return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function signedArea(r){
 let sum=0;for(let i=0;i<r.length;i++){
 const a=r[i],b=r[(i+1)%r.length];sum+=a.x*b.y-b.x*a.y;
 }return sum/2;
}
function handles(list,closed,factor,gridSize){
 const sign=closed?(signedArea(list)>=0?1:-1):1;
 return list.map((p,i)=>{
   const prev=list[closed?(i+list.length-1)%list.length:Math.max(0,i-1)],
         next=list[closed?(i+1)%list.length:Math.min(list.length-1,i+1)];
   const v={...p};delete v.tangent;delete v.inTangent;delete v.outTangent;
   if(p.vertexType==='corner'||!factor)return v;
   const ax=p.x-prev.x,ay=p.y-prev.y,bx=next.x-p.x,by=next.y-p.y;
   const a=Math.hypot(ax,ay),b=Math.hypot(bx,by);
   if(!a||!b)return v;
   const cosine=(ax*bx+ay*by)/(a*b),cross=ax*by-ay*bx;
   // Protect reentrant cusps and sharp line hairpins.
   if(cosine<-.25&&(closed?cross*sign<0:cosine<-.7)){
     v.vertexType='corner';return v;
   }
   const end=!closed&&(i===0||i===list.length-1);
   let x=(end?(i===0?bx:ax):next.x-prev.x)*(end?factor/3:factor/6);
   let y=(end?(i===0?by:ay):next.y-prev.y)*(end?factor/3:factor/6);
   // Handles may not swallow thin arms, small island/hole corners, or fine grid detail.
   const cap=Math.min(a,b)/3;
   const spatialCap=Number.isFinite(gridSize)&&gridSize>0?Math.min(cap,gridSize*1.4):cap;
   const norm=Math.hypot(x,y);
   if(norm>spatialCap){x*=spatialCap/norm;y*=spatialCap/norm;}
   if(Math.hypot(x,y)>EPS)v.tangent={x,y};
   return v;
 });
}
function cubic(a,b,t){
 const out=a.outTangent||a.tangent||{x:(b.x-a.x)/3,y:(b.y-a.y)/3};
 const tin=b.inTangent||(b.tangent?{x:-b.tangent.x,y:-b.tangent.y}:{x:-(b.x-a.x)/3,y:-(b.y-a.y)/3});
 const u=1-t;
 return {x:u*u*u*a.x+3*u*u*t*(a.x+out.x)+3*u*t*t*(b.x+tin.x)+t*t*t*b.x,
         y:u*u*u*a.y+3*u*u*t*(a.y+out.y)+3*u*t*t*(b.y+tin.y)+t*t*t*b.y};
}
function flatten(list,closed,steps=6){
 const sample=[],deviations=[];const count=closed?list.length:list.length-1;
 for(let i=0;i<count;i++){
   const a=list[i],b=list[(i+1)%list.length];
   if(!i)sample.push({x:a.x,y:a.y});
   for(let j=1;j<=steps;j++){
     const p=cubic(a,b,j/steps);
     sample.push(p);deviations.push(distance(p,a,b));
   }
 }
 if(closed)sample.pop();
 return {sample,deviations};
}
function orient(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function intersects(a,b,c,d){
 if(Math.max(a.x,b.x)+EPS<Math.min(c.x,d.x)||Math.max(c.x,d.x)+EPS<Math.min(a.x,b.x)||
    Math.max(a.y,b.y)+EPS<Math.min(c.y,d.y)||Math.max(c.y,d.y)+EPS<Math.min(a.y,b.y))return false;
 const u=orient(a,b,c),v=orient(a,b,d),w=orient(c,d,a),z=orient(c,d,b);
 if((u>EPS&&v< -EPS||u< -EPS&&v>EPS)&&(w>EPS&&z< -EPS||w< -EPS&&z>EPS))return true;
 const on=(p,x,y)=>Math.abs(orient(x,y,p))<=EPS&&p.x>=Math.min(x.x,y.x)-EPS&&p.x<=Math.max(x.x,y.x)+EPS&&
   p.y>=Math.min(x.y,y.y)-EPS&&p.y<=Math.max(x.y,y.y)+EPS;
 return on(c,a,b)||on(d,a,b)||on(a,c,d)||on(b,c,d);
}
function segments(r,closed){
 const edges=[];for(let i=0;i<(closed?r.length:r.length-1);i++)edges.push([r[i],r[(i+1)%r.length]]);
 return edges;
}
function selfCrosses(r,closed){
 const edges=segments(r,closed);
 for(let i=0;i<edges.length;i++)for(let j=i+2;j<edges.length;j++){
  if(closed&&i===0&&j===edges.length-1)continue;
  if(intersects(...edges[i],...edges[j]))return true;
 }return false;
}
function ringCrosses(a,b){
 const ea=segments(a,true),eb=segments(b,true);
 for(const x of ea)for(const y of eb)if(intersects(...x,...y))return true;
 return false;
}
function inside(p,ring){
 let hit=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const a=ring[i],b=ring[j];
   if(Math.abs(orient(a,b,p))<=EPS&&distance(p,a,b)<=EPS)return false;
   if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;
 }return hit;
}
function validShape(geometry,closed,allowedOffset){
 const samples=[],all=closed?[geometry.points,...(geometry.holes||[])]:[geometry.points];
 let totalPoints=0;
 for(const ring of all){
   const f=flatten(ring,closed);totalPoints+=f.sample.length;
   if(totalPoints>2300)return false; // Explicitly do NOT alter huge/unverified shapes.
   if(f.deviations.some(d=>d>allowedOffset+EPS))return false;
   if(selfCrosses(f.sample,closed))return false;
   if(closed&&Math.abs(signedArea(f.sample))<EPS)return false;
   samples.push(f.sample);
 }
 if(!closed)return true;
 for(let i=1;i<samples.length;i++){
   if(!inside(samples[i][0],samples[0])||ringCrosses(samples[0],samples[i]))return false;
   for(let j=1;j<i;j++)if(ringCrosses(samples[i],samples[j])||
     inside(samples[i][0],samples[j])||inside(samples[j][0],samples[i]))return false;
 }
 return true;
}
function apply(feature,options={}){
 if(!shouldCurve(feature))return feature;
 const originals=[pointsOf(feature.points,feature.type==='area')];
 if(!originals[0])return feature;
 if(feature.type==='area'){
   for(const h of feature.holes||[]){
     const pts=pointsOf(h,true);if(!pts)return feature;
     originals.push(pts);
   }
 }
 const level=Object.hasOwn(LEVELS,options.level)?options.level:'medium';
 const gridSize=Number(options.gridSizeLocal);
 const safeGrid=Number.isFinite(gridSize)&&gridSize>0?gridSize:null;
 const avg=originals[0].reduce((a,p,i,r)=>a+Math.hypot(p.x-r[(i+1)%r.length].x,p.y-r[(i+1)%r.length].y),0)/originals[0].length;
 const limit=safeGrid?safeGrid*1.5:Math.max(0.1,avg*.20);
 const closed=feature.type==='area';
 // Try the selected level and progressively gentler handles. Never alter
 // topology, hole membership or the untouched source if all attempts fail.
 for(const scale of [LEVELS[level],LEVELS[level]*.55,LEVELS[level]*.25]){
   const result={...feature,points:handles(originals[0],closed,scale,safeGrid)};
   if(closed)result.holes=originals.slice(1).map(r=>handles(r,true,scale,safeGrid));
   if(!validShape(result,closed,limit))continue;
   result.curve='bezier';
   result.naturalCurve='cubic-bezier';
   result.autoCurveLevel=level;
   result.autoCurveValidated=true;
   return result;
 }
 // The feature remains editable as its original polyline, with a warning.
 return {...feature,autoCurveWarning:'Forma compleja: se conserva el contorno original para no deformar ni cerrar huecos'};
}
return Object.freeze({apply,shouldCurve,flatten,validShape});
});