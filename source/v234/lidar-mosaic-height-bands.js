/* Ocarto: rasters independientes por rangos REALES de altura de copa.
   Se aplica máscara alfa sobre el ráster coloreado ya calculado; no cambia
   cotas, TIFF, PNG original ni coordenadas. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoLidarMosaicHeightBands=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function ranges(stops){
  if(!Array.isArray(stops)||stops.length!==4||stops.some((s,i)=>
    !Number.isFinite(s?.height)||s.height<0||(i>0&&s.height<=stops[i-1].height)))
   throw Error('Cuatro alturas de vegetación crecientes requeridas');
  return stops.map((s,i)=>({id:i+1,min:s.height,max:i===3?Infinity:stops[i+1].height}));
 }
 function mask(grid,rows,range){
  if(!grid?.rgba||!grid.bounds||!Number.isFinite(grid.cell)||!Array.isArray(rows))
   throw Error('Ráster de alturas de vegetación inválido');
  const rgba=new Uint8ClampedArray(grid.rgba.length),w=grid.width,h=grid.height;
  let selected=0,estimated=0;
  for(const r of rows){
   const value=r.canopy_max_above_ground_m;
   if(!Number.isFinite(value)||value<range.min||value>=range.max)continue;
   const x=Math.round((r.x-grid.bounds.left)/grid.cell-.5),
     y=Math.round((grid.bounds.top-r.y)/grid.cell-.5);
   if(x<0||y<0||x>=w||y>=h)throw Error('Alturas de vegetación desalineadas con la rejilla');
   const p=(y*w+x)*4;
   if(!grid.rgba[p+3])throw Error('Altura medida sin color en la rejilla original');
   rgba[p]=grid.rgba[p];rgba[p+1]=grid.rgba[p+1];rgba[p+2]=grid.rgba[p+2];
   rgba[p+3]=grid.rgba[p+3];selected++;
   if(r.ground_height_source==='nearby_estimate')estimated++;
  }
  return{rgba,selected,estimated,min_m:range.min,max_m:range.max,
   bounds:grid.bounds,worldFile:grid.worldFile,cell:grid.cell,width:w,height:h};
 }
 return Object.freeze({ranges,mask});
});
