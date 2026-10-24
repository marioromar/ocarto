'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {rotate180}=require('../selection-rotate-180.js');

test('gira selección mixta alrededor del centro común y conserva huecos y tangentes',()=>{
 const line={type:'line',x:10,y:5,points:[
  {x:0,y:0,tangent:{x:1,y:2},rawX:1,rawY:2},{x:4,y:0}
 ],holes:[[{x:1,y:1}]]};
 const point={type:'point',x:20,y:5,rawX:3,rawY:4};
 const result=rotate180([line,point],{toWorld:p=>({x:p.x+1000,y:p.y+2000})});
 assert.deepEqual(result,{center:{x:15,y:5.5},count:2});
 assert.deepEqual(line.points[0],{x:10,y:1,tangent:{x:-1,y:-2},rawX:1020,rawY:2006});
 assert.deepEqual(line.points[1],{x:6,y:1,rawX:1016,rawY:2006});
 assert.deepEqual(line.holes,[[{x:9,y:0,rawX:1019,rawY:2005}]]);
 assert.deepEqual(point,{type:'point',x:10,y:6,rawX:1010,rawY:2006});
});

test('un punto aislado conserva su coordenada de origen al girar sobre sí mismo',()=>{
 const point={type:'point',x:1,y:2,rawX:500001,rawY:4100002};
 rotate180([point]);
 assert.deepEqual(point,{type:'point',x:1,y:2,rawX:500001,rawY:4100002});
});

test('rechaza selecciones vacías o sin geometría',()=>{
 assert.throws(()=>rotate180([]),/Selecciona objetos editables/);
 assert.throws(()=>rotate180([{type:'line',points:[]}]),/no contiene geometría/);
});
