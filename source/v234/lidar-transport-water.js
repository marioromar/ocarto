/* Ocarto v281: vector proposals from LAS classes 11 (road surface) and 9 (water).
   No inference from unclassified ground: absent classes produce NO proposals.
   Road axes are skeleton approximations; water outlines retain interior holes.
   Results are review-only GeoJSON and do not modify any map. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.OcartoTransportWater=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const key=(i,j)=>i+','+j;
const pos=id=>id.split(',').map(Number);
const DIR4=[[1,0],[-1,0],[0,1],[0,-1]];
const DIR8=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
const round=v=>+v.toFixed(4);
function signedArea(r){let a=0;for(let i=0;i<r.length-1;i++)a+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1];return a/2;}
function simplify(r,closed=false){
  const src=closed?r.slice(0,-1):r;
  if(src.length<3)return r;
  const result=[];
  for(let i=0;i<src.length;i++){
    if(!closed&&(i===0||i===src.length-1)){result.push(src[i]);continue;}
    const a=src[(i-1+src.length)%src.length],b=src[i],c=src[(i+1)%src.length];
    if((b[0]-a[0])*(c[1]-b[1])===(b[1]-a[1])*(c[0]-b[0]))continue;
    result.push(b);
  }
  return closed&&result.length>=3?[...result,result[0]]:result.length>=2?result:r;
}
function pointInside(pt,ring){
  let hit=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if((a[1]>pt[1])!==(b[1]>pt[1]) &&
       pt[0]<(b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
function components(mask,diagonals){
  const result=[],seen=new Set(),dirs=diagonals?DIR8:DIR4;
  for(const start of mask){
    if(seen.has(start))continue;
    const cells=[],stack=[start];seen.add(start);
    while(stack.length){
      const id=stack.pop(),[i,j]=pos(id);cells.push([i,j]);
      for(const [di,dj] of dirs){
        const q=key(i+di,j+dj);
        if(mask.has(q)&&!seen.has(q)){seen.add(q);stack.push(q);}
      }
    }
    result.push(cells);
  }
  return result;
}
function ringsFromRegion(region){
  const occupied=new Set(region.map(p=>key(...p))),edges=new Map();
  function add(a,b){
    const id=key(...a);if(!edges.has(id))edges.set(id,[]);
    edges.get(id).push({a,b});
  }
  for(const [i,j] of region){
    if(!occupied.has(key(i,j-1)))add([i,j],[i+1,j]);
    if(!occupied.has(key(i+1,j)))add([i+1,j],[i+1,j+1]);
    if(!occupied.has(key(i,j+1)))add([i+1,j+1],[i,j+1]);
    if(!occupied.has(key(i-1,j)))add([i,j+1],[i,j]);
  }
  const rings=[];
  while(edges.size){
    const first=edges.values().next().value[0],ring=[first.a],start=key(...first.a);
    let edge=first,n=0;
    while(true){
      const id=key(...edge.a),list=edges.get(id),index=list?.indexOf(edge)??-1;
      if(index<0)throw Error('Borde de agua incoherente');
      list.splice(index,1);if(!list.length)edges.delete(id);
      ring.push(edge.b);
      if(key(...edge.b)===start)break;
      const choices=edges.get(key(...edge.b));
      if(!choices?.length||++n>region.length*4+10)throw Error('Contorno de agua abierto');
      if(choices.length===1){edge=choices[0];continue;}
      const dx=edge.b[0]-edge.a[0],dy=edge.b[1]-edge.a[1];
      edge=choices.slice().sort((a,b)=>{
        const ar=dx*(a.b[1]-a.a[1])-dy*(a.b[0]-a.a[0]);
        const br=dx*(b.b[1]-b.a[1])-dy*(b.b[0]-b.a[0]);
        return br-ar;
      })[0];
    }
    const s=simplify(ring,true);
    if(s.length>=4&&Math.abs(signedArea(s))>=.5)rings.push(s);
  }
  const exterior=rings.filter(r=>signedArea(r)>0).map(r=>({ring:r,holes:[],area:signedArea(r)}));
  for(const hole of rings.filter(r=>signedArea(r)<0)){
    const a=hole[0],b=hole[1],dx=b[0]-a[0],dy=b[1]-a[1];
    const sample=[(a[0]+b[0])/2+dy*.01,(a[1]+b[1])/2-dx*.01];
    let parent=null;
    for(const candidate of exterior)if(pointInside(sample,candidate.ring)&&
      (!parent||candidate.area<parent.area))parent=candidate;
    if(parent)parent.holes.push(hole);
  }
  return exterior.map(p=>[p.ring,...p.holes]);
}
function thin(mask,maxPasses=70){
  const active=new Set(mask);
  let completed=false,passes=0;
  for(let round=0;round<maxPasses;round++){
    let removed=0;
    for(let phase=0;phase<2;phase++){
      const batch=[];
      for(const id of active){
        const [i,j]=pos(id),n=DIR8.map(([dx,dy])=>active.has(key(i+dx,j+dy))?1:0);
        const count=n.reduce((a,b)=>a+b,0);
        if(count<2||count>6)continue;
        let turns=0;for(let k=0;k<8;k++)if(!n[k]&&n[(k+1)%8])turns++;
        if(turns!==1)continue;
        // Order N,NE,E,SE,S,SW,W,NW.
        if(phase===0 && (n[0]*n[2]*n[4]||n[2]*n[4]*n[6]))continue;
        if(phase===1 && (n[0]*n[2]*n[6]||n[0]*n[4]*n[6]))continue;
        batch.push(id);
      }
      for(const id of batch)active.delete(id);
      removed+=batch.length;
    }
    passes=round+1;
    if(!removed){completed=true;break;}
  }
  return {pixels:active,completed,passes};
}
function roadAxis(mask,cell,minLength,maxFeatures){
  if(!mask.size)return {features:[],thinningComplete:true};
  if(mask.size>180000)throw Error('Superficie de carretera demasiado grande para ejes automáticos; recorta el área LiDAR');
  const thinned=thin(mask),pixels=thinned.pixels,adj=new Map();
  for(const id of pixels){
    const [i,j]=pos(id),neighbors=[];
    for(const [di,dj] of DIR8){
      const next=key(i+di,j+dj);
      if(!pixels.has(next))continue;
      // Prefer orthogonal adjacency where a diagonal is redundant.
      if(di&&dj&&(pixels.has(key(i+di,j))||pixels.has(key(i,j+dj))))continue;
      neighbors.push(next);
    }
    adj.set(id,neighbors);
  }
  const used=new Set(),features=[];
  const edgeId=(a,b)=>a<b?a+'|'+b:b+'|'+a;
  function trace(start,next){
    const out=[start];let prev=start,at=next,guard=0;
    while(true){
      const e=edgeId(prev,at);
      if(used.has(e))break;
      used.add(e);out.push(at);
      if(at===start||adj.get(at).length!==2)break;
      const following=adj.get(at).find(n=>n!==prev);
      if(!following||used.has(edgeId(at,following)))break;
      prev=at;at=following;
      if(++guard>pixels.size+10)throw Error('Eje de carretera cíclico inválido');
    }
    if(out.length<2)return;
    const coords=out.map(id=>pos(id).map(v=>round((v+.5)*cell)));
    let distance=0;for(let n=1;n<coords.length;n++)
      distance+=Math.hypot(coords[n][0]-coords[n-1][0],coords[n][1]-coords[n-1][1]);
    if(distance+1e-6<minLength)return;
    if(features.length>=maxFeatures)throw Error('Demasiados ejes de carretera: recorta el área');
    features.push({type:'Feature',
      geometry:{type:'LineString',coordinates:simplify(coords)},
      properties:{kind:'camino-o-carretera-candidato-clase11-lidar',
        source:'LAS clase 11 · superficie vial',approx_length_m:round(distance),
        extraction_method:'esqueleto binario de celdas clasificadas',
        source_class:11,review_required:true,auto_accept:false,
        warning:'Eje aproximado, puede contener ramas y cortes. La clase 11 no distingue calle, carretera, pista ni camino; confirmar trazado y símbolo.'}});
  }
  // Start at the junctions and endpoints, then recover any closed loops.
  for(const [id,neighbors] of adj)if(neighbors.length!==2)
    for(const n of neighbors)if(!used.has(edgeId(id,n)))trace(id,n);
  for(const [id,neighbors] of adj)
    for(const n of neighbors)if(!used.has(edgeId(id,n)))trace(id,n);
  return {features,thinningComplete:thinned.completed,passes:thinned.passes};
}
function detect(rows,cell,opts={}){
  cell=Number(cell);
  const minRoadPoints=Number(opts.minRoadPoints??1),minWaterPoints=Number(opts.minWaterPoints??1);
  const minRoadLength=Number(opts.minRoadLength??10),minWaterArea=Number(opts.minWaterArea??12);
  const maxFeatures=Number(opts.maxFeatures??2500);
  if(!Array.isArray(rows)||rows.length>1000000||!Number.isFinite(cell)||cell<.1)
    throw Error('Rejilla LiDAR de transporte y agua inválida');
  if(!Number.isInteger(minRoadPoints)||minRoadPoints<1||!Number.isInteger(minWaterPoints)||minWaterPoints<1||
    !Number.isFinite(minRoadLength)||minRoadLength<0||!Number.isFinite(minWaterArea)||minWaterArea<0||
    !Number.isInteger(maxFeatures)||maxFeatures<1||maxFeatures>10000)
    throw Error('Umbrales de transporte y agua inválidos');
  const road=new Set(),water=new Set(),seen=new Set();
  for(const r of rows){
    if(!Number.isFinite(r.x)||!Number.isFinite(r.y))throw Error('Coordenadas LiDAR inválidas');
    const i=Math.round(r.x/cell-.5),j=Math.round(r.y/cell-.5),id=key(i,j);
    if(seen.has(id)||Math.abs((i+.5)*cell-r.x)>cell*1e-5||
      Math.abs((j+.5)*cell-r.y)>cell*1e-5)throw Error('Celdas duplicadas o tamaño de celda incompatible');
    seen.add(id);
    if(Number(r.road_points||0)>=minRoadPoints)road.add(id);
    if(Number(r.water_points||0)>=minWaterPoints)water.add(id);
  }
  const axes=roadAxis(road,cell,minRoadLength,maxFeatures),features=[...axes.features];
  const waterRegions=components(water,false);
  for(const region of waterRegions){
    const area=region.length*cell*cell;
    if(area+1e-9<minWaterArea)continue;
    for(const polygon of ringsFromRegion(region)){
      if(features.length>=maxFeatures)throw Error('Demasiadas propuestas LiDAR');
      features.push({type:'Feature',
        geometry:{type:'Polygon',coordinates:polygon.map(r=>r.map(p=>p.map(v=>round(v*cell))))},
        properties:{kind:'agua-superficie-candidata-clase9-lidar',source:'LAS clase 9 · agua',
          source_class:9,raster_area_m2:round(area),review_required:true,auto_accept:false,
          warning:'Clase LAS 9. Puede representar masa de agua o zonas inundadas del vuelo; revisar límites, caudal y símbolo.'}});
    }
  }
  return{type:'FeatureCollection',name:'Ocarto v281 · carreteras y agua clasificados · revisar',
    properties:{cellSize:cell,roadClassCells:road.size,waterClassCells:water.size,
      roadAxes:axes.features.length,waterAreas:features.length-axes.features.length,
      skeletonCompleted:axes.thinningComplete,reviewRequired:true,
      warning:'No se infieren caminos ni ríos en nubes sin clases 11 y 9. Los ejes y límites son preliminares.'},
    features};
}
return Object.freeze({detect});
});
