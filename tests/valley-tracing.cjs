const assert=require('node:assert/strict'),V=require('../valley-tracing.js');
const cell=2;
const grid=[];for(let j=0;j<70;j++)for(let i=0;i<70;i++){
 const axis=34+7*Math.sin(j/11),offset=i-axis;
 grid.push([(i+.5)*cell,(j+.5)*cell,100+Math.abs(offset)*1.1+j*.1,3,'observado']);
}
const original=JSON.stringify(grid);
const r=V.detect(grid,cell,{minLength:20,minIncision:.55,radius:2});
assert.ok(r.features.length>0,'should find at least one long curved valley');
assert.ok(r.features.some(f=>new Set(f.geometry.coordinates.map(p=>Math.round(p[0]/cell))).size>2),'valley line should curve');
assert.ok(r.features.every(f=>f.properties.length_m>=20));
assert.ok(r.features.every(f=>f.properties.review_required&&!f.properties.apply_automatically));
assert.equal(JSON.stringify(grid),original,'must not modify input MDT');
assert.equal(V.detect(grid,cell,{minLength:10000,minIncision:.55,radius:2}).features.length,0);
const flat=grid.map(r=>[r[0],r[1],2,3,'observado']);assert.equal(V.detect(flat,cell).features.length,0);
const pit=flat.map(r=>r[0]===69&&r[1]===69?[r[0],r[1],0,3,'observado']:r);assert.equal(V.detect(pit,cell).features.length,0);
assert.throws(()=>V.detect(grid,cell,{minLength:0}),/Parámetros/);
console.log('✓ v23 vaguadas curvas, longitud mínima, falsos positivos y MDT intacto:',r.features.length,'ejes');
