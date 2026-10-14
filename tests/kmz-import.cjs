const assert=require('node:assert/strict');
const JSZip=require('../vendor/jszip.min.js');
require('../kml-import.js');
const makeFile=async entries=>{const zip=new JSZip();for(const [name,data] of entries)zip.file(name,data);const buffer=await zip.generateAsync({type:'arraybuffer'});return{size:buffer.byteLength,arrayBuffer:async()=>buffer}};
(async()=>{
 const file=await makeFile([['files/map.kml','nested'],['doc.kml','<kml>main</kml>'],['images/icon.png','x']]);
 assert.equal(await OcartoKml.extractKmzKml(file,JSZip),'<kml>main</kml>');
 const one=await makeFile([['folder/only.kml','single']]);
 assert.equal(await OcartoKml.extractKmzKml(one,JSZip),'single');
 const ambiguous=await makeFile([['a.kml','a'],['b.kml','b']]);
 await assert.rejects(OcartoKml.extractKmzKml(ambiguous,JSZip),/varios KML/);
 const empty=await makeFile([['notes.txt','none']]);
 await assert.rejects(OcartoKml.extractKmzKml(empty,JSZip),/no contiene ningún archivo KML/);
 await assert.rejects(OcartoKml.extractKmzKml({size:100*1024*1024+1,arrayBuffer:async()=>new ArrayBuffer(0)},JSZip),/menos de 100 MB/);
 console.log('OK: KMZ selects doc.kml, handles a single KML and rejects ambiguous, missing or oversized input');
})().catch(err=>{console.error(err);process.exitCode=1});
