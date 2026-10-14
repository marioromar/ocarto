/* Ocarto v27: orthophoto region segmentation -> provisional vector road axes.
 * RGB similarity + binary thinning + connected centerline tracing.
 * Does NOT certify roads; fields/soil of similar colors can be false positives.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoRoadExtract=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const EIGHT=[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]], FOUR=[[1,0],[-1,0],[0,1],[0,-1]];
function extract(img,transform,opts={}){
 const w=img?.width,h=img?.height,rgba=img?.data;if(!Number.isInteger(w)||!Number.isInteger(h)||w<4||h<4||w*h>2300000||rgba?.length!==w*h*4)throw Error('Ortofoto inválida, supera el límite de píxeles o sin datos');
 if(!transform||![transform.a,transform.b,transform.c,transform.d,transform.e,transform.f].every(Number.isFinite))throw Error('Falta georreferenciación válida');
 const rgb=opts.referenceRGB||[205,190,160],tol=Number(opts.tolerance??26),minLength=Number(opts.minLength??25),minArea=Number(opts.minArea??14),maxFeatures=Number(opts.maxFeatures??2500);
 if(!Array.isArray(rgb)||rgb.length!==3||rgb.some(v=>!Number.isFinite(v)||v<0||v>255)||!Number.isFinite(tol)||tol<5||tol>120||!Number.isFinite(minLength)||minLength<4||!Number.isFinite(minArea)||minArea<1||!Number.isInteger(maxFeatures)||maxFeatures<1||maxFeatures>6000)throw Error('Parámetros de detección inválidos');
 const n=w*h,mask=new Uint8Array(n),maxdiff=tol*tol*3;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=y*w+x,i=k*4;if(rgba[i+3]<200)continue;const dr=rgba[i]-rgb[0],dg=rgba[i+1]-rgb[1],db=rgba[i+2]-rgb[2];if(dr*dr+dg*dg+db*db<=maxdiff)mask[k]=1}
 // 4-connected components: discard isolated color patches before thinning.
 let discarded=0;const visited=new Uint8Array(n),queue=new Int32Array(n),components=[];
 for(let k=0;k<n;k++){if(!mask[k]||visited[k])continue;let end=1;queue[0]=k;visited[k]=1;for(let p=0;p<end;p++){const at=queue[p],x=at%w,y=(at/w)|0;for(const [dx,dy] of FOUR){const xx=x+dx,yy=y+dy;if(xx<1||yy<1||xx>=w-1||yy>=h-1)continue;const next=yy*w+xx;if(mask[next]&&!visited[next]){visited[next]=1;queue[end++]=next}}}if(end<minArea){for(let i=0;i<end;i++)mask[queue[i]]=0;discarded++;continue}components.push(end)}
 // Standard two-subiteration thinning (Zhang-Suen). Kept in a Worker in the browser.
 const removed=new Int32Array(n);let iterations=0;
 for(let step=0;step<36;step++){let changes=0;for(let pass=0;pass<2;pass++){let m=0;for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=y*w+x;if(!mask[k])continue;const p2=mask[k-w],p3=mask[k-w+1],p4=mask[k+1],p5=mask[k+w+1],p6=mask[k+w],p7=mask[k+w-1],p8=mask[k-1],p9=mask[k-w-1];const nb=p2+p3+p4+p5+p6+p7+p8+p9;if(nb<2||nb>6)continue;const transitions=(!p2&&p3)+(!p3&&p4)+(!p4&&p5)+(!p5&&p6)+(!p6&&p7)+(!p7&&p8)+(!p8&&p9)+(!p9&&p2);if(transitions!==1)continue;if(pass===0?(p2*p4*p6||p4*p6*p8):(p2*p4*p8||p2*p6*p8))continue;removed[m++]=k}for(let j=0;j<m;j++)mask[removed[j]]=0;changes+=m}iterations++;if(changes===0)break}
 const graphVisited=new Uint8Array(n),segments=[];const pixScale=(Math.hypot(transform.a,transform.d)+Math.hypot(transform.b,transform.e))/2;
 function neighbors(k){const x=k%w,y=(k/w)|0,out=[];for(const [dx,dy] of EIGHT){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const id=yy*w+xx;if(mask[id])out.push(id)}return out}
 // Collect skeleton subgraphs and trace the longest path through each, to avoid loops/noise.
 const graphQueue=new Int32Array(n),seenCost=new Float32Array(n),predecessor=new Int32Array(n),stamp=new Uint32Array(n);let epoch=0;
 function farthest(root,set){++epoch;let end=1;graphQueue[0]=root;stamp[root]=epoch;seenCost[root]=0;predecessor[root]=-1;let far=root;for(let start=0;start<end;start++){const curr=graphQueue[start],x=curr%w,y=(curr/w)|0;for(const id of neighbors(curr)){if(!set.has(id)||stamp[id]===epoch)continue;stamp[id]=epoch;seenCost[id]=seenCost[curr]+Math.hypot(id%w-x,Math.floor(id/w)-y);predecessor[id]=curr;graphQueue[end++]=id;if(seenCost[id]>seenCost[far])far=id}}return{far,length:seenCost[far],predecessor,stamp:epoch}}
 for(let k=0;k<n;k++){if(!mask[k]||graphVisited[k])continue;let end=1;graphQueue[0]=k;graphVisited[k]=1;const component=new Set();for(let q=0;q<end;q++){const id=graphQueue[q];component.add(id);for(const j of neighbors(id))if(!graphVisited[j]){graphVisited[j]=1;graphQueue[end++]=j}}if(component.size<3)continue;
  let tip=k;for(const idx of component)if(neighbors(idx).filter(j=>component.has(j)).length===1){tip=idx;break}
  const a=farthest(tip,component),b=farthest(a.far,component);if(b.length*pixScale<minLength)continue;
  const route=[],seen=new Set();let j=b.far;while(j>=0&&!seen.has(j)){seen.add(j);const x=j%w+.5,y=Math.floor(j/w)+.5;route.push([+(transform.a*x+transform.b*y+transform.c).toFixed(3),+(transform.d*x+transform.e*y+transform.f).toFixed(3)]);j=b.predecessor[j]}
  if(route.length<3)continue;route.reverse();if(segments.length>=maxFeatures)throw Error('Demasiados candidatos: ajusta tolerancia o área mínima');
  segments.push({type:'Feature',properties:{kind:'posible-camino-por-ortofoto',method:'color-skeleton',approx_length_m:+(b.length*pixScale).toFixed(2),referenceRGB:rgb,tolerance:tol,review_required:true,apply_automatically:false,confidence:'experimental-sin-semantica',warning:'La coincidencia de color NO confirma un sendero o carretera; revisar continuidad, ortofoto, LiDAR y campo. Intersecciones o ramales pueden omitirse.'},geometry:{type:'LineString',coordinates:route}});
 }
 segments.sort((a,b)=>b.properties.approx_length_m-a.properties.approx_length_m);
 return {type:'FeatureCollection',name:'Ocarto v27: ejes probables de caminos por ortofoto',properties:{image_pixels:n,pixel_size_approx_m:+pixScale.toFixed(3),iterations,small_blobs_removed:discarded,components_after_mask:components.length,warning:'Detector experimental por color; no sustituye segmentación semántica ni validación georreferenciada. No altera mapa.',review_required:true},features:segments};
}
return {extract};
});
