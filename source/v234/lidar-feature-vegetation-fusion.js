/* Ocarto v287: fuse extra near-ground LiDAR Feature Map evidence into
   vegetation candidates without asserting impassability or crops.
   Reads georeferenced black-alpha masks from the same unmodified LAS/LAZ run.
   Unclassified returns could be stones, buildings, low plants or noise. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoLidarFeatureVegetationFusion=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function statsAt(evidence,index){
  if(!evidence)return null;
  const total=evidence.pixelTotal;
  return evidence.coverage.map(c=>+(c[index]/Math.max(1,total)).toFixed(3));
 }
 function annotate(features,evidence,shape){
  if(!evidence||!features?.length)return{features,summary:null};
  if(evidence.n!==shape.width*shape.height)throw Error('Feature Map y vegetación vectorial con distinta malla');
  // Feature polygons use EPSG projected coordinates; raster evidence is
  // already aggregated in exactly the same georeferenced grid.
  function inside(x,y,ring){
   let yes=false;
   for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&
      x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;
   }
   return yes;
  }
  let supported=0,conflicts=0;
  const output=features.map(f=>{
   const polys=f.geometry?.type==='Polygon'?[f.geometry.coordinates]:
     f.geometry?.type==='MultiPolygon'?f.geometry.coordinates:[];
   const bounds=polys.flatMap(poly=>poly[0]||[]);
   if(!bounds.length)return f;
   const xs=bounds.map(p=>p[0]),ys=bounds.map(p=>p[1]);
   const x0=Math.max(0,Math.floor((Math.min(...xs)-shape.x0)/shape.cell));
   const x1=Math.min(shape.width-1,Math.floor((Math.max(...xs)-shape.x0)/shape.cell));
   const y0=Math.max(0,Math.floor((Math.min(...ys)-shape.y0)/shape.cell));
   const y1=Math.min(shape.height-1,Math.floor((Math.max(...ys)-shape.y0)/shape.cell));
   let count=0,low=0,stripedBand=0,medium=0,tall=0,nearGround=0;
   for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++){
    const x=shape.x0+(i+.5)*shape.cell,y=shape.y0+(j+.5)*shape.cell;
    if(!polys.some(poly=>poly?.length&&inside(x,y,poly[0])&&
      !poly.slice(1).some(h=>inside(x,y,h))))continue;
    const at=j*shape.width+i;
    count++;low+=evidence.coverage[0][at]+evidence.coverage[1][at];
    stripedBand+=evidence.coverage[1][at];
    nearGround+=evidence.nearGroundCoverage?.[at]||0;
    medium+=evidence.coverage[2][at];tall+=evidence.coverage[3][at];
   }
   const normalize=n=>count?+(n/(count*evidence.pixelTotal)).toFixed(3):0;
   const near=normalize(low),rayado30_100=normalize(stripedBand),mid=normalize(medium),high=normalize(tall),
    ground05=evidence.nearGroundCoverage?normalize(nearGround):null;
   const disagreement=f.properties?.clase==='amarillo'&&(mid>.08||high>.04);
   const featureSupport=f.properties?.clase==='rayado'?
     (rayado30_100>.04||mid>.04):f.properties?.clase==='verde_oscuro'?
     high>.08:f.properties?.clase==='amarillo'?
     !disagreement:null;
   if(featureSupport)supported++;if(disagreement)conflicts++;
   return {...f,properties:{...f.properties,
     feature_map_evidence:{low_0_1m_fraction:near,
       striped_0_3_1m_fraction:rayado30_100,
       rayado_support_30cm_1m:f.properties?.clase==='rayado'&&rayado30_100>.04,
       near_ground_0_05m_fraction:ground05,
       sparse_near_ground_supports_open_candidate:f.properties?.clase==='amarillo'&&
         ground05!==null&&ground05<.04&&!disagreement,
       medium_1_2m_fraction:mid,
       tall_2_5m_fraction:high,reviewed_cells:count,
       suggests_consistency:featureSupport,possible_conflict:disagreement,
       caveat:'La franja 30 cm–1 m ayuda a proponer rayado, pero no confirma penetrabilidad ni sustituye revisión; puede contener hierba y otros objetos.'},
     review_required:true}};
  });
  return {features:output,summary:{supported,conflicts,method:'superposición UTM de máscaras negras transparentes del Feature Map; no cambia clasificación ni símbolos automáticamente'}};
 }
 async function load(directory,manifest,shape,{decodeImage,createCanvas,maxPixels=12000000,signal}={}){
  const bands=manifest?.mosaic?.outputs?.featureBandMasks;
  if(!Array.isArray(bands)||!bands.some(b=>b.image?.png))return null;
  if(typeof decodeImage!=='function'||typeof createCanvas!=='function')
   throw Error('Faltan lectores de las bandas Feature Map');
  const rasterCell=manifest.cellVegetation,
    extent=manifest?.selectedArea?.bounds||manifest?.plan?.bounds;
  if(!extent||!Number.isFinite(rasterCell))throw Error('Área del Feature Map inválida');
  const minX=Math.floor(extent.minX/rasterCell)*rasterCell,
    top=Math.ceil(extent.maxY/rasterCell)*rasterCell;
  const width=Math.ceil(extent.maxX/rasterCell)-Math.floor(extent.minX/rasterCell),
    height=Math.ceil(extent.maxY/rasterCell)-Math.floor(extent.minY/rasterCell);
  if(width*height>maxPixels)return null; // Never risk OOM for large areas.
  const n=shape.width*shape.height,coverage=Array.from({length:4},()=>new Uint32Array(n)),
    nearGroundCoverage=manifest.mosaic.outputs.featureNearGround?.png?new Uint32Array(n):null;
  const xIndex=new Int32Array(width),yIndex=new Int32Array(height);
  for(let x=0;x<width;x++)xIndex[x]=Math.floor((minX+(x+.5)*rasterCell-shape.x0)/shape.cell+1e-8);
  for(let y=0;y<height;y++)yIndex[y]=Math.floor((top-(y+.5)*rasterCell-shape.y0)/shape.cell+1e-8);
  let available=0;
  for(let b=0;b<4;b++){
   if(signal?.aborted)throw Object.assign(Error('Fusión LiDAR cancelada'),{name:'AbortError'});
   const descriptor=bands.find(z=>z.band===b+1)?.image;
   if(!descriptor?.png)continue;
   const file=await(await directory.getFileHandle(descriptor.png)).getFile();
   const bitmap=await decodeImage(file);
   try{
    if(bitmap.width!==width||bitmap.height!==height)
      throw Error('Máscara Feature Map desalineada: '+descriptor.png);
    const canvas=createCanvas(width,height),ctx=canvas.getContext('2d',{
     willReadFrequently:true});
    if(!ctx)throw Error('No se puede analizar la máscara Feature Map');
    ctx.drawImage(bitmap,0,0);
    const rgba=ctx.getImageData(0,0,width,height).data;
    for(let y=0;y<height;y++){
     const j=yIndex[y];if(j<0||j>=shape.height)continue;
     for(let x=0;x<width;x++){
      if(rgba[(y*width+x)*4+3]<128)continue;
      const i=xIndex[x];if(i>=0&&i<shape.width)
        coverage[b][j*shape.width+i]++;
     }
    }
    available++;
   }finally{bitmap.close?.();}
  }
  if(nearGroundCoverage){
   const descriptor=manifest.mosaic.outputs.featureNearGround;
   if(signal?.aborted)throw Object.assign(Error('Fusión LiDAR cancelada'),{name:'AbortError'});
   const file=await(await directory.getFileHandle(descriptor.png)).getFile();
   const bitmap=await decodeImage(file);
   try{
    if(bitmap.width!==width||bitmap.height!==height)
      throw Error('Máscara Feature Map 0–5 cm desalineada');
    const canvas=createCanvas(width,height),ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('No se puede inspeccionar Feature Map 0–5 cm');
    ctx.drawImage(bitmap,0,0);
    const rgba=ctx.getImageData(0,0,width,height).data;
    for(let y=0;y<height;y++){
     const j=yIndex[y];if(j<0||j>=shape.height)continue;
     for(let x=0;x<width;x++){
      if(rgba[(y*width+x)*4+3]<128)continue;
      const i=xIndex[x];if(i>=0&&i<shape.width)
       nearGroundCoverage[j*shape.width+i]++;
     }
    }
   }finally{bitmap.close?.();}
  }
  if(!available)return null;
  const pixelTotal=Math.max(1,Math.round((shape.cell/rasterCell)**2));
  return {coverage,n,pixelTotal,nearGroundCoverage,bandsAvailable:available,cell_m:shape.cell,
    interpretation:'evidencia de retornos LiDAR cercanos al suelo; solo revisión, nunca etiquetar automáticamente como verde impasable'};
 }
 return Object.freeze({statsAt,annotate,load});
});
