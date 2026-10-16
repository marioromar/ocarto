'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const importer=require('../ocad-editable.js');
function toFeatures(data){return data.objects.map(obj=>{
  const f={type:obj.type==='text'?'point':obj.type,angle:obj.angle,symbolCode:obj.symbolCode,
    x:['point','text'].includes(obj.type)?obj.points[0].x:0,
    y:['point','text'].includes(obj.type)?obj.points[0].y:0,
    points:['point','text'].includes(obj.type)?undefined:obj.points.map(p=>({...p})),
    holes:obj.holes.map(r=>r.map(p=>({...p}))),
    properties:{ocadSourceIndexOffset:obj.sourceIndexOffset}};
  if(obj.type==='text')f.ocadText=obj.text||'';
  f.properties.ocadBaseline=importer.geometrySignature(f);
  return f;
});}
const files=['bobadilla E.ocd','Bobadillla.ocd','bobadilla E 7 oct ocd11.ocd'];
const fixtureDir=process.env.OCARTO_OCAD_REAL_DIR;
if(fixtureDir){for(const file of files){
  const source=fs.readFileSync(path.join(fixtureDir,file)),parsed=importer.parse(source),features=toFeatures(parsed);
  // No changes: output should be identical to original, byte for byte.
  const original=importer.exportEdited(source,parsed,features);
  assert.deepEqual(original.report,{changed:0,deleted:0,added:0,unchanged:parsed.objects.length,warnings:[],verifiedObjects:parsed.report.imported});
  assert.deepEqual(Buffer.from(original.bytes),source);
  const line=features.find(f=>f.type==='line'&&f.points.length>2);
  assert.ok(line);const originalX=line.points[0].x;line.points[0].x+=0.25;
  const targetOffset=line.properties.ocadSourceIndexOffset;
  const copy=structuredClone(line);copy.properties={};copy.points=copy.points.map(v=>({...v,x:v.x+25}));
  features.push(copy);
  const removed=features.findIndex(f=>f.type==='area');const deletedOffset=features[removed].properties.ocadSourceIndexOffset;
  features.splice(removed,1);
  const edited=importer.exportEdited(source,parsed,features),reopen=importer.parse(edited.bytes);
  assert.equal(edited.report.changed,1,file);assert.equal(edited.report.added,1,file);assert.equal(edited.report.deleted,1,file);
  assert.equal(reopen.report.imported,parsed.report.imported,file);
  const modified=reopen.objects.find(o=>o.sourceIndexOffset===targetOffset);assert.ok(modified);assert.ok(Math.abs(modified.points[0].x-originalX-0.25)<.012);
  assert.ok(!reopen.objects.some(o=>o.sourceIndexOffset===deletedOffset));
  assert.equal(reopen.colors.length,parsed.colors.length);assert.equal(reopen.symbols.length,parsed.symbols.length);
  console.log('✓ Real roundtrip '+file+': '+edited.report.verifiedObjects+' objetos, 1 modificación, 1 eliminación, 1 alta');
}}
console.log('✓ Exportador binario OCAD: preservación de elementos sin cambios y geometrías editadas');