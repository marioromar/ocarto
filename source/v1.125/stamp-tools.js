(function(root){
  'use strict';
  const orient=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  function onSegment(a,b,p,tolerance){
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length===0)return Math.hypot(p[0]-a[0],p[1]-a[1])<=tolerance;
    return Math.abs(orient(a,b,p))/length<=tolerance&&p[0]>=Math.min(a[0],b[0])-tolerance&&p[0]<=Math.max(a[0],b[0])+tolerance&&p[1]>=Math.min(a[1],b[1])-tolerance&&p[1]<=Math.max(a[1],b[1])+tolerance;
  }
  function pointInRing(point,ring,tolerance=1e-9){
    if(!Array.isArray(point)||point.length<2||!point.every(Number.isFinite)||!Array.isArray(ring)||ring.length<3)return false;
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[j],b=ring[i];
      if(onSegment(a,b,point,tolerance))return true;
      if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function contains(point,outer,holes=[]){return pointInRing(point,outer)&&!(holes||[]).some(r=>pointInRing(point,r,0));}
  function ringFromLinePaths(paths,tolerance=1e-6){
    if(!Array.isArray(paths)||!paths.length||!Number.isFinite(tolerance)||tolerance<0)throw Error('No hay líneas válidas para formar el recinto');
    let remaining=paths.map((path,index)=>{
      if(!Array.isArray(path)||path.length<2||path.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))throw Error(`Línea ${index+1} no válida`);
      return path.map(p=>p.slice());
    });
    const ring=remaining.shift();
    if(Math.hypot(ring[0][0]-ring.at(-1)[0],ring[0][1]-ring.at(-1)[1])<=tolerance){
      if(remaining.length)throw Error('Selecciona un solo contorno cerrado');
    }
    while(remaining.length){
      const end=ring.at(-1);let best=null;
      for(let i=0;i<remaining.length;i++)for(const reverse of [false,true]){
        const path=remaining[i],start=reverse?path.at(-1):path[0],distance=Math.hypot(start[0]-end[0],start[1]-end[1]);
        if(!best||distance<best.distance)best={i,reverse,distance};
      }
      if(!best||best.distance>tolerance)throw Error('Las líneas seleccionadas no forman un perímetro conectado');
      const path=remaining.splice(best.i,1)[0];if(best.reverse)path.reverse();ring.push(...path.slice(1));
    }
    if(Math.hypot(ring[0][0]-ring.at(-1)[0],ring[0][1]-ring.at(-1)[1])>tolerance)throw Error('El perímetro seleccionado no está cerrado');
    ring.pop();
    if(ring.length<3)throw Error('El recinto necesita al menos tres vértices');
    return ring;
  }
  root.OcartoStampTools={pointInRing,contains,ringFromLinePaths};
  if(typeof module!=='undefined')module.exports=root.OcartoStampTools;
})(typeof window!=='undefined'?window:globalThis);
