'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {parse}=require('../ocad-editable');
const {inspect}=require('../ocad-catalog-review');
function fixture() {
  const b=new Uint8Array(22000),v=new DataView(b.buffer);
  const u16=(p,n)=>v.setUint16(p,n,true),u32=(p,n)=>v.setUint32(p,n,true);
  const i32=(p,n)=>v.setInt32(p,n,true),u8=(p,n)=>v.setUint8(p,n);
  u16(0,0x0cad);u16(4,2018);u32(8,11000);u32(12,128);u32(32,13000);
  u32(11004,17600);i32(17600,820);i32(17604,401000);u8(17608,3);
  u16(17626,1);u16(17628,1);u16(17600+800,1);u8(17600+814,1);
  const name='Vegetación';for(let i=0;i<name.length;i++)u16(17656+i*2,name.charCodeAt(i));
  const param=(i,p,type,str)=>{const at=13004+i*16;u32(at,p);i32(at+4,str.length+1);
    i32(at+8,type);for(let j=0;j<str.length;j++)u8(p+j,str.charCodeAt(j))};
  param(0,19700,1039,'\tm10000\tx385000\ty4114000\te32630\tr1');
  param(1,19800,9,'Green\tn1\tc80\tm0\ty80\tk0\to0\tt100');
  param(2,20000,9,'Black\tn2\tc0\tm0\ty0\tk100\to1\tt100');
  u32(128+4+16,19000);u32(128+4+20,132);i32(128+4+24,401000);
  u8(128+4+28,3);u8(128+4+30,1);
  i32(19000,401000);u8(19004,3);u8(19005,1);u32(19000+44,4);
  for(let i=0;i<4;i++) {i32(19056+i*8,(i%2?100:0)*256);i32(19060+i*8,(i>1?100:0)*256)}
  return b;
}
const parsed=parse(fixture()),snapshot=JSON.stringify(parsed.colors)+JSON.stringify(parsed.symbols);
const report=inspect(parsed,'Bobadilla-fixture.ocd');
assert.equal(report.valid,true);
assert.equal(report.totals.symbols,1);assert.equal(report.totals.colors,2);
assert.equal(report.totals.objects,1);assert.equal(report.colors[0].printIndex,1);
assert.equal(report.colors[0].provisionalPriority,2);
assert.equal(report.colors[1].printIndex,2);assert.equal(report.applied,false);
assert.equal(report.approved,false);
assert.equal(JSON.stringify(parsed.colors)+JSON.stringify(parsed.symbols),snapshot,'El análisis no puede modificar los datos leídos');
const duplicate={...parsed,colors:[...parsed.colors,parsed.colors[0]]};
assert.equal(inspect(duplicate).valid,false);
const missing={...parsed,symbols:[{...parsed.symbols[0],inks:[777]}]};
assert.equal(inspect(missing).totals.missingInks,1);
assert.throws(()=>inspect({version:2018,symbols:null,colors:[]}),/estructura válida/);
const dir=process.env.OCARTO_OCAD_REAL_DIR;
if (dir) for(const filename of ['bobadilla E.ocd','Bobadillla.ocd','bobadilla E 7 oct ocd11.ocd']) {
  const p=path.join(dir,filename);
  if (!fs.existsSync(p))continue;
  const real=inspect(parse(fs.readFileSync(p)),filename);
  assert.equal(real.totals.symbols,218,filename);
  assert.equal(real.totals.colors,45,filename);
  assert.equal(real.applied,false);
  console.log('✓ Catálogo OCAD real: '+filename+' — '+real.totals.symbols+' símbolos, '+real.totals.colors+' tintas');
}
console.log('✓ v249: comparación OCAD, orden, errores, tintas ausentes y catálogo intacto');
