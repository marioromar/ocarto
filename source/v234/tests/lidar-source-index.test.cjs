'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {parseBounds,indexFiles,forWindow,intersects,unionBounds,envelopeAoi,needsTiling}=require('../lidar-source-index.js');
const plan=require('../lidar-tile-plan.js').plan;
const fixtures=path.join(__dirname,'fixtures');
function fromFixture(name){
  const data=fs.readFileSync(path.join(fixtures,name));
  return Object.assign(new Blob([data]),{name});
}
function synthetic(name,bounds) {
  const bytes=Buffer.from(fs.readFileSync(path.join(fixtures,'1815.las')));
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  view.setFloat64(179,bounds.maxX,true);
  view.setFloat64(187,bounds.minX,true);
  view.setFloat64(195,bounds.maxY,true);
  view.setFloat64(203,bounds.minY,true);
  return Object.assign(new Blob([bytes]),{name});
}
test('LAS y LAZ reales se indexan leyendo solo 227 bytes',async()=>{
  const files=['1815.las','1815.laz','point-time-1.4.las.laz'].map(fromFixture);
  const calls=[];
  const wrapped=files.map(f=>({
    name:f.name,
    get size(){return f.size;},
    slice(from,to) {
      calls.push({name:f.name,from,to});
      assert.equal(from,0);assert.equal(to,227);
      return f.slice(from,to);
    }
  }));
  const entries=await indexFiles(wrapped);
  assert.equal(entries.length,3);
  assert(entries.every(e=>e.verified));
  assert.equal(calls.length,3);
  assert.equal(entries[0].bounds.minX,entries[1].bounds.minX);
  assert.equal(entries[0].bounds.maxY,entries[1].bounds.maxY);
  assert(entries[2].bounds.minX>0);
});
test('el índice no descarta archivos de cabecera ilegible: quedan para validación',async()=>{
  const broken=Object.assign(new Blob([new Uint8Array(227)]),{name:'corrupto.laz'});
  const entries=await indexFiles([broken]);
  assert.equal(entries[0].verified,false);
  assert.equal(entries[0].bounds,null);
  assert.equal(forWindow(entries,{minX:1e9,maxX:1e9+100,minY:1e9,maxY:1e9+100}).selected.length,1);
  assert.equal(parseBounds(new Uint8Array(100).buffer),null);
});
test('un borde inferior es inclusivo y el borde superior exclusivo',()=>{
  const bounds={minX:100,maxX:100,minY:100,maxY:100};
  assert.equal(intersects(bounds,{minX:100,maxX:105,minY:100,maxY:105}),true);
  assert.equal(intersects(bounds,{minX:90,maxX:100,minY:90,maxY:100}),false);
  assert.equal(intersects(bounds,{minX:99,maxX:101,minY:99,maxY:101}),true);
});
test('un índice de cabeceras selecciona solo archivos relevantes por tesela',async()=>{
  const files=[
    synthetic('A.las',{minX:1000,maxX:1120,minY:2000,maxY:2130}),
    synthetic('B.laz',{minX:1600,maxX:1720,minY:2000,maxY:2130}),
    synthetic('C.laz',{minX:2200,maxX:2320,minY:2000,maxY:2130}),
  ];
  const entries=await indexFiles(files);
  const windows=[
    {minX:900,maxX:1300,minY:1900,maxY:2200},
    {minX:1400,maxX:1800,minY:1900,maxY:2200},
    {minX:2000,maxX:2400,minY:1900,maxY:2200},
  ];
  for(let i=0;i<3;i++){
    const result=forWindow(entries,windows[i]);
    assert.deepEqual(result.selected.map(f=>f.name),[files[i].name]);
    assert.equal(result.skipped.length,2);
  }
  assert.equal(forWindow(entries,{minX:2500,maxX:2600,minY:1900,maxY:2200}).selected.length,0);
});
test('0,5 y 0,7 m comparten cortes exactos sin duplicar celdas del borde',()=>{
  const bounds={minX:350000.11,maxX:350900.9,minY:4070000.24,maxY:4070900.9};
  const tiled=plan(bounds,.5,.7);
  assert(tiled.total>4);
  assert.equal(tiled.sharedBoundaryMetres,3.5);
  for(let i=0;i<tiled.tiles.length;i++){
    const current=tiled.tiles[i].window;
    for(const resolution of [.5,.7]){
      if(i%tiled.columns){
        const prev=tiled.tiles[i-1].window;
        assert.equal(current.minX,prev.maxX);
        const div=current.minX/resolution;
        assert(Math.abs(div-Math.round(div))<1e-6,
          'X de unión no alineada al centro de celda de '+resolution);
      }
      if(i>=tiled.columns){
        const above=tiled.tiles[i-tiled.columns].window;
        assert.equal(current.minY,above.maxY);
        const div=current.minY/resolution;
        assert(Math.abs(div-Math.round(div))<1e-6,
          'Y de unión no alineada a celda de '+resolution);
      }
    }
  }
});
test('recorta un mosaico de 9 km2 a bloques con resolución 0,5 y 1m',()=>{
  const tiled=plan({minX:350000,maxX:353000,minY:4070000,maxY:4073000},.5,1);
  assert(tiled.total>=36);
  assert(tiled.tiles.every(tile=>tile.window.maxX>tile.window.minX));
});

test('dos LAZ contiguos PNOA Bobadilla detectan 8 millones de celdas posibles y requieren teselas',async()=>{
 const files=[
  synthetic('PNOA_2024_AND_384-4115_H30_NPC01.laz',
   {minX:384000,maxX:385000,minY:4114000,maxY:4115000}),
  synthetic('PNOA_2024_AND_385-4115_H30_NPC01.laz',
   {minX:385000,maxX:386000,minY:4114000,maxY:4115000}),
 ];
 const entries=await indexFiles(files);
 const bounds=unionBounds(entries);
 assert.deepEqual(bounds,{minX:384000,maxX:386000,minY:4114000,maxY:4115000});
 assert.equal(needsTiling(bounds,.5,.5),true);
 assert.equal(needsTiling(bounds,.5,1),true);
 const aoi=envelopeAoi(bounds);
 assert.equal(aoi.rings[0].length,4);
 assert.equal(aoi.bounds.minX,384000);
 const p=plan(bounds,.5,.5);
 assert(p.total>1&&p.total<=512,'Planificación automática sin desbordar memoria');
 assert(p.tiles.every(tile=>tile.window.minX>=bounds.minX&&tile.window.maxX<=bounds.maxX));
});
test('mosaico pequeño conserva flujo habitual y no se autoriza área con cabecera inválida',async()=>{
 const b={minX:100,maxX:150,minY:200,maxY:250};
 assert.equal(needsTiling(b,.5,.5),false);
 assert.equal(unionBounds([{verified:true,bounds:b},{verified:false,bounds:null}]),null);
 assert.equal(unionBounds([]),null);
 assert.equal(envelopeAoi(null),null);
});
