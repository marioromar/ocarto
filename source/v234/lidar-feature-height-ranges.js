/* Ocarto v287 · franjas independientes de Feature Map sin sombreado.
   Sólo se representan celdas con extremos observados de retornos no suelo y
   un suelo local validado. Las alturas interiores no medidas NO se infieren.
   El resultado es una máscara negra de fondo transparente, EPSG por PGW/PRJ. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoFeatureHeightRanges=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const LIMITS=Object.freeze([0,.3,1,2,5]);
 function ranges(limits=LIMITS){
  if(!Array.isArray(limits)||limits.length<2||limits.length>10||
   limits.some((v,i)=>!Number.isFinite(v)||v<0||(i&&v<=limits[i-1])))
   throw Error('Los límites del Feature Map deben ser alturas crecientes y no negativas');
  return limits.slice(1).map((upper,i)=>Object.freeze({
    id:i+1,min:limits[i],max:upper,
    label:limits[i].toLocaleString('es-ES')+'–'+upper.toLocaleString('es-ES')+' m'
  }));
 }
 function render(rows,cell,range,featureMosaic){
  if(!featureMosaic||typeof featureMosaic.buildCells!=='function')
   throw Error('Falta el clasificador real de extremos LiDAR');
  const data=featureMosaic.buildCells(rows,cell,range.min,range.max);
  if(!data.cells.i.length)return {grid:null,summary:data.summary};
  const ii=data.cells.i,jj=data.cells.j;
  let leftI=Infinity,rightI=-Infinity,bottomJ=Infinity,topJ=-Infinity;
  for(let k=0;k<ii.length;k++){
   leftI=Math.min(leftI,ii[k]);rightI=Math.max(rightI,ii[k]);
   bottomJ=Math.min(bottomJ,jj[k]);topJ=Math.max(topJ,jj[k]);
  }
  const width=rightI-leftI+1,height=topJ-bottomJ+1;
  if(width*height>12000000)throw Error('Feature Map por franja demasiado grande: recorta o aumenta la celda');
  const rgba=new Uint8ClampedArray(width*height*4);
  for(let k=0;k<ii.length;k++)rgba[((topJ-jj[k])*width+ii[k]-leftI)*4+3]=255;
  const left=leftI*cell,top=(topJ+1)*cell;
  const worldFile=[cell,0,0,-cell,left+cell/2,top-cell/2].join('\n')+'\n';
  return {grid:{width,height,rgba,worldFile,cell,bounds:{
   left,right:(rightI+1)*cell,bottom:bottomJ*cell,top}},
   summary:{...data.summary,range_min_m:range.min,range_max_m:range.max,
    visualization:'Máscara negra sin sombreado; píxeles ausentes transparentes',
    limitations:'Sólo máximos/mínimos observados por celda; no asegura detección de alturas intermedias, especies, piedras ni muros'}};
 }
 return Object.freeze({LIMITS,ranges,render});
});
