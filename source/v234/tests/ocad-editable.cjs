'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parse} = require('../ocad-editable');
function fixture(version=2018) {
  const bytes=new Uint8Array(22000),d=new DataView(bytes.buffer),u8=(o,v)=>d.setUint8(o,v),u16=(o,v)=>d.setUint16(o,v,true),u32=(o,v)=>d.setUint32(o,v,true),i32=(o,v)=>d.setInt32(o,v,true);
  u16(0,0x0cad);u16(4,version);u32(8,11000);u32(12,128);u32(32,13000);
  u32(11004,17600);
  i32(17600,820);i32(17604,401000);u8(17608,3);u16(17626,1);u16(17628,1);
  const symName='Área de prueba';for(let i=0;i<symName.length;i++)u16(17656+i*2,symName.charCodeAt(i));i32(17600+796,0);u16(17600+800,1);u8(17600+814,1);
  const param=(entry,p,type,text)=>{const at=13004+entry*16;u32(at,p);u32(at+4,text.length+1);i32(at+8,type);for(let i=0;i<text.length;i++)u8(p+i,text.charCodeAt(i));};
  param(0,19900,1039,'\tm10000\tx385000\ty4114000\te32630\tr1');
  param(1,20000,9,'Green\tn1\tc80\tm0\ty80\tk0\to0\tt100');
  const objectPos=19000,record=132,entry=132;
  u32(entry+16,objectPos);u32(entry+20,record);i32(entry+24,401000);u8(entry+28,3);u8(entry+30,1);
  i32(objectPos,401000);u8(objectPos+4,3);u8(objectPos+5,1);
  const count=4,header=version===2018||version===12?56:40;
  u32(objectPos+(header===56?44:8),count);
  for(const [j,x,y,xf,yf] of [[0,0,0,0,0],[1,100,0,0,0],[2,100,100,0,0],[3,0,100,0,0]]){
    i32(objectPos+header+j*8,x*256+xf);i32(objectPos+header+j*8+4,y*256+yf);
  }
  return bytes;
}
const sample=parse(fixture());assert.equal(sample.version,2018);assert.equal(sample.report.imported,1);
assert.equal(sample.report.symbols,1);assert.equal(sample.report.colors,1);
assert.equal(sample.objects[0].type,'area');assert.equal(sample.objects[0].symbolNo,401000);
assert.equal(sample.objects[0].points.length,4);assert.equal(sample.setup.crs,'EPSG:32630');
assert.equal(sample.objects[0].symbol.fillOn,true);
const old=parse(fixture(11));assert.equal(old.version,11);assert.equal(old.report.imported,1);
const corrupted=fixture();corrupted[0]=0;assert.throws(()=>parse(corrupted),/OCAD válido/);
const names=['bobadilla E.ocd','Bobadillla.ocd','bobadilla E 7 oct ocd11.ocd'];
const fixtureDir=process.env.OCARTO_OCAD_REAL_DIR;
if(fixtureDir){
 for(const name of names){const file=path.join(fixtureDir,name);if(!fs.existsSync(file))continue;const result=parse(fs.readFileSync(file));assert.equal(result.report.symbols,218);assert.equal(result.report.colors,45);assert.ok(result.report.imported>5000);assert.ok(result.report.curves>1000);console.log(`  ${name}: ${result.report.imported} objetos, ${result.report.curves} tramos Bézier`)}
}
console.log('✓ OCAD 2018/11: encabezados, índices, geometría, tintas, símbolos y archivos reales');