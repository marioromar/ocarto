const assert=require('node:assert/strict');
const {combine,inferGroup}=require('../lidar-detection-catalog.js');
const fc=(name,features)=>({type:'FeatureCollection',name,features});
const feature=(kind,geometry={type:'Point',coordinates:[1,2]})=>({type:'Feature',geometry,properties:{kind,review_required:false,auto_accept:true}});
const result=combine([
 {source:'LiDAR claro',collection:fc('claros',[feature('claro-candidato')])},
 {source:'LiDAR clases',collection:fc('construcciones',[feature('edificio-candidato-por-clase-lidar'),feature('tendido-electrico-candidato-por-clase-lidar',{type:'LineString',coordinates:[[0,0],[1,1]]})])},
 fc('relieve',[feature('roca-candidata-relieve-lidar'),feature('arroyo-canal-surco-candidato',{type:'LineString',coordinates:[[0,0],[0,1]]})])
],{crs:'EPSG:32630',coordinate_status:'georeferenced'});
assert.equal(result.features.length,5);
assert.deepEqual(result.properties.counts,{vegetacion:1,construido:1,infraestructura:1,relieve:1,hidrografia_o_surco:1});
assert.equal(result.metadata.crs,'EPSG:32630');assert.equal(result.properties.deduplicated,false);
assert.ok(result.features.every(f=>f.properties.review_required===true&&f.properties.auto_accept===false));
assert.equal(result.features[0].properties.source_detection,'LiDAR claro');
assert.equal(inferGroup({kind:'posible camino por ortofoto'}),'road');
assert.throws(()=>combine([fc('rota',[{type:'Feature',geometry:null,properties:{}}])]),/incompleta/);
assert.throws(()=>combine([{}]),/FeatureCollection/);
console.log('✓ inventario común: vegetación y elementos humanos, procedencia conservada, revisión obligatoria y ninguna aceptación automática');
