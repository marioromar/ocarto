/* Cierre controlado de pequeños huecos entre áreas; no fusiona símbolos distintos. */
(function(root){
  function ring(a){return Array.isArray(a)&&a.length>=3&&a.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]))}
  function bridge(a,b,maxDistance=10){if(!ring(a)||!ring(b))throw Error('Áreas no válidas');let best=null;for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const d=Math.hypot(a[i][0]-b[j][0],a[i][1]-b[j][1]);if(!best||d<best.d)best={i,j,d}}if(!best||best.d>maxDistance)throw Error('El hueco supera la distancia máxima');return{gap:best.d,connector:[a[best.i].slice(),b[best.j].slice()],indices:[best.i,best.j],review_required:true}}
  function unionAdjacent(a,b,tolerance=1){if(!ring(a)||!ring(b))throw Error('Áreas no válidas');let best=null;for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const d=Math.hypot(a[i][0]-b[j][0],a[i][1]-b[j][1]);if(d<=tolerance&&(!best||d<best.d))best={i,j,d}}if(!best)throw Error('Las áreas no son contiguas');const rot=(p,k)=>p.slice(k).concat(p.slice(0,k));return rot(a,best.i).concat(rot(b,best.j).reverse().slice(1))}
  root.OcartoAreaTools={bridge,unionAdjacent};if(typeof module!=='undefined')module.exports=root.OcartoAreaTools;
})(typeof window!=='undefined'?window:globalThis);
