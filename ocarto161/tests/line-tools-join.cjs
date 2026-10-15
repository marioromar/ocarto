const assert=require('assert');const T=require('../line-tools.js');assert.deepStrictEqual(T.join([[0,0],[1,0]],[[1,0],[2,0]]),[[0,0],[1,0],[2,0]]);console.log('✓ unión de líneas por extremos');
