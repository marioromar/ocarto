(function(root){
  function snapEdges(a,b,tolerance=1,sourceOffset={x:0,y:0},targetOffset={x:0,y:0}){
    if(!Array.isArray(a)||!Array.isArray(b)||!Number.isFinite(tolerance)||tolerance<0||![sourceOffset?.x,sourceOffset?.y,targetOffset?.x,targetOffset?.y].every(Number.isFinite))throw Error('Geometría o tolerancia no válida');
    const out=a.map(p=>[p[0],p[1]]);let moved=0;
    for(let i=0;i<out.length;i++){const p=a[i];if(!Array.isArray(p)||!p.every(Number.isFinite))continue;const px=p[0]+sourceOffset.x,py=p[1]+sourceOffset.y;let best=null;
      for(let j=0;j<b.length;j++){const q=b[j],n=b[(j+1)%b.length];if(!Array.isArray(q)||!Array.isArray(n)||!q.every(Number.isFinite)||!n.every(Number.isFinite))continue;const qx=q[0]+targetOffset.x,qy=q[1]+targetOffset.y,nx=n[0]+targetOffset.x,ny=n[1]+targetOffset.y,dx=nx-qx,dy=ny-qy,den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((px-qx)*dx+(py-qy)*dy)/den)):0,candidate=[qx+t*dx,qy+t*dy],d=Math.hypot(px-candidate[0],py-candidate[1]);if(d<=tolerance&&(!best||d<best.d))best={point:candidate,d}}
      if(best){out[i]=[best.point[0]-sourceOffset.x,best.point[1]-sourceOffset.y];moved++}}
    return{points:out,moved}
  }
  function snapCurvedEdges(points,target,tolerance=1,closed=true,steps=96,sourceOffset={x:0,y:0},targetOffset={x:0,y:0}){
    if(!Array.isArray(points)||!Array.isArray(target)||!Number.isFinite(tolerance)||tolerance<0||!Number.isInteger(steps)||steps<8||![sourceOffset?.x,sourceOffset?.y,targetOffset?.x,targetOffset?.y].every(Number.isFinite))throw Error('Geometría o tolerancia no válida');
    const controls=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,out=a.outTangent||a.tangent||{x:dx/3,y:dy/3},incoming=b.inTangent||(b.tangent?{x:-b.tangent.x,y:-b.tangent.y}:{x:-dx/3,y:-dy/3});return[{x:a.x,y:a.y},{x:a.x+out.x,y:a.y+out.y},{x:b.x+incoming.x,y:b.y+incoming.y},{x:b.x,y:b.y}]};
    const point=(c,t)=>{const[a,b,d,e]=c,u=1-t;return{x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*d.x+t*t*t*e.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*d.y+t*t*t*e.y}};
    const phi=(Math.sqrt(5)-1)/2,segments=closed?target.length:target.length-1;
    const curves=[];for(let j=0;j<segments;j++){const a=target[j],b=target[(j+1)%target.length];if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||!Number.isFinite(b.x)||!Number.isFinite(b.y))continue;const shiftedA={...a,x:a.x+targetOffset.x,y:a.y+targetOffset.y},shiftedB={...b,x:b.x+targetOffset.x,y:b.y+targetOffset.y},c=controls(shiftedA,shiftedB);if(c.some(q=>!Number.isFinite(q.x)||!Number.isFinite(q.y)))continue;curves.push({c,minX:Math.min(...c.map(q=>q.x)),maxX:Math.max(...c.map(q=>q.x)),minY:Math.min(...c.map(q=>q.y)),maxY:Math.max(...c.map(q=>q.y))})}
    const out=points.map(p=>({...p}));let moved=0;
    for(const p of out){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;const px=p.x+sourceOffset.x,py=p.y+sourceOffset.y;let best=null;for(const curve of curves){const dx=Math.max(curve.minX-px,0,px-curve.maxX),dy=Math.max(curve.minY-py,0,py-curve.maxY);if(Math.hypot(dx,dy)>tolerance)continue;const {c}=curve,dist2=t=>{const q=point(c,t);return(q.x-px)**2+(q.y-py)**2};let coarse=0,score=Infinity;for(let k=0;k<=steps;k++){const t=k/steps,d=dist2(t);if(d<score){score=d;coarse=t}}let lo=Math.max(0,coarse-1/steps),hi=Math.min(1,coarse+1/steps),x1=hi-phi*(hi-lo),x2=lo+phi*(hi-lo),f1=dist2(x1),f2=dist2(x2);for(let k=0;k<32;k++){if(f1<=f2){hi=x2;x2=x1;f2=f1;x1=hi-phi*(hi-lo);f1=dist2(x1)}else{lo=x1;x1=x2;f1=f2;x2=lo+phi*(hi-lo);f2=dist2(x2)}}for(const t of [coarse,(lo+hi)/2]){const q=point(c,t),d=Math.hypot(px-q.x,py-q.y);if(d<=tolerance&&(!best||d<best.d))best={x:q.x,y:q.y,d}}}if(best){p.x=best.x-sourceOffset.x;p.y=best.y-sourceOffset.y;moved++}}
    return{points:out,moved};
  }
  function validate(path,closed=false){if(closed)return validatePolygon(path,[]);if(!Array.isArray(path)||path.length<2)return{valid:false,issues:['pocos vértices']};if(path.length>2500)return{valid:false,issues:['línea demasiado compleja para validar de forma interactiva (>2500 vértices); simplifica primero']};if(path.some(p=>!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1])))return{valid:false,issues:['coordenada no válida']};const scale=path.reduce((m,p)=>Math.max(m,Math.abs(p[0]),Math.abs(p[1])),1),eps=scale*1e-10,issues=[];for(let i=1;i<path.length;i++)if(Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1])<=eps)issues.push(`vértices duplicados en ${i}–${i+1}`);if(path.length>2&&Math.hypot(path[0][0]-path.at(-1)[0],path[0][1]-path.at(-1)[1])<=eps)issues.push('extremos coincidentes en línea abierta');for(let i=1;i<path.length-1;i++){const a=path[i-1],b=path[i],c=path[i+1],v1=[b[0]-a[0],b[1]-a[1]],v2=[c[0]-b[0],c[1]-b[1]];if(Math.abs(orient(a,b,c))<=eps&&v1[0]*v2[0]+v1[1]*v2[1]<-eps)issues.push(`retroceso en el vértice ${i+1}`)}const segments=path.length-1;for(let i=0;i<segments;i++)for(let j=i+2;j<segments;j++){const a=path[i],b=path[i+1],c=path[j],d=path[j+1];if(Math.max(a[0],b[0])+eps<Math.min(c[0],d[0])||Math.max(c[0],d[0])+eps<Math.min(a[0],b[0])||Math.max(a[1],b[1])+eps<Math.min(c[1],d[1])||Math.max(c[1],d[1])+eps<Math.min(a[1],b[1]))continue;if(segmentsIntersect(a,b,c,d,eps))issues.push(`auto-intersección entre segmentos ${i+1} y ${j+1}`)}return{valid:issues.length===0,issues:[...new Set(issues)]}}
  const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  function onSegment(a,b,p,eps){return Math.abs(orient(a,b,p))<=eps&&p[0]>=Math.min(a[0],b[0])-eps&&p[0]<=Math.max(a[0],b[0])+eps&&p[1]>=Math.min(a[1],b[1])-eps&&p[1]<=Math.max(a[1],b[1])+eps}
  function segmentsIntersect(a,b,c,d,eps){const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);if((o1>eps&&o2< -eps||o1< -eps&&o2>eps)&&(o3>eps&&o4< -eps||o3< -eps&&o4>eps))return true;return onSegment(a,b,c,eps)||onSegment(a,b,d,eps)||onSegment(c,d,a,eps)||onSegment(c,d,b,eps)}
  function ringArea2(ring){let area=0;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];area+=a[0]*b[1]-b[0]*a[1]}return area}
  function pointLocation(point,ring,eps){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[j],b=ring[i];if(onSegment(a,b,point,eps))return 0;if(((a[1]>point[1])!==(b[1]>point[1]))&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside?1:-1}
  function validateRing(ring,label,eps){const issues=[];if(!Array.isArray(ring)||ring.length<3)return [`${label}: pocos vértices`];for(const p of ring)if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))return [`${label}: coordenada no válida`];for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];if(Math.hypot(a[0]-b[0],a[1]-b[1])<=eps)issues.push(`${label}: vértices duplicados`)}if(Math.abs(ringArea2(ring))<=eps*eps)issues.push(`${label}: área nula`);for(let i=0;i<ring.length;i++)for(let j=i+1;j<ring.length;j++){if(j===i+1||i===0&&j===ring.length-1)continue;if(segmentsIntersect(ring[i],ring[(i+1)%ring.length],ring[j],ring[(j+1)%ring.length],eps))issues.push(`${label}: auto-intersección`)}return [...new Set(issues)]}
  function validatePolygon(outer,holes=[]){if(!Array.isArray(holes))return{valid:false,issues:['lista de agujeros no válida']};const rings=[outer,...holes],count=rings.reduce((n,r)=>n+(Array.isArray(r)?r.length:0),0);if(count>2500)return{valid:false,issues:['geometría demasiado compleja para validar de forma interactiva (>2500 vértices); simplifica primero']};const all=rings.flat().filter(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite)),scale=all.reduce((m,p)=>Math.max(m,Math.abs(p[0]),Math.abs(p[1])),1),eps=scale*1e-10,issues=[...validateRing(outer,'contorno exterior',eps)];holes.forEach((hole,i)=>issues.push(...validateRing(hole,`agujero ${i+1}`,eps)));if(!Array.isArray(outer)||outer.length<3)return{valid:false,issues:[...new Set(issues)]};for(let h=0;h<holes.length;h++){const hole=holes[h];if(!Array.isArray(hole)||hole.length<3)continue;let crossesOuter=false;for(let i=0;i<hole.length&&!crossesOuter;i++)for(let j=0;j<outer.length;j++)if(segmentsIntersect(hole[i],hole[(i+1)%hole.length],outer[j],outer[(j+1)%outer.length],eps)){crossesOuter=true;break}if(crossesOuter)issues.push(`agujero ${h+1}: cruza o toca el contorno exterior`);else if(pointLocation(hole[0],outer,eps)!==1)issues.push(`agujero ${h+1}: queda fuera del contorno exterior`)}for(let a=0;a<holes.length;a++)for(let b=a+1;b<holes.length;b++){const x=holes[a],y=holes[b];if(!Array.isArray(x)||!Array.isArray(y)||x.length<3||y.length<3)continue;let overlap=false;for(let i=0;i<x.length&&!overlap;i++)for(let j=0;j<y.length;j++)if(segmentsIntersect(x[i],x[(i+1)%x.length],y[j],y[(j+1)%y.length],eps)){overlap=true;break}if(!overlap&&pointLocation(x[0],y,eps)>=0||!overlap&&pointLocation(y[0],x,eps)>=0)overlap=true;if(overlap)issues.push(`agujeros ${a+1} y ${b+1}: se solapan`)}return{valid:issues.length===0,issues:[...new Set(issues)]}}
  function clipLineToPolygon(line,outer,holes=[],options={}){
    if(!Array.isArray(line)||line.length<2||line.length>2500||line.some(p=>!Array.isArray(p)||p.length<2||!p.every(Number.isFinite)))throw Error('Línea no válida');
    const checked=validatePolygon(outer,holes);if(!checked.valid)throw Error(`Área no válida: ${checked.issues[0]}`);
    const all=[...line,...outer,...holes.flat()],scale=all.flat().reduce((m,v)=>Math.max(m,Math.abs(v)),1),eps=scale*1e-10,paramEps=1e-10;
    const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],rings=[outer,...holes],runs=[];let run=[];
    const flush=()=>{if(run.length>=2)runs.push(run);run=[]},at=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],insideArea=p=>pointLocation(p,outer,eps)>=0&&!holes.some(h=>pointLocation(p,h,eps)>0);
    for(let i=0;i<line.length-1;i++){
      const p=line[i],q=line[i+1],d=sub(q,p),length=Math.hypot(...d);if(length<=eps){flush();continue}const ts=[0,1];
      for(const ring of rings)for(let j=0;j<ring.length;j++){
        const a=ring[j],b=ring[(j+1)%ring.length],e=sub(b,a),den=cross(d,e),ap=sub(a,p);
        if(Math.abs(den)<=eps*length){
          if(Math.abs(cross(ap,d))<=eps*length){const l2=d[0]*d[0]+d[1]*d[1],t1=((a[0]-p[0])*d[0]+(a[1]-p[1])*d[1])/l2,t2=((b[0]-p[0])*d[0]+(b[1]-p[1])*d[1])/l2,lo=Math.max(0,Math.min(t1,t2)),hi=Math.min(1,Math.max(t1,t2));if(hi>=lo-paramEps)ts.push(lo,hi)}
          continue;
        }
        const t=cross(ap,e)/den,u=cross(ap,d)/den;if(t>=-paramEps&&t<=1+paramEps&&u>=-paramEps&&u<=1+paramEps)ts.push(Math.max(0,Math.min(1,t)));
      }
      ts.sort((a,b)=>a-b);const unique=ts.filter((t,k)=>k===0||t-ts[k-1]>paramEps);
      for(let k=0;k<unique.length-1;k++){const t0=unique[k],t1=unique[k+1];if(t1-t0<=paramEps)continue;const a=at(p,q,t0),b=at(p,q,t1),inside=insideArea(at(p,q,(t0+t1)/2)),keep=options.outside?!inside:inside;if(keep){if(run.length&&Math.hypot(run.at(-1)[0]-a[0],run.at(-1)[1]-a[1])<=eps)run.push(b);else{flush();run=[a,b]}}else flush()}
    }
    flush();return runs;
  }
  function clipLineToArea(line,area){return clipLineToPolygon(line,area,[])}
  function clipLineOutsidePolygon(line,outer,holes=[]){return clipLineToPolygon(line,outer,holes,{outside:true})}
  function isConvexRing(ring){let sign=0;for(let i=0;i<ring.length;i++){const turn=orient(ring[i],ring[(i+1)%ring.length],ring[(i+2)%ring.length]);if(Math.abs(turn)<=1e-10)continue;const next=Math.sign(turn);if(sign&&next!==sign)return false;sign=next}return sign!==0}
  function clipAreaToArea(subject,clip){
    const check=(ring,label)=>{if(!Array.isArray(ring)||ring.length<3||ring.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))throw Error(`${label}: geometría no válida`);const valid=validatePolygon(ring);if(!valid.valid)throw Error(`${label}: ${valid.issues[0]}`);if(!isConvexRing(ring))throw Error(`${label}: el recorte solo admite áreas convexas`)};
    check(subject,'Área');check(clip,'Límite');
    let boundary=clip.map(p=>p.slice());if(ringArea2(boundary)<0)boundary.reverse();
    let out=subject.map(p=>p.slice());
    for(let i=0;i<boundary.length;i++){
      const A=boundary[i],B=boundary[(i+1)%boundary.length],input=out;out=[];if(!input.length)break;
      const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]),insideE=p=>cross(A,B,p)>=-1e-10;
      for(let j=0;j<input.length;j++){
        const P=input[j],Q=input[(j+1)%input.length],ip=insideE(P),iq=insideE(Q);
        if(ip&&iq)out.push(Q);
        else if(ip!==iq){const dx=Q[0]-P[0],dy=Q[1]-P[1],ex=B[0]-A[0],ey=B[1]-A[1],den=dx*ey-dy*ex;if(Math.abs(den)<1e-14)continue;const t=((A[0]-P[0])*ey-(A[1]-P[1])*ex)/den;out.push([P[0]+t*dx,P[1]+t*dy]);if(!ip&&iq)out.push(Q)}
      }
    }
    if(out.length<3||Math.abs(ringArea2(out))<1e-10)return[];
    return out;
  }
  function differenceConvexArea(subject,clip){
    const check=(ring,label)=>{if(!Array.isArray(ring)||ring.length<3||ring.some(p=>!Array.isArray(p)||p.length<2||!p.every(Number.isFinite)))throw Error(`${label}: geometría no válida`);const valid=validatePolygon(ring);if(!valid.valid)throw Error(`${label}: ${valid.issues[0]}`);if(!isConvexRing(ring))throw Error(`${label}: el recorte exterior solo admite áreas convexas`) };
    check(subject,'Área');check(clip,'Límite');const boundary=clip.map(p=>p.slice());if(ringArea2(boundary)<0)boundary.reverse();
    const clean=ring=>{const out=[];for(const p of ring)if(!out.length||Math.hypot(p[0]-out.at(-1)[0],p[1]-out.at(-1)[1])>1e-10)out.push(p);if(out.length>1&&Math.hypot(out[0][0]-out.at(-1)[0],out[0][1]-out.at(-1)[1])<=1e-10)out.pop();return out};
    const clipHalf=(ring,a,b,inside)=>{const out=[],side=p=>orient(a,b,p),isIn=p=>inside?side(p)>=-1e-10:side(p)<=1e-10;for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length],sp=side(p),sq=side(q),ip=isIn(p),iq=isIn(q);if(ip&&iq)out.push(q.slice());else if(ip!==iq){const den=sp-sq;if(Math.abs(den)>1e-14){const t=sp/den,x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t;out.push([x,y]);if(!ip&&iq)out.push(q.slice())}}}return clean(out)};
    let remaining=[subject.map(p=>p.slice())];const outside=[];
    for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length],next=[];for(const ring of remaining){const out=clipHalf(ring,a,b,false),ins=clipHalf(ring,a,b,true);if(out.length>=3&&Math.abs(ringArea2(out))>1e-10)outside.push(out);if(ins.length>=3&&Math.abs(ringArea2(ins))>1e-10)next.push(ins)}remaining=next;if(!remaining.length)break}
    for(const ring of outside){const checked=validatePolygon(ring);if(!checked.valid)throw Error(`El recorte exterior produciría una geometría inválida: ${checked.issues[0]}`)}return outside;
  }
  root.OcartoTopologyTools={snapEdges,snapCurvedEdges,validate,validatePolygon,clipLineToArea,clipLineToPolygon,clipLineOutsidePolygon,clipAreaToArea,differenceConvexArea};if(typeof module!=='undefined')module.exports=root.OcartoTopologyTools;
})(typeof window!=='undefined'?window:globalThis);
