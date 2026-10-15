/* Ocarto v69: convert review-only vegetation GeoJSON areas into editable map features. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoVegetationMap=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function toMapAreas(fc,options={}){
 if(!fc||fc.type!=='FeatureCollection'||!Array.isArray(fc.features)||fc.features.length>3000)throw Error('Colección de áreas LiDAR inválida o demasiado grande');
 if(typeof options.transform!=='function')throw Error('Falta la transformación de coordenadas del mapa');
 const styles=options.styles||{},batch=String(options.batchId??Date.now()),symbol=options.symbol||'vegetation',layers=[],layerByCategory=new Map(),features=[];
 const convertRing=(ring)=>{
  if(!Array.isArray(ring))return null;let source=ring;
  if(source.length>1){const a=source[0],b=source.at(-1);if(Array.isArray(a)&&Array.isArray(b)&&a[0]===b[0]&&a[1]===b[1])source=source.slice(0,-1)}
  if(source.length<3)return null;
  const points=source.map(p=>{if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))return null;const q=options.transform(p[0],p[1]);return q&&Number.isFinite(q.x)&&Number.isFinite(q.y)?{x:q.x,y:q.y,...(Number.isFinite(q.rawX)&&Number.isFinite(q.rawY)?{rawX:q.rawX,rawY:q.rawY}:{})}:null});
  return points.some(p=>!p)?null:points;
 };
 for(const f of fc.features){
  if(f?.geometry?.type!=='Polygon'||!Array.isArray(f.geometry.coordinates)||!f.geometry.coordinates.length)continue;
  const category=String(f.properties?.category||'');if(!category)continue;const style=styles[category];if(!style)continue;
  const rings=f.geometry.coordinates.map(convertRing);if(rings.some(r=>!r)||rings[0].length<3)continue;
  let layer=layerByCategory.get(category);if(!layer){layer={id:`lidar-${batch}-${category}`,name:`LiDAR · ${style.name||category}`.slice(0,48),color:style.color==='#ffffff'?'#e7e7e7':style.color,visible:true};layers.push(layer);layerByCategory.set(category,layer)}
  features.push({x:0,y:0,type:'area',points:rings[0],...(rings.length>1?{holes:rings.slice(1)}:{}),symbol,layerId:layer.id,aiVegetationLabel:category,lidarVegetationCandidate:true,transparent:false});
 }
 if(!features.length)throw Error('No se pudieron convertir las áreas LiDAR al mapa');
 return{layers,features};
}
return{toMapAreas};
});
