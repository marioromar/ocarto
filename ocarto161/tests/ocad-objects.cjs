const assert=require('node:assert/strict');
const {parseOcadObjects}=require('../ocad-objects.js');
function makeMap({version=12,objectType=3,objectCount=4,setup='m10000.000000\tx100000\ty2000000\te32630'}={}){
 const legacy=version===10||version===11,headerSize=legacy?48:60,objectHeader=legacy?40:56;
 const b=new ArrayBuffer(16000),v=new DataView(b),bytes=new Uint8Array(b);v.setInt16(0,3245,true);v.setUint16(4,version,true);v.setUint32(12,128,true);v.setUint32(32,60,true);
 v.setUint32(60,0,true);const text=new TextEncoder().encode(setup);v.setUint32(64,5000,true);v.setInt32(68,text.length,true);v.setInt32(72,1039,true);bytes.set(text,5000);
 const pts=[[0,0,0,0],[100,0,0,0],[100,100,0,0],[0,100,0,0]];const data=12000;v.setInt32(148,data,true);v.setInt32(152,legacy?objectCount:objectHeader+objectCount*8,true);v.setInt32(156,401000,true);v.setUint8(160,objectType);v.setUint8(161,0);v.setUint8(162,1);
 v.setInt32(data,401000,true);v.setUint8(data+4,objectType);v.setUint32(data+(legacy?8:44),objectCount,true);for(let i=0;i<objectCount;i++){v.setInt32(data+objectHeader+i*8,pts[i%pts.length][0]<<8,true);v.setInt32(data+objectHeader+4+i*8,pts[i%pts.length][1]<<8,true)}return bytes
}
let r=parseOcadObjects(makeMap());assert.equal(r.version,12);assert.equal(r.setup.crs,'EPSG:32630');assert.equal(r.setup.scale,10000);assert.equal(r.areaCount,1);assert.equal(r.objects[0].symbolCode,'401.000');assert.deepEqual(r.objects[0].geometry.coordinates[0][0],[100000,2000000]);assert.deepEqual(r.objects[0].geometry.coordinates[0].at(-1),[100000,2000000]);
r=parseOcadObjects(makeMap({version:2018}));assert.equal(r.version,2018);
for(const version of [10,11]){r=parseOcadObjects(makeMap({version,setup:'m10000.000000\tx100000\ty2000000\tr1\ti30'}));assert.equal(r.version,version);assert.equal(r.setup.crs,null);assert.equal(r.setup.georeferenced,true);assert.equal(r.setup.grid,30);assert.equal(r.areaCount,1);assert.deepEqual(r.objects[0].geometry.coordinates[0][0],[100000,2000000])}
assert.equal(parseOcadObjects(makeMap({version:10,setup:'m15000\tx500000\ty4000000\tr0'})).setup.georeferenced,false);
assert.throws(()=>parseOcadObjects(new Uint8Array(20)),/truncado/);
assert.throws(()=>parseOcadObjects(makeMap({setup:'m10000 x100000 y2000000'})),/no declara/);
assert.throws(()=>parseOcadObjects(makeMap({version:2019})),/no admitido/);
assert.equal(parseOcadObjects(makeMap({objectType:2})).areaCount,0);
const cyc=makeMap();new DataView(cyc.buffer).setInt32(128,128,true);assert.throws(()=>parseOcadObjects(cyc),/circular/);
console.log('OK: polígonos OCAD 10/11/12/2018, escala/origen/CRS, cierre de anillo y guardas de entrada');
