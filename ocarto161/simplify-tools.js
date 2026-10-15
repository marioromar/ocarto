/* Douglas–Peucker simplification that keeps endpoints and marked corner/dash vertices. */
(function(root){
  'use strict';
  const distanceToSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;if(!len2)return Math.hypot(p.x-a.x,p.y-a.y);const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len2));return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy))};
  function simplify(path,tolerance=1,{closed=false}={}){
    if(!Array.isArray(path))throw Error('Geometría no válida');
    const points=path.map(p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Vértice no válido');return {...p}});
    if(closed&&points.length>3&&points[0].x===points.at(-1).x&&points[0].y===points.at(-1).y)points.pop();
    if(points.length<(closed?3:2)||!Number.isFinite(tolerance)||tolerance<=0)return points;
    const work=closed?[...points,{...points[0]}]:points,n=work.length,last=n-1,keep=new Uint8Array(n),anchors=[0];
    for(let i=1;i<last;i++)if(work[i].vertexType==='corner'||work[i].vertexType==='dash')anchors.push(i);
    anchors.push(last);anchors.sort((a,b)=>a-b);for(const i of anchors)keep[i]=1;
    for(let k=1;k<anchors.length;k++){
      const start=anchors[k-1],end=anchors[k];if(end<=start+1)continue;
      const stack=[[start,end]];
      while(stack.length){const [a,b]=stack.pop();let best=-1,max=tolerance;for(let i=a+1;i<b;i++){const d=distanceToSegment(work[i],work[a],work[b]);if(d>max){max=d;best=i}}if(best>=0){keep[best]=1;stack.push([a,best],[best,b])}}
    }
    let result=work.filter((_,i)=>keep[i]);if(closed)result.pop();
    if(closed&&result.length<3){const selected=new Set([...work.map((_,i)=>keep[i]?i:-1).filter(i=>i>=0),last]);for(const i of [Math.floor(last/3),Math.floor(2*last/3)])if(selected.size<4)selected.add(i);result=[...selected].filter(i=>i<last).sort((a,b)=>a-b).map(i=>({...work[i]}))}
    return result;
  }
  root.OcartoSimplifyTools={simplify};if(typeof module!=='undefined'&&module.exports)module.exports=root.OcartoSimplifyTools;
})(typeof window!=='undefined'?window:globalThis);
