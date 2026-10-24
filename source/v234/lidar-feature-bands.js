/* Ocarto: Feature Map bands as independent, georeferenced reference templates.
   This module never modifies source PNGs, GeoTIFFs or CART geometry. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoFeatureBandLayers=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const bands=Object.freeze([
  {id:'05_30',title:'0,05–0,30 m',stem:'feature_00_05_00_30m_05m'},
  {id:'30_100',title:'0,30–1 m',stem:'feature_00_30_01_00m_05m'},
  {id:'100_200',title:'1–2 m',stem:'feature_01_00_02_00m_05m'},
  {id:'200_500',title:'2–5 m',stem:'feature_02_00_05_00m_05m'}
 ]);
 function detect(name){
  const basename=String(name||'').split(/[\\/]/).pop().replace(/\.[^.]+$/,'').toLowerCase();
  return bands.find(b=>basename===b.stem)||null;
 }
 function detectVegetation(name){
  const stem=String(name||'').split(/[\\/]/).pop().replace(/\.[^.]+$/,'').toLowerCase();
  const m=stem.match(/^altura_vegetacion_banda_([1-4])$/);
  return m?Number(m[1]):null;
 }
 function isHeightTemplate(layer){
  return !!layer&&!layer.featureMapBand&&/alturas?[_ -]?vegetaci[oó]n|vegetaci[oó]n[_ -]?alturas?|altura[_ -]?copa|alturas?_lidar/i.test(String(layer.name||''));
 }
 function displayOrder(layers){
  if(!layers.some(l=>l.featureMapBand))return layers;
  const priority=l=>isHeightTemplate(l)||l.vegetationHeightBand?2:l.featureMapBand?1:0;
  return layers.map((layer,i)=>({layer,i})).sort((a,b)=>priority(a.layer)-priority(b.layer)||a.i-b.i).map(x=>x.layer);
 }
 function blackTint(img,canvasFactory=()=>document.createElement('canvas')){
  if(!img||!img.width||!img.height)throw Error('Imagen Feature Map inválida');
  const canvas=canvasFactory();canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se puede colorear Feature Map');
  ctx.drawImage(img,0,0,img.width,img.height);
  ctx.globalCompositeOperation='source-in';
  ctx.fillStyle='#000000';
  ctx.fillRect(0,0,img.width,img.height);
  ctx.globalCompositeOperation='source-over';
  return canvas;
 }
 return Object.freeze({bands,detect,detectVegetation,isHeightTemplate,displayOrder,blackTint});
});
