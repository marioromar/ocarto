'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const plan=require('../lidar-tile-plan.js').plan;
const MAX=1000000;

test('9 km² a 0,5m producen múltiples bloques sin superar un millón de celdas',()=>{
  const result=plan({minX:350000,maxX:353000,minY:4070000,maxY:4073000},.5,1);
  assert(result.total>=36 && result.total<=100,'Bloques mal dimensionados: '+result.total);
  assert.equal(result.total,result.tiles.length);
  let area=0;
  for(const t of result.tiles){
    const b=t.window;
    assert(b.maxX>b.minX && b.maxY>b.minY);
    area+=(b.maxX-b.minX)*(b.maxY-b.minY);
    for(const resolution of [.5,1]) {
      const n=(Math.ceil(b.maxX/resolution)-Math.floor(b.minX/resolution)+1)*
        (Math.ceil(b.maxY/resolution)-Math.floor(b.minY/resolution)+1);
      assert(n<=MAX,'Bloque excede memoria: '+t.name);
    }
  }
  assert(Math.abs(area-9000000)<.01,'Las ventanas no cubren íntegramente el área');
});

test('4 km² a 0,5m tienen bordes compartidos sin huecos ni solapes',()=>{
  const result=plan({minX:350000.17,maxX:352000,minY:4070000.2,maxY:4072000},.5,.5);
  const seen=new Set();
  for(const t of result.tiles) {
    assert(!seen.has(t.name));
    seen.add(t.name);
  }
  for(let row=0;row<result.rows;row++)
    for(let col=0;col<result.columns;col++){
      const t=result.tiles[row*result.columns+col].window;
      if(col)assert(Math.abs(t.minX-result.tiles[row*result.columns+col-1].window.maxX)<1e-7);
      if(row)assert(Math.abs(t.minY-result.tiles[(row-1)*result.columns+col].window.maxY)<1e-7);
    }
});

test('no admite AOI vacío, resolución insegura o plan superior a 512 teselas',()=>{
  assert.throws(()=>plan({minX:0,maxX:0,minY:0,maxY:1},.5,1),/Extensión/);
  assert.throws(()=>plan({minX:0,maxX:100,minY:0,maxY:100},.05,1),/Resolución/);
  assert.throws(()=>plan({minX:0,maxX:100000,minY:0,maxY:100000},.5,.5),/512/);
});

test('la interfaz activa procesado por bloques con selección, carpeta y manifest',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert(html.includes('id="tiledAreaBtn"'));
  assert(html.includes('id="tiledPointFile"'));
  assert(html.includes('lidar-tile-plan.js'));
  assert(html.includes('showDirectoryPicker'));
  assert(html.includes('window:tile.window,aoi,throwOnError:true'));
  assert(html.includes('writeTiledManifest'));
  assert(html.includes("const aoi=options.aoi??currentLidarPolygon()"));
});
