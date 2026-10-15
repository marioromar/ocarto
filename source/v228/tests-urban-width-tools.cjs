'use strict';
const assert=require('node:assert/strict');
const {offsetRing}=require('../urban-width-tools.js');
const square=[[0,0],[10,0],[10,10],[0,10]];
const expanded=offsetRing(square,.5),inset=offsetRing(square,-.2);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ≈ ${b}`);
for(const [i,p] of [[-.5,-.5],[10.5,-.5],[10.5,10.5],[-.5,10.5]].entries()){near(expanded[i][0],p[0]);near(expanded[i][1],p[1])}
for(const [i,p] of [[.2,.2],[9.8,.2],[9.8,9.8],[.2,9.8]].entries()){near(inset[i][0],p[0]);near(inset[i][1],p[1])}
assert.ok(Math.abs((expanded[1][0]-expanded[0][0])-11)<1e-10);
assert.throws(()=>offsetRing([[0,0],[1,0],[2,0]],.5),/área nula/);
console.log('✓ ajuste urbano: ampliación de calles y estrechamiento métrico de polígonos');
