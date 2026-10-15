/* Points placed at fixed distances along an open polyline. */
(function(root){
  function cleanPath(path){
    if(!Array.isArray(path)||path.length<2||path.some(p=>!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite)))throw Error('La línea necesita al menos dos puntos válidos');
    const out=[path[0].slice(0,2)];for(const p of path.slice(1))if(Math.hypot(p[0]-out.at(-1)[0],p[1]-out.at(-1)[1])>1e-10)out.push(p.slice(0,2));
    if(out.length<2)throw Error('La línea no tiene longitud');return out;
  }
  function distributeAlongPath(path,spacing,options={}){
    if(!Number.isFinite(spacing)||spacing<=0)throw Error('La separación debe ser mayor que cero');
    const points=cleanPath(path),segments=[];let length=0;
    for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);segments.push({a,b,len,start:length});length+=len}
    const max=options.maxCount??2000,count=Math.floor((length+spacing*1e-10)/spacing);
    if(count>max)throw Error(`La línea produciría ${count} copias; el máximo es ${max}`);
    const result=[];let segmentIndex=0;
    for(let n=1;n<=count;n++){
      const d=n*spacing;while(segmentIndex<segments.length-1&&d>segments[segmentIndex].start+segments[segmentIndex].len+1e-10)segmentIndex++;
      const s=segments[segmentIndex],t=Math.max(0,Math.min(1,(d-s.start)/s.len));result.push({x:s.a[0]+(s.b[0]-s.a[0])*t,y:s.a[1]+(s.b[1]-s.a[1])*t,distance:d});
    }
    return{length,positions:result};
  }
  root.OcartoDistributeTools={distributeAlongPath};if(typeof module!=='undefined'&&module.exports)module.exports=root.OcartoDistributeTools;
})(typeof window!=='undefined'?window:globalThis);
