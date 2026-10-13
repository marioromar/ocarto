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
return {generate};
});
