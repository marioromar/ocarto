/* Ocarto v248 runtime assets. Original bundled licenses retained. */

/* topology-tools.js */
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

;

/* wms-templates.js */
/* Ocarto: WMS reference imagery. Requests only one deliberate GetMap per click.
   WMS is a background, never interpreted as vector geometry or training labels. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoWMS=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PRESETS=Object.freeze({
 pnoa:Object.freeze({title:'Ortofoto PNOA (IGN)',url:'https://www.ign.es/wms-inspire/pnoa-ma',layers:'OI.OrthoimageCoverage',version:'1.3.0'}),
 catastro:Object.freeze({title:'Catastro INSPIRE',url:'https://ovc.catastro.meh.es/cartografia/INSPIRE/spadgcwms.aspx',layers:'CP.CadastralParcel',version:'1.3.0'})
});
const SAFE_ID=/^[A-Za-z0-9_.:,\-]+$/;
function bounds(b){const a=Array.isArray(b)?b:[b?.minX,b?.minY,b?.maxX,b?.maxY];if(!a||a.length!==4||a.some(v=>typeof v!=='number'||!Number.isFinite(v))||a[0]>=a[2]||a[1]>=a[3])throw Error('Extensión geográfica BBOX inválida');return a.slice()}
function valid(input){
 if(!input||typeof input!=='object')throw Error('WMS sin configuración');
 let u;try{u=new URL(input.url)}catch(_){throw Error('URL WMS inválida')}
 if(u.protocol!=='https:'||u.username||u.password)throw Error('El servicio WMS debe utilizar HTTPS sin credenciales en la URL');
 const layer=String(input.layers||'').trim(),crs=String(input.crs||'').trim().toUpperCase(),version=String(input.version||'1.3.0');
 if(!layer||!SAFE_ID.test(layer))throw Error('Nombre de capa WMS inválido');
 if(!/^EPSG:\d{4,6}$/.test(crs))throw Error('Selecciona un CRS EPSG válido para WMS');
 if(version!=='1.3.0'&&version!=='1.1.1')throw Error('Versión WMS no admitida');
 const bbox=bounds(input.bbox),width=Number(input.width||1024),height=Number(input.height||1024);
 if(!Number.isInteger(width)||width<64||width>2048||!Number.isInteger(height)||height<64||height>2048)throw Error('Resolución WMS fuera del límite (64–2048 px)');
 return {url:u.toString(),layers:layer,crs,version,bbox,width,height};
}
function getMapUrl(input){const p=valid(input),u=new URL(p.url);for(const k of [...u.searchParams.keys()])if(/^(service|request|version|layers|styles|format|transparent|width|height|bbox|crs|srs)$/i.test(k))u.searchParams.delete(k);
 u.searchParams.set('SERVICE','WMS');u.searchParams.set('REQUEST','GetMap');u.searchParams.set('VERSION',p.version);u.searchParams.set('LAYERS',p.layers);u.searchParams.set('STYLES','');u.searchParams.set('FORMAT','image/png');u.searchParams.set('TRANSPARENT','TRUE');u.searchParams.set(p.version==='1.3.0'?'CRS':'SRS',p.crs);u.searchParams.set('WIDTH',String(p.width));u.searchParams.set('HEIGHT',String(p.height));
 // OGC WMS 1.3 EPSG:4326 axis order: latitude, longitude. WMS 1.1 uses x/y.
 const [x0,y0,x1,y1]=p.bbox,bb=(p.version==='1.3.0'&&p.crs==='EPSG:4326')?[y0,x0,y1,x1]:[x0,y0,x1,y1];u.searchParams.set('BBOX',bb.join(','));return u.toString();
}
function georef(input){const p=valid(input),[x0,y0,x1,y1]=p.bbox;return {a:(x1-x0)/p.width,b:0,c:x0,d:0,e:-(y1-y0)/p.height,f:y1,source:'WMS '+p.layers};}
function parseManualBBox(text){const parts=String(text||'').trim().split(/[;,\s]+/).filter(Boolean);if(parts.length!==4)throw Error('Indica BBOX como xmin, ymin, xmax, ymax');const nums=parts.map(Number);return bounds(nums)}
return{PRESETS,valid,getMapUrl,georef,parseManualBBox};
});

;

/* vectorize-vegetation.js */
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
 cell=Number(cell);if(!Array.isArray(rows)||!Number.isFinite(cell)||cell<=0||rows.length>1000000)throw Error('Rejilla de vegetación inválida o demasiado grande');
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
 return {type:'FeatureCollection',name:opts.labeler?'Ocarto v25 - vegetacion aprendida para revision':'Ocarto v24 - coberturas LiDAR para revision',properties:{cellSize:cell,minimumAreaM2:minArea,minimumEquivalentWidthM:minWidth,filterSummary,counts,nonAutomatic:true,warning:'No son símbolos ISOM ni categorías de transitabilidad; contrastar con el mapa guía y el terreno. La ortofoto es opcional.'},features};
}
function vectorizeHeightClasses(rows,cell,stops,opts={}){
 if(!Array.isArray(stops)||stops.length!==4||stops.some((s,i)=>!Number.isFinite(Number(s?.height))||!/^#[0-9a-f]{6}$/i.test(String(s?.color||''))||i>0&&Number(s.height)<=Number(stops[i-1].height)))throw Error('Configura cuatro alturas crecientes y colores válidos');
 const labels=['vegetation_height_1','vegetation_height_2','vegetation_height_3','vegetation_height_4'];
 const labeler=row=>{let h=Number(row?.canopy_max_above_ground_m);if(!Number.isFinite(h)){if(Number(row?.ground_points)>0&&Number(row?.vegetation_points)===0)h=0;else return null}return labels[h<Number(stops[1].height)?0:h<Number(stops[2].height)?1:h<Number(stops[3].height)?2:3]};
 const fc=vectorize(rows,cell,{minArea:Number(opts.minArea??1),minWidth:0,maxFeatures:10000,labeler});
 const legends=labels.map((category,i)=>({category,name:`Altura ${i===0?`0–${stops[1].height}`:i===1?`${stops[1].height}–${stops[2].height}`:i===2?`${stops[2].height}–${stops[3].height}`:`>${stops[3].height}`} m`,color:String(stops[i].color).toLowerCase(),minHeightM:i===0?0:Number(stops[i].height),maxHeightM:i<3?Number(stops[i+1].height):null}));
 const byCategory=Object.fromEntries(legends.map(item=>[item.category,item]));
 fc.features=fc.features.map(feature=>{const style=byCategory[feature.properties.category];return{...feature,properties:{...feature.properties,kind:'vegetation-height-band',description:style.name,color:style.color,height_min_m:style.minHeightM,height_max_m:style.maxHeightM,vegetation_label:style.name,ocad_symbol_candidate:null,map_symbol:null,review_required:true,auto_accept:false}}});
 fc.name='Ocarto · polígonos de altura de vegetación';fc.properties={...fc.properties,heightStops:stops.map(s=>({height:Number(s.height),color:String(s.color).toLowerCase()})),legend:legends,warning:'Clases vectoriales por altura de copa sobre suelo local. Los colores siguen la paleta configurable del PNG y son una propuesta cartográfica; revisar la asignación a símbolos del mapa OCAD de destino.'};
 return fc;
}
function minimumsFromMarked(features,current={}){if(!Array.isArray(features))return null;const kept=features.filter(f=>f?.filtering?.decision==='keep'&&Number.isFinite(f.area)&&f.area>=0&&Number.isFinite(f.width)&&f.width>=0),removed=features.filter(f=>f?.filtering?.decision==='remove'&&Number.isFinite(f.area)&&f.area>=0&&Number.isFinite(f.width)&&f.width>=0);if(!kept.length)return null;const fit=(axis,fallback)=>{const k=kept.map(f=>f[axis]),minKeep=Math.min(...k);if(!removed.length)return{value:minKeep,method:'minimum_kept'};const maxRemove=Math.max(...removed.map(f=>f[axis]));return maxRemove<minKeep?{value:(maxRemove+minKeep)/2,method:'separated'}:{value:Number.isFinite(Number(fallback))?Number(fallback):minKeep,method:'overlap'}};const a=fit('area',current.area),w=fit('width',current.width);return{area:a.value,width:w.value,countKeep:kept.length,countRemove:removed.length,areaMethod:a.method,widthMethod:w.method}}
return {classify,vectorize,vectorizeHeightClasses,minimumsFromMarked};
});

;

