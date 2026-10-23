'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const auto=require('../lidar-auto-natural-bezier.js');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function functionLine(name){
  const matches=html.split('\n').filter(s=>s.startsWith('  function '+name+'('));
  assert.equal(matches.length,1,'La función exportadora debe estar presente: '+name);
  return matches[0];
}
function makeExports(mode='utm',features=[],candidates=[]){
  const S={features,candidates,vectorLayers:[{id:'cartography',name:'Cartografía'}],
    symbolStates:{},mapType:'forest',cloudTransform:null,georef:null,renderGeo:null};
  if(mode==='utm'){S.georef={};S.renderGeo={cx:500000,cy:4200000,scale:2};}
  if(mode==='cloud')S.cloudTransform={centerX:300000,centerY:4400000,scale:2};
  const $=id=>({value:id==='mapCrs'?'EPSG:25830':id==='mapScale'?'10000':''});
  const snippets=['localToWorld','sampledPoints','xyToGeo','candidateGeoFeature','exportMapData']
   .map(functionLine).join('\n');
  const impl=Function('S','$','SYMBOL_CATALOG','OcartoSymbolSpecs','symbolStatus','vectorLayerFor',
    snippets+'\nreturn {candidateGeoFeature,exportMapData,xyToGeo};');
  const symbols=[{id:'vegetation',code:'405',name:'Vegetación'},
    {id:'path',code:'506',name:'Camino'}];
  return impl(S,$,symbols,{symbolStyle:()=>null},()=> 'normal',
    ()=>({id:'cartography',name:'Cartografía'}));
}
function bezierLine(){
 return {type:'line',symbol:'path',curve:'bezier',
  candidateKind:'posible-camino-por-ortofoto',
  points:[{x:0,y:0,tangent:{x:3,y:0}},
    {x:20,y:12,tangent:{x:3,y:2}}]};
}
function bezierArea(){
 const ring=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
 return auto.apply({type:'area',symbol:'vegetation',
  candidateKind:'agua-superficie-candidata-clase9-lidar',
  points:ring(0,0,40,35),holes:[ring(12,12,8,6)]},
  {level:'medium',gridSizeLocal:1});
}
function coordsInBounds(coords,xmin,xmax,ymin,ymax){
 assert(coords.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&
   x>=xmin&&x<=xmax&&y>=ymin&&y<=ymax),
   'Fuera de coordenadas de mapa georreferenciado: '+JSON.stringify(coords.slice(0,3)));
}

test('el inventario exporta el camino Bézier con puntos interpolados y coordenadas UTM reales',()=>{
 const {candidateGeoFeature}=makeExports('utm');
 const f=bezierLine(),g=candidateGeoFeature(f).geometry;
 assert.equal(g.type,'LineString');
 assert(g.coordinates.length>10,'No puede salir un LineString vacío');
 coordsInBounds(g.coordinates,499995,500030,4199980,4200010);
 assert.deepEqual(g.coordinates[0],[500000,4200000]);
 assert.deepEqual(g.coordinates.at(-1),[500010,4199994]);
});

test('los polígonos candidatos curvos exportan el contorno exterior y un hueco curvo',()=>{
 const f=bezierArea(),{candidateGeoFeature}=makeExports('utm');
 assert.equal(f.curve,'bezier');
 const g=candidateGeoFeature(f).geometry;
 assert.equal(g.type,'Polygon');
 assert.equal(g.coordinates.length,2);
 for(const ring of g.coordinates){
   assert(ring.length>30,'Se deben muestrear las curvas, no vaciarlas');
   assert.deepEqual(ring[0],ring.at(-1),'El anillo debe quedar cerrado');
   coordsInBounds(ring,499995,500025,4199975,4200005);
 }
 assert.notDeepEqual(g.coordinates[0],g.coordinates[1]);
});

