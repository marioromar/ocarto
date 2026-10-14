const assert=require('node:assert/strict'),S=require('../vectorize-structures.js');
const rows=[];for(let i=0;i<8;i++)for(let j=0;j<8;j++){const building=i>=2&&i<=5&&j>=2&&j<=5;rows.push({x:i*5+2.5,y:j*5+2.5,ground_points:3,vegetation_points:4,vegetation_return_fraction:.3,canopy_max_above_ground_m:4,building_points:building?5:0,building_height_above_ground_m:building?8:null,wire_points:j===0?4:0,tower_points:i===3&&j===0?1:0})}
const r=S.extract(rows,5,{minRoofArea:35,minWireLength:20});assert.equal(r.properties.buildings,1);assert.equal(r.properties.power_lines,1);assert.equal(r.properties.power_tower_cells,1);assert.equal(r.features.length,3);assert.ok(r.features.every(f=>f.properties.review_required===true));assert.ok(r.features.every(f=>f.properties.apply_automatically===false));
assert.equal(r.features[0].geometry.type,'Polygon');assert.equal(r.features[1].geometry.type,'LineString');assert.equal(r.features[2].geometry.type,'Point');
const empty=S.extract(rows.map(p=>({...p,building_points:0,wire_points:0,tower_points:0})),5);assert.equal(empty.features.length,0);
assert.throws(()=>S.extract(rows,5,{minRoofPoints:0}),/inválidos/);
console.log('✓ v26 construcciones: clase 6 poligonal, tendidos 14, apoyos 15, ningún objeto inventado');
