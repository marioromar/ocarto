const assert=require('node:assert/strict'),M=require('../road-align.js');
const width=120,height=80,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,road=y>=36&&y<=42;data[i]=road?205:34;data[i+1]=road?195:95;data[i+2]=road?170:30;data[i+3]=255}
const img={width,height,data},g={a:1,b:0,c:0,d:0,e:-1,f:80}; // image row 40 => world y40
const source=[[10,35],[35,35],[60,35],[85,35],[110,35]],copy=JSON.stringify(source);
const f=M.align(source,img,g,{referenceRGB:[205,195,170],maxShift:9,sampleStep:2,smoothness:.28});
assert.equal(f.geometry.type,'LineString');assert.equal(f.properties.apply_automatically,false);assert.equal(JSON.stringify(source),copy);
assert.equal(f.geometry.coordinates[0][1],35);assert.equal(f.geometry.coordinates.at(-1)[1],35);
const middle=f.geometry.coordinates.slice(5,-5);const mean=middle.reduce((s,p)=>s+p[1],0)/middle.length;assert.ok(mean>=37&&mean<=45,`fitted center follows bright strip, got y=${mean}`);
assert.ok(f.properties.gain_score>0);
assert.throws(()=>M.align(source,img,{a:0,b:0,c:0,d:0,e:0,f:0}),/no invertible/);
assert.throws(()=>M.align([[0,0]],img,g),/inválida/);
console.log('✓ v24 caminos: ajuste guiado, continuidad, endpoints, original intacto, errores');
