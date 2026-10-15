'use strict';

function offsetRing(ring,distance){
  if(!Array.isArray(ring)||ring.length<3||!Number.isFinite(distance))throw new Error('Contorno o distancia no válidos');
  if(distance===0)return ring.map(p=>[...p]);
  let twiceArea=0;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];twiceArea+=a[0]*b[1]-b[0]*a[1]}
  if(Math.abs(twiceArea)<1e-12)throw new Error('El contorno tiene área nula');
  const orientation=Math.sign(twiceArea),shifted=[];
  for(let i=0;i<ring.length;i++){
    const p=ring[i],prev=ring[(i+ring.length-1)%ring.length],next=ring[(i+1)%ring.length];
    const edge=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<1e-12)throw new Error('El contorno contiene lados duplicados');return{dx,dy,nx:orientation*dy/len,ny:-orientation*dx/len}};
    const e1=edge(prev,p),e2=edge(p,next),a=[prev[0]+e1.nx*distance,prev[1]+e1.ny*distance],b=[p[0]+e1.nx*distance,p[1]+e1.ny*distance],c=[p[0]+e2.nx*distance,p[1]+e2.ny*distance],d=[next[0]+e2.nx*distance,next[1]+e2.ny*distance],den=e1.dx*e2.dy-e1.dy*e2.dx;
    if(Math.abs(den)<1e-10){const nx=e1.nx+e2.nx,ny=e1.ny+e2.ny,n=Math.hypot(nx,ny)||1;shifted.push([p[0]+nx/n*distance,p[1]+ny/n*distance]);continue}
    const t=((c[0]-a[0])*e2.dy-(c[1]-a[1])*e2.dx)/den,q=[a[0]+t*e1.dx,a[1]+t*e1.dy];
    if(Math.hypot(q[0]-p[0],q[1]-p[1])>Math.max(Math.abs(distance)*8,Math.abs(distance)+1e-9))throw new Error('Esquina demasiado aguda para ajustar con seguridad');
    shifted.push(q);
  }
  return shifted;
}
if(typeof module==='object'&&module.exports)module.exports={offsetRing};
if(typeof window!=='undefined')window.OcartoUrbanWidthTools={offsetRing};
