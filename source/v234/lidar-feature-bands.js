/* Ocarto: Feature Map bands as independent, georeferenced reference templates.
   This module never modifies source PNGs, GeoTIFFs or CART geometry. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoFeatureBandLayers=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // The original colored Feature Map is always left untouched.
 const FEATURE_COLORS=Object.freeze({
  banda_0:'#c9b78a', // 0–5 cm: near-ground diagnostic
  banda_1:'#e8c962', // 0–0.3 m
  banda_2:'#ec8c43', // 0.3–1 m: low vegetation / stripes
  banda_3:'#7bae67', // 1–2 m
  banda_4:'#326945'  // 2–5 m
 });
 const bands=Object.freeze([
  {id:'05_30',title:'0,05–0,30 m',stem:'feature_00_05_00_30m_05m'},
  {id:'30_100',title:'0,30–1 m',stem:'feature_00_30_01_00m_05m'},
  {id:'100_200',title:'1–2 m',stem:'feature_01_00_02_00m_05m'},
  {id:'200_500',title:'2–5 m',stem:'feature_02_00_05_00m_05m'}
 ]);
 function detect(name){
  const basename=String(name||'').split(/[\\/]/).pop().replace(/\.[^.]+$/,'').toLowerCase();
  const band=bands.find(b=>basename===b.stem||basename.endsWith('_'+b.stem));
  if(band)return band;
  const generated=basename.match(/^(?:zona_completa_|tesela_\d{3}_\d{3}_)?feature_map_banda_([0-4])(?:_sin_sombreado)?$/);
  if(generated){
   const index=Number(generated[1]);
   return{id:'banda_'+generated[1],title:['0–5 cm · diagnóstico de suelo','0–0,3 m','0,3–1 m','1–2 m','2–5 m'][index],
     stem:basename};
  }
  if(/^(?:zona_completa_feature_map_lidar(?:_real_0_2m)?|feature_00_05_02_00m_05m)$/.test(basename))
   return {id:'combined',title:'Feature Map combinado (revisar intervalo)',stem:basename};
  return null;
 }
 function detectContour(name){
  const base=String(name||'').split(/[\\/]/).pop().replace(/\.[^.]+$/,'').toLowerCase();
  const m=base.match(/^zona_completa_curvas_(5m_suave|3m_suave_ligero|1m_original|1m_suave_ligero|0_5m_original|0_5m_suave_minimo)$/);
  return m?.[1]||null;
 }
 function isReliefTemplate(layer){
  const s=String(layer?.name||'').toLowerCase();
  return /(?:^|[_\s-])(?:relieve|sombreado|hillshade)(?:[_\s.-]|$)|(?:^|[_\s-])mdt[_\s-]/.test(s);
 }
 function detectVegetation(name){
  const stem=String(name||'').split(/[\\/]/).pop().replace(/\.[^.]+$/,'').toLowerCase();
  const m=stem.match(/^(?:tesela_\d{3}_\d{3}_)?altura_vegetacion_banda_([1-4])$/);
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
 function tint(img,color,canvasFactory=()=>document.createElement('canvas')){
  if(!img||!img.width||!img.height)throw Error('Imagen Feature Map inválida');
  if(!/^#[0-9a-f]{6}$/i.test(color))throw Error('Color Feature Map inválido');
  const canvas=canvasFactory();canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se puede colorear Feature Map');
  ctx.drawImage(img,0,0,img.width,img.height);
  ctx.globalCompositeOperation='source-in';
  ctx.fillStyle=color;
  ctx.fillRect(0,0,img.width,img.height);
  ctx.globalCompositeOperation='source-over';
  return canvas;
 }
 function colorForBand(id){return FEATURE_COLORS[id]||null}
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
 return Object.freeze({bands,FEATURE_COLORS,colorForBand,tint,detect,detectVegetation,detectContour,isReliefTemplate,isHeightTemplate,displayOrder,blackTint});
});
