/* Ocarto v25: supervised exemplar matching from approved map polygons + LiDAR cells.
 * Lightweight local prototype, no pre-trained semantic model or automatic ISOM certainty.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoVegetationLearn=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const labels=['blanco','verde1','verde2','verde3','amarillo','matorral','frutales','rayado'];
function contains(x,y,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes}return yes}
function inPolygon(x,y,rings){return Array.isArray(rings)&&rings.length>0&&contains(x,y,rings[0])&&!rings.slice(1).some(r=>contains(x,y,r))}
function fingerprint(row){const n=Number(row.vegetation_points),ground=Number(row.ground_points),rawH=row.canopy_max_above_ground_m,rawMean=row.canopy_mean_above_ground_m,cover=Number(row.vegetation_return_fraction);if(!(ground>=1&&n>=1)&&!(ground>=2&&n===0))return null;const h=n===0?0:rawH,mean=n===0?0:rawMean;if(h===null||h===undefined||mean===null||mean===undefined||![h,mean,cover].every(Number.isFinite))return null;return[Math.log1p(Math.max(0,h)),Math.log1p(Math.max(0,mean)),cover,n>0?Number(row.low_veg_points||0)/n:0,n>0?Number(row.medium_veg_points||0)/n:0,n>0?Number(row.high_veg_points||0)/n:0];}
const featureNames=['altura-maxima-normalizada','altura-media-normalizada','fraccion-retornos-vegetacion','fraccion-vegetacion-baja','fraccion-vegetacion-media','fraccion-vegetacion-alta'];
function predictor(samples,sigma,thresholds){
 const distance=(a,b)=>Math.sqrt(a.reduce((sum,v,i)=>sum+((v-b[i])/sigma[i])**2,0)/featureNames.length);
 return r=>{const fp=fingerprint(r);if(!fp)return null;const closest=[];for(const s of samples){const d=distance(fp,s.fp);if(closest.length<5||d<closest.at(-1).distance){closest.push({label:s.label,distance:d});closest.sort((a,b)=>a.distance-b.distance);if(closest.length>5)closest.pop()}}
  if(!closest.length)return null;const votes=new Map();for(const p of closest)votes.set(p.label,(votes.get(p.label)||0)+1/(.1+p.distance));const order=[...votes].sort((a,b)=>b[1]-a[1]);const label=order[0][0],best=closest.find(s=>s.label===label);if(!best||best.distance>thresholds[label]||order.length>1&&order[0][1]<order[1][1]*1.18)return null;return label};
}
function makeModel(data){
 const samples=data.samples.map(s=>({label:s.label,fp:[...s.fp]})),thresholds={...data.thresholds},sigma=[...data.sigma];
 return{predict:predictor(samples,sigma,thresholds),counts:{...data.counts},labels:Object.keys(thresholds),conflicts:data.conflicts,prototypes:samples.length,featureNames:[...featureNames],warning:'Modelo local por ejemplos, no garantiza correspondencia con transitabilidad; revisar todas las predicciones.',toJSON:()=>JSON.parse(JSON.stringify(data))};
}
function fromJSON(data){
 if(!data||typeof data!=='object'||data.format!=='ocarto-vegetation-model'||data.version!==1||!Array.isArray(data.featureNames)||data.featureNames.length!==featureNames.length||data.featureNames.some((name,i)=>name!==featureNames[i])||!Array.isArray(data.samples)||data.samples.length<3||data.samples.length>12000||!Array.isArray(data.sigma)||data.sigma.length!==featureNames.length||!data.sigma.every(v=>Number.isFinite(v)&&v>0&&v<=10000)||!data.thresholds||typeof data.thresholds!=='object'||Array.isArray(data.thresholds)||!data.counts||typeof data.counts!=='object'||Array.isArray(data.counts))throw Error('Archivo de modelo Ocarto inválido o incompatible');
 const samples=data.samples.map(s=>{if(!s||!labels.includes(s.label)||!Array.isArray(s.fp)||s.fp.length!==featureNames.length||!s.fp.every(Number.isFinite))throw Error('Muestra del modelo inválida');return{label:s.label,fp:s.fp}});
 const thresholds={};for(const label of Object.keys(data.thresholds)){const n=data.thresholds[label];if(!labels.includes(label)||!Number.isFinite(n)||n<=0||n>5)throw Error('Umbral del modelo inválido');thresholds[label]=n}
 if(!Object.keys(thresholds).length||samples.some(s=>!Object.hasOwn(thresholds,s.label))||Object.keys(thresholds).some(label=>samples.filter(s=>s.label===label).length<3))throw Error('El modelo no tiene muestras suficientes por etiqueta');
 const counts={};for(const label of Object.keys(data.counts)){const n=data.counts[label];if(!labels.includes(label)||!Number.isInteger(n)||n<0||n>150000)throw Error('Recuento del modelo inválido');counts[label]=n}
 const conflicts=Number(data.conflicts||0);if(!Number.isInteger(conflicts)||conflicts<0||conflicts>150000)throw Error('Conflictos del modelo inválidos');
 return makeModel({format:'ocarto-vegetation-model',version:1,featureNames:[...featureNames],sigma:[...data.sigma],thresholds,samples,counts,conflicts});
}
function train(rows,polygons,options={}){
 if(!Array.isArray(rows)||!Array.isArray(polygons)||rows.length>150000||polygons.length>20000)throw Error('Datos de entrenamiento inválidos');
 const perLabelMax=Number(options.maxPerLabel??280);if(!Number.isInteger(perLabelMax)||perLabelMax<10||perLabelMax>2000)throw Error('Límite de muestras inválido');
 const byLabel=new Map(),counts=new Map(),conflicts=new Set(),selected=new Map(),validRows=[];let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(let i=0;i<rows.length;i++){const r=rows[i];if(!Number.isFinite(r?.x)||!Number.isFinite(r?.y))continue;validRows.push(i);minX=Math.min(minX,r.x);maxX=Math.max(maxX,r.x);minY=Math.min(minY,r.y);maxY=Math.max(maxY,r.y)}
 const gridSide=Math.min(256,Math.max(8,Math.ceil(Math.sqrt(validRows.length)))),binWidth=Math.max((maxX-minX)/gridSide,1e-9),binHeight=Math.max((maxY-minY)/gridSide,1e-9),bins=new Map();
 for(const i of validRows){const r=rows[i],bx=Math.min(gridSide-1,Math.floor((r.x-minX)/binWidth)),by=Math.min(gridSide-1,Math.floor((r.y-minY)/binHeight)),key=bx+','+by;let bucket=bins.get(key);if(!bucket)bins.set(key,bucket=[]);bucket.push(i)}
 let totalVertices=0;
 for(const poly of polygons){const label=String(poly.label||'').toLowerCase();if(!labels.includes(label))throw Error('Etiqueta de vegetación no reconocida');const rings=poly.coordinates;
  if(!Array.isArray(rings)||!rings.length)throw Error('Polígono de aprendizaje inválido');
  let vertexCount=0,x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  for(const ring of rings){if(!Array.isArray(ring)||ring.length<3)throw Error('Polígono de aprendizaje inválido');vertexCount+=ring.length;totalVertices+=ring.length;if(vertexCount>250000||totalVertices>2000000)throw Error('Polígono de aprendizaje demasiado complejo');for(const point of ring){if(!Array.isArray(point)||point.length<2||!Number.isFinite(point[0])||!Number.isFinite(point[1]))throw Error('Polígono de aprendizaje inválido');if(ring===rings[0]){x0=Math.min(x0,point[0]);x1=Math.max(x1,point[0]);y0=Math.min(y0,point[1]);y1=Math.max(y1,point[1]);}}}
  if(x1<minX||x0>maxX||y1<minY||y0>maxY)continue;
  const bx0=Math.max(0,Math.min(gridSide-1,Math.floor((x0-minX)/binWidth))),bx1=Math.max(0,Math.min(gridSide-1,Math.floor((x1-minX)/binWidth))),by0=Math.max(0,Math.min(gridSide-1,Math.floor((y0-minY)/binHeight))),by1=Math.max(0,Math.min(gridSide-1,Math.floor((y1-minY)/binHeight)));
  for(let bx=bx0;bx<=bx1;bx++)for(let by=by0;by<=by1;by++)for(const i of bins.get(bx+','+by)||[]){const r=rows[i];if(r.x<x0||r.x>x1||r.y<y0||r.y>y1||!inPolygon(r.x,r.y,rings))continue;const fp=fingerprint(r);if(!fp)continue;const prev=selected.get(i);if(prev&&prev.label!==label){conflicts.add(i);continue}selected.set(i,{label,fp});}
 }
 for(const [i,s] of selected){if(conflicts.has(i))continue;counts.set(s.label,(counts.get(s.label)||0)+1);if(!byLabel.has(s.label))byLabel.set(s.label,[]);byLabel.get(s.label).push(s.fp)}
 if([...counts.values()].reduce((a,b)=>a+b,0)<5)throw Error('Muestras insuficientes: dibuja áreas sobre celdas LiDAR con datos de suelo y vegetación');
 const samples=[];for(const [label,arr] of byLabel){if(arr.length<3)continue;const step=Math.max(1,Math.ceil(arr.length/perLabelMax));for(let i=0;i<arr.length;i+=step)samples.push({label,fp:arr[i]})}
 if(!samples.length)throw Error('Mínimo 3 celdas LiDAR por tipo de vegetación');
 // Standardization from annotated cells only, with floors to protect sparse examples.
 const dims=6,avg=Array.from({length:dims},(_,d)=>samples.reduce((sum,s)=>sum+s.fp[d],0)/samples.length),sigma=avg.map((v,d)=>Math.max([.35,.35,.14,.13,.13,.13][d],Math.sqrt(samples.reduce((sum,s)=>sum+(s.fp[d]-v)**2,0)/samples.length)));
 const distance=(a,b)=>Math.sqrt(a.reduce((sum,v,i)=>sum+((v-b[i])/sigma[i])**2,0)/dims);
 const thresholds={};for(const [label,arr] of byLabel){if(arr.length<3)continue;const chosen=samples.filter(s=>s.label===label);const radii=chosen.map(s=>{let nearest=Infinity;for(const t of chosen){if(s===t)continue;nearest=Math.min(nearest,distance(s.fp,t.fp))}return nearest}).sort((a,b)=>a-b);thresholds[label]=Math.max(.6,Math.min(1.8,radii[Math.floor(radii.length*.90)]*2.5||.6))}
 const modelData={format:'ocarto-vegetation-model',version:1,featureNames:[...featureNames],sigma,thresholds,samples,counts:Object.fromEntries(counts),conflicts:conflicts.size};
 return makeModel(modelData);
}
function missingLabels(model,polygons){const trained=new Set(Array.isArray(model?.labels)?model.labels:[]);return[...new Set((Array.isArray(polygons)?polygons:[]).map(p=>String(p?.label||'').toLowerCase()).filter(label=>labels.includes(label)))].filter(label=>!trained.has(label))}
return {train,fromJSON,labels,fingerprint,inPolygon,missingLabels};
});
