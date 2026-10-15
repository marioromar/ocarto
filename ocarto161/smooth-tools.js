/* Suavizado de geometrías: conservador y geométrico. */
(function(root){
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  function simplify(path,tolerance=0.5,closed=false){if(!Array.isArray(path)||path.length<3)return path?.map(p=>p.slice())||[];const end=closed?path.length-1:path.length-1,out=[path[0].slice()];for(let i=1;i<end;i++){const a=out.at(-1),b=path[i],c=path[i+1],ab=[c[0]-a[0],c[1]-a[1]],len=Math.hypot(...ab)||1,t=Math.max(0,Math.min(1,((b[0]-a[0])*ab[0]+(b[1]-a[1])*ab[1])/(len*len))),d=Math.hypot(b[0]-(a[0]+t*ab[0]),b[1]-(a[1]+t*ab[1]));if(d>tolerance)out.push(b.slice())}out.push(path[end].slice());if(closed)out.push(out[0].slice());return out}
  function smooth(path,intensity=.35,closed=false){if(!Array.isArray(path)||path.length<3)return path?.map(p=>p.slice())||[];const end=closed?path.length-1:path.length-1,out=path.map(p=>p.slice()),k=Math.max(0,Math.min(.9,Number(intensity)||0));for(let i=1;i<end;i++){const p=path[i],a=path[i-1],b=path[i+1];out[i]=[p[0]*(1-k)+(a[0]+b[0])*k/2,p[1]*(1-k)+(a[1]+b[1])*k/2]}if(closed)out[end]=out[0].slice();return out}
  function apply(path,{mode='conservative',simplification=.5,intensity=.35,closed=false}={}){const reduced=simplify(path,mode==='conservative'?1e-12:Number(simplification),closed);return mode==='geometric'?smooth(reduced,intensity,closed):reduced}
  root.OcartoSmoothTools={simplify,smooth,apply};if(typeof module!=='undefined')module.exports=root.OcartoSmoothTools;
})(typeof window!=='undefined'?window:globalThis);
