/* Use known area symbols on the editable map/reference layers as labelled LiDAR examples. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoVegetationSymbolGuides=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const CODE_LABEL=Object.freeze({'401':'amarillo','403':'amarillo','405':'blanco','406':'verde1','407':'rayado','408':'verde2','409':'rayado','410':'verde3','411':'verde3','413':'frutales','414':'amarillo'});
function codeFor(feature,catalog=[],symbolSpecs=null,mapType='forest'){
 const id=String(feature?.symbol||''),entry=catalog.find(x=>x.id===id),raw=entry?(symbolSpecs?.symbolStyle?.(id,mapType)?.code??entry.code):feature?.symbolCode??feature?.symbol_code??feature?.ocad_symbol_candidate;
 if(raw==null)return null;const match=String(raw).trim().match(/^(\d{3})(?:\.\d+)?$/);return match?match[1]:null;
}
function collect(features,{catalog=[],symbolSpecs=null,mapType='forest',worldRing,includeFeature}={}){
 if(!Array.isArray(features)||features.length>200000)throw Error('Elementos del mapa inválidos para inspección');if(typeof worldRing!=='function')throw Error('Falta transformación de coordenadas para usar símbolos guía');
 const polygons=[],symbolCounts={},labelCounts={},skipped=0;
 for(const f of features){if(includeFeature&&!includeFeature(f))continue;if(f?.type!=='area'||!Array.isArray(f.points)||f.points.length<3)continue;const label=String(f.aiVegetationLabel||CODE_LABEL[codeFor(f,catalog,symbolSpecs,mapType)]||'');if(!label){continue}let outer=worldRing(f.points);if(!Array.isArray(outer)||outer.length<3||!outer.every(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite))){skipped++;continue}const holes=(f.holes||[]).map(worldRing);if(holes.some(r=>!Array.isArray(r)||r.length<3||!r.every(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite)))){skipped++;continue}polygons.push({label,coordinates:[outer,...holes]});labelCounts[label]=(labelCounts[label]||0)+1;const code=codeFor(f,catalog,symbolSpecs,mapType);if(code)symbolCounts[code]=(symbolCounts[code]||0)+1;
 }
 return{polygons,symbolCounts,labelCounts,matchedFeatures:polygons.length,skipped};
}
return{CODE_LABEL,codeFor,collect};
});
