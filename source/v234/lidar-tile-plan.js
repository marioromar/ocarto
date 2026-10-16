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
    // Keep headroom for two simultaneous grids, the compressed LAZ bytes,
    // and the CSV arrays being streamed to disk.
    const limit=opts.maxCellsPerTile??Math.floor(MAX_CELLS*.5);
    if(!Number.isInteger(limit)||limit<100||limit>MAX_CELLS)throw Error('Límite por tesela no válido');
    // Both raster resolutions must share the very same tile boundaries.
    // Align the half-open boundaries to their least common multiple,
    // otherwise a 0.5 m cell and a 0.7 m cell can straddle adjacent tiles
    // and appear twice in the exported CSV mosaic.
    const millimetres=c=>{
      const n=Math.round(c*1000);
      if(Math.abs(c*1000-n)>1e-6)
        throw Error('Resoluciones por teselas: usa un múltiplo de 0,001 m');
      return n;
    };
    const gcd=(a,b)=>b?gcd(b,a%b):a;
    const units=cells.map(millimetres);
    const step=(units[0]/gcd(units[0],units[1]))*units[1];
    const sideCells=Math.max(1,Math.floor(Math.sqrt(limit))-3);
    const desired=sideCells*Math.min(...units);
    const spanMm=Math.floor(desired/step)*step;
    if(spanMm<=0)
      throw Error('Resoluciones incompatibles para teselas de memoria segura; elige resoluciones múltiplos entre sí');
    const originX=Math.floor(bounds.minX*1000/step)*step;
    const originY=Math.floor(bounds.minY*1000/step)*step;
    const span=spanMm/1000;
    const x0=originX/1000, y0=originY/1000;
    const nx=Math.ceil((bounds.maxX-x0)/span),ny=Math.ceil((bounds.maxY-y0)/span);
    if(nx*ny>512)throw Error('Más de 512 teselas: aumenta la resolución o divide el proyecto');
    const tiles=[];
    for(let row=0;row<ny;row++)for(let col=0;col<nx;col++){
      const xMin=(originX+col*spanMm)/1000,yMin=(originY+row*spanMm)/1000;
      const xMax=Math.min((originX+(col+1)*spanMm)/1000,bounds.maxX);
      const yMax=Math.min((originY+(row+1)*spanMm)/1000,bounds.maxY);
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
      sharedBoundaryMetres:step/1000,windowSizeMetres:span,
      maxCellsPerModel:MAX_CELLS,
      note:'Se procesan teselas separadas; todavía no se unen bordes ni se interpolan curvas entre teselas'};
  }
  return Object.freeze({plan});
});
