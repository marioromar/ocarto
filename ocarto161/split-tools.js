(function(root){
  function split(path,index){
    if(!Array.isArray(path)||path.length<3||index<=0||index>=path.length-1)throw Error('El punto de corte debe estar dentro de la línea');
    return [path.slice(0,index+1),path.slice(index)];
  }
  function splitArea(path,a,b){
    if(!Array.isArray(path)||path.length<4)throw Error('El área no tiene suficientes vértices');
    const n=path.length;if(a===b||a<0||b<0||a>=n||b>=n)throw Error('Índices de corte no válidos');
    const walk=(from,to)=>{const out=[path[from]];let i=from;while(i!==to){i=(i+1)%n;out.push(path[i])}return out};
    const p=walk(a,b),q=walk(b,a);if(p.length<3||q.length<3)throw Error('El corte debe formar dos áreas');return [p,q];
  }
  function cutLine(path,a,b){
    if(!Array.isArray(path)||path.length<3)throw Error('La línea no tiene suficientes vértices');
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=path.length||b>=path.length||a===b)throw Error('Índices de corte no válidos');
    const lo=Math.min(a,b),hi=Math.max(a,b),left=path.slice(0,lo+1),right=path.slice(hi);if(left.length<2||right.length<2)throw Error('El tramo debe quedar entre dos extremos');return [left,right];
  }
  const api={split,splitArea,cutLine};
  root.OcartoSplitTools=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
