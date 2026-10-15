/* Ocarto v61: extend a mapped valley axis to the next selected 1 m contour.
   Geometry-only operation: it never edits the terrain grid or the contour template. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoValleyExtend=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function extend(line,contours,options={}){
 const target=Number(options.targetElevation),startElevation=options.startElevation===undefined?null:Number(options.startElevation),maxDistance=options.maxDistance===undefined?100:Number(options.maxDistance),end=options.end||'end';
 if(!Array.isArray(line)||line.length<2||line.some(p=>!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite)))throw Error('Eje de vaguada no válido');
 if(!Array.isArray(contours)||!Number.isFinite(target)||!Number.isFinite(maxDistance)||maxDistance<=0||!['start','end'].includes(end)||(startElevation!==null&&(!Number.isFinite(startElevation)||target<=startElevation)))throw Error('Curva objetivo superior o distancia no válidas');
 const origin=end==='end'?line.at(-1):line[0],near=end==='end'?line.at(-2):line[1];
 let dx=origin[0]-near[0],dy=origin[1]-near[1],len=Math.hypot(dx,dy);if(!len)throw Error('El extremo de la vaguada no tiene dirección');dx/=len;dy/=len;
 let best=null;
 for(const f of contours){if(f?.geometry?.type!=='LineString'||!Number.isFinite(f.properties?.elevation)||Math.abs(f.properties.elevation-target)>1e-8)continue;const pts=f.geometry.coordinates;if(!Array.isArray(pts)||pts.length<2)continue;
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if(!Array.isArray(a)||!Array.isArray(b)||!a.slice(0,2).every(Number.isFinite)||!b.slice(0,2).every(Number.isFinite))continue;
   const sx=b[0]-a[0],sy=b[1]-a[1],den=dx*sy-dy*sx;if(Math.abs(den)<1e-12)continue;
   const ax=a[0]-origin[0],ay=a[1]-origin[1],t=(ax*sy-ay*sx)/den,u=(ax*dy-ay*dx)/den;
   if(t<=1e-8||t>maxDistance||u< -1e-8||u>1+1e-8)continue;
   if(!best||t<best.distance)best={distance:t,point:[origin[0]+dx*t,origin[1]+dy*t]};
  }
 }
 if(!best)throw Error('La vaguada no cruza la curva superior dentro de la distancia indicada');
 const coordinates=line.map(p=>p.slice());if(end==='end')coordinates.push(best.point);else coordinates.unshift(best.point);
 return {coordinates,extension_m:best.distance,target_elevation:target,start_elevation:startElevation,end,source:'eje prolongado hasta curva 1 m',review_required:true};
}
const DIRS=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
function followTerrain(line,rows,cell,options={}){
 if(!Number.isFinite(cell)||cell<=0||!Array.isArray(rows)||rows.length>200000)throw Error('MDT LiDAR o celda no válidos');
 const target=Number(options.targetElevation),startElevation=Number(options.startElevation),end=options.end||'end',maxDistance=options.maxDistance===undefined?250:Number(options.maxDistance),maxUphillGrade=options.maxUphillGrade===undefined?1.2:Number(options.maxUphillGrade);
 if(!Number.isFinite(target)||!Number.isFinite(startElevation)||target<=startElevation||!['start','end'].includes(end)||!Number.isFinite(maxDistance)||maxDistance<=0||!Number.isFinite(maxUphillGrade)||maxUphillGrade<=0)throw Error('Curva superior o distancia no válidas');
 if(!Array.isArray(line)||line.length<2||line.some(p=>!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite)))throw Error('Eje de vaguada no válido');
 const origin=end==='end'?line.at(-1):line[0],near=end==='end'?line.at(-2):line[1];let hx=origin[0]-near[0],hy=origin[1]-near[1],hl=Math.hypot(hx,hy);if(!hl)throw Error('El extremo de la vaguada no tiene dirección');hx/=hl;hy/=hl;
 const cells=new Map();for(const r of rows){if(!Array.isArray(r)||r.length<4||!r.slice(0,4).every(Number.isFinite))throw Error('Celda MDT inválida');if(r[4]&&r[4]!=='observado')continue;const i=Math.round(r[0]/cell-.5),j=Math.round(r[1]/cell-.5);if(Math.abs(r[0]-(i+.5)*cell)>cell*1e-5||Math.abs(r[1]-(j+.5)*cell)>cell*1e-5)throw Error('MDT fuera de rejilla');const id=i+','+j;if(cells.has(id))throw Error('Celda MDT repetida');cells.set(id,{i,j,x:r[0],y:r[1],z:r[2],n:r[3]});}
 const nearest=[...cells.values()].reduce((best,p)=>{const d=Math.hypot(p.x-origin[0],p.y-origin[1]);return !best||d<best.d?{p,d}:best},null);if(!nearest||nearest.d>cell*1.5)throw Error('El extremo debe estar cerca de terreno LiDAR observado');
 const start=nearest.p;if(start.z>=target)throw Error('El extremo ya está en la curva objetivo o por encima');
 const keys=[...cells.keys()],idx=new Map(keys.map((k,i)=>[k,i])),list=keys.map(k=>cells.get(k)),N=list.length,states=N*9,dist=new Float64Array(states);dist.fill(Infinity);const parent=new Int32Array(states);parent.fill(-2);const pathLen=new Float64Array(states);pathLen.fill(Infinity);
 class Heap{constructor(){this.a=[]}push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].cost<=v.cost)break;this.a[i]=this.a[p];i=p}this.a[i]=v}pop(){if(!this.a.length)return null;const top=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(true){let c=i*2+1;if(c>=this.a.length)break;if(c+1<this.a.length&&this.a[c+1].cost<this.a[c].cost)c++;if(this.a[c].cost>=last.cost)break;this.a[i]=this.a[c];i=c}this.a[i]=last}return top}}
 const heap=new Heap(),si=idx.get(start.i+','+start.j),sstate=si*9+8;dist[sstate]=0;pathLen[sstate]=nearest.d;parent[sstate]=-1;heap.push({state:sstate,cost:0});let goal=null;
 const get=(i,j)=>{const k=idx.get(i+','+j);return k===undefined?null:list[k]};
 while(heap.a.length){const cur=heap.pop(),s=cur.state;if(cur.cost!==dist[s])continue;const ci=Math.floor(s/9),prevDir=s%9,p=list[ci],plen=pathLen[s];for(let d=0;d<8;d++){const[dx,dy]=DIRS[d],q=get(p.i+dx,p.j+dy);if(!q)continue;const step=cell*Math.hypot(dx,dy),nextLen=plen+step;if(nextLen>maxDistance||q.z-p.z>maxUphillGrade*step)continue;
   if(p.z<target&&q.z>=target){const t=(target-p.z)/(q.z-p.z),point=[p.x+t*(q.x-p.x),p.y+t*(q.y-p.y)];goal={state:s,point,distance:nextLen-step+step*t};break}
   const n1=get(q.i-dy,q.j+dx),n2=get(q.i+dy,q.j-dx),inc=n1&&n2?Math.max(0,Math.min(n1.z-q.z,n2.z-q.z)):0;
   const dot=prevDir===8?(dx/Math.hypot(dx,dy)*hx+dy/Math.hypot(dx,dy)*hy):((dx*DIRS[prevDir][0]+dy*DIRS[prevDir][1])/(Math.hypot(dx,dy)*Math.hypot(...DIRS[prevDir])));
   const turn=prevDir===8?.8*(1-dot):.42*(1-dot),channel=1/(1+3*inc),slope=.08*Math.abs(q.z-p.z)/cell,cost=cur.cost+step*(channel+slope)+turn;
   const ni=idx.get(q.i+','+q.j),ns=ni*9+d;if(cost<dist[ns]){dist[ns]=cost;parent[ns]=s;pathLen[ns]=nextLen;heap.push({state:ns,cost})}
  }if(goal)break;
 }
 if(!goal)throw Error('No se pudo seguir la vaguada hasta la curva superior dentro del límite');
 const reversed=[];for(let s=goal.state;s>=0;s=parent[s]){const p=list[Math.floor(s/9)];reversed.push([p.x,p.y]);if(parent[s]===-1)break}const route=reversed.reverse();route.push(goal.point);
 const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<cell*1e-6;let coords;if(end==='end'){const extra=same(line.at(-1),route[0])?route.slice(1):route;coords=[...line,...extra]}else{const extra=route.reverse();if(same(extra.at(-1),line[0]))extra.pop();coords=[...extra,...line]}return{coordinates:coords,extension_m:+goal.distance.toFixed(3),target_elevation:target,start_elevation:startElevation,end,source:'eje seguido por LiDAR hasta curva 1 m',review_required:true};
}
return {extend,followTerrain};
});
