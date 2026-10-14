/* Ocarto v25: supervised exemplar matching from approved map polygons + LiDAR cells.
 * Lightweight local prototype, no pre-trained semantic model or automatic ISOM certainty.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoVegetationLearn=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const labels=['blanco','verde1','verde2','verde3','amarillo','matorral'];
function contains(x,y,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes}return yes}
function inPolygon(x,y,rings){return Array.isArray(rings)&&rings.length>0&&contains(x,y,rings[0])&&!rings.slice(1).some(r=>contains(x,y,r))}
function fingerprint(row){const n=Number(row.vegetation_points),ground=Number(row.ground_points),rawH=row.canopy_max_above_ground_m,rawMean=row.canopy_mean_above_ground_m,cover=Number(row.vegetation_return_fraction);if(!(ground>=1&&n>=1)&&!(ground>=2&&n===0))return null;const h=n===0?0:rawH,mean=n===0?0:rawMean;if(h===null||h===undefined||mean===null||mean===undefined||![h,mean,cover].every(Number.isFinite))return null;return[Math.log1p(Math.max(0,h)),Math.log1p(Math.max(0,mean)),cover,n>0?Number(row.low_veg_points||0)/n:0,n>0?Number(row.medium_veg_points||0)/n:0,n>0?Number(row.high_veg_points||0)/n:0];}
function train(rows,polygons,options={}){
 if(!Array.isArray(rows)||!Array.isArray(polygons)||rows.length>150000||polygons.length>200)throw Error('Datos de entrenamiento inválidos');
 const perLabelMax=Number(options.maxPerLabel??280);if(!Number.isInteger(perLabelMax)||perLabelMax<10||perLabelMax>2000)throw Error('Límite de muestras inválido');
 const byLabel=new Map(),counts=new Map(),conflicts=new Set(),selected=new Map();
 for(const poly of polygons){const label=String(poly.label||'').toLowerCase();if(!labels.includes(label))throw Error('Etiqueta de vegetación no reconocida');const rings=poly.coordinates;if(!Array.isArray(rings)||!Array.isArray(rings[0])||rings[0].length<3||rings[0].some(p=>!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite)))throw Error('Polígono de aprendizaje inválido');
  const xs=rings[0].map(p=>p[0]),ys=rings[0].map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  for(let i=0;i<rows.length;i++){const r=rows[i];if(r.x<x0||r.x>x1||r.y<y0||r.y>y1)continue;if(!inPolygon(r.x,r.y,rings))continue;const fp=fingerprint(r);if(!fp)continue;const prev=selected.get(i);if(prev&&prev.label!==label){conflicts.add(i);continue}selected.set(i,{label,fp});}
 }
 for(const [i,s] of selected){if(conflicts.has(i))continue;counts.set(s.label,(counts.get(s.label)||0)+1);if(!byLabel.has(s.label))byLabel.set(s.label,[]);byLabel.get(s.label).push(s.fp)}
 if([...counts.values()].reduce((a,b)=>a+b,0)<5)throw Error('Muestras insuficientes: dibuja áreas sobre celdas LiDAR con datos de suelo y vegetación');
 const samples=[];for(const [label,arr] of byLabel){if(arr.length<3)continue;const step=Math.max(1,Math.ceil(arr.length/perLabelMax));for(let i=0;i<arr.length;i+=step)samples.push({label,fp:arr[i]})}
 if(!samples.length)throw Error('Mínimo 3 celdas LiDAR por tipo de vegetación');
 // Standardization from annotated cells only, with floors to protect sparse examples.
 const dims=6,avg=Array.from({length:dims},(_,d)=>samples.reduce((sum,s)=>sum+s.fp[d],0)/samples.length),sigma=avg.map((v,d)=>Math.max([.35,.35,.14,.13,.13,.13][d],Math.sqrt(samples.reduce((sum,s)=>sum+(s.fp[d]-v)**2,0)/samples.length)));
 const distance=(a,b)=>Math.sqrt(a.reduce((sum,v,i)=>sum+((v-b[i])/sigma[i])**2,0)/dims);
 const thresholds=new Map();for(const [label,arr] of byLabel){if(arr.length<3)continue;const chosen=samples.filter(s=>s.label===label);const radii=chosen.map(s=>{let nearest=Infinity;for(const t of chosen){if(s===t)continue;nearest=Math.min(nearest,distance(s.fp,t.fp))}return nearest}).sort((a,b)=>a-b);thresholds.set(label,Math.max(.6,Math.min(1.8,radii[Math.floor(radii.length*.90)]*2.5||.6)))}
 const prediction=(r)=>{const fp=fingerprint(r);if(!fp)return null;const closest=[];for(const s of samples){const d=distance(fp,s.fp);if(closest.length<5||d<closest.at(-1).distance){closest.push({label:s.label,distance:d});closest.sort((a,b)=>a.distance-b.distance);if(closest.length>5)closest.pop()}}
 if(!closest.length)return null;const votes=new Map();for(const p of closest)votes.set(p.label,(votes.get(p.label)||0)+1/(.1+p.distance));const order=[...votes].sort((a,b)=>b[1]-a[1]);const label=order[0][0],best=closest.find(s=>s.label===label);if(!best||best.distance>thresholds.get(label)||order.length>1&&order[0][1]<order[1][1]*1.18)return null;return label};
 return{predict:prediction,counts:Object.fromEntries(counts),labels:[...thresholds.keys()],conflicts:conflicts.size,prototypes:samples.length,featureNames:['altura-maxima-normalizada','altura-media-normalizada','fraccion-retornos-vegetacion','fraccion-vegetacion-baja','fraccion-vegetacion-media','fraccion-vegetacion-alta'],warning:'Modelo local por ejemplos, no garantiza correspondencia con transitabilidad; revisar todas las predicciones.'};
}
return {train,labels,fingerprint,inPolygon};
});
