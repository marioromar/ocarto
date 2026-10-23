'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const v=require('../lidar-vegetation-reviewed-layers.js');
const ring=[[385000,4114000],[385020,4114000],[385020,4114020],[385000,4114020],[385000,4114000]];
const hole=[[385005,4114005],[385005,4114015],[385015,4114015],[385015,4114005],[385005,4114005]];
const poly=(id,clase,geometry={type:'Polygon',coordinates:[ring,hole]})=>({
  type:'Feature',properties:{id,clase,estado:'pendiente_revision'},geometry
});
const fc=(...features)=>({type:'FeatureCollection',features});
const item=(name,content)=>({name,content});
const opts={confirmedCrs:true,mapCrs:'EPSG:25830'};
test('prepara tres clases independientes y conserva huecos y origen',()=>{
  const inputs=[
    item('verde_oscuro.geojson',fc(poly('A','verde_oscuro'))),
    item('rayado.geojson',fc(poly('B','rayado'))),
    item('amarillo.geojson',fc(poly('C','amarillo')))
  ];
  const before=JSON.stringify(inputs);
  const result=v.prepare(inputs,['verde_oscuro','rayado','amarillo'],opts);
  assert.equal(result.total,3);
  assert.deepEqual(result.counts,{verde_oscuro:1,rayado:1,amarillo:1});
  assert.deepEqual(result.grouped.verde_oscuro[0].geometry.coordinates,[ring,hole]);
  assert.equal(result.grouped.rayado[0].properties.iof_symbol,null);
  assert.equal(result.grouped.amarillo[0].properties.review_required,true);
  assert.equal(JSON.stringify(inputs),before,'Original stays unchanged');
});
test('solo devuelve capas seleccionadas, aunque reciba los tres GeoJSON',()=>{
  const r=v.prepare([item('areas.geojson',fc(poly('A','verde_oscuro'),poly('B','rayado'),poly('C','amarillo')))],
    ['rayado'],opts);
  assert.equal(r.total,1);
  assert.equal(r.grouped.rayado.length,1);
  assert.equal(r.grouped.verde_oscuro.length,0);
  assert.equal(r.grouped.amarillo.length,0);
});
test('preserva multipolígonos (sin convertirlos en rectángulos)',()=>{
  const multi={type:'MultiPolygon',coordinates:[[ring,hole],[ring]]};
  const r=v.prepare([item('bob.geojson',fc(poly('A','amarillo',multi)))],['amarillo'],opts);
  assert.deepEqual(r.grouped.amarillo[0].geometry,multi);
  assert.equal(r.total,2);
});
test('exige confirmación explícita de CRS/EPSG',()=>{
  const inputs=[item('a.geojson',fc(poly('A','rayado')))];
  assert.throws(()=>v.prepare(inputs,['rayado'],{confirmedCrs:false,mapCrs:'EPSG:25830'}),/Confirma/);
  assert.throws(()=>v.prepare(inputs,['rayado'],{confirmedCrs:true,mapCrs:''}),/Confirma/);
});
test('rechaza CRS declarado distinto y coordenadas geográficas',()=>{
  const a=fc(poly('A','rayado'));a.metadata={crs:'EPSG:32630'};
  assert.throws(()=>v.prepare([item('a.geojson',a)],['rayado'],opts),/CRS distinto/);
  const geo=fc(poly('B','amarillo',{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}));
  assert.throws(()=>v.prepare([item('a.geojson',geo)],['amarillo'],opts),/geográfica/);
});
test('rechaza anillos abiertos y clases desconocidas',()=>{
  const bad=fc(poly('A','rayado',{type:'Polygon',coordinates:[ring.slice(0,-1)]}));
  assert.throws(()=>v.prepare([item('bad.geojson',bad)],['rayado'],opts),/Anillos/);
  assert.throws(()=>v.prepare([item('a.geojson',fc(poly('B','no_es_vegetacion')))],['amarillo'],opts),/Clase/);
});
test('rechaza identificadores duplicados antes de tocar el mapa',()=>{
  const a=item('dobles.geojson',fc(poly('A','rayado'),poly('A','amarillo')));
  assert.throws(()=>v.prepare([a],['rayado','amarillo'],opts),/repetido/);
});
test('el editor incluye panel y lógica de importación atómica y deshacer',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  for(const s of ['lidar-vegetation-reviewed-layers.js','id="vegReviewedPanel"',
    'id="vegReviewedFiles"','id="vegReviewedDark"','id="vegReviewedHatch"',
    'id="vegReviewedYellow"','id="vegReviewedConfirmCrs"','id="vegReviewedImport"',
    'id="vegReviewedAsTemplate"','referenceOnly:asTemplate',
    "if(!asTemplate)S.activeLayerId=layers[0].id",
    'OcartoVegetationReviewedLayers.prepare','const before=snapshotMap();',
    'S.vectorLayers.push(...layers)','S.features.push(...staged)','recordMapEdit(before)',
    'vegetationReviewSourceId','reviewRequired:true,autoSymbol:false'])
    assert(html.includes(s),'Missing editor integration '+s);
});
test('lee el ZIP Bobadilla sin descomprimir el TIFF ni los PNG',async()=>{
 const names=['verde_oscuro','rayado','amarillo'];
 let imageReads=0;
 const files=Object.fromEntries(names.map((name,i)=>[
   name+'.geojson',{name:name+'.geojson',dir:false,
     _data:{uncompressedSize:1000},
     async:async()=>JSON.stringify(fc(poly(String(i),name)))}
 ]));
 files['Bobadilla_alturas_recorte_referencia.tif']={
   name:'Bobadilla_alturas_recorte_referencia.tif',dir:false,
   _data:{uncompressedSize:200000000},
   async:async()=>{imageReads++;throw Error('TIFF must not be opened')}
 };
 const zip={loadAsync:async()=>({files})};
 const raw=[{name:'Ocarto_Bobadilla_v4_capas_seleccionables.zip',size:22*1024*1024}];
 const sources=await v.readSources(raw,zip);
 assert.equal(sources.length,3);
 assert.equal(imageReads,0);
 const result=v.prepare(sources,names,opts);
 assert.equal(result.total,3);
 assert.equal(result.grouped.verde_oscuro.length,1);
});
test('ZIP rechaza extracción excesiva y clases repetidas',async()=>{
 const zipSize={loadAsync:async()=>({files:{'rayado.geojson':{
   name:'rayado.geojson',dir:false,_data:{uncompressedSize:11*1024*1024},
   async:async()=>'{ }'}}})};
 await assert.rejects(v.readSources([{name:'bob.zip',size:3000}],zipSize),/10 MB/);
 const duplicate={loadAsync:async()=>({files:{
   'rayado.geojson':{name:'rayado.geojson',dir:false,_data:{uncompressedSize:20},async:async()=>'{ }'},
   'sub/rayado.geojson':{name:'sub/rayado.geojson',dir:false,_data:{uncompressedSize:20},async:async()=>'{ }'}
 }})};
 await assert.rejects(v.readSources([{name:'bob.zip',size:3000}],duplicate),/duplicada/);
});
test('acepta GeoJSON individual sin ZIP y rechaza formatos no admitidos',async()=>{
 const source=JSON.stringify(fc(poly('G1','amarillo')));
 const sources=await v.readSources([{name:'amarillo.geojson',size:source.length,text:async()=>source}],null);
 assert.equal(v.prepare(sources,['amarillo'],opts).total,1);
 await assert.rejects(v.readSources([{name:'Bobadilla.tif',size:1000}],null),/Solo se admiten/);
});
