'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'..');
const bundle=fs.readFileSync(path.join(base,'ocarto-runtime-v248-4.js'),'utf8');
const start=bundle.indexOf('/* vectorize-vegetation.js */');
const end=bundle.indexOf('\n;\n\n/* ',start+10);
assert(start>=0&&end>start,'Motor de polígonos real no localizado');
const sandbox={module:{exports:{}},Math,Number,Array,Map,Set};
vm.runInNewContext(bundle.slice(start,end),sandbox);
sandbox.OcartoVegetationVector=sandbox.module.exports;
sandbox.module={exports:{}};
vm.runInNewContext(fs.readFileSync(path.join(base,'lidar-cultivated-candidates.js'),'utf8'),sandbox);
const detector=sandbox.module.exports;
const xy=(i,j,tag='amarillo',extra={})=>({
 x:i+.5,y:j+.5,ground_points:5,vegetation_points:1,canopy_max_above_ground_m:.5,
 vegetation_return_fraction:.15,ortho_r:200,ortho_g:168,ortho_b:80,tag,...extra
});
const predict=r=>r.tag;
function run(rows,opts={}){return detector.detect(rows,1,predict,{minArea:3,minWidth:0,...opts});}
test('etiquetas aprendidas generan solo amarillos revisables, nunca cultivos confirmados',()=>{
 const rows=[];for(let j=0;j<4;j++)for(let i=0;i<4;i++)rows.push(xy(i,j));
 const snapshot=JSON.stringify(rows);
 const fc=run(rows);
 assert.equal(fc.type,'FeatureCollection');
 assert.equal(fc.features.length,1);
 const f=fc.features[0];
 assert.equal(f.geometry.type,'Polygon');
 assert.equal(f.properties.crop_confirmed,false);
 assert.equal(f.properties.auto_accept,false);
 assert.equal(f.properties.review_required,true);
 assert.equal(fc.properties.labeled_cells,16);
 assert.equal(fc.properties.orthophoto_sampled_cells,16);
 assert.equal(JSON.stringify(rows),snapshot,'la fuente LiDAR no se modifica');
});
test('verdes, agua, carretera y clase 6 de edificio no se convierten en cultivo',()=>{
 const rows=[
  xy(0,0,'amarillo'),xy(1,0,'amarillo'),xy(2,0,'amarillo'),
  xy(3,0,'verde3'),xy(4,0,'amarillo',{building_points:3}),
  xy(5,0,'amarillo',{road_points:2}),
  xy(6,0,'rayado'),xy(7,0,'amarillo',{water_points:3})
 ];
 const fc=run(rows,{minArea:1});
 assert.equal(fc.properties.labeled_cells,3);
 assert(fc.features.every(f=>f.properties.category==='amarillo'));
 assert(fc.features.every(f=>f.properties.crop_confirmed===false));
});
test('el aprendizaje sin muestras amarillas no inventa parcelas por estar despejado',()=>{
 const rows=[];for(let j=0;j<6;j++)for(let i=0;i<6;i++)
   rows.push(xy(i,j,'open',{vegetation_points:0,ground_points:12}));
 assert.equal(run(rows).features.length,0);
 assert.equal(run(rows).properties.labeled_cells,0);
});
test('conserva huecos interiores aunque el centro no sea Amarillo',()=>{
 const rows=[];for(let j=0;j<7;j++)for(let i=0;i<7;i++)
  rows.push(xy(i,j,i>=2&&i<=4&&j>=2&&j<=4?'verde3':'amarillo'));
 const fc=run(rows,{minArea:1});
 assert.equal(fc.features.length,1);
 assert.equal(fc.features[0].geometry.coordinates.length,2,'conservar hueco central');
 const inner=fc.features[0].geometry.coordinates[1];
 assert(inner.length>=4);
});
test('permite candidatos basados en ejemplos LiDAR sin inventar evidencia de ortofoto',()=>{
 const rows=[xy(0,0,'amarillo',{ortho_r:null,ortho_g:null,ortho_b:null}),
  xy(1,0,'amarillo',{ortho_r:null,ortho_g:null,ortho_b:null}),
  xy(2,0,'amarillo',{ortho_r:null,ortho_g:null,ortho_b:null})];
 const fc=run(rows,{minArea:1});
 assert(fc.features.length>0);
 assert.equal(fc.properties.orthophoto_sampled_cells,0);
 assert.equal(fc.features[0].properties.crop_confirmed,false);
});
test('rechaza peticiones sin modelo o sin datos, y umbrales incorrectos',()=>{
 assert.throws(()=>detector.detect([xy(0,0)],1,null),/Aprende primero/);
 assert.throws(()=>detector.detect([],1,predict),/Analiza primero/);
 assert.throws(()=>run([xy(0,0)],{minArea:-1}),/Umbrales/);
});
test('interfaz incluye botón amarillo independiente y salida revisable, sin incorporar a CART',()=>{
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 for(const marker of ['lidar-cultivated-candidates.js','id="detectCultivatedCandidates"',
  'id="cultivatedCandidatesStatus"','OcartoCultivatedCandidates.detect(',
  "addCandidateFeatureCollection(out,'LiDAR · zonas amarillas / cultivos a revisar',true)",
  'ocarto-v286-amarillos-posibles-cultivos-revisar.geojson'])
  assert(html.includes(marker),'Falta integración '+marker);
});

