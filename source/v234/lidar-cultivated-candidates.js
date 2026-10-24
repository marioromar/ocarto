/* Ocarto v286 — yellow/open or cultivated candidates from trained examples.
 * NOT automatic identification of crops: yellow/open can be fallow land,
 * prairies or bare ground. Source rasters and existing map stay untouched.
 */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.OcartoCultivatedCandidates=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const hasOrtho=r=>[r?.ortho_r,r?.ortho_g,r?.ortho_b].every(Number.isFinite);
 function detect(rows,cell,predict,options={}){
  const V=root.OcartoVegetationVector ||
    (typeof require==='function'?require('./vectorize-vegetation.js'):null);
  if(typeof V?.vectorize!=='function')throw Error('No está disponible el motor vectorial de vegetación');
  if(typeof predict!=='function')throw Error('Aprende primero áreas de ejemplo etiquetadas como Amarillo');
  if(!Array.isArray(rows)||!rows.length)throw Error('Analiza primero una nube LiDAR');
  const minArea=Number(options.minArea??100),minWidth=Number(options.minWidth??2);
  if(!Number.isFinite(minArea)||minArea<0||!Number.isFinite(minWidth)||minWidth<0)
   throw Error('Umbrales de cultivo inválidos');
  const source=rows; // Se analiza en lectura: no duplicar una rejilla grande en memoria.
  let yellowCells=0,orthoCells=0;
  const labeler=r=>{
   if(!Number.isFinite(r?.x)||!Number.isFinite(r?.y))return null;
   if(Number(r.building_points||0)>0||Number(r.road_points||0)>0||Number(r.water_points||0)>0)
    return null; // Las clases LAS 6 (edificio), 11 (vía) y 9 (agua) no son amarillos.
   const v=predict(r);
   if(v!=='amarillo')return null;
   yellowCells++;
   if(hasOrtho(r))orthoCells++;
   return 'amarillo';
  };
  const out=V.vectorize(source,cell,{
   labeler,minArea,minWidth,maxFeatures:options.maxFeatures??3000,
   detectClearings:false,detectTallForest:false,
   includeUncertain:false,overrides:options.overrides
  });
  const features=out.features.filter(f=>f.properties.category==='amarillo')
   .map(f=>({...f,properties:{...f.properties,
     kind:'zona-amarilla-candidata-abierto-o-cultivo',
     vegetation_symbol_suggestion:'amarillo · pendiente de confirmar tipo de terreno',
     source_detection:'ejemplos locales Amarillo + indicadores LiDAR' +
      (orthoCells?' + ortofoto alineada cuando existe':''),
     crop_confirmed:false,auto_accept:false,review_required:true,
     geometry_review_required:true,
     warning:'El aprendizaje Amarillo no permite distinguir por sí solo cultivo, pradera, claro o suelo desnudo. Verifica textura/parcelas en ortofoto y terreno.',
     confidence:'pendiente de revisión cartográfica'}}));
  return {...out,
   name:'Ocarto · zonas amarillas / cultivos candidatos · revisar',
   properties:{...out.properties,method:'modelo aprendido Amarillo; polígonos candidatos no verificados',
    candidate_class:'amarillo',crop_confirmed:false,
    labeled_cells:yellowCells,orthophoto_sampled_cells:orthoCells,
    warning:'No hay clasificación automática fiable de cultivo. No asignar símbolo de cultivo sin revisar ortofoto y campo.',
    review_required:true},features};
 }
 return Object.freeze({detect});
});
