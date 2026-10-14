const assert=require('node:assert/strict');
require('../kml-import.js');
const el=(localName,children=[],textContent='')=>({localName,children,textContent});
const coords=s=>el('coordinates',[],s);
const ring=s=>el('LinearRing',[coords(s)]);
const boundary=(name,s)=>el(name,[ring(s)]);
const outer='-3,40,10 -2.9,40,10 -2.9,40.1,10 -3,40,10';
const inner='-2.98,40.02 -2.97,40.02 -2.97,40.03 -2.98,40.02';
const point=el('Point',[coords('-3.1,40.2,20')]);
const line=el('LineString',[coords('-3,40,0 -2.9,40.1,5')]);
const polygon=el('Polygon',[boundary('outerBoundaryIs',outer),boundary('innerBoundaryIs',inner)]);
const multi=el('MultiGeometry',[point,line]);
const doc=placemarks=>({documentElement:el('kml',placemarks)});
const kml=OcartoKml.parseKmlDocument(doc([
  el('Placemark',[el('name',[],'Control'),multi]),
  el('Placemark',[el('name',[],'Bosque'),polygon]),
  el('Placemark',[el('Point',[coords('181,40')])]),
]));
assert.equal(kml.metadata.crs,'EPSG:4326');
assert.deepEqual(kml.features.map(f=>f.geometry.type),['Point','LineString','Polygon']);
assert.equal(kml.features[0].properties.name,'Control');
assert.equal(kml.features[0].geometry.coordinates[2],20);
assert.equal(kml.features[2].geometry.coordinates.length,2);
assert.equal(kml.features[2].geometry.coordinates[1].length,4);
assert.throws(()=>OcartoKml.parseKmlDocument(doc([el('Placemark',[el('Polygon',[boundary('outerBoundaryIs','bad')])])])),/no contiene puntos, líneas o polígonos válidos/);
console.log('OK: KML points, lines, polygons, holes, altitude and invalid geometry handling');
