const assert=require('assert');
const T=require('../line-tools.js');
const p=T.parallel([[0,0],[10,0]],2);
assert.deepStrictEqual(p,[[0,2],[10,2]]);
assert.deepStrictEqual(T.reverse([[0,0],[1,2]]),[[1,2],[0,0]]);
console.log('✓ herramientas de línea: paralela y reversión');
