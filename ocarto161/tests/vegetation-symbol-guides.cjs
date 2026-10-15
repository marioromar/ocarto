const assert=require('node:assert/strict');
const G=require('../vegetation-symbol-guides.js');
const catalog=[{id:'open-land',code:'401'},{id:'forest-white',code:'405'},{id:'orchard',code:'413'},{id:'unknown',code:'999'}];
const features=[
 {type:'area',symbol:'open-land',points:[{x:0,y:0},{x:2,y:0},{x:2,y:2}],holes:[]},
 {type:'area',symbol:'forest-white',points:[{x:3,y:0},{x:5,y:0},{x:5,y:2}],holes:[]},
 {type:'area',symbol:'orchard',points:[{x:6,y:0},{x:8,y:0},{x:8,y:2}],holes:[]},
 {type:'area',symbol:'unknown',points:[{x:9,y:0},{x:11,y:0},{x:11,y:2}]},
 {type:'line',symbol:'open-land',points:[{x:0,y:0},{x:1,y:1}]},
 {type:'area',aiVegetationLabel:'matorral',points:[{x:12,y:0},{x:14,y:0},{x:14,y:2}]}
];
const result=G.collect(features,{catalog,worldRing:ring=>ring.map(p=>[p.x+100,p.y+200])});
assert.equal(result.matchedFeatures,4);
assert.deepEqual(result.labelCounts,{amarillo:1,blanco:1,frutales:1,matorral:1});
assert.deepEqual(result.symbolCounts,{401:1,405:1,413:1});
assert.deepEqual(result.polygons[0].coordinates[0][0],[100,200]);
assert.equal(G.codeFor({symbol:'forest-white'},catalog).toString(),'405');
const filtered=G.collect(features,{catalog,worldRing:ring=>ring.map(p=>[p.x,p.y]),includeFeature:f=>f.symbol!=='open-land'});assert.equal(filtered.matchedFeatures,3);assert.equal(filtered.labelCounts.amarillo,undefined);
console.log('✓ inspección de símbolos de área y conversión en ejemplos LiDAR sin editar el mapa');
