const assert=require('node:assert/strict');
const JSZip=require('../vendor/jszip.min.js');
const crs=require('../geo-crs.js');
const exporter=require('../kml-export.js');
(async()=>{
 const data={name:'Mapa & bosque',metadata:{coordinate_status:'georeferenced',crs:'EPSG:25830',vector_layers:[{name:'Oculta',visible:false}]},features:[
  {type:'Feature',geometry:{type:'Point',coordinates:[500000,4427757.218738]},properties:{symbol:'417*',symbol_name:'Árbol <grande>',vector_layer:'Puntos'}},
  {type:'Feature',geometry:{type:'Polygon',coordinates:[[[500000,4427757],[500100,4427757],[500100,4427857],[500000,4427757]],[[500020,4427780],[500030,4427780],[500030,4427790],[500020,4427780]]]},properties:{symbol:'vegetation',vector_layer:'Bosque'}},
  {type:'Feature',geometry:{type:'Point',coordinates:[500000,4427757]},properties:{vector_layer:'Oculta'}}
 ]};
 const kml=exporter.geoJsonToKml(data,crs.transformCoordinate);
 assert.match(kml,/<name>Mapa &amp; bosque<\/name>/);
 assert.match(kml,/Árbol &lt;grande&gt;/);
 assert.match(kml,/<innerBoundaryIs>/);
 assert.doesNotMatch(kml,/<name>Oculta<\/name>/);
 assert.match(kml,/<coordinates>-3,40/);
 await assert.rejects(Promise.resolve().then(()=>exporter.geoJsonToKml({...data,metadata:{coordinate_status:'local'}},crs.transformCoordinate)),/georreferencia/);
 await assert.rejects(Promise.resolve().then(()=>exporter.geoJsonToKml({...data,metadata:{coordinate_status:'georeferenced',crs:'EPSG:26911'}},crs.transformCoordinate)),/requiere EPSG/);
 const blob=await exporter.toKmz(kml,JSZip),zip=await JSZip.loadAsync(await blob.arrayBuffer());
 assert.equal(await zip.file('doc.kml').async('string'),kml);
 console.log('OK: KMZ exports georeferenced UTM map, polygon holes, XML escaping and doc.kml archive');
})().catch(err=>{console.error(err);process.exitCode=1});
