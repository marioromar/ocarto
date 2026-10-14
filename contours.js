/* Ocarto v18: preliminary, unsmoothed contours from ground-only MDT cell centres. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoContours=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function generate(rows,cell,interval,opts={}){
 if(!Number.isFinite(cell)||cell<=0||!Number.isFinite(interval)||interval<=0)throw Error('Celda o equidistancia inválida');
 if(!Array.isArray(rows)||rows.length>200000)throw Error('MDT demasiado grande');
 const limit=Number.isInteger(opts.maxSegments)?opts.maxSegments:200000;
 if(limit<1||limit>1000000)throw Error('Límite de segmentos inválido');
 const map=new Map(); let min=Infinity,max=-Infinity;
 for(const p of rows){if(!Array.isArray(p)||p.length<3||!p.slice(0,3).every(Number.isFinite))throw Error('Cota MDT inválida');
  const i=Math.round(p[0]/cell-.5),j=Math.round(p[1]/cell-.5),k=i+','+j;
  if(Math.abs((i+.5)*cell-p[0])>cell*1e-5||Math.abs((j+.5)*cell-p[1])>cell*1e-5)throw Error('Coordenadas de centro de celda inválidas');
  if(map.has(k))throw Error('Celda MDT repetida');map.set(k,{i,j,z:p[2]});min=Math.min(min,p[2]);max=Math.max(max,p[2]);
 }
 const segments=[];let squares=0,skipped=0;
 if(!map.size)return {features:[],segments:0,squares:0,skipped:0,interval};
 if((max-min)/interval>20000)throw Error('Equidistancia demasiado pequeña para las cotas');
 for(const p of map.values()){
  const right=map.get((p.i+1)+','+p.j),up=map.get(p.i+','+(p.j+1)),diag=map.get((p.i+1)+','+(p.j+1));
  if(!right||!up||!diag){skipped++;continue} squares++;
  // Counterclockwise: lower-left, lower-right, upper-right, upper-left.
  const v=[p.z,right.z,diag.z,up.z],xy=[[p.i+.5,p.j+.5],[p.i+1.5,p.j+.5],[p.i+1.5,p.j+1.5],[p.i+.5,p.j+1.5]];
  const lo=Math.min(...v),hi=Math.max(...v),k0=Math.floor(lo/interval)+1,k1=Math.ceil(hi/interval)-1;
  for(let k=k0;k<=k1;k++){
   const elevation=k*interval,edges=[];
   for(let e=0;e<4;e++){
    const a=e,b=(e+1)%4,za=v[a],zb=v[b];
    // Half-open crossing: exactly-on-contour vertex assigned deterministically.
    if((za<elevation&&zb>=elevation)||(zb<elevation&&za>=elevation)){
     const t=(elevation-za)/(zb-za);edges.push({edge:e,coord:[(xy[a][0]+t*(xy[b][0]-xy[a][0]))*cell,(xy[a][1]+t*(xy[b][1]-xy[a][1]))*cell]});
    }
   }
   if(edges.length===2){segments.push({elevation,coords:[edges[0].coord,edges[1].coord]});}
   else if(edges.length===4){
    // Asymptotic decider: evaluate bilinear centre to choose saddle connectivity.
    const centre=(v[0]+v[1]+v[2]+v[3])/4;
    const high0=v[0]>=elevation;
    const pairs=(high0===(centre>=elevation))?[[0,1],[2,3]]:[[0,3],[1,2]];
    for(const pair of pairs)segments.push({elevation,coords:[edges[pair[0]].coord,edges[pair[1]].coord]});
   }
   if(segments.length>limit)throw Error('Demasiados segmentos de curva; aumenta la equidistancia o el tamaño de celda');
  }
 }
 const features=segments.map((s,i)=>({type:'Feature',properties:{elevation:s.elevation,source:'MDT preliminar',unsmoothed:true},geometry:{type:'LineString',coordinates:s.coords}}));
 return {features,segments:segments.length,squares,skipped,interval,method:'marching squares sin suavizado; segmentos provisionales sin unir; sin extrapolación'};
}
// Connect only matching endpoints at the SAME elevation. Junctions remain separate:
// automatically guessing a route through a crossing would destroy cartographic detail.
function connect(features, opts={}) {
 if(!Array.isArray(features)||features.length>1000000)throw Error('Segmentos inválidos o demasiados');
 const tolerance=opts.tolerance===undefined?1e-7:Number(opts.tolerance);
 if(!Number.isFinite(tolerance)||tolerance<=0)throw Error('Tolerancia de unión inválida');
 const buckets=new Map(),nodes=[],edges=[];
 function key(x,y,z) {return String(z)+'|'+x+','+y}
 function endpoint(xy,z){
  const gx=Math.floor(xy[0]/tolerance),gy=Math.floor(xy[1]/tolerance),matches=[];
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   const bucket=buckets.get(key(gx+dx,gy+dy,z));
   if(bucket)for(const node of bucket)if(Math.hypot(xy[0]-node.xy[0],xy[1]-node.xy[1])<=tolerance)matches.push(node);
  }
  if(matches.length>1)throw Error('Coincidencia ambigua de vértices; reduce tolerancia');
  if(matches.length===1)return matches[0];
  const k=key(gx,gy,z),node={xy,links:[]},bucket=buckets.get(k);
  if(bucket)bucket.push(node);else buckets.set(k,[node]);
  nodes.push(node);return node;
 }
 for(const f of features){
  const coords=f?.geometry?.coordinates,z=f?.properties?.elevation;
  if(f?.geometry?.type!=='LineString'||!Array.isArray(coords)||coords.length!==2||!Number.isFinite(z)||!coords.every(c=>Array.isArray(c)&&c.length>=2&&Number.isFinite(c[0])&&Number.isFinite(c[1])))throw Error('Segmento de curva inválido');
  const a=endpoint(coords[0],z),b=endpoint(coords[1],z);
  if(a===b)continue;
  const e={a,b,z,used:false};edges.push(e);a.links.push(e);b.links.push(e);
 }
 const output=[];let closed=0,junctions=0;
 for(const n of nodes.values())if(n.links.length>2)junctions++;
 function walk(start,first) {
  const points=[start.xy],elevation=first.z;let current=start,e=first,end;
  while(e&&!e.used){
   e.used=true; const next=e.a===current?e.b:e.a;
   points.push(next.xy);current=next;
   if(next===start){closed++;break}
   if(next.links.length!==2)break;
   e=next.links.find(v=>!v.used);
  }
  end=current;
  output.push({type:'Feature',properties:{elevation,source:'MDT preliminar',unsmoothed:true,connected:true,closed:end===start,review_required:true},geometry:{type:'LineString',coordinates:points.map(pt=>[pt[0],pt[1]])}});
 }
 // Prefer open ends and graph junctions. A pure cycle is handled afterwards.
 for(const n of nodes.values())if(n.links.length!==2)for(const e of n.links)if(!e.used)walk(n,e);
 for(const e of edges)if(!e.used)walk(e.a,e);
 return {features:output,segments:edges.length,lines:output.length,closed,junctions,tolerance,method:'v52: extremos coincidentes por cota y tolerancia espacial; sin suavizado; bifurcaciones separadas'};
}
return {generate,connect};
});
