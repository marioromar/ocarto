'use strict';
const assert=require('node:assert/strict');
const {distributeAlongPath}=require('../distribute-tools.js');
const result=distributeAlongPath([[0,0],[3,0],[3,4]],2);
assert.equal(result.length,7);assert.deepEqual(result.positions.map(p=>[p.x,p.y]),[[2,0],[3,1],[3,3]]);
assert.throws(()=>distributeAlongPath([[0,0],[1,0]],0),/mayor que cero/);
assert.throws(()=>distributeAlongPath([[0,0],[100,0]],.01,{maxCount:5}),/máximo/);
assert.throws(()=>distributeAlongPath([[1,1],[1,1]],1),/longitud/);
console.log('✓ copias a separación fija sobre líneas rectas y vértices');
