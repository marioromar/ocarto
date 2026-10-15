/* Sustituye solo un tramo de una línea o anillo por una nueva firma dibujada. */
(function(root){
  function ok(p){return Array.isArray(p)&&p.length>=2&&p.every(q=>Array.isArray(q)&&Number.isFinite(q[0])&&Number.isFinite(q[1]))}
  function nearestIndex(path,p){let best=0,d=Infinity;for(let i=0;i<path.length;i++){const q=Math.hypot(path[i][0]-p[0],path[i][1]-p[1]);if(q<d){d=q;best=i}}return{index:best,distance:d}}
  function replace(path,start,end,signature,closed=false){if(!ok(path)||!ok(signature)||signature.length<2)throw Error('Geometría no válida');const a=nearestIndex(path,start).index,b=nearestIndex(path,end).index;if(a===b)throw Error('Los puntos inicial y final deben ser distintos');const forward=(b-a+path.length)%path.length,back=(a-b+path.length)%path.length;if(!closed&&a>b)return path.slice(0,a+1).concat(signature.slice(1,-1),path.slice(b));if(!closed)return path.slice(0,a+1).concat(signature.slice(1,-1),path.slice(b));if(forward<=back)return path.slice(0,a+1).concat(signature.slice(1,-1),path.slice(b));const rev=signature.slice().reverse();return path.slice(0,b+1).concat(rev.slice(1,-1),path.slice(a));}
  root.OcartoReshapeTools={replace,nearestIndex};if(typeof module!=='undefined')module.exports=root.OcartoReshapeTools;
})(typeof window!=='undefined'?window:globalThis);
