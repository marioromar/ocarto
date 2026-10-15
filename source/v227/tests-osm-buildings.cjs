'use strict';
const assert=require('node:assert/strict');
const {osmBuildingQuery,parseOsmBuildingWays}=require('../osm-buildings.js');
const query=osmBuildingQuery([[40,-3],[40,-2.999],[40.001,-2.999],[40,-3]]);
assert.match(query,/way\["building"\]/);
assert.match(query,/40\.0000000 -3\.0000000/);
assert.throws(()=>osmBuildingQuery([[91,0],[0,1],[1,0]]),/coordenadas/);
const result=parseOsmBuildingWays({elements:[
  {type:'way',id:12,tags:{building:'yes','building:levels':'2'},geometry:[{lat:40,lon:-3},{lat:40,lon:-2.999},{lat:40.001,lon:-2.999},{lat:40,lon:-3}]},
  {type:'way',id:13,tags:{highway:'residential'},geometry:[{lat:40,lon:-3},{lat:40,lon:-2.999},{lat:40.001,lon:-2.999},{lat:40,lon:-3}]},
  {type:'node',id:14,tags:{building:'yes'}}
]});
assert.equal(result.features.length,1);
assert.equal(result.features[0].properties.osm_id,12);
assert.equal(result.features[0].geometry.coordinates[0].length,4);
assert.equal(result.features[0].properties.review_required,true);
console.log('✓ edificios OSM: consulta poligonal y conversión de huellas way con atribución y revisión');
