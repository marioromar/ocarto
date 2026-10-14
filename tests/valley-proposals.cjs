const assert=require('node:assert/strict');const V=require('../valley-proposals.js');
function grid(fn){const a=[];for(let y=0;y<7;y++)for(let x=0;x<7;x++)a.push([x+.5,y+.5,fn(x,y),3,'observado']);return a}
const valley=grid((x,y)=>Math.abs(x-3)*1.1+y*.1);
const before=JSON.stringify(valley),out=V.detect(valley,1,{minIncision:.6,maxProposal:1});
assert.ok(out.features.length>=3,'a continuous incised axis should yield candidates');
assert.ok(out.features.some(f=>f.properties.axis==='NS'&&f.geometry.coordinates[0]===3.5));
assert.ok(out.features.every(f=>f.properties.review_required&&f.properties.apply_automatically===false));
assert.ok(out.features.every(f=>f.properties.possible_extra_depth_max_m<=1));
assert.equal(JSON.stringify(valley),before,'must not alter terrain');
assert.equal(V.detect(grid(()=>10),1).features.length,0,'flat ground: no candidate');
const pit=grid((x,y)=>x===3&&y===3?6:10);
assert.equal(V.detect(pit,1).features.length,0,'isolated pit: not valley');
const missing=valley.filter(r=>!(r[0]===4.5&&r[1]===3.5));
assert.ok(V.detect(missing,1).features.length<out.features.length);
const synthetic=valley.map(p=>p[0]===4.5?[...p.slice(0,4),'interpolado']:p);
assert.ok(V.detect(synthetic,1).features.length<out.features.length);
assert.throws(()=>V.detect(valley,1,{maxProposal:10}),/Parámetros/);
console.log('✓ v22: detección conservadora de vaguadas; sin modificación automática del MDT');
