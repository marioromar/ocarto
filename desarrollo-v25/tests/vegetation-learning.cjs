const assert=require('node:assert/strict'),M=require('../vegetation-learning.js'),V=require('../vectorize-vegetation.js');
const cells=[];for(let i=0;i<14;i++)for(let j=0;j<10;j++){const tall=i<7,cover=tall?.72:.24,h=tall?11:2.6;cells.push({x:i+.5,y:j+.5,ground_points:5,vegetation_points:25,vegetation_return_fraction:cover,canopy_max_above_ground_m:h,canopy_mean_above_ground_m:h*.66,low_veg_points:tall?2:18,medium_veg_points:tall?3:4,high_veg_points:tall?20:3})}
const examples=[{label:'verde3',coordinates:[[[0,0],[4,0],[4,10],[0,10],[0,0]]]},{label:'blanco',coordinates:[[[9,0],[14,0],[14,10],[9,10],[9,0]]]}];
const model=M.train(cells,examples);assert.equal(model.labels.length,2);assert.equal(model.predict(cells[0]),'verde3');assert.equal(model.predict(cells.at(-1)),'blanco');
const fc=V.vectorize(cells,1,{minArea:3,labeler:model.predict});assert.ok(fc.features.some(f=>f.properties.category==='verde3'));assert.ok(fc.features.some(f=>f.properties.category==='blanco'));assert.ok(fc.features.every(f=>f.properties.review_required===true));
assert.throws(()=>M.train(cells,[]),/Muestras insuficientes/);
assert.throws(()=>M.train(cells,[{label:'rojo',coordinates:examples[0].coordinates}]),/no reconocida/);
assert.throws(()=>M.train(cells,[{label:'verde3',coordinates:[examples[0].coordinates[0],[[1,1],[2,1],[NaN,2]]]}]),/Polígono de aprendizaje inválido/);
assert.throws(()=>M.train(cells,[{label:'verde3',coordinates:[[[0,0],[4,0],[4,10],[0,10],[0,0]],[[1,1],[2,1]]]}]),/Polígono de aprendizaje inválido/);
assert.throws(()=>M.train(cells,[{label:'verde3',coordinates:[[...Array(250001)].map(()=>[0,0])]}]),/demasiado complejo/);
assert.equal(M.inPolygon(2,2,[[[0,0],[4,0],[4,4],[0,4]],[[1,1],[3,1],[3,3],[1,3]]]),false,'interior rings stay excluded');

const one=M.train(cells,[examples[0]]);assert.equal(one.predict(cells[0]),'verde3');assert.equal(one.predict(cells.at(-1)),null,'single class must not paint unrelated cells');
assert.deepEqual(M.fingerprint({ground_points:5,vegetation_points:0,canopy_max_above_ground_m:null,canopy_mean_above_ground_m:null,vegetation_return_fraction:0}),[0,0,0,0,0,0]);
console.log('✓ v25 aprendizaje LiDAR: etiquetas supervisadas, filtro de muestras, predicción conservadora y vectorización');
