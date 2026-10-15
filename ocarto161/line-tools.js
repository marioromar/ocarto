/* Ocarto: edición geométrica avanzada de líneas, conservando la línea original. */
(function(root){
  function valid(line){return Array.isArray(line)&&line.length>=2&&line.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]))}
  function parallel(line,distance,side=1){
    if(!valid(line)) throw Error('Línea no válida');
    const d=Number(distance); if(!Number.isFinite(d)) throw Error('Distancia no válida');
    const out=[];
    for(let i=0;i<line.length;i++){
      const a=line[Math.max(0,i-1)], b=line[Math.min(line.length-1,i+1)];
      let dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy); if(!l) {out.push(line[i].slice());continue}
      const nx=-dy/l*side,ny=dx/l*side; out.push([line[i][0]+nx*d,line[i][1]+ny*d]);
    }
    return out;
  }
  function reverse(line){if(!valid(line))throw Error('Línea no válida');return line.slice().reverse().map(p=>p.slice())}
  function join(a,b,tolerance=1){if(!valid(a)||!valid(b))throw Error('Línea no válida');const ends=[[a.at(-1),b[0],true,false],[a[0],b.at(-1),false,true],[a[0],b[0],false,false],[a.at(-1),b.at(-1),true,true]];let best=null;for(const q of ends){const d=Math.hypot(q[0][0]-q[1][0],q[0][1]-q[1][1]);if(!best||d<best.d)best={q,d}}if(best.d>tolerance)throw Error('Los extremos están demasiado separados');const aa=best.q[2]?a.slice():a.slice().reverse(),bb=best.q[3]?b.slice().reverse():b.slice();return aa.concat(bb.slice(1))}
  function extendToNearest(line,targets,maxDistance=10){if(!valid(line)||!Array.isArray(targets))throw Error('Geometría no válida');let best=null;for(const t of targets){if(!valid(t)||t===line)continue;for(const end of [0,line.length-1])for(const i of [0,t.length-1]){const d=Math.hypot(line[end][0]-t[i][0],line[end][1]-t[i][1]);if(!best||d<best.d)best={d,end,point:t[i]}}}if(!best||best.d>maxDistance)throw Error('No hay un extremo compatible dentro de la distancia máxima');const out=line.map(p=>p.slice());out[best.end]=best.point.slice();return{line:out,distance:best.d,target:best.point.slice()}}
  root.OcartoLineTools={parallel,reverse,join,extendToNearest};
  if(typeof module!=='undefined')module.exports=root.OcartoLineTools;
})(typeof window!=='undefined'?window:globalThis);
