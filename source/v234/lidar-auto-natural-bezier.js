/* Ocarto v283: scalable guarded native cubic Bezier conversion for detected natural shapes.
   Never change the source geometry; return the original if the smoothed outline
   self-intersects, crosses a hole, or deviates excessively from sampled data.
   Large-contour topology is checked through spatial buckets with hard budget caps.
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
/* Uniform spatial index: compare only segments overlapping nearby spatial buckets.
   Unlike the former all-pairs check this is usable on long contours with
   thousands of vertices. Resource guardrails fail closed (preserve polyline).
   Shared vertices of adjoining segments are deliberately excluded. */
function spatiallyCrosses(rings,closed){
 const edges=[];let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(let ringId=0;ringId<rings.length;ringId++){
   const paths=segments(rings[ringId],closed),size=paths.length;
   for(let k=0;k<size;k++){
     const [a,b]=paths[k];if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||
       !Number.isFinite(b.x)||!Number.isFinite(b.y))return true;
     const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x);
     const y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);
     minX=Math.min(minX,x0);maxX=Math.max(maxX,x1);
     minY=Math.min(minY,y0);maxY=Math.max(maxY,y1);
     if(Math.hypot(a.x-b.x,a.y-b.y)<EPS)return true;
     edges.push({a,b,ringId,k,size,x0,x1,y0,y1,id:edges.length});
   }
 }
 if(!edges.length||edges.length>100000)return true;
 const length=Math.max(maxX-minX,maxY-minY);
 if(!Number.isFinite(length)||length<=EPS)return true;
 // Ensure boxes that share a boundary fall into a common bucket.
 const side=Math.max(8,Math.min(2048,Math.ceil(Math.sqrt(edges.length)*5)));
 const cell=length/side;
 const buckets=new Map(),pairs=new Set();
 let entries=0,checks=0;
 for(const edge of edges){
   const col0=Math.floor((edge.x0-minX)/cell),col1=Math.floor((edge.x1-minX)/cell);
   const row0=Math.floor((edge.y0-minY)/cell),row1=Math.floor((edge.y1-minY)/cell);
   const occupied=(col1-col0+1)*(row1-row0+1);
   if(occupied>50000||entries+occupied>400000)return true; // complex/degenerate extent
   for(let row=row0;row<=row1;row++)for(let col=col0;col<=col1;col++){
     const tag=col+','+row;
     let bucket=buckets.get(tag);
     if(!bucket){bucket=[];buckets.set(tag,bucket);}
     for(const id of bucket){
       const other=edges[id];
       if(edge.ringId===other.ringId &&
         (Math.abs(edge.k-other.k)===1||(closed&&
          ((edge.k===0&&other.k===edge.size-1)||(other.k===0&&edge.k===other.size-1)))))continue;
       const low=Math.min(id,edge.id),high=Math.max(id,edge.id),
         pairId=low*edges.length+high;
       if(pairs.has(pairId))continue;
       pairs.add(pairId);
       if(++checks>600000)return true;
       if(intersects(edge.a,edge.b,other.a,other.b))return true;
     }
     bucket.push(edge.id);
     entries++;
   }
 }
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
 if(closed&&all.length>128)return false; // Unverified quantity of holes.
 for(const ring of all){
   const f=flatten(ring,closed);totalPoints+=f.sample.length;
   if(totalPoints>100000)return false; // Limit memory/CPU in browser.
   if(f.deviations.some(d=>d>allowedOffset+EPS))return false;
   if(closed){
     const oldArea=signedArea(ring),newArea=signedArea(f.sample);
     if(Math.abs(newArea)<EPS||oldArea*newArea<=0)return false;
   }
   samples.push(f.sample);
 }
 // The index checks both intra-ring self-intersections and all crossings
 // between exterior and hole boundaries, in a single guarded pass.
 if(spatiallyCrosses(samples,closed))return false;
 if(!closed)return true;
 for(let i=1;i<samples.length;i++){
   if(!inside(samples[i][0],samples[0]))return false;
   for(let j=1;j<i;j++)if(inside(samples[i][0],samples[j])||
     inside(samples[j][0],samples[i]))return false;
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