test('calcula límites de mosaicos LiDAR de 220.000 celdas sin desbordar argumentos',()=>{
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 const marker='function vegetationRowsBounds(rows)';
 const start=html.indexOf(marker);
 assert(start>=0,'No existe el cálculo acotado de límites');
 const source=html.slice(start,html.indexOf('\n',start));
 const boundsOf=vm.runInNewContext('('+source+')');
 const rows=Array.from({length:220000},(_,i)=>({x:i*.5,y:900-i*.25}));
 const bounds=boundsOf(rows);
 assert.equal(bounds.minX,0);
 assert.equal(bounds.maxX,109999.5);
 assert.equal(bounds.maxY,900);
 assert.equal(bounds.minY,900-219999*.25);
 assert.equal((html.match(/bounds=vegetationRowsBounds\(rows\)/g)||[]).length,2,
  'El cálculo acotado debe utilizarse tanto en selección de ortofoto como en muestreo');
 assert(!html.includes('Math.min(...rows.map(r=>r.x))'));
});

test('v286 reutiliza la ortofoto del lote sin buscarla para cada celda',()=>{
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 const start=html.indexOf('function predictVegetationRow(');
 const end=html.indexOf('\n  function trainVegetationExamples(',start);
 assert(start>=0&&end>start,'Falta el predictor de ejemplos');
 let selectionCount=0;
 const sandbox={
   reusableVegetationModel:{predict:()=> 'amarillo'},
   reusableVegetationImageModel:{templateId:'orto-1',predict:()=> 'amarillo'},
   vegetationOrthoTemplate:()=>{selectionCount++;return{id:'orto-1'};}
 };
 const predict=vm.runInNewContext('('+html.slice(start,end)+')',sandbox);
 const selected=sandbox.vegetationOrthoTemplate();
 for(let i=0;i<3000;i++)
  assert.equal(predict({x:i+.5,y:.5},selected),'amarillo');
 assert.equal(selectionCount,1,'La ortofoto no debe volver a buscarse por celda');
 assert.equal(predict({x:.5,y:.5}),'amarillo','Conservar el uso antiguo sin argumento');
 assert.equal(selectionCount,2,'El predictor estándar sigue obteniendo su referencia');
 assert(html.includes('const predictYellowRow=row=>predictVegetationRow(row,yellowTemplate)'),
  'La detección v286 debe usar la referencia elegida para el lote');
});
