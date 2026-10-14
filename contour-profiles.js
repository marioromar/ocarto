/* Ocarto v21: separate editable/general and high-detail template contours. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoContourProfiles=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function detailInterval(general,requested){
 const g=Number(general),d=requested===undefined||requested===null||requested===''?g/5:Number(requested);
 if(!Number.isFinite(g)||g<=0||!Number.isFinite(d)||d<=0||d>g)throw Error('Equidistancias inválidas');
 return d;
}
function build(rows,cell,interval,options={}){
 if(!globalThis.OcartoContours||!globalThis.OcartoContourSmoothing)throw Error('Módulos de curvas no disponibles');
 const detail=detailInterval(interval,options.detailInterval);
 const cap=options.maxSegments??200000;
 const opts={maxSegments:cap};
 // Generate separate equidistances directly from identical MDT, not by filtering a coarser output.
 const rawGeneral=OcartoContours.generate(rows,cell,Number(interval),opts);
 const generalJoined=OcartoContours.connect(rawGeneral.features,{tolerance:Math.max(1e-9,cell*1e-7)});
 const rawDetail=OcartoContours.generate(rows,cell,detail,opts);
 const detailJoined=OcartoContours.connect(rawDetail.features,{tolerance:Math.max(1e-9,cell*1e-7)});
 const intensity=options.intensity===undefined?25:Number(options.intensity);
 const protectedAngle=options.protectedAngle===undefined?55:Number(options.protectedAngle);
 const general=OcartoContourSmoothing.smooth(generalJoined.features,{intensity,protectedAngle,maxShift:cell*.2});
 const originals=generalJoined.features.map(f=>({type:'Feature',properties:{...f.properties,layer:'original',editable:false},geometry:{type:'LineString',coordinates:f.geometry.coordinates.map(p=>p.slice())}}));
 const detailed=detailJoined.features.map(f=>({type:'Feature',properties:{...f.properties,layer:'detail-template',editable:false,template:true,review_required:true},geometry:{type:'LineString',coordinates:f.geometry.coordinates.map(p=>p.slice())}}));
 const work=general.features.map(f=>({type:'Feature',properties:{...f.properties,layer:'general-work',editable:true,review_required:true},geometry:{type:'LineString',coordinates:f.geometry.coordinates.map(p=>p.slice())}}));
 return {interval:Number(interval),detailInterval:detail, general:work,detail:detailed,original:originals,auxiliary:[],stats:{general:work.length,detail:detailed.length,original:originals.length,detailSegments:rawDetail.segments,generalSegments:rawGeneral.segments},warning:'Curvado preliminar: las curvas de 1 m pueden contener ruido LiDAR; verificar las formas sobre terreno antes de cartografiar'};
}
function geojson(profile,layer){
 if(!profile||!['general','detail','original','auxiliary'].includes(layer)||!Array.isArray(profile[layer]))throw Error('Capa de curvas inválida');
 return {type:'FeatureCollection',name:'Ocarto v21 '+layer,properties:{interval:layer==='detail'?profile.detailInterval:profile.interval,layer,warning:profile.warning,source:'MDT preliminar LiDAR; comprobar precisión y presencia real de elementos'},features:profile[layer]};
}
return {build,detailInterval,geojson};
});