/* vegetation-fruit-detection.js */
/* Ocarto v79: vectorize the learned frutales label without assuming tree spacing. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoFruitDetection=api})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
function inside(point,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
// This is evidence for review only. It never decides whether an area is orchard.
function rowEvidence(rows,ring,labeler){const points=rows.filter(r=>labeler(r)==='frutales'&&Number.isFinite(r.x)&&Number.isFinite(r.y)&&inside([r.x,r.y],ring)).map(r=>[r.x,r.y]);if(points.length<4)return{evidence:'insuficiente',points:points.length,orientation:null};const bins=18,counts=Array(bins).fill(0);for(let i=0;i<points.length;i++){const nearest=[];for(let j=0;j<points.length;j++){if(i===j)continue;const dx=points[j][0]-points[i][0],dy=points[j][1]-points[i][1],d=Math.hypot(dx,dy);if(d>0)nearest.push({dx,dy,d})}nearest.sort((a,b)=>a.d-b.d);for(const q of nearest.slice(0,3)){let angle=Math.atan2(q.dy,q.dx);if(angle<0)angle+=Math.PI;if(angle>=Math.PI)angle-=Math.PI;counts[Math.min(bins-1,Math.floor(angle/Math.PI*bins))]++}}const total=counts.reduce((a,b)=>a+b,0),best=Math.max(...counts),index=counts.indexOf(best),ratio=total?best/total:0,orientation=+(index+.5)*180/bins;return{evidence:ratio>=.5?'alineacion-marcada':ratio>=.36?'alineacion-posible':'sin-alineacion-clara',points:points.length,orientation,ratio:+ratio.toFixed(3)}}
function detect(rows,cell,labeler,opts={}){
 if(typeof labeler!=='function')throw Error('Etiqueta ejemplos de frutales y aprende un modelo antes de detectar');
 const V=root.OcartoVegetationVector||(typeof require==='function'?require('./vectorize-vegetation.js'):null);if(!V?.vectorize)throw Error('No está disponible el vectorizador de áreas');
 const result=V.vectorize(rows,cell,{minArea:opts.minArea??0,minWidth:opts.minWidth??0,overrides:opts.overrides,maxFeatures:opts.maxFeatures??10000,labeler:r=>labeler(r)==='frutales'?'frutales':null});
 result.name='Ocarto · áreas candidatas de frutales aprendidas · revisar';result.features=result.features.filter(f=>f.properties.category==='frutales').map(f=>{const e=rowEvidence(rows,f.geometry.coordinates[0],labeler);return{...f,properties:{...f.properties,kind:'area-candidata-frutales-lidar',fruit_detection:'modelo aprendido con ejemplos del usuario',row_pattern_evidence:e.evidence,row_pattern_points:e.points,row_orientation_degrees:e.orientation,row_alignment_ratio:e.ratio??null,review_required:true,auto_accept:false}}});
 result.properties={...result.properties,fruitDetection:{method:'clasificación por ejemplos LiDAR etiquetados como frutales; la alineación de copas se informa solo como pista de revisión',treeSpacingUsed:false,rowPatternUsedForDecision:false,areaThresholdM2:opts.minArea??0,widthThresholdM:opts.minWidth??0},warning:'Áreas candidatas según el modelo local. Revisar con ortofoto y cartografía; el LiDAR no confirma por sí solo la especie.'};
 return result;
}
return{detect};
});

;

/* road-align.js */
/* Ocarto v24: opt-in, orthophoto-guided adjustment of an existing path.
 * Cost-based preliminary proposal. It does NOT identify roads from scratch and
 * may confuse bare ground with roads. Never mutates the seed path.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoRoadAlign=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function inverse(x,y,g){const det=g.a*g.e-g.b*g.d;if(!Number.isFinite(det)||Math.abs(det)<1e-15)throw Error('Transformación ortofoto no invertible');const dx=x-g.c,dy=y-g.f;return [(dx*g.e-dy*g.b)/det,(dy*g.a-dx*g.d)/det]}
function rgbAt(x,y,img,g){const [u,v]=inverse(x,y,g);const i=Math.floor(u),j=Math.floor(v);if(i<0||j<0||i>=img.width||j>=img.height)return null;const k=(j*img.width+i)*4;if(img.data[k+3]<200)return null;return [img.data[k],img.data[k+1],img.data[k+2]]}
function pathDistance(p,q){return Math.hypot(p[0]-q[0],p[1]-q[1])}
function resample(points,step,maxSamples){let out=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=pathDistance(a,b);if(length<1e-8)continue;const n=Math.max(1,Math.ceil(length/step));for(let j=1;j<=n;j++)out.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);if(out.length>maxSamples)throw Error('El camino es demasiado largo para una única corrección; divídelo en tramos');}return out}
function align(line,img,g,options={}){
 if(!Array.isArray(line)||line.length<2||line.length>10000||line.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))throw Error('Línea de camino inválida');
 if(!img||!Number.isInteger(img.width)||!Number.isInteger(img.height)||img.data?.length!==img.width*img.height*4||img.width*img.height>12000000)throw Error('Ortofoto inválida o demasiado grande');
 if(!g||![g.a,g.b,g.c,g.d,g.e,g.f].every(Number.isFinite))throw Error('Faltan coordenadas de ortofoto');
 const reference=options.referenceRGB||[205,190,155],shift=Number(options.maxShift??5),step=Number(options.sampleStep??2),weight=Number(options.smoothness??.28);
 if(reference.length!==3||reference.some(v=>!Number.isFinite(v)||v<0||v>255)||!Number.isFinite(shift)||shift<.5||shift>20||!Number.isFinite(step)||step<.5||step>10||!Number.isFinite(weight)||weight<0||weight>3)throw Error('Parámetros de seguimiento inválidos');
 const path=resample(line,step,1500);if(path.length<3)throw Error('El trazado necesita al menos 3 puntos de muestreo');
 const pix=Math.max(.35,Math.min(2,Math.hypot(g.a,g.d),Math.hypot(g.b,g.e)));
 const offStep=Math.max(.5,Math.min(1.5,pix)),n=Math.floor(shift/offStep),offsets=Array.from({length:n*2+1},(_,i)=>(i-n)*offStep);
 const normals=path.map((p,i)=>{const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return[-dy/l,dx/l]});
 function candidate(i,j){const p=path[i],normal=normals[i],d=offsets[j],x=p[0]+normal[0]*d,y=p[1]+normal[1]*d,rgb=rgbAt(x,y,img,g);if(!rgb)return {point:[x,y],cost:1e5,observed:false};const score=Math.sqrt(rgb.reduce((s,v,k)=>s+(v-reference[k])**2,0))/Math.sqrt(3)/255;return{point:[x,y],cost:score+Math.abs(d)/Math.max(1,shift)*.11,rawScore:score,observed:true}}
 const states=path.map((_,i)=>offsets.map((__,j)=>candidate(i,j))),dp=[],prev=[];
 for(let i=0;i<path.length;i++){
  const row=[],links=[];
  for(let j=0;j<offsets.length;j++){
   const terminal=i===0||i===path.length-1;
   if(terminal&&j!==n){row.push(Infinity);links.push(-1);continue}
   if(i===0){row.push(states[i][j].cost);links.push(-1);continue}
   let best=Infinity,bestK=-1;for(let k=0;k<offsets.length;k++){if(Math.abs(offsets[j]-offsets[k])>2*offStep+.01)continue;const c=dp[i-1][k]+weight*Math.pow((offsets[j]-offsets[k])/Math.max(.5,offStep),2)*.03;if(c<best){best=c;bestK=k}}
   row.push(best+states[i][j].cost);links.push(bestK);
  }dp.push(row);prev.push(links)
 }
 let idx=n,aligned=new Array(path.length),total=0,covered=0,offsetSum=0;for(let i=path.length-1;i>=0;i--){const state=states[i][idx];aligned[i]=state.point;if(state.observed)covered++;total+=state.rawScore||0;offsetSum+=Math.abs(offsets[idx]);idx=prev[i][idx];if(i>0&&idx<0)throw Error('No hay continuidad válida del camino')}
 const baseline=path.reduce((sum,p)=>{const rgb=rgbAt(p[0],p[1],img,g);return sum+(rgb?Math.sqrt(rgb.reduce((s,v,k)=>s+(v-reference[k])**2,0))/Math.sqrt(3)/255:1)},0);
 const gain=(baseline-total)/path.length,coverage=covered/path.length;
 return{type:'Feature',properties:{kind:'correccion-camino-ortofoto-propuesta',method:'color-de-referencia-y-continuidad',gain_score:+gain.toFixed(4),valid_sample_fraction:+coverage.toFixed(3),mean_lateral_shift_m:+(offsetSum/path.length).toFixed(2),reference_rgb:reference,maximum_shift_m:shift,confidence:coverage>=.95&&gain>.04?'revisar-visualmente':'insuficiente',review_required:true,apply_automatically:false,warning:'Seguimiento experimental guiado por un camino inicial y color elegido. No demuestra que sea el camino real; revisar con ortofoto y LiDAR.'},geometry:{type:'LineString',coordinates:aligned.map(p=>p.map(v=>+v.toFixed(3)))}};
}
return {align,inverse};
});

;

/* vegetation-learning.js */
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
 return{predict:predictor(samples,sigma,thresholds),counts:{...data.counts},labels:Object.keys(thresholds),conflicts:data.conflicts,conflictPairs:Array.isArray(data.conflictPairs)?data.conflictPairs.map(p=>({...p})):[],prototypes:samples.length,featureNames:[...featureNames],warning:'Modelo local por ejemplos, no garantiza correspondencia con transitabilidad; revisar todas las predicciones.',toJSON:()=>JSON.parse(JSON.stringify(data))};
}
function fromJSON(data){
 if(!data||typeof data!=='object'||data.format!=='ocarto-vegetation-model'||data.version!==1||!Array.isArray(data.featureNames)||data.featureNames.length!==featureNames.length||data.featureNames.some((name,i)=>name!==featureNames[i])||!Array.isArray(data.samples)||data.samples.length<3||data.samples.length>12000||!Array.isArray(data.sigma)||data.sigma.length!==featureNames.length||!data.sigma.every(v=>Number.isFinite(v)&&v>0&&v<=10000)||!data.thresholds||typeof data.thresholds!=='object'||Array.isArray(data.thresholds)||!data.counts||typeof data.counts!=='object'||Array.isArray(data.counts))throw Error('Archivo de modelo Ocarto inválido o incompatible');
 const samples=data.samples.map(s=>{if(!s||!labels.includes(s.label)||!Array.isArray(s.fp)||s.fp.length!==featureNames.length||!s.fp.every(Number.isFinite))throw Error('Muestra del modelo inválida');return{label:s.label,fp:s.fp}});
 const thresholds={};for(const label of Object.keys(data.thresholds)){const n=data.thresholds[label];if(!labels.includes(label)||!Number.isFinite(n)||n<=0||n>5)throw Error('Umbral del modelo inválido');thresholds[label]=n}
 if(!Object.keys(thresholds).length||samples.some(s=>!Object.hasOwn(thresholds,s.label))||Object.keys(thresholds).some(label=>samples.filter(s=>s.label===label).length<3))throw Error('El modelo no tiene muestras suficientes por etiqueta');
 const counts={};for(const label of Object.keys(data.counts)){const n=data.counts[label];if(!labels.includes(label)||!Number.isInteger(n)||n<0||n>500000)throw Error('Recuento del modelo inválido');counts[label]=n}
 const conflicts=Number(data.conflicts||0);if(!Number.isInteger(conflicts)||conflicts<0||conflicts>500000)throw Error('Conflictos del modelo inválidos');
 let conflictPairs;
 if(data.conflictPairs!==undefined){if(!Array.isArray(data.conflictPairs)||data.conflictPairs.length>28)throw Error('Parejas de conflictos del modelo inválidas');const seenPairs=new Set();conflictPairs=data.conflictPairs.map(pair=>{if(!pair||!Array.isArray(pair.labels)||pair.labels.length!==2||pair.labels.some(label=>!labels.includes(label))||pair.labels[0]===pair.labels[1]||!Number.isInteger(pair.cells)||pair.cells<1||pair.cells>conflicts)throw Error('Pareja de conflictos del modelo inválida');const pairLabels=[...pair.labels].sort(),key=pairLabels.join('|');if(seenPairs.has(key))throw Error('Pareja de conflictos duplicada en el modelo');seenPairs.add(key);return{labels:pairLabels,cells:pair.cells}});if(conflictPairs.reduce((sum,pair)=>sum+pair.cells,0)<conflicts)throw Error('El desglose de conflictos no cubre el total indicado')}
 return makeModel({format:'ocarto-vegetation-model',version:1,featureNames:[...featureNames],sigma:[...data.sigma],thresholds,samples,counts,conflicts,...(conflictPairs?{conflictPairs}: {})});
}
function train(rows,polygons,options={}){
 if(!Array.isArray(rows)||!Array.isArray(polygons)||rows.length>1000000||polygons.length>20000)throw Error('Datos de entrenamiento inválidos');
 const perLabelMax=Number(options.maxPerLabel??280);if(!Number.isInteger(perLabelMax)||perLabelMax<10||perLabelMax>2000)throw Error('Límite de muestras inválido');
 const byLabel=new Map(),counts=new Map(),conflicts=new Set(),conflictPairs=new Map(),selected=new Map(),validRows=[];let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
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
  for(let bx=bx0;bx<=bx1;bx++)for(let by=by0;by<=by1;by++)for(const i of bins.get(bx+','+by)||[]){const r=rows[i];if(r.x<x0||r.x>x1||r.y<y0||r.y>y1||!inPolygon(r.x,r.y,rings))continue;const fp=fingerprint(r);if(!fp)continue;const prev=selected.get(i);if(prev&&prev.label!==label){conflicts.add(i);const pair=[prev.label,label].sort().join('|');let cells=conflictPairs.get(pair);if(!cells)conflictPairs.set(pair,cells=new Set());cells.add(i);continue}selected.set(i,{label,fp});}
 }
 for(const [i,s] of selected){if(conflicts.has(i))continue;counts.set(s.label,(counts.get(s.label)||0)+1);if(!byLabel.has(s.label))byLabel.set(s.label,[]);byLabel.get(s.label).push(s.fp)}
 if([...counts.values()].reduce((a,b)=>a+b,0)<5)throw Error('Muestras insuficientes: dibuja áreas sobre celdas LiDAR con datos de suelo y vegetación');
 const samples=[];for(const [label,arr] of byLabel){if(arr.length<3)continue;const step=Math.max(1,Math.ceil(arr.length/perLabelMax));for(let i=0;i<arr.length;i+=step)samples.push({label,fp:arr[i]})}
 if(!samples.length)throw Error('Mínimo 3 celdas LiDAR por tipo de vegetación');
 // Standardization from annotated cells only, with floors to protect sparse examples.
 const dims=6,avg=Array.from({length:dims},(_,d)=>samples.reduce((sum,s)=>sum+s.fp[d],0)/samples.length),sigma=avg.map((v,d)=>Math.max([.35,.35,.14,.13,.13,.13][d],Math.sqrt(samples.reduce((sum,s)=>sum+(s.fp[d]-v)**2,0)/samples.length)));
 const distance=(a,b)=>Math.sqrt(a.reduce((sum,v,i)=>sum+((v-b[i])/sigma[i])**2,0)/dims);
 const thresholds={};for(const [label,arr] of byLabel){if(arr.length<3)continue;const chosen=samples.filter(s=>s.label===label);const radii=chosen.map(s=>{let nearest=Infinity;for(const t of chosen){if(s===t)continue;nearest=Math.min(nearest,distance(s.fp,t.fp))}return nearest}).sort((a,b)=>a-b);thresholds[label]=Math.max(.6,Math.min(1.8,radii[Math.floor(radii.length*.90)]*2.5||.6))}
 const conflictPairList=[...conflictPairs].map(([pair,cells])=>({labels:pair.split('|'),cells:cells.size})).sort((a,b)=>b.cells-a.cells||a.labels.join('|').localeCompare(b.labels.join('|')));
 const modelData={format:'ocarto-vegetation-model',version:1,featureNames:[...featureNames],sigma,thresholds,samples,counts:Object.fromEntries(counts),conflicts:conflicts.size,conflictPairs:conflictPairList};
 const model=makeModel(modelData);
 return model;
}
function missingLabels(model,polygons){const trained=new Set(Array.isArray(model?.labels)?model.labels:[]);return[...new Set((Array.isArray(polygons)?polygons:[]).map(p=>String(p?.label||'').toLowerCase()).filter(label=>labels.includes(label)))].filter(label=>!trained.has(label))}
return {train,fromJSON,labels,fingerprint,inPolygon,missingLabels};
});

