const assert=require('node:assert/strict');const {generate}=require('../contours.js');
const model=(arr)=>arr.flatMap((row,j)=>row.map((z,i)=>z===null?null:[i+.5,j+.5,z,2,'observado']).filter(Boolean));
let r=generate(model([[0,1],[0,1]]),1,.5);assert.equal(r.segments,1);assert.equal(r.features[0].properties.elevation,.5);assert.deepEqual(r.features[0].geometry.coordinates,[[1,.5],[1,1.5]]);
r=generate(model([[0,1],[null,1]]),1,.5);assert.equal(r.segments,0);assert.ok(r.skipped>0);
r=generate(model([[0,2],[2,0]]),1,1);assert.equal(r.segments,2);assert.ok(r.features.every(x=>x.geometry.coordinates.length===2));
r=generate(model([[10,10],[10,10]]),1,1);assert.equal(r.segments,0);
assert.throws(()=>generate(model([[0,1],[0,1]]),1,0));
assert.throws(()=>generate(model([[0,1],[0,1]]),1,.01,{maxSegments:1}),/Demasiados/);
console.log('Contours v18: OK');
