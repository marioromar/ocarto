/* Ocarto v262: bounded, deterministic UTM window plan.
   Each work unit is a half-open geographic rectangle aligned to the finer
   model grid, and no tile ever needs the full 4–9 km² grid in memory. */
(function(root,factory) {
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.OcartoLidarTilePlan=api;
})(typeof globalThis!=='undefined'?globalThis:this,function() {
  'use strict';
  const MAX_CELLS=1000000;
  function plan(bounds, terrainCell, vegetationCell, opts={}) {
    if (!bounds || ![bounds.minX,bounds.maxX,bounds.minY,bounds.maxY].every(Number.isFinite) ||
        bounds.maxX<=bounds.minX || bounds.maxY<=bounds.minY) throw Error('Extensión UTM del polígono no válida');
    const cells=[Number(terrainCell),Number(vegetationCell)];
    if(cells.some(c=>!Number.isFinite(c)||c<.1||c>100))throw Error('Resolución LiDAR no válida');
    const limit=opts.maxCellsPerTile??Math.floor(MAX_CELLS*.8);
    if(!Number.isInteger(limit)||limit<100||limit>MAX_CELLS)throw Error('Límite por tesela no válido');
    const base=Math.min(...cells);
    // Geometry aligns to integer multiples of the finest cell size, and the
    // dimensions are conservative for larger second-model cell resolutions.
    const sideCells=Math.max(1,Math.floor(Math.sqrt(limit))-3);
    const span=sideCells*base;
    const x0=Math.floor(bounds.minX/base)*base, y0=Math.floor(bounds.minY/base)*base;
    const nx=Math.ceil((bounds.maxX-x0)/span),ny=Math.ceil((bounds.maxY-y0)/span);
    if(nx*ny>512)throw Error('Más de 512 teselas: aumenta la resolución o divide el proyecto');
    const tiles=[];
    for(let row=0;row<ny;row++)for(let col=0;col<nx;col++){
      const xMin=x0+col*span,yMin=y0+row*span;
      const xMax=Math.min(xMin+span,bounds.maxX),yMax=Math.min(yMin+span,bounds.maxY);
      const window={minX:xMin,maxX:xMax,minY:yMin,maxY:yMax};
      for(const cell of cells){
        const count=(Math.ceil(xMax/cell)-Math.floor(xMin/cell)+1)*
          (Math.ceil(yMax/cell)-Math.floor(yMin/cell)+1);
        if(count>MAX_CELLS)throw Error('La tesela excede el límite de memoria: ajusta celdas');
      }
      tiles.push({index:tiles.length+1,row:row+1,column:col+1,
        name:'tesela_'+String(row+1).padStart(3,'0')+'_'+String(col+1).padStart(3,'0'),
        window});
    }
    return {version:1,cellTerrain:cells[0],cellVegetation:cells[1],
      bounds,tiles,columns:nx,rows:ny,total:tiles.length,
      maxCellsPerModel:MAX_CELLS,
      note:'Se procesan teselas separadas; todavía no se unen bordes ni se interpolan curvas entre teselas'};
  }
  return Object.freeze({plan});
});
