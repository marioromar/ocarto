/* Ocarto v23: plan-view channel/thalweg candidates from the observed ground grid.
   This does not alter terrain elevation or claim to measure missing incision depth. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoValleyTrace=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DIR=[[1,0],[1,1],[0,1],[-1,1]], EIGHT=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
function detect(rows,cell,options={}){
 if(!Number.isFinite(cell)||cell<=0||!Array.isArray(rows)||rows.length>200000)throw Error('Rejilla de terreno inválida');
 const minLength=options.minLength===undefined?20:Number(options.minLength),minIncision=options.minIncision===undefined?.6:Number(options.minIncision);
 const radius=options.radius===undefined?2:Number(options.radius),minGround=options.minGround===undefined?1:Number(options.minGround);
 if(!Number.isFinite(minLength)||minLength<5||minLength>10000||!Number.isFinite(minIncision)||minIncision<=0||!Number.isInteger(radius)||radius<1||radius>4||!Number.isInteger(minGround)||minGround<1)throw Error('Parámetros de vaguada inválidos');
 const cells=new Map();
 for(const r of rows){if(!Array.isArray(r)||r.length<4||!r.slice(0,4).every(Number.isFinite))throw Error('Celda MDT inválida');const i=Math.round(r[0]/cell-.5),j=Math.round(r[1]/cell-.5);if(Math.abs(r[0]-(i+.5)*cell)>cell*1e-5||Math.abs(r[1]-(j+.5)*cell)>cell*1e-5)throw Error('Rejilla incompatible con tamaño de celda');const key=i+','+j;if(cells.has(key))throw Error('Celdas repetidas');cells.set(key,{key,i,j,x:r[0],y:r[1],z:r[2],n:r[3],source:r[4]||'observado'});}
 const get=(i,j)=>cells.get(i+','+j), good=p=>p&&p.source==='observado'&&p.n>=minGround;
 const candidates=new Map();
 for(const p of cells.values()){
  if(!good(p))continue;
  let best=null;
  for(let d=0;d<4;d++){
   const [dx,dy]=DIR[d],normal=[-dy,dx];let bestSide=null;
   for(let rad=1;rad<=radius;rad++){
    const a=get(p.i+normal[0]*rad,p.j+normal[1]*rad),b=get(p.i-normal[0]*rad,p.j-normal[1]*rad);
    if(!good(a)||!good(b))continue;
    const v=Math.min(a.z-p.z,b.z-p.z);
    if(v>=minIncision&&(!bestSide||v>bestSide.incision))bestSide={incision:v,radius:rad};
   }
   if(!bestSide)continue;
   // At least one observed neighbour on each side of the axis: avoid isolated pits.
   const ahead=get(p.i+dx,p.j+dy),back=get(p.i-dx,p.j-dy);
   if(!good(ahead)||!good(back))continue;
   // A small tolerance in the axial neighbours allows a channel that descends with the slope.
   const directionalGradient=Math.abs(ahead.z-back.z)/(2*cell*Math.hypot(dx,dy));
   const score=bestSide.incision/(1+.2*directionalGradient);
   if(!best||score>best.score)best={d,score,incision:bestSide.incision,radius:bestSide.radius};
  }
  if(best)candidates.set(p.key,{...p,...best});
 }
 // Trace candidate ridge-orthogonal lines in all 8 directions, allowing turns.
 // Every candidate has at most two links, with a mutual axial-alignment requirement.
 const graph=new Map([...candidates].map(([k])=>[k,new Set()]));
 const proposals=[];
 for(const p of candidates.values()){
  const forward=DIR[p.d];
  const opts=[];
  for(const [dx,dy] of EIGHT){const q=candidates.get((p.i+dx)+','+(p.j+dy));if(!q)continue;
   const unit=Math.hypot(dx,dy);const along=Math.abs((dx*forward[0]+dy*forward[1])/(unit*Math.hypot(...forward)));
   const qaxis=DIR[q.d],match=Math.abs((dx*qaxis[0]+dy*qaxis[1])/(unit*Math.hypot(...qaxis)));
   if(along<.70||match<.70)continue;
   // Penalize sharp turns and prefer points with a consistent incision signature.
   opts.push({q,dx,dy,rank:along+match-Math.abs(p.incision-q.incision)*.03});
  }
  for(const sign of [-1,1]){const side=opts.filter(v=>Math.sign(v.dx*forward[0]+v.dy*forward[1])===sign).sort((a,b)=>b.rank-a.rank)[0];if(side)proposals.push({a:p.key,b:side.q.key,rank:side.rank});}
 }
 // Build an undirected graph without degrees > 2; this keeps crossing/junction cases separate.
 proposals.sort((a,b)=>b.rank-a.rank);const used=new Set();
 for(const e of proposals){const pair=[e.a,e.b].sort().join('|');if(used.has(pair))continue;used.add(pair);
  if(graph.get(e.a).size>=2||graph.get(e.b).size>=2)continue;
  graph.get(e.a).add(e.b);graph.get(e.b).add(e.a);
 }
 const visited=new Set(),paths=[];
 function walk(start){const path=[],seen=new Set();let p=start,prev=null,closed=false;
  while(p&&!seen.has(p)){seen.add(p);visited.add(p);path.push(candidates.get(p));const next=[...graph.get(p)].find(n=>n!==prev&&!seen.has(n));
   if(!next){closed=graph.get(p).has(start)&&path.length>2;break;}prev=p;p=next;
  }
  if(path.length<2)return;
  let length=0;for(let n=1;n<path.length;n++)length+=Math.hypot(path[n].x-path[n-1].x,path[n].y-path[n-1].y);
  if(closed)length+=Math.hypot(path[0].x-path.at(-1).x,path[0].y-path.at(-1).y);
  if(length<minLength)return;
  const inc=path.map(x=>x.incision).sort((a,b)=>a-b),mean=inc.reduce((a,b)=>a+b,0)/inc.length;
  const coords=path.map(p=>[p.x,p.y]);if(closed)coords.push(coords[0]);
  paths.push({type:'Feature',properties:{kind:'vaguada-pronunciada-candidata',length_m:+length.toFixed(2),cells:path.length,closed,incision_median_m:+inc[Math.floor(inc.length/2)].toFixed(2),incision_mean_m:+mean.toFixed(2),min_length_m:minLength,min_incision_m:minIncision,confidence:'pendiente-de-validacion',review_required:true,apply_automatically:false,extra_depth_m:null,warning:'Eje candidato: no representa profundidad adicional medida. Comprobar relieve, cauce y puntos LiDAR antes de exagerar curvas.'},geometry:{type:'LineString',coordinates:coords}});
 }
 for(const [k,links] of graph)if(links.size===1&&!visited.has(k))walk(k);
 for(const k of graph.keys())if(!visited.has(k))walk(k);
 paths.sort((a,b)=>b.properties.length_m-a.properties.length_m);
 return {type:'FeatureCollection',name:'Ocarto v23 - ejes de vaguadas para revision',properties:{cellSize:cell,candidateCells:candidates.size,minLength,minIncision,axes:'8 direcciones y giros',source:'solo terreno observado, sin alterar MDT',review_required:true},features:paths};
}
return {detect};
});
