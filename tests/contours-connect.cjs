const assert=require('node:assert/strict');const {generate,connect}=require('../contours.js');
const seg=(z,a,b)=>({type:'Feature',properties:{elevation:z},geometry:{type:'LineString',coordinates:[a,b]}});
let r=connect([seg(5,[0,0],[1,0]),seg(5,[2,0],[1,0]),seg(5,[2,0],[3,0])]);
assert.equal(r.lines,1);assert.equal(r.features[0].geometry.coordinates.length,4);
r=connect([seg(5,[0,0],[1,0]),seg(10,[1,0],[2,0])]);assert.equal(r.lines,2);
r=connect([seg(5,[0,0],[1,0]),seg(5,[1,0],[1,1]),seg(5,[1,1],[0,1]),seg(5,[0,1],[0,0])]);assert.equal(r.lines,1);assert.equal(r.closed,1);assert.equal(r.features[0].geometry.coordinates.length,5);
r=connect([seg(5,[0,0],[1,0]),seg(5,[1,0],[2,0]),seg(5,[1,0],[1,1])]);assert.equal(r.lines,3);assert.equal(r.junctions,1);
// Endpoints within tolerance must join even when they land in neighboring spatial-hash buckets.
r=connect([seg(5,[-2,0],[.99,0]),seg(5,[1.01,0],[4,0])],{tolerance:1});assert.equal(r.lines,1);assert.equal(r.features[0].geometry.coordinates.length,3);
assert.throws(()=>connect([seg(5,[0,0],[-5,0]),seg(5,[2,0],[5,0]),seg(5,[1,0],[6,1])],{tolerance:1}),/ambigua/,'no debe adivinar entre dos extremos posibles');
const m=[[0,1,2],[0,1,2],[0,1,2]].flatMap((row,j)=>row.map((z,i)=>[i+.5,j+.5,z,1,'observado']));
r=connect(generate(m,1,.5).features);assert.equal(r.lines,2);assert.equal(r.features.every(f=>f.geometry.coordinates.length===3),true);
assert.throws(()=>connect([seg(5,[0,0],[1,0])],{tolerance:0}),/Tolerancia/);
assert.throws(()=>connect([seg(5,[0,0],[NaN,0])]),/inválido/);
console.log('Contours connection v19: OK');
