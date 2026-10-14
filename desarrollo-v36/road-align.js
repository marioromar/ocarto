/* Ocarto v24: opt-in, orthophoto-guided adjustment of an existing path.
 * Cost-based preliminary proposal. It does NOT identify roads from scratch and
 * may confuse bare ground with roads. Never mutates the seed path.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoRoadAlign=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function inverse(x,y,g){const det=g.a*g.e-g.b*g.d;if(!Number.isFinite(det)||Math.abs(det)<1e-15)throw Error('Transformación ortofoto no invertible');const dx=x-g.c,dy=y-g.f;return [(dx*g.e-dy*g.b)/det,(dy*g.a-dx*g.d)/det]}
function rgbAt(x,y,img,g){const [u,v]=inverse(x,y,g);const i=Math.floor(u),j=Math.floor(v);if(i<0||j<0||i>=img.width||j>=img.height)return null;const k=(j*img.width+i)*4;if(img.data[k+3]<200)return null;return [img.data[k],img.data[k+1],img.data[k+2]]}
function pathDistance(p,q){return Math.hypot(p[0]-q[0],p[1]-q[1])}
function resample(points,step,maxSamples){let out=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=pathDistance(a,b);if(length<1e-8)continue;const n=Math.max(1,Math.ceil(length/step));for(let j=1;j<=n;j++)out.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);if(out.length>maxSamples)throw Error('El camino es demasiado largo para una única corrección; divídelo en tramos');}return out}
function align(line,img,g,options={}){
 if(!Array.isArray(line)||line.length<2||line.length>10000||line.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))throw Error('Línea de camino inválida');
 if(!img||!Number.isInteger(img.width)||!Number.isInteger(img.height)||img.data?.length!==img.width*img.height*4||img.width*img.height>12000000)throw Error('Ortofoto inválida o demasiado grande');
 if(!g||![g.a,g.b,g.c,g.d,g.e,g.f].every(Number.isFinite))throw Error('Faltan coordenadas de ortofoto');
 const reference=options.referenceRGB||[205,190,155],shift=Number(options.maxShift??5),step=Number(options.sampleStep??2),weight=Number(options.smoothness??.28);
 if(reference.length!==3||reference.some(v=>!Number.isFinite(v)||v<0||v>255)||!Number.isFinite(shift)||shift<.5||shift>20||!Number.isFinite(step)||step<.5||step>10||!Number.isFinite(weight)||weight<0||weight>3)throw Error('Parámetros de seguimiento inválidos');
 const path=resample(line,step,1500);if(path.length<3)throw Error('El trazado necesita al menos 3 puntos de muestreo');
 const pix=Math.max(.35,Math.min(2,Math.hypot(g.a,g.d),Math.hypot(g.b,g.e)));
 const offStep=Math.max(.5,Math.min(1.5,pix)),n=Math.floor(shift/offStep),offsets=Array.from({length:n*2+1},(_,i)=>(i-n)*offStep);
 const normals=path.map((p,i)=>{const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return[-dy/l,dx/l]});
 function candidate(i,j){const p=path[i],normal=normals[i],d=offsets[j],x=p[0]+normal[0]*d,y=p[1]+normal[1]*d,rgb=rgbAt(x,y,img,g);if(!rgb)return {point:[x,y],cost:1e5,observed:false};const score=Math.sqrt(rgb.reduce((s,v,k)=>s+(v-reference[k])**2,0))/Math.sqrt(3)/255;return{point:[x,y],cost:score+Math.abs(d)/Math.max(1,shift)*.11,rawScore:score,observed:true}}
 const states=path.map((_,i)=>offsets.map((__,j)=>candidate(i,j))),dp=[],prev=[];
 for(let i=0;i<path.length;i++){
  const row=[],links=[];
  for(let j=0;j<offsets.length;j++){
   const terminal=i===0||i===path.length-1;
   if(terminal&&j!==n){row.push(Infinity);links.push(-1);continue}
   if(i===0){row.push(states[i][j].cost);links.push(-1);continue}
   let best=Infinity,bestK=-1;for(let k=0;k<offsets.length;k++){if(Math.abs(offsets[j]-offsets[k])>2*offStep+.01)continue;const c=dp[i-1][k]+weight*Math.pow((offsets[j]-offsets[k])/Math.max(.5,offStep),2)*.03;if(c<best){best=c;bestK=k}}
   row.push(best+states[i][j].cost);links.push(bestK);
  }dp.push(row);prev.push(links)
 }
 let idx=n,aligned=new Array(path.length),total=0,covered=0,offsetSum=0;for(let i=path.length-1;i>=0;i--){const state=states[i][idx];aligned[i]=state.point;if(state.observed)covered++;total+=state.rawScore||0;offsetSum+=Math.abs(offsets[idx]);idx=prev[i][idx];if(i>0&&idx<0)throw Error('No hay continuidad válida del camino')}
 const baseline=path.reduce((sum,p)=>{const rgb=rgbAt(p[0],p[1],img,g);return sum+(rgb?Math.sqrt(rgb.reduce((s,v,k)=>s+(v-reference[k])**2,0))/Math.sqrt(3)/255:1)},0);
 const gain=(baseline-total)/path.length,coverage=covered/path.length;
 return{type:'Feature',properties:{kind:'correccion-camino-ortofoto-propuesta',method:'color-de-referencia-y-continuidad',gain_score:+gain.toFixed(4),valid_sample_fraction:+coverage.toFixed(3),mean_lateral_shift_m:+(offsetSum/path.length).toFixed(2),reference_rgb:reference,maximum_shift_m:shift,confidence:coverage>=.95&&gain>.04?'revisar-visualmente':'insuficiente',review_required:true,apply_automatically:false,warning:'Seguimiento experimental guiado por un camino inicial y color elegido. No demuestra que sea el camino real; revisar con ortofoto y LiDAR.'},geometry:{type:'LineString',coordinates:aligned.map(p=>p.map(v=>+v.toFixed(3)))}};
}
return {align,inverse};
});
