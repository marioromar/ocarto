/* Safe normalization of optional analysis settings stored in Ocarto project files. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoProjectSettings=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function normalize(raw){
 raw=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const numeric=(key,fallback,min,max,integer=false)=>{const n=Number(raw[key]);if(!Number.isFinite(n)||n<min||n>max||integer&&!Number.isInteger(n))return String(fallback);return String(n)};
 const heightThreshold=numeric('heightThreshold',4,-10000,10000);
 let heightMaximum='';
 if(raw.heightMaximum!==undefined&&raw.heightMaximum!==null&&raw.heightMaximum!==''){
  const candidate=numeric('heightMaximum',NaN,-10000,10000);
  if(Number.isFinite(Number(candidate))&&Number(candidate)>=Number(heightThreshold))heightMaximum=candidate;
 }
 return{
  heightThreshold,heightMaximum,
  lidarClassFilter:['all','ground','vegetation','unclassified'].includes(raw.lidarClassFilter)?raw.lidarClassFilter:'all',
  cellSize:numeric('cellSize',5,.01,10000),minCellPoints:numeric('minCellPoints',1,1,10000000,true),
  localMax3x3:raw.localMax3x3===true,
  contourInterval:numeric('contourInterval',5,.1,10000),contourSmoothing:numeric('contourSmoothing',25,0,100),
  contourProtectAngle:numeric('contourProtectAngle',55,0,180),contourDetailInterval:numeric('contourDetailInterval',1,.1,10000),
  valleyThreshold:numeric('valleyThreshold',.6,.1,10000),valleyMinLength:numeric('valleyMinLength',20,5,1000000),
  valleyRadius:numeric('valleyRadius',2,1,4,true),vegetationCell:numeric('vegetationCell',5,1,10000),vegetationMinArea:numeric('vegetationMinArea',100,0,100000000),vegetationAreaPreset:['isom406','isom408','isom410','isom407','isom401','isom402','isom405','custom'].includes(raw.vegetationAreaPreset)?raw.vegetationAreaPreset:'isom406',vegetationMinWidth:numeric('vegetationMinWidth',4,0,100000),wallMinStep:numeric('wallMinStep',.8,.1,100),wallMinLength:numeric('wallMinLength',5,0,100000),rockMinProminence:numeric('rockMinProminence',.35,.05,100),rockRadius:numeric('rockRadius',2,1,5,true),rockMinPoints:numeric('rockMinPoints',1,1,100000,true)
 };
}
const VEGETATION_LABELS=new Set(['forest_white','slow','slow_open','walk','walk_open','fight','uncrossable','cultivated','orchard','vineyard','open_land','rough_open','low_vegetation','scrub','frutales','clear_open','tall_forest']);
function normalizeVegetationCorrections(raw){
 raw=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const out={decisions:{},classes:{}};
 for(const [key,value] of Object.entries(raw.decisions||{}).slice(0,15000))if(typeof key==='string'&&key.length<=180&&['keep','remove'].includes(value))out.decisions[key]=value;
 for(const [key,value] of Object.entries(raw.classes||{}).slice(0,15000))if(typeof key==='string'&&key.length<=180&&VEGETATION_LABELS.has(value))out.classes[key]=value;
 return out;
}
return{normalize,normalizeVegetationCorrections};
});
