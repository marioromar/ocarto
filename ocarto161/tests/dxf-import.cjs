const assert=require('node:assert/strict');
const {parseDxf}=require('../dxf-import.js');
const text=pairs=>pairs.join('\n')+'\n';
const ent=(type,...pairs)=>[0,type,...pairs.flat()];
const source=text([
 ...ent('SECTION',2,'HEADER',9,'$INSUNITS',70,4,0,'ENDSEC'),
 ...ent('SECTION',2,'ENTITIES'),
 ...ent('POINT',8,'Control',10,1000,20,2000),
 ...ent('LINE',8,'Camino',10,0,20,0,11,10,21,5),
 ...ent('LWPOLYLINE',8,'Area',70,1,10,0,20,0,10,10000,20,0,10,10000,20,10000),
 ...ent('CIRCLE',8,'Curva',10,0,20,0,40,1000),
 ...ent('ARC',8,'Arco',10,0,20,0,40,1000,50,350,51,10),
 ...ent('POLYLINE',8,'Legacy',70,1),
 ...ent('VERTEX',10,0,20,0),...ent('VERTEX',10,10,20,0),...ent('VERTEX',10,10,20,10),...ent('SEQEND'),
 ...ent('SPLINE',8,'Unsupported'),
 ...ent('ENDSEC'),...ent('EOF')
]);
const parsed=parseDxf(source,{referenced:true,mapCrs:'EPSG:25830'});
assert.equal(parsed.metadata.crs,'EPSG:25830');
assert.equal(parsed.metadata.dxf_units_factor,.001);
assert.equal(parsed.features.length,6);
assert.equal(parsed.skipped,1);
assert.deepEqual(parsed.features[0].geometry.coordinates,[1,2]);
assert.deepEqual(parsed.features[1].geometry.coordinates,[[0,0],[.01,.005]]);
assert.equal(parsed.features[2].geometry.type,'Polygon');
assert.equal(parsed.features[2].properties.dxf_layer,'Area');
assert.deepEqual(parsed.metadata.layers,['Control','Camino','Area','Curva','Arco','Legacy']);
assert.equal(parsed.features[2].geometry.coordinates[0].length,4);
assert.equal(parsed.features[3].geometry.coordinates[0].length,37);
assert.equal(parsed.features[4].geometry.type,'LineString');
assert.ok(parsed.features[4].geometry.coordinates.length>=3);
assert.equal(parsed.features[5].geometry.type,'Polygon');
assert.equal(parsed.features[5].properties.dxf_layer,'Legacy','la polilínea POLYLINE debe conservar su capa');
const local=parseDxf(text([...ent('SECTION',2,'ENTITIES'),...ent('POINT',10,5,20,7),...ent('ENDSEC')]),{});
assert.equal(local.metadata.coordinate_status,'local');
assert.throws(()=>parseDxf(source,{referenced:true}),/Indica el CRS/);
assert.throws(()=>parseDxf('AutoCAD Binary DXF\r\n\0'),/DXF binario/);
assert.throws(()=>parseDxf(text([...ent('SECTION',2,'ENTITIES'),...ent('SPLINE'),...ent('ENDSEC')])),/No se encontraron entidades/);
console.log('OK: DXF ASCII entidades, capas retenidas, polilíneas, CIRCLE/ARC, unidades y CRS');
