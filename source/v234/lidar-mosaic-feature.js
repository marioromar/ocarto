/* Ocarto v286: Feature Map de todo el mosaico exclusivamente desde
   retornos LiDAR no suelo y suelo medido/estimado. Usa el mismo cálculo de
   celda del Worker: altura MÁXIMA de retorno no suelo por celda.
   No recrea medidas que no existen y NO es una detección de elementos. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoLidarMosaicFeature=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function buildCells(rows,cell,minHeight=0,maxHeight=2){
   if(!Array.isArray(rows)||!Number.isFinite(cell)||cell<.1||
       !Number.isFinite(minHeight)||minHeight<0||
       !Number.isFinite(maxHeight)||maxHeight<minHeight)
     throw Error('Parámetros LiDAR de Feature Map inválidos');
   const cells={i:[],j:[],height:[]};
   const summary={selectedCells:0,selectedReturns:0,measuredGroundCells:0,
     estimatedGroundCells:0,discardedUncertainGround:0,excludedByHeight:0,
     cellSize:cell,minHeight,maxHeight,
     source:'retornos LiDAR no suelo, alturas máximas sobre suelo medido o vecino fiable',
     limits:'Solo máximos por celda, no todos los retornos entre umbrales'};
   for(const r of rows){
     const count=Number(r.vegetation_points||0)+Number(r.other_points||0);
     if(!count)continue;
     const h=r.feature_max_above_ground_m;
     if(!Number.isFinite(h)){
       summary.discardedUncertainGround++;
       continue;
     }
     if(h<minHeight||h>maxHeight){summary.excludedByHeight++;continue;}
     if(!['observed','nearby_estimate'].includes(r.ground_height_source))
       throw Error('Altura Feature Map sin suelo validado');
     const i=Math.round(r.x/cell-.5),j=Math.round(r.y/cell-.5);
     if(Math.abs((i+.5)*cell-r.x)>cell*1e-5||
       Math.abs((j+.5)*cell-r.y)>cell*1e-5)
       throw Error('Feature Map LiDAR no está alineado con el mosaico');
     cells.i.push(i);cells.j.push(j);cells.height.push(h);
     summary.selectedReturns+=count;
     summary.selectedCells++;
     if(r.ground_height_source==='observed')summary.measuredGroundCells++;
     else summary.estimatedGroundCells++;
   }
   if(summary.selectedCells>1000000)
     throw Error('Feature Map supera un millón de celdas por bloque');
   return {cells,summary};
 }
 function render(rows,cell,minHeight,maxHeight,featureRenderer){
   if(!featureRenderer||typeof featureRenderer.render!=='function')
     throw Error('Falta el renderer de Feature Map LiDAR');
   const data=buildCells(rows,cell,minHeight,maxHeight);
   if(!data.summary.selectedCells)return {grid:null,...data};
   return {grid:featureRenderer.render(data.cells,cell),...data};
 }
 return Object.freeze({buildCells,render});
});
