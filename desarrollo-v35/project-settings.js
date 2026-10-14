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
  valleyRadius:numeric('valleyRadius',2,1,4,true),vegetationCell:numeric('vegetationCell',5,1,10000)
 };
}
return{normalize};
});