;

/* vegetation-image-learning.js */
/* Local exemplar matching for georeferenced orthophoto samples. Experimental; never emits unreviewed map objects. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoVegetationImageLearn=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const labels=['blanco','verde1','verde2','verde3','amarillo','matorral','frutales','rayado'];
const names=['ortho-r','ortho-g','ortho-b','ortho-texture'];
function fingerprint(row){const a=[row?.ortho_r,row?.ortho_g,row?.ortho_b,row?.ortho_texture].map(Number);return a.every(Number.isFinite)?[a[0]/255,a[1]/255,a[2]/255,a[3]/255]:null}
function train(rows,polygons,{templateId=null,maxPerLabel=500}={}){
 if(!Array.isArray(rows)||!Array.isArray(polygons)||rows.length>500000||polygons.length>200)throw Error('Datos de ortofoto inválidos');
 const selected=new Map();for(const p of polygons){const label=String(p.label||'').toLowerCase();if(!labels.includes(label)||!Array.isArray(p.coordinates)||!p.coordinates.length)continue;for(const r of rows){if(!Number.isFinite(r?.x)||!Number.isFinite(r?.y)||!inside(r.x,r.y,p.coordinates))continue;const fp=fingerprint(r);if(fp){if(!selected.has(label))selected.set(label,[]);selected.get(label).push(fp)}}}
 const prototypes=[],counts={};for(const [label,arr] of selected){counts[label]=arr.length;if(arr.length<3)continue;const step=Math.max(1,Math.ceil(arr.length/maxPerLabel));for(let i=0;i<arr.length;i+=step)prototypes.push({label,fp:arr[i]})}
 if(prototypes.length<3)throw Error('La ortofoto no aporta muestras suficientes dentro de las áreas guía; comprueba que la imagen esté georreferenciada y coincida con el LiDAR');
 return make({format:'ocarto-vegetation-image-model',version:1,featureNames:names,templateId,prototypes,counts});
}
function inside(x,y,rings){const hit=ring=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes}return yes};return hit(rings[0])&&!rings.slice(1).some(hit)}
function make(data){const samples=data.prototypes,sigma=[.12,.12,.12,.08];const predict=row=>{const fp=fingerprint(row);if(!fp)return null;const d=s=>Math.sqrt(fp.reduce((sum,v,i)=>sum+((v-s.fp[i])/sigma[i])**2,0)/4),best=new Map();for(const s of samples){const q=d(s),old=best.get(s.label);if(old===undefined||q<old)best.set(s.label,q)}const sorted=[...best].sort((a,b)=>a[1]-b[1]);if(!sorted.length||sorted[0][1]>.9||sorted[1]&&sorted[0][1]>.78*sorted[1][1])return null;return sorted[0][0]};return{predict,labels:Object.keys(data.counts).filter(k=>data.counts[k]>=3),counts:{...data.counts},prototypes:samples.length,templateId:data.templateId,featureNames:[...names],toJSON:()=>JSON.parse(JSON.stringify(data))}}
function fromJSON(data){if(!data||data.format!=='ocarto-vegetation-image-model'||data.version!==1||!Array.isArray(data.featureNames)||data.featureNames.join('|')!==names.join('|')||!Array.isArray(data.prototypes)||data.prototypes.length<3||data.prototypes.length>6000||!data.counts||typeof data.counts!=='object'||Array.isArray(data.counts)||data.templateId!==null&&typeof data.templateId!=='string')throw Error('Modelo de ortofoto inválido o incompatible');const ps=data.prototypes.map(p=>{if(!p||!labels.includes(p.label)||!Array.isArray(p.fp)||p.fp.length!==4||!p.fp.every(Number.isFinite)||p.fp.some(v=>v<0||v>1))throw Error('Muestra de ortofoto inválida');return{label:p.label,fp:[...p.fp]}});const counts={};for(const [k,v] of Object.entries(data.counts)){if(!labels.includes(k)||!Number.isInteger(v)||v<0||v>500000)throw Error('Recuento de ortofoto inválido');counts[k]=v}return make({...data,prototypes:ps,counts})}
return{train,fromJSON,fingerprint};
});

;

/* vegetation-symbol-guides.js */
/* Use known area symbols on the editable map/reference layers as labelled LiDAR examples. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoVegetationSymbolGuides=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const CODE_LABEL=Object.freeze({'401':'amarillo','403':'amarillo','405':'blanco','406':'verde1','407':'rayado','408':'verde2','409':'rayado','410':'verde3','411':'verde3','413':'frutales','414':'amarillo'});
function codeFor(feature,catalog=[],symbolSpecs=null,mapType='forest'){
 const id=String(feature?.symbol||''),entry=catalog.find(x=>x.id===id),raw=entry?(symbolSpecs?.symbolStyle?.(id,mapType)?.code??entry.code):feature?.symbolCode??feature?.symbol_code??feature?.ocad_symbol_candidate;
 if(raw==null)return null;const match=String(raw).trim().match(/^(\d{3})(?:\.\d+)?$/);return match?match[1]:null;
}
function collect(features,{catalog=[],symbolSpecs=null,mapType='forest',worldRing,includeFeature}={}){
 if(!Array.isArray(features)||features.length>200000)throw Error('Elementos del mapa inválidos para inspección');if(typeof worldRing!=='function')throw Error('Falta transformación de coordenadas para usar símbolos guía');
 const polygons=[],symbolCounts={},labelCounts={},skipped=0;
 for(const f of features){if(includeFeature&&!includeFeature(f))continue;if(f?.type!=='area'||!Array.isArray(f.points)||f.points.length<3)continue;const label=String(f.aiVegetationLabel||CODE_LABEL[codeFor(f,catalog,symbolSpecs,mapType)]||'');if(!label){continue}let outer=worldRing(f.points);if(!Array.isArray(outer)||outer.length<3||!outer.every(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite))){skipped++;continue}const holes=(f.holes||[]).map(worldRing);if(holes.some(r=>!Array.isArray(r)||r.length<3||!r.every(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite)))){skipped++;continue}polygons.push({label,coordinates:[outer,...holes]});labelCounts[label]=(labelCounts[label]||0)+1;const code=codeFor(f,catalog,symbolSpecs,mapType);if(code)symbolCounts[code]=(symbolCounts[code]||0)+1;
 }
 return{polygons,symbolCounts,labelCounts,matchedFeatures:polygons.length,skipped};
}
return{CODE_LABEL,codeFor,collect};
});

;

/* vegetation-exports.js */
/* Ocarto v55: ISOM-oriented vegetation proposals and class palette raster. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoVegetationExports=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const STYLE={blanco:{name:'Bosque blanco / terreno abierto',color:'#ffffff',symbol:'405*'},verde1:{name:'Verde 1 · vegetación lenta',color:'#b7d7a8',symbol:'406*'},verde2:{name:'Verde 2 · vegetación caminable',color:'#7fb069',symbol:'408*'},verde3:{name:'Verde 3 · vegetación impenetrable',color:'#3f7d3a',symbol:'410*'},amarillo:{name:'Terreno abierto / posible cultivo',color:'#f2dc72',symbol:'401*'},matorral:{name:'Matorral / sotobosque (clase aprendida)',color:'#90b87c',symbol:null,layer:'VEG_MATORRAL_REVISAR'},frutales:{name:'Frutales · clase aprendida, revisar',color:'#b78b53',symbol:null,layer:'VEG_FRUTALES_REVISAR'},rayado:{name:'Vegetación baja rayada · clase aprendida, revisar',color:'#a9d6aa',symbol:null,layer:'VEG_RAYADO_REVISAR'},open:{name:'Cobertura abierta · clase LiDAR provisional',color:'#f2dc72',symbol:null,layer:'LIDAR_OPEN'},low:{name:'Vegetación baja · clase LiDAR provisional',color:'#b7d7a8',symbol:null,layer:'LIDAR_LOW'},sparse:{name:'Arbolado disperso · clase LiDAR provisional',color:'#7fb069',symbol:null,layer:'LIDAR_SPARSE'},dense:{name:'Cobertura arbórea densa · clase LiDAR provisional',color:'#3f7d3a',symbol:null,layer:'LIDAR_DENSE'},clear_open:{name:'Claro potencial · amarillo, revisar',color:'#f2dc72',symbol:null,layer:'ISOM_401_AMARILLO'},tall_forest:{name:'Arbolado alto · candidato a bosque blanco, revisar',color:'#ffffff',symbol:null,layer:'ISOM_405_BLANCO'},uncertain:{name:'Vegetación dudosa · necesita clasificación manual',color:'#888888',symbol:null,layer:'LIDAR_DUDOSO'}};
// Colours for the LiDAR interpretation raster. They are not ISOM fill colours.
const EVIDENCE_COLORS={rayado:'#d38b4c',verde3:'#c84b43'};
function rgb(hex){return[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
function symbolFor(label,mapType='forest'){const style=STYLE[label];if(!style)return null;if(String(mapType).startsWith('mtbo'))return({blanco:'405*',verde1:'406*',amarillo:'401*',clear_open:'401*',tall_forest:'405*',frutales:'413*',rayado:'407*'})[label]||null;return({frutales:'413*',rayado:'407*',clear_open:'401*',tall_forest:'405*'})[label]||style.symbol}
function classRaster(rows,cell,opts={}){
 if(!Array.isArray(rows)||!rows.length||!Number.isFinite(cell)||cell<=0)throw Error('Rejilla o tamaño de celda inválido');
 const classifier=typeof opts.labeler==='function'?opts.labeler:r=>r?.training_label||null,cells=new Map();let minI=Infinity,maxI=-Infinity,minJ=Infinity,maxJ=-Infinity;
 for(const r of rows){if(!Number.isFinite(r.x)||!Number.isFinite(r.y))throw Error('Coordenadas de vegetación inválidas');const i=Math.round(r.x/cell-.5),j=Math.round(r.y/cell-.5),k=i+','+j;if(Math.abs((i+.5)*cell-r.x)>cell*1e-5||Math.abs((j+.5)*cell-r.y)>cell*1e-5||cells.has(k))throw Error('Celdas incompatibles o duplicadas');const label=classifier(r);if(label!==null&&!Object.hasOwn(STYLE,label))throw Error('Clase de vegetación desconocida');cells.set(k,label);minI=Math.min(minI,i);maxI=Math.max(maxI,i);minJ=Math.min(minJ,j);maxJ=Math.max(maxJ,j)}
 const width=maxI-minI+1,height=maxJ-minJ+1;if(width*height>(opts.maxPixels||12000000))throw Error('Imagen de vegetación demasiado grande; aumenta el tamaño de celda');const rgba=new Uint8ClampedArray(width*height*4),evidence=opts.palette==='lidar-evidence',styles=evidence?Object.fromEntries(Object.entries(STYLE).map(([key,value])=>[key,{...value,color:EVIDENCE_COLORS[key]||value.color}])):STYLE;
 for(const[k,label]of cells){if(!label)continue;const[i,j]=k.split(',').map(Number),row=maxJ-j,index=(row*width+i-minI)*4,c=rgb(styles[label].color);rgba.set([...c,255],index)}
 const left=minI*cell,top=(maxJ+1)*cell;return{width,height,rgba,cell,bounds:{left,bottom:minJ*cell,right:(maxI+1)*cell,top},worldFile:[cell,0,0,-cell,left+cell/2,top-cell/2].join('\n')+'\n',styles,palette:evidence?'lidar-evidence':'map-proposal'};
}
function assignOcadSymbols(fc,{mapType='forest'}={}){if(!fc||fc.type!=='FeatureCollection'||!Array.isArray(fc.features))throw Error('Capa vectorial inválida');const spec=String(mapType).startsWith('mtbo')?'ISMTBOM 2022':mapType==='sprint'?'ISSprOM 2019-2':'ISOM 2017-2',features=fc.features.map(f=>{const label=f?.properties?.category;if(!Object.hasOwn(STYLE,label))return f;const s=STYLE[label],symbol=symbolFor(label,mapType);return{...f,properties:{...f.properties,vegetation_label:s.name,ocad_symbol_candidate:symbol,symbol_assignment:`propuesta ${spec}; verificar transitabilidad y biblioteca OCAD`,map_symbol:symbol,review_required:true,auto_accept:false}}});return{...fc,name:`Ocarto - vegetación orientada a ${spec} (propuestas)`,properties:{...fc.properties,symbol_scheme:`${spec}; códigos candidatos`,symbol_assignment:'candidata; requiere confirmar transitabilidad y que el número exista en la biblioteca OCAD activa',legend:Object.fromEntries(Object.entries(STYLE).map(([k,v])=>[k,{name:v.name,color:v.color,candidateSymbol:symbolFor(k,mapType)}]))},features}}
function toOmapCollection(fc){if(!fc||fc.type!=='FeatureCollection'||!Array.isArray(fc.features))throw Error('Capa vectorial inválida');let omittedHoles=0;const features=[];for(const f of fc.features){const p=f?.properties||{},style=STYLE[p.category];if(!style||f?.geometry?.type!=='Polygon'||!Array.isArray(f.geometry.coordinates)||!f.geometry.coordinates.length)continue;if(f.geometry.coordinates.length>1){omittedHoles++;continue}const candidate=p.ocad_symbol_candidate||p.map_symbol||symbolFor(p.category)||style.layer||p.category;features.push({...f,properties:{...p,symbol:String(candidate),symbol_name:p.vegetation_label||style.name,color:style.color}})}return{collection:{type:'FeatureCollection',metadata:fc.metadata||{},features},omittedHoles}}
function vectorToDxf(fc,options={}){if(!fc||fc.type!=='FeatureCollection')throw Error('Capa vectorial inválida');const overrides=options.layerSymbols||{};for(const[layer,value]of Object.entries(overrides)){if(value===''||value==null)continue;const text=String(value).trim();if(!/^(?:-1|\d{1,4}(?:\.\d{1,3})?)$/.test(text)||Number(text)<-1)throw Error(`Símbolo OCAD no válido para ${layer}: ${text}`)}const out=['0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','ENTITIES'];const layers={},crt=[];let included=0,skippedHoles=0;
 for(const f of fc.features){const p=f?.properties,style=STYLE[p?.category],rings=f?.geometry?.type==='Polygon'?f.geometry.coordinates:null;if(!style||!Array.isArray(rings)||!rings.length)continue;if(rings.length>1){skippedHoles++;continue}const ring=rings[0];if(!Array.isArray(ring)||ring.length<4||!ring.every(x=>Array.isArray(x)&&x.length>=2&&Number.isFinite(x[0])&&Number.isFinite(x[1])))continue;const candidate=symbolFor(p.category,options.mapType||'forest')?.replace('*',''),layer=style.layer||`ISOM_${String(candidate||'').replace('.','_')}_${p.category.toUpperCase()}`.slice(0,31),override=overrides[layer],code=override!==undefined&&override!==null&&String(override).trim()!==''?Number(override):candidate?Number(candidate):null;if(layers[layer]!==undefined&&layers[layer]!==code)throw Error(`La capa ${layer} tiene más de un símbolo OCAD asignado`);layers[layer]=code;out.push('0','LWPOLYLINE','8',layer,'90',String(ring.length-1),'70','1');for(const xy of ring.slice(0,-1))out.push('10',String(xy[0]),'20',String(xy[1]),'30','0');included++}
 for(const[layer,code]of Object.entries(layers))if(code!==null)crt.push(`${Number(code).toFixed(3)} ${layer}`);out.push('0','ENDSEC','0','EOF');if(!included)throw Error('No hay polígonos vectoriales compatibles con las capas de vegetación');return{content:out.join('\r\n')+'\r\n',crt:crt.length?crt.join('\r\n')+'\r\n':'',included,skippedHoles,layers:Object.keys(layers),symbolCandidates:Object.fromEntries(Object.entries(layers).filter(([,code])=>code!==null))}}
return{STYLE,classRaster,assignOcadSymbols,toOmapCollection,vectorToDxf};
});

;

/* vegetation-map.js */
/* Ocarto v69: convert review-only vegetation GeoJSON areas into editable map features. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoVegetationMap=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function toMapAreas(fc,options={}){
 if(!fc||fc.type!=='FeatureCollection'||!Array.isArray(fc.features)||fc.features.length>3000)throw Error('Colección de áreas LiDAR inválida o demasiado grande');
 if(typeof options.transform!=='function')throw Error('Falta la transformación de coordenadas del mapa');
 const styles=options.styles||{},batch=String(options.batchId??Date.now()),symbol=options.symbol||'vegetation',layers=[],layerByCategory=new Map(),features=[];
 const convertRing=(ring)=>{
  if(!Array.isArray(ring))return null;let source=ring;
  if(source.length>1){const a=source[0],b=source.at(-1);if(Array.isArray(a)&&Array.isArray(b)&&a[0]===b[0]&&a[1]===b[1])source=source.slice(0,-1)}
  if(source.length<3)return null;
  const points=source.map(p=>{if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))return null;const q=options.transform(p[0],p[1]);return q&&Number.isFinite(q.x)&&Number.isFinite(q.y)?{x:q.x,y:q.y,...(Number.isFinite(q.rawX)&&Number.isFinite(q.rawY)?{rawX:q.rawX,rawY:q.rawY}:{})}:null});
  return points.some(p=>!p)?null:points;
 };
 for(const f of fc.features){
  if(f?.geometry?.type!=='Polygon'||!Array.isArray(f.geometry.coordinates)||!f.geometry.coordinates.length)continue;
  const category=String(f.properties?.category||'');if(!category)continue;const style=styles[category];if(!style)continue;
  const rings=f.geometry.coordinates.map(convertRing);if(rings.some(r=>!r)||rings[0].length<3)continue;
  let layer=layerByCategory.get(category);if(!layer){layer={id:`lidar-${batch}-${category}`,name:`LiDAR · ${style.name||category}`.slice(0,48),color:style.color==='#ffffff'?'#e7e7e7':style.color,visible:true};layers.push(layer);layerByCategory.set(category,layer)}
  features.push({x:0,y:0,type:'area',points:rings[0],...(rings.length>1?{holes:rings.slice(1)}:{}),symbol,layerId:layer.id,aiVegetationLabel:category,lidarVegetationCandidate:true,transparent:false,properties:{...f.properties,source:f.properties?.source||'LiDAR',review_required:true,auto_accept:false}});
 }
 if(!features.length)throw Error('No se pudieron convertir las áreas LiDAR al mapa');
 return{layers,features};
}
return{toMapAreas};
});

;

/* natural-curves.js */
/* Convert natural LiDAR map lines and areas to editable cubic Bezier geometry. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoNaturalCurves=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function pointList(points,closed){
 if(!Array.isArray(points)||points.length<(closed?3:2))throw Error('Geometría natural inválida');
 const clean=points.map(p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Vértice natural inválido');return {...p}});
 if(closed&&clean.length>3){const a=clean[0],b=clean.at(-1);if(a.x===b.x&&a.y===b.y)clean.pop()}
 if(clean.length<(closed?3:2))throw Error('Geometría natural inválida');
 const n=clean.length;
 let winding=0;
 if(closed)for(let i=0;i<n;i++){const a=clean[i],b=clean[(i+1)%n];winding+=a.x*b.y-b.x*a.y}
 const orientation=winding>=0?1:-1;
 for(let i=0;i<n;i++){
  const prev=closed?clean[(i+n-1)%n]:clean[Math.max(0,i-1)],next=closed?clean[(i+1)%n]:clean[Math.min(n-1,i+1)],p=clean[i];
  if(p.vertexType==='corner'){delete p.tangent;delete p.inTangent;delete p.outTangent;continue}
  // Keep sharp re-entrant bends crisp: an untagged concave corner on a closed
  // contour should not be rounded by smoothing handles.
  const ax=p.x-prev.x,ay=p.y-prev.y,bx=next.x-p.x,by=next.y-p.y;
  const al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
  const cosine=al&&bl?(ax*bx+ay*by)/(al*bl):1;
  const cross=ax*by-ay*bx;
  if(al&&bl&&cosine<-.25&&(closed?cross*orientation<0:cosine<-.7)){p.vertexType='corner';delete p.tangent;delete p.inTangent;delete p.outTangent;continue}
  let dx,dy,scale;
  if(!closed&&i===0){dx=next.x-p.x;dy=next.y-p.y;scale=1/3}
  else if(!closed&&i===n-1){dx=p.x-prev.x;dy=p.y-prev.y;scale=1/3}
  else{dx=next.x-prev.x;dy=next.y-prev.y;scale=1/6}
  let tx=dx*scale,ty=dy*scale;
  const mag=Math.hypot(tx,ty),before=Math.hypot(p.x-prev.x,p.y-prev.y),after=Math.hypot(next.x-p.x,next.y-p.y),cap=!closed&&i===0?after/3:!closed&&i===n-1?before/3:Math.min(before,after)/3;
  if(mag>cap&&mag>0){tx*=cap/mag;ty*=cap/mag}
  p.tangent={x:tx,y:ty};
 }
 return clean;
}
function isBuilding(feature,options){
 if(options.isBuilding)return true;
 const text=[feature?.candidateKind,feature?.candidateProperties?.kind,feature?.candidateProperties?.category,feature?.symbol,feature?.aiVegetationLabel].filter(Boolean).join(' ').toLowerCase();
 return /edificio|building|construcci[oó]n|ruina|ruin/.test(text);
}
function apply(feature,options={}){
 if(!feature||!['line','area'].includes(feature.type)||isBuilding(feature,options))return feature;
 const out={...feature};
 if(feature.type==='line')out.points=pointList(feature.points,false);
 else{
  out.points=pointList(feature.points,true);
  if(Array.isArray(feature.holes))out.holes=feature.holes.map(ring=>pointList(ring,true));
 }
 out.curve='bezier';
 out.naturalCurve='cubic-bezier';
 return out;
}
return {apply,pointList,isBuilding};
});

;

/* bezier-polyline.js */
/* Adaptive cubic Bezier flattening for editable map geometry. */
(function(root){
  'use strict';
  function point(p){return{x:p.x,y:p.y}}
  function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(!l2)return Math.hypot(p.x-a.x,p.y-a.y);const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
  function flattenRing(points,closed,tolerance,{maxDepth,maxPoints}){
    if(!Array.isArray(points)||points.length<(closed?3:2)||points.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('Geometría Bézier no válida');
    const first={...points[0],...point(points[0])};delete first.tangent;delete first.inTangent;delete first.outTangent;const out=[first];let count=1;
    const append=(p,metadata)=>{if(++count>maxPoints)throw Error(`La curva supera el límite de ${maxPoints} vértices; aumenta la tolerancia`);out.push({...metadata,...point(p),vertexType:metadata?.vertexType||'normal'});delete out.at(-1).tangent;delete out.at(-1).inTangent;delete out.at(-1).outTangent};
    const segment=(a,b,depth,endMeta)=>{
      const dx=b.x-a.x,dy=b.y-a.y,av=a.vertexType==='corner'?{x:dx/3,y:dy/3}:a.outTangent||a.tangent||{x:dx/3,y:dy/3},iv=b.vertexType==='corner'?{x:-dx/3,y:-dy/3}:b.inTangent||(b.tangent?{x:-b.tangent.x,y:-b.tangent.y}:{x:-dx/3,y:-dy/3}),p0=point(a),p1={x:a.x+av.x,y:a.y+av.y},p2={x:b.x+iv.x,y:b.y+iv.y},p3=point(b),flat=Math.max(distanceToSegment(p1,p0,p3),distanceToSegment(p2,p0,p3));
      if(flat<=tolerance){append(p3,endMeta);return}
      if(depth>=maxDepth)throw Error('No se alcanza la tolerancia solicitada al convertir la curva');
      const mid=(p,q)=>({x:(p.x+q.x)/2,y:(p.y+q.y)/2}),q0=mid(p0,p1),q1=mid(p1,p2),q2=mid(p2,p3),r0=mid(q0,q1),r1=mid(q1,q2),m=mid(r0,r1);
      const leftA={...a,outTangent:{x:q0.x-p0.x,y:q0.y-p0.y}},leftB={...b,inTangent:{x:r0.x-m.x,y:r0.y-m.y}},rightA={...a,outTangent:{x:r1.x-m.x,y:r1.y-m.y}},rightB={...b,inTangent:{x:q2.x-p3.x,y:q2.y-p3.y}},midpoint={...point(m),inTangent:leftB.inTangent,outTangent:rightA.outTangent,vertexType:'normal'};
      segment(leftA,midpoint,depth+1,{vertexType:'normal'});
      segment(midpoint,rightB,depth+1,endMeta);
    };
    const n=closed?points.length:points.length-1;
    for(let i=0;i<n;i++)segment(points[i],points[(i+1)%points.length],0,points[(i+1)%points.length]);
    if(closed)out.pop();
    return out;
  }
  function flattenFeature(feature,tolerance,{maxDepth=16,maxPoints=20000,maxValidatedPoints=2400,simplifyTools=root.OcartoSimplifyTools}={}){
    if(!feature||feature.curve!=='bezier')throw Error('Selecciona una geometría Bézier');
    if(!Number.isFinite(tolerance)||tolerance<=0)throw Error('Tolerancia no válida');
    if(!Number.isInteger(maxDepth)||maxDepth<1||maxDepth>24||!Number.isInteger(maxPoints)||maxPoints<3)throw Error('Límites de conversión no válidos');
    if(!Number.isInteger(maxValidatedPoints)||maxValidatedPoints<3||maxValidatedPoints>2500)throw Error('Límite topológico no válido');
    const closed=feature.type==='area',budget=tolerance/2,points=flattenRing(feature.points,closed,budget,{maxDepth,maxPoints});let remaining=maxPoints-points.length,holes=[];
    if(closed)for(const ring of feature.holes||[]){const flat=flattenRing(ring,true,budget,{maxDepth,maxPoints:remaining});remaining-=flat.length;if(remaining<0)throw Error('La curva genera demasiados vértices para convertirla');holes.push(flat)}
    let total=points.length+holes.reduce((n,r)=>n+r.length,0),result={points,holes};
    if(total>maxValidatedPoints){
      if(!simplifyTools||typeof simplifyTools.simplify!=='function')throw Error('No se puede reducir la polilínea al límite topológico disponible');
      const reduce=ring=>simplifyTools.simplify(ring,budget,{closed});
      result={points:reduce(points),holes:holes.map(reduce)};total=result.points.length+result.holes.reduce((n,r)=>n+r.length,0);
      if(total>maxValidatedPoints)throw Error(`La curva necesita ${total} vértices para respetar la tolerancia; aumenta la tolerancia para validar el máximo de ${maxValidatedPoints}`);
    }
    return result;
  }
  root.OcartoBezierPolyline={flattenFeature};if(typeof module==='object'&&module.exports)module.exports=root.OcartoBezierPolyline;
})(typeof globalThis!=='undefined'?globalThis:this);

;

/* ocad-symbols.js */
/* Read the OCAD symbol index and area-symbol descriptions for CRT validation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoOcadSymbols=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const HEADER_SIZE=60,INDEX_BLOCK_SIZE=1028,OCAD_MARK=3245,AREA_SYMBOL=3;
function asBytes(input){if(input instanceof Uint8Array)return input;if(input instanceof ArrayBuffer)return new Uint8Array(input);if(ArrayBuffer.isView(input))return new Uint8Array(input.buffer,input.byteOffset,input.byteLength);throw Error('Archivo OCAD inválido')}
function symbolCode(value){const whole=Math.trunc(value/1000),fraction=Math.abs(value%1000);return `${whole}.${String(fraction).padStart(3,'0')}`}
function readDescription(bytes,pos,size){if(size<56)return '';const available=Math.min(128,size-56),raw=bytes.subarray(pos+56,pos+56+available);if(!raw.length)return '';let oddZeros=0;for(let i=1;i<raw.length;i+=2)if(raw[i]===0)oddZeros++;let text;if(oddZeros>=Math.min(8,Math.floor(raw.length/4)))text=new TextDecoder('utf-16le').decode(raw);else text=new TextDecoder('windows-1252').decode(raw.subarray(0,Math.min(64,raw.length)));return text.replace(/\0/g,' ').replace(/\s+/g,' ').trim()}
function parseOcadSymbols(input){const bytes=asBytes(input);if(bytes.byteLength<HEADER_SIZE)throw Error('El archivo OCAD está truncado');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(view.getInt16(0,true)!==OCAD_MARK)throw Error('El archivo no tiene una cabecera OCAD válida');const version=view.getUint16(4,true);if(version!==11&&version!==12&&version!==2018)throw Error(`Formato OCAD ${version} no admitido para leer símbolos; se admiten OCAD 11, 12 y 2018`);const firstBlock=view.getUint32(8,true);if(!firstBlock)throw Error('El mapa OCAD no contiene índice de símbolos');const symbols=[],visited=new Set();let block=firstBlock;
 while(block){if(visited.has(block))throw Error('Índice OCAD circular');visited.add(block);if(visited.size>4096||block<HEADER_SIZE||block+INDEX_BLOCK_SIZE>bytes.byteLength)throw Error('Bloque de símbolos OCAD fuera de los límites del archivo');const next=view.getUint32(block,true);for(let i=0;i<256;i++){const pos=view.getInt32(block+4+i*4,true);if(pos===0)continue;if(pos<HEADER_SIZE||pos+56>bytes.byteLength)throw Error('Símbolo OCAD fuera de los límites del archivo');const size=view.getInt32(pos,true),number=view.getInt32(pos+4,true),type=view.getUint8(pos+8),status=view.getUint8(pos+11);if(size<56||pos+size>bytes.byteLength||number<=0)throw Error('Registro de símbolo OCAD inválido');if(![1,2,3,4,6,7].includes(type))continue;symbols.push({code:symbolCode(number),number,type,status,description:readDescription(bytes,pos,size)})}if(next&&next<HEADER_SIZE)throw Error('Siguiente bloque de símbolos OCAD inválido');block=next}
 const seen=new Set();const unique=symbols.filter(s=>{const k=`${s.code}:${s.type}`;if(seen.has(k))return false;seen.add(k);return true});return{version,symbols:unique,areaSymbols:unique.filter(s=>s.type===AREA_SYMBOL),symbolCount:unique.length,areaSymbolCount:unique.filter(s=>s.type===AREA_SYMBOL).length}}
return{parseOcadSymbols};
});

;

/* ocad-objects.js */
/* Conservative reader for OCAD 10 / 11 / 12 / 2018 area objects. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoOcadObjects=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const HEADER_SIZE=48,INDEX_SIZE=10244,INDEX_ENTRY_SIZE=40,MAX_BLOCKS=65536,MAX_OBJECTS=1000000,MAX_POINTS=1000000;
function bytesOf(input){if(input instanceof Uint8Array)return input;if(input instanceof ArrayBuffer)return new Uint8Array(input);if(ArrayBuffer.isView(input))return new Uint8Array(input.buffer,input.byteOffset,input.byteLength);throw Error('Archivo OCAD inválido')}
function setupFromStrings(strings){for(const entry of strings){if(entry.type!==1039)continue;const values={};for(const m of entry.text.matchAll(/(?:^|\t)([a-z])(-?\d+(?:\.\d+)?)/gi))values[m[1].toLowerCase()]=Number(m[2]);const scale=values.m,easting=values.x,northing=values.y,epsg=values.e;if(Number.isFinite(scale)&&scale>0&&Number.isFinite(easting)&&Number.isFinite(northing))return{scale,easting,northing,crs:Number.isInteger(epsg)&&epsg>0?`EPSG:${epsg}`:null,georeferenced:values.r!==0,grid:values.i??null}}
 throw Error('El OCAD no declara escala y origen (registro 1039)')}
function readMapStrings(view,bytes){const first=view.getUint32(32,true);if(!first)return[];const seen=new Set(),out=[];let block=first;while(block){if(seen.has(block)||seen.size>=4096||block<HEADER_SIZE||block+4100>bytes.length)throw Error('Índice de parámetros OCAD inválido');seen.add(block);const next=view.getUint32(block,true);for(let i=0;i<256;i++){const p=block+4+i*16,pos=view.getUint32(p,true),length=view.getInt32(p+4,true),type=view.getInt32(p+8,true);if(!pos||length<=0)continue;if(length>2*1024*1024||pos+length>bytes.length)throw Error('Cadena de parámetros OCAD fuera de límites');let raw=bytes.subarray(pos,pos+length);while(raw.length&&raw.at(-1)===0)raw=raw.subarray(0,-1);out.push({type,text:new TextDecoder('utf-8').decode(raw)})}block=next}return out}
function decodePoint(view,offset){const packedX=view.getInt32(offset,true),packedY=view.getInt32(offset+4,true);return{x:packedX>>8,y:packedY>>8,xFlags:packedX&255,yFlags:packedY&255}}
function pointToWorld(p,setup){const factor=setup.scale/100000;return[setup.easting+p.x*factor,setup.northing+p.y*factor]}
function linearizeRing(points){const out=[];let curves=0;for(let i=0;i<points.length;i++){const p=points[i];if((p.xFlags&1)!==0){const c1=p,c2=points[i+1],end=points[i+2];if(!out.length||!c2||(c2.xFlags&2)===0||!end)return null;const start=out.at(-1),steps=6;for(let k=1;k<=steps;k++){const t=k/steps,u=1-t;out.push([u*u*u*start[0]+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*end.x,u*u*u*start[1]+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*end.y])}curves++;i+=2;continue}if(p.xFlags&2)return null;out.push([p.x,p.y])}return{coordinates:out,curves}}
function ringsFromPoints(points){const rings=[[]];for(let i=0;i<points.length;i++){const p=points[i];if(i>0&&(p.yFlags&2))rings.push([]);rings.at(-1).push(p)}const valid=[];let curves=0;for(const ring of rings){const linear=linearizeRing(ring);if(!linear)return null;curves+=linear.curves;let coords=linear.coordinates;if(coords.length>1&&coords[0][0]===coords.at(-1)[0]&&coords[0][1]===coords.at(-1)[1])coords=coords.slice(0,-1);if(coords.length<3)return null;valid.push(coords)}return{rings:valid,curves}}
function parseOcadObjects(input,options={}){const bytes=bytesOf(input);if(bytes.length<HEADER_SIZE)throw Error('El archivo OCAD está truncado');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),mark=view.getInt16(0,true),version=view.getUint16(4,true);if(mark!==3245)throw Error('El archivo no tiene una cabecera OCAD válida');if(![10,11,12,2018].includes(version))throw Error(`Formato OCAD ${version} no admitido; se admiten OCAD 10, 11, 12 y 2018`);const legacy=version===10||version===11,headerSize=legacy?48:60,setup=setupFromStrings(readMapStrings(view,bytes)),first=view.getUint32(12,true);if(!first)throw Error('El OCAD no contiene índice de objetos');const objects=[],seenBlocks=new Set();let block=first,visited=0,skipped={notArea:0,deleted:0,encrypted:0,invalid:0,curves:0};while(block){if(seenBlocks.has(block)||seenBlocks.size>=MAX_BLOCKS||block<headerSize||block+INDEX_SIZE>bytes.length)throw Error('Índice de objetos OCAD fuera de límites o circular');seenBlocks.add(block);const next=view.getInt32(block,true);for(let i=0;i<256;i++){const at=block+4+i*INDEX_ENTRY_SIZE,pos=view.getInt32(at+16,true),reservedLength=view.getInt32(at+20,true),symbol=view.getInt32(at+24,true),type=view.getUint8(at+28),encrypted=view.getUint8(at+29),status=view.getUint8(at+30);if(!pos)continue;if(++visited>MAX_OBJECTS)throw Error('El OCAD supera el máximo de objetos admitido');if(status===0||status===3){skipped.deleted++;continue}if(type!==3){skipped.notArea++;continue}if(encrypted!==0){skipped.encrypted++;continue}const objectHeaderSize=legacy?40:56,countOffset=legacy?8:44,pointOffset=objectHeaderSize;if(pos<headerSize||reservedLength<3||pos+objectHeaderSize>bytes.length){skipped.invalid++;continue}const actualSymbol=view.getInt32(pos,true),objectType=view.getUint8(pos+4),count=view.getUint32(pos+countOffset,true),textCount=legacy?view.getInt16(pos+12,true):view.getUint16(pos+48,true),objectString=legacy?0:view.getUint16(pos+50,true),databaseString=legacy?0:view.getUint16(pos+52,true);if(actualSymbol!==symbol||objectType!==type||count<3||count>MAX_POINTS||count>reservedLength||pos+pointOffset+count*8>bytes.length||textCount||objectString||databaseString){skipped.invalid++;continue}const points=[];for(let j=0;j<count;j++)points.push(decodePoint(view,pos+pointOffset+j*8));const ringResult=ringsFromPoints(points);if(!ringResult){skipped.invalid++;continue}skipped.curves+=ringResult.curves;objects.push({symbolCode:`${Math.trunc(symbol/1000)}.${String(Math.abs(symbol%1000)).padStart(3,'0')}`,symbol,geometry:{type:'Polygon',coordinates:ringResult.rings.map(r=>{const coords=r.map(([x,y])=>pointToWorld({x,y},setup));coords.push([...coords[0]]);return coords})},sourceObjectIndex:visited-1})}if(next<0)throw Error('Siguiente bloque de objetos OCAD inválido');block=next}
 if(objects.length>(options.maxAreas??250000))throw Error('El OCAD contiene demasiadas áreas de referencia para este proyecto');return{version,setup,objects,objectCount:visited,areaCount:objects.length,skipped}}
return{parseOcadObjects,pointToWorld,ringsFromPoints};
});

;

/* ocad-export.js */
/* Append CART map objects to an OCAD 12/2018 template while preserving its symbols and settings. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoOcadExport=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const HEADER=60,INDEX_BLOCK=10244,INDEX_ENTRY=40,OBJECT_HEADER=56,MAX_OBJECTS=1000000,MAX_COORD=0x7fffff;
function asBytes(value){if(value instanceof Uint8Array)return value;if(value instanceof ArrayBuffer)return new Uint8Array(value);if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength);throw Error('Plantilla OCAD inválida')}
function supportedFeatures(collection,opts){if(collection?.type!=='FeatureCollection'||!Array.isArray(collection.features))throw Error('Proyecto CART sin objetos cartográficos');const out=[],skipped={unsupported:0,holes:0,noSymbol:0};for(const f of collection.features){const g=f?.geometry,p=f?.properties||{};if(!g){skipped.unsupported++;continue}const parts=g.type==='MultiPolygon'?g.coordinates.map(coordinates=>({type:'Polygon',coordinates})):g.type==='MultiLineString'?g.coordinates.map(coordinates=>({type:'LineString',coordinates})):g.type==='Polygon'||g.type==='LineString'?[g]:[];if(!parts.length){skipped.unsupported++;continue}for(const part of parts){if(part.type==='Polygon'&&part.coordinates?.length>1){skipped.holes++;continue}const kind=part.type==='Polygon'?'area':'line',candidate=opts.symbolFor?.(f,kind)??p.ocad_symbol_candidate??p.symbol_code??p.symbol;let symbol;if(typeof candidate==='number'&&Number.isInteger(candidate)&&candidate>=0&&candidate<1000)symbol=candidate*1000;else{const m=String(candidate??'').trim().match(/^(\d+)(?:\.(\d{1,3}))?$/);symbol=m?Number(m[1])*1000+Number((m[2]||'').padEnd(3,'0')):NaN}if(!Number.isSafeInteger(symbol)||symbol<=0){skipped.noSymbol++;continue}let coords=part.type==='Polygon'?part.coordinates?.[0]:part.coordinates;if(!Array.isArray(coords)){skipped.unsupported++;continue}coords=coords.filter(q=>Array.isArray(q)&&Number.isFinite(Number(q[0]))&&Number.isFinite(Number(q[1]))).map(q=>[Number(q[0]),Number(q[1])]);if(part.type==='Polygon'&&coords.length&& (coords[0][0]!==coords.at(-1)[0]||coords[0][1]!==coords.at(-1)[1]))coords.push([...coords[0]]);if(coords.length<(kind==='area'?4:2)){skipped.unsupported++;continue}out.push({kind,symbol,coords,properties:p})}}
if(out.length>MAX_OBJECTS)throw Error('El proyecto supera el millón de objetos OCAD');return{objects:out,skipped}}
function indexBlocks(view,bytes){let pos=view.getUint32(12,true),last=0;const seen=new Set(),free=[];while(pos){if(pos<HEADER||pos+INDEX_BLOCK>bytes.length||seen.has(pos)||seen.size>=65536)throw Error('Índice de objetos OCAD inválido');seen.add(pos);last=pos;const next=view.getInt32(pos,true);for(let i=0;i<256;i++){const at=pos+4+i*INDEX_ENTRY;if(view.getInt32(at+16,true)===0)free.push(at)}if(next<0)throw Error('Siguiente bloque OCAD inválido');pos=next}if(!last)throw Error('El mapa OCAD no tiene índice de objetos');return{last,free}}
function pointXY(x,y,setup){const unit=100000/setup.scale,px=Math.round((x-setup.easting)*unit),py=Math.round((y-setup.northing)*unit);if(Math.abs(px)>MAX_COORD||Math.abs(py)>MAX_COORD)throw Error('Algún objeto queda fuera del encuadre que admite OCAD; comprueba escala y georreferenciación');return[px,py]}
function writeObject(view,pos,obj,setup,indexAt){const pts=obj.coords.map(([x,y])=>pointXY(x,y,setup)),area=obj.kind==='area',xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),type=area?3:2,count=pts.length;view.setInt32(indexAt,Math.min(...xs),true);view.setInt32(indexAt+4,Math.min(...ys),true);view.setInt32(indexAt+8,Math.max(...xs),true);view.setInt32(indexAt+12,Math.max(...ys),true);view.setInt32(indexAt+16,pos,true);view.setInt32(indexAt+20,count,true);view.setInt32(indexAt+24,obj.symbol,true);view.setUint8(indexAt+28,type);view.setUint8(indexAt+29,0);view.setUint8(indexAt+30,1);view.setUint8(indexAt+31,0);view.setInt16(indexAt+32,0,true);view.setInt16(indexAt+34,0,true);view.setInt16(indexAt+36,0,true);view.setUint8(indexAt+38,0);view.setUint8(indexAt+39,0);
 view.setInt32(pos,obj.symbol,true);view.setUint8(pos+4,type);view.setUint8(pos+5,0);view.setInt16(pos+6,0,true);view.setInt32(pos+8,0,true);view.setInt16(pos+12,0,true);view.setInt16(pos+14,0,true);view.setInt32(pos+16,0,true);view.setInt32(pos+20,0,true);view.setFloat64(pos+24,0,true);view.setUint32(pos+32,0,true);view.setFloat64(pos+36,0,true);view.setUint32(pos+44,count,true);view.setUint16(pos+48,0,true);view.setUint16(pos+50,0,true);view.setUint16(pos+52,0,true);view.setUint8(pos+54,0);view.setUint8(pos+55,0);for(let i=0;i<count;i++){const [x,y]=pts[i],xFlag=0,yFlag=area?1:0;view.setInt32(pos+OBJECT_HEADER+i*8,(x<<8)|xFlag,true);view.setInt32(pos+OBJECT_HEADER+i*8+4,(y<<8)|yFlag,true)}}
function toOcad(template,collection,options={}){const source=asBytes(template);let copy=source.slice(),headerView=new DataView(copy.buffer);if(copy.length<HEADER||headerView.getInt16(0,true)!==3245)throw Error('El archivo no tiene una cabecera OCAD válida');const version=headerView.getUint16(4,true);if(version!==12&&version!==2018)throw Error('Para convertir a OCAD necesitas una plantilla OCAD 12 o 2018');const setup=options.setup||options.parseSetup?.(copy);if(!setup||!Number.isFinite(setup.scale)||setup.scale<=0||!Number.isFinite(setup.easting)||!Number.isFinite(setup.northing))throw Error('La plantilla OCAD no declara escala y coordenadas de origen válidas');const prepared=supportedFeatures(collection,options);if(!prepared.objects.length)throw Error('No hay líneas o áreas con símbolos OCAD válidos. Elige códigos de símbolo de la plantilla de destino.');const symbols=options.validSymbols;if(symbols instanceof Set)for(const obj of prepared.objects)if(!symbols.has(`${obj.symbol}:${obj.kind==='area'?3:2}`))throw Error(`El símbolo ${obj.symbol/1000} no existe con el tipo ${obj.kind==='area'?'área':'línea'} en la plantilla OCAD`);let{last,free}=indexBlocks(headerView,copy);let appendAt=copy.length;
 if(free.length<prepared.objects.length){const newBlock=appendAt;const expanded=new Uint8Array(copy.length+INDEX_BLOCK);expanded.set(copy);new DataView(expanded.buffer).setInt32(last,newBlock,true);copy=expanded;headerView=new DataView(copy.buffer);appendAt=copy.length;free=free.concat(Array.from({length:256},(_,i)=>newBlock+4+i*INDEX_ENTRY));}
 const out=new Uint8Array(appendAt+prepared.objects.reduce((n,o)=>n+OBJECT_HEADER+o.coords.length*8,0)),view=new DataView(out.buffer);out.set(copy);let pos=appendAt;for(let i=0;i<prepared.objects.length;i++){const obj=prepared.objects[i],slot=free[i];writeObject(view,pos,obj,setup,slot);pos+=OBJECT_HEADER+obj.coords.length*8}return{bytes:out,version,objects:prepared.objects.length,skipped:prepared.skipped}}
return{toOcad,supportedFeatures};
});

;