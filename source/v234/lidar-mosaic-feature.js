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
     limits:'Usa máximos y mínimos realmente observados por celda; puede omitir retornos intermedios entre ambos extremos'};
   for(const r of rows){
     const count=Number(r.vegetation_points||0)+Number(r.other_points||0);
     if(!count)continue;
     const peak=r.feature_max_above_ground_m,low=r.feature_min_above_ground_m;
     const h=Number.isFinite(peak)&&peak>=minHeight&&peak<=maxHeight?
       peak:Number.isFinite(low)&&low>=minHeight&&low<=maxHeight?low:null;
     if(!Number.isFinite(peak)&&!Number.isFinite(low)){
       summary.discardedUncertainGround++;
       continue;
     }
     if(h===null){summary.excludedByHeight++;continue;}
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

 // Componer UNA imagen de toda la zona en memoria acotada, solo cuando
 // <=12 millones de píxeles. Los VRT siguen siendo la salida para mapas enormes.
 // Se reciben dependencias del navegador para poder verificar la geometría en Node.
 async function saveWholePng(directory,manifest,{
   planGeometry,decodeImage,createCanvas,writeTriplet,wkt,
   shouldStop=()=>false,maxPixels=12000000
 }={}){
   if(![planGeometry,decodeImage,createCanvas,writeTriplet]
        .every(fn=>typeof fn==='function')||!wkt)
     throw Error('Herramientas del mosaico Feature Map incompletas');
   const shape=planGeometry(manifest,manifest.cellVegetation);
   if(shape.width*shape.height>maxPixels)return null;
   const canvas=createCanvas(shape.width,shape.height),ctx=canvas?.getContext?.('2d');
   if(!ctx)throw Error('No se pudo crear la imagen unificada Feature Map');
   let tiles=0;
   for(const tile of manifest.completed){
     if(shouldStop())throw Object.assign(Error('Feature Map cancelado'),{name:'AbortError'});
     const raster=tile.featureRaster;if(!raster)continue;
     if(!raster.bounds||Math.abs(raster.cellSize-shape.cell)>1e-8)
       throw Error('Feature Map desalineado en '+tile.name);
     const image=await decodeImage(await(await directory.getFileHandle(raster.png)).getFile());
     try{
       const x=Math.round((raster.bounds.left-shape.left)/shape.cell),
         y=Math.round((shape.top-raster.bounds.top)/shape.cell);
       if(image.width!==raster.width||image.height!==raster.height||x<0||y<0||
          x+image.width>shape.width||y+image.height>shape.height)
         throw Error('Desplazamiento inválido Feature Map '+tile.name);
       ctx.drawImage(image,x,y);tiles++;
     }finally{image.close?.();}
   }
   if(!tiles)return null;
   if(shouldStop())throw Object.assign(Error('Feature Map cancelado'),{name:'AbortError'});
   const png=await new Promise((resolve,reject)=>canvas.toBlob(blob=>
     blob?resolve(blob):reject(Error('PNG de Feature Map no disponible')),'image/png'));
   const world=[shape.cell,0,0,-shape.cell,shape.left+shape.cell/2,
     shape.top-shape.cell/2].join('\n')+'\n';
   const data=await writeTriplet(directory,'zona_completa_feature_map_lidar',png,world,wkt);
   return {...data,width:shape.width,height:shape.height,cellSize:shape.cell,
     sources:tiles,method:'retornos no suelo LAS/LAZ; una sola imagen georreferenciada'};
 }
 return Object.freeze({buildCells,render,saveWholePng});
});
