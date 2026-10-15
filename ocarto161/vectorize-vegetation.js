/* Ocarto v24: vegetation masks => connected, editable vector polygons.
 * Labels describe LiDAR canopy evidence, NOT ISOM colors or runnability.
 * Preserves holes and keeps input descriptors untouched. No external libraries.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoVegetationVector=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const LABELS={open:'cobertura-escasa',low:'vegetacion-baja',sparse:'arbolado-disperso',dense:'cobertura-arborea-densa',clear_open:'claro-potencial-sin-arbolado',tall_forest:'arbolado-alto-candidato-bosque-blanco-revisar',uncertain:'superficie-lidar-dudosa-etiquetar'};
function classify(r,o={}){
 const ground=Number(r.ground_points),veg=Number(r.vegetation_points),h=r.canopy_max_above_ground_m,cover=Number(r.vegetation_return_fraction);
 const minimum=Number(o.minReturns??6),minGround=Number(o.minGround??1);
 if(!Number.isFinite(ground)||!Number.isFinite(veg)||!Number.isFinite(cover)||ground<minGround||ground+veg<minimum||cover<0||cover>1)return null;
 if(o.detectClearings===true&&cover<=Number(o.clearMaxFraction??.15)&&(veg===0||Number.isFinite(Number(h))&&Number(h)<=Number(o.clearMaxHeight??2)))return 'clear_open';
 if(o.detectTallForest===true&&Number.isFinite(Number(h))&&Number(h)>=Number(o.tallMinHeight??4)&&cover>=Number(o.tallMinFraction??.18)&&cover<Number(o.tallWhiteMaxFraction??.48))return 'tall_forest';
 if(h===null||h===undefined||!Number.isFinite(Number(h)))return null;
 if(cover<.13)return 'open';
 if(Number(h)<2.1)return cover>=.18?'low':null;
 if(Number(h)>=2.1)return cover>=.48?'dense':cover>=.18?'sparse':null;
 return null;
}
const key=(i,j)=>i+','+j;
function signedArea(r){let n=0;for(let i=0;i<r.length-1;i++)n+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1];return n/2}
function simplify(r){if(r.length<5)return r;const p=r.slice(0,-1),out=[];for(let a=0;a<p.length;a++){const prev=p[(a-1+p.length)%p.length],c=p[a],next=p[(a+1)%p.length];if((c[0]-prev[0])*(next[1]-c[1])===(c[1]-prev[1])*(next[0]-c[0]))continue;out.push(c)}if(out.length<3)return r;out.push(out[0]);return out;}
function inside(pt,ring){let hit=false;for(let a=0,b=ring.length-1;a<ring.length;b=a++){const u=ring[a],v=ring[b];if((u[1]>pt[1])!==(v[1]>pt[1])&&pt[0]<(v[0]-u[0])*(pt[1]-u[1])/(v[1]-u[1])+u[0])hit=!hit}return hit;}
function polygons(cells){
 const occupied=new Set(cells.map(p=>key(p.i,p.j))),edges=new Map();
 function add(a,b){const k=key(...a);if(!edges.has(k))edges.set(k,[]);edges.get(k).push({a,b})}
 for(const {i,j} of cells){if(!occupied.has(key(i,j-1)))add([i,j],[i+1,j]);if(!occupied.has(key(i+1,j)))add([i+1,j],[i+1,j+1]);if(!occupied.has(key(i,j+1)))add([i+1,j+1],[i,j+1]);if(!occupied.has(key(i-1,j)))add([i,j+1],[i,j])}
 const rings=[];while(edges.size){const start=edges.values().next().value[0],ring=[start.a],origin=key(...start.a);let cursor=start,steps=0;while(true){const k=key(...cursor.a),out=edges.get(k);if(!out)throw Error('Borde raster roto');const at=out.indexOf(cursor);if(at<0)throw Error('Borde raster desordenado');out.splice(at,1);if(!out.length)edges.delete(k);ring.push(cursor.b);if(key(...cursor.b)===origin)break;let choices=edges.get(key(...cursor.b));if(!choices?.length)throw Error('Borde raster abierto');if(choices.length===1)cursor=choices[0];else{const vx=cursor.b[0]-cursor.a[0],vy=cursor.b[1]-cursor.a[1];choices=choices.slice().sort((a,b)=>{const ca=vx*(a.b[1]-a.a[1])-vy*(a.b[0]-a.a[0]);const cb=vx*(b.b[1]-b.a[1])-vy*(b.b[0]-b.a[0]);return cb-ca});cursor=choices[0]}
 if(++steps>400000)throw Error('Contorno demasiado complejo')}
 const simple=simplify(ring);if(simple.length>=4&&Math.abs(signedArea(simple))>1e-8)rings.push(simple);
 }
 const outer=rings.filter(r=>signedArea(r)>0).map(r=>({outer:r,holes:[],area:signedArea(r)}));
 for(const r of rings.filter(r=>signedArea(r)<0)){const [a,b]=r,dx=b[0]-a[0],dy=b[1]-a[1],pt=[(a[0]+b[0])/2+dy*.01,(a[1]+b[1])/2-dx*.01];let belongs=null;for(const p of outer)if(inside(pt,p.outer)&&(!belongs||p.area<belongs.area))belongs=p;if(belongs)belongs.holes.push(r);}
 return outer.map(p=>[p.outer,...p.holes]);
}
function vectorize(rows,cell,opts={}){
 cell=Number(cell);if(!Array.isArray(rows)||!Number.isFinite(cell)||cell<=0||rows.length>150000)throw Error('Rejilla de vegetación inválida o demasiado grande');
 const minArea=Number(opts.minArea??25),minWidth=Number(opts.minWidth??0),maxFeatures=Number(opts.maxFeatures??3000);
 if(!Number.isFinite(minArea)||minArea<0||!Number.isFinite(minWidth)||minWidth<0||!Number.isInteger(maxFeatures)||maxFeatures<1||maxFeatures>10000)throw Error('Configuración de vectorización inválida');
 const predictor=typeof opts.labeler==='function'?r=>{
  // Without sampled ortho pixels, retain the explicit LiDAR clearing/high-canopy
  // proposals. With an aligned image sample, learned map classes can refine them.
  const hasOrtho=Number.isFinite(r.ortho_r)&&Number.isFinite(r.ortho_g)&&Number.isFinite(r.ortho_b);
  if(!hasOrtho&&opts.detectClearings&&classify(r,{...opts,detectTallForest:false})==='clear_open')return 'clear_open';
  if(!hasOrtho&&opts.detectTallForest&&classify(r,{...opts,detectClearings:false})==='tall_forest')return 'tall_forest';
  const learned=opts.labeler(r);if(learned)return learned;
  const structural=classify(r,opts);return structural==='clear_open'||structural==='tall_forest'?structural:null;
 }:r=>classify(r,opts);
 const cells=new Map();for(const r of rows){if(!Number.isFinite(r.x)||!Number.isFinite(r.y))throw Error('Coordenadas de vegetación inválidas');const i=Math.round(r.x/cell-.5),j=Math.round(r.y/cell-.5),k=key(i,j);if(Math.abs((i+.5)*cell-r.x)>cell*1e-5||Math.abs((j+.5)*cell-r.y)>cell*1e-5||cells.has(k))throw Error('Celdas de vegetación incompatibles o duplicadas');let kind=predictor(r);if(kind===null&&opts.includeUncertain===true&&Number(r.ground_points)>=1&&(Number(r.vegetation_points)>=1||Number(r.ground_points)>=6))kind='uncertain';cells.set(k,{i,j,kind,row:r});}
 const seen=new Set(),features=[],counts={open:0,low:0,sparse:0,dense:0,clear_open:0,tall_forest:0,uncertain:0,unknown:0},filterSummary={components:0,kept:0,removedByArea:0,removedByWidth:0,manualKeep:0,manualRemove:0,byClass:{}},overrides=opts.overrides&&typeof opts.overrides==='object'?opts.overrides:{},classOverrides=opts.classOverrides&&typeof opts.classOverrides==='object'?opts.classOverrides:{},allowedClassOverrides=new Set(['blanco','verde1','verde2','verde3','amarillo','matorral','frutales','rayado','open','low','sparse','dense','clear_open','tall_forest']),DIR=[[1,0],[-1,0],[0,1],[0,-1]];
 for(const p of cells.values()){if(p.kind===null){counts.unknown++;continue}counts[p.kind]=(counts[p.kind]||0)+1;const k=key(p.i,p.j);if(seen.has(k))continue;const stack=[p],region=[];seen.add(k);while(stack.length){const q=stack.pop();region.push(q);for(const [di,dj] of DIR){const tkey=key(q.i+di,q.j+dj),t=cells.get(tkey);if(t&&t.kind===p.kind&&!seen.has(tkey)){seen.add(tkey);stack.push(t)}}}
 const area=region.length*cell*cell;filterSummary.components++;const classSummary=filterSummary.byClass[p.kind]||(filterSummary.byClass[p.kind]={components:0,kept:0,removedByArea:0,removedByWidth:0});classSummary.components++;let perimeterEdges=0,hash=2166136261;for(const q of region){hash=Math.imul(hash^q.i,16777619);hash=Math.imul(hash^q.j,16777619);for(const [di,dj] of DIR)if(!cells.has(key(q.i+di,q.j+dj))||cells.get(key(q.i+di,q.j+dj)).kind!==p.kind)perimeterEdges++}const componentKey=`${p.kind}:${region.length}:${hash>>>0}`,category=p.kind==='uncertain'&&allowedClassOverrides.has(classOverrides[componentKey])?classOverrides[componentKey]:p.kind,perimeter=perimeterEdges*cell,disc=Math.max(0,perimeter*perimeter-16*area),widthEstimate=perimeter?Math.max(0,(perimeter-Math.sqrt(disc))/4):0,autoReason=area<minArea?'minimum_area':widthEstimate+1e-9<minWidth?'minimum_width':null,decision=['keep','remove'].includes(overrides[componentKey])?overrides[componentKey]:'auto',passed=decision==='keep'||decision==='auto'&&!autoReason,exclusionReason=passed?null:decision==='remove'?'manual_remove':autoReason;if(autoReason==='minimum_area'){filterSummary.removedByArea++;classSummary.removedByArea++}else if(autoReason==='minimum_width'){filterSummary.removedByWidth++;classSummary.removedByWidth++}if(decision==='keep'){filterSummary.manualKeep++;classSummary.manualKeep=(classSummary.manualKeep||0)+1}else if(decision==='remove'){filterSummary.manualRemove++;classSummary.manualRemove=(classSummary.manualRemove||0)+1}if(passed){filterSummary.kept++;classSummary.kept++}if(!passed&&!opts.includeFiltered)continue;if(features.length>=maxFeatures)throw Error('Más de 3.000 áreas: aumenta los umbrales o limita la vista previa');
 const covers=region.map(q=>Number(q.row.vegetation_return_fraction)).filter(Number.isFinite),heights=region.map(q=>Number(q.row.canopy_max_above_ground_m)).filter(Number.isFinite),meanCover=covers.length?covers.reduce((a,b)=>a+b,0)/covers.length:null,meanHeight=heights.length?heights.reduce((a,b)=>a+b,0)/heights.length:null;const parts=polygons(region);for(const poly of parts){const coordinates=poly.map(r=>r.map(v=>[+(v[0]*cell).toFixed(4),+(v[1]*cell).toFixed(4)]));features.push({type:'Feature',properties:{kind:'clasificacion-estructural-lidar',category,description:LABELS[category]||category,raster_area_m2:area,equivalent_width_min_m:+widthEstimate.toFixed(3),mean_vegetation_return_fraction:meanCover===null?null:+meanCover.toFixed(4),mean_canopy_height_m:meanHeight===null?null:+meanHeight.toFixed(3),filtering:{minAreaM2:minArea,minEquivalentWidthM:minWidth,automaticPass:!autoReason,automaticReason:autoReason,passed,decision,exclusionReason},previewKey:componentKey,cell_count:region.length,source:'retornos LiDAR suelo y vegetación',training_status:opts.labeler?'modelo local de ejemplos':'sin calibracion local',classification_override:category!==p.kind?category:null,needs_user_review:category==='uncertain',confidence:'orientativa',map_symbol:null,passability:null,review_required:true,auto_accept:false},geometry:{type:'Polygon',coordinates}})}
 }
 return {type:'FeatureCollection',name:opts.labeler?'Ocarto v25 - vegetacion aprendida para revision':'Ocarto v24 - coberturas LiDAR para revision',properties:{cellSize:cell,minimumAreaM2:minArea,minimumEquivalentWidthM:minWidth,filterSummary,counts,nonAutomatic:true,warning:'No son símbolos ISOM ni categorías de transitabilidad; validar con ortofoto y cartografía terminada.'},features};
}
function minimumsFromMarked(features,current={}){if(!Array.isArray(features))return null;const kept=features.filter(f=>f?.filtering?.decision==='keep'&&Number.isFinite(f.area)&&f.area>=0&&Number.isFinite(f.width)&&f.width>=0),removed=features.filter(f=>f?.filtering?.decision==='remove'&&Number.isFinite(f.area)&&f.area>=0&&Number.isFinite(f.width)&&f.width>=0);if(!kept.length)return null;const fit=(axis,fallback)=>{const k=kept.map(f=>f[axis]),minKeep=Math.min(...k);if(!removed.length)return{value:minKeep,method:'minimum_kept'};const maxRemove=Math.max(...removed.map(f=>f[axis]));return maxRemove<minKeep?{value:(maxRemove+minKeep)/2,method:'separated'}:{value:Number.isFinite(Number(fallback))?Number(fallback):minKeep,method:'overlap'}};const a=fit('area',current.area),w=fit('width',current.width);return{area:a.value,width:w.value,countKeep:kept.length,countRemove:removed.length,areaMethod:a.method,widthMethod:w.method}}
return {classify,vectorize,minimumsFromMarked};
});