test('GeoJSON del mapa conserva también curvatura de agujeros y metadatos Bézier',()=>{
 const f=bezierArea(),exports=makeExports('utm',[f]);
 const all=exports.exportMapData();
 assert.equal(all.type,'FeatureCollection');
 const g=all.features[0];
 assert.equal(g.geometry.type,'Polygon');
 assert.equal(g.geometry.coordinates.length,2);
 assert(g.geometry.coordinates[0].length>30);
 assert(g.geometry.coordinates[1].length>30);
 assert.equal(g.properties.curve_type,'bezier');
 assert.equal(g.properties.bezier_vertices.length,f.points.length);
 assert.deepEqual(g.properties.bezier_vertices[0].coordinates,[500000,4200000]);
 for(const ring of g.geometry.coordinates){
   assert.deepEqual(ring[0],ring.at(-1));
   coordsInBounds(ring,499995,500025,4199975,4200005);
 }
});

test('mapa completo exporta un eje Bézier sin invertir coordenadas intermedias',()=>{
 const f=bezierLine(),{exportMapData}=makeExports('utm',[f]);
 const g=exportMapData().features[0];
 assert.equal(g.geometry.type,'LineString');
 assert(g.geometry.coordinates.length>10);
 coordsInBounds(g.geometry.coordinates,499995,500030,4199980,4200010);
 assert.deepEqual(g.geometry.coordinates[0],[500000,4200000]);
 assert.equal(g.properties.curve_type,'bezier');
});

test('en mosaico LAZ sin mapa georreferenciado usa cloudTransform coherentemente',()=>{
 const f=bezierArea(),exporter=makeExports('cloud',[f],[bezierLine()]);
 const all=exporter.exportMapData();
 assert.equal(all.metadata.coordinate_status,'cloud');
 assert.equal(all.metadata.crs,'EPSG:25830');
 for(const feature of all.features){
   const coords=feature.geometry.type==='Polygon'?feature.geometry.coordinates.flat():feature.geometry.coordinates;
   assert(coords.length>5);
   coordsInBounds(coords,299995,300025,4399970,4400010);
 }
 const candidate=exporter.candidateGeoFeature(bezierLine());
 coordsInBounds(candidate.geometry.coordinates,299995,300025,4399970,4400010);
});

test('las transformaciones respetan el traslado de un objeto y sus agujeros',()=>{
 const f={...bezierArea(),x:10,y:20},exporter=makeExports('utm',[f]);
 const candidate=exporter.candidateGeoFeature(f);
 const full=exporter.exportMapData().features[0];
 assert.deepEqual(candidate.geometry.coordinates[0][0],[500005,4199990]);
 assert.deepEqual(full.geometry.coordinates[0][0],[500005,4199990]);
 assert.deepEqual(full.properties.bezier_vertices[0].coordinates,[500005,4199990]);
 assert.equal(full.geometry.coordinates.length,2);
});

test('los objetos lineales no Bézier siguen exportándose igual',()=>{
 const f={type:'line',symbol:'path',points:[{x:0,y:0},{x:2,y:4}]};
 const exp=makeExports('local',[f]);
 // -0 and +0 identify the same cartographic coordinate. Preserve the
 // exact nonzero geometry while normalizing only the sign of zero.
 const normalizeZero=coords=>coords.map(pair=>pair.map(n=>n===0?0:n));
 assert.deepEqual(normalizeZero(exp.candidateGeoFeature(f).geometry.coordinates),[[0,0],[-2,-4]]);
 assert.deepEqual(normalizeZero(exp.exportMapData().features[0].geometry.coordinates),[[0,0],[-2,-4]]);
});

test('la corrección conserva inventario, botón exportar, CART y KMZ',()=>{
 assert(html.includes("S.candidates.map(candidateGeoFeature)"));
 assert(html.includes("download(result,'ocarto-inventario-elementos-candidatos.geojson'"));
 assert(html.includes("$('exportKmz').onclick"));
 assert(html.includes("$('exportMap').onclick"));
 assert(html.includes('recordMapEdit(before)'));
 assert(html.includes('id="acceptDetectionsEditable"'));
 assert(html.includes("sampledPoints(f.points||[],false)"));
 assert(html.includes("sampledPoints(pts,true):pts"));
});
