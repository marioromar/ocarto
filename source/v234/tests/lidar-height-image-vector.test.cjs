'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../lidar-height-image-vector.js');

const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
const colors=['#f2dc72','#e53935','#48a868','#ffffff'].map(rgb);
const pgw='1\n0\n0\n-1\n100\n200\n';
function image(width,height,classes,overrides={}){
 const pixels=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<width*height;i++){
   const id=classes[i];
   if(!id)continue;
   const pos=4*i;
   pixels.set([...colors[id-1],255],pos);
 }
 return engine.vectorize({pixels,width,height,worldFile:pgw,
   minAreaM2:0,maxColorError:0,crs:'EPSG:25830',...overrides});
}
const signed=ring=>ring.slice(0,-1).reduce((s,p,i)=>{
 const q=ring[i+1];return s+p[0]*q[1]-q[0]*p[1];
},0)/2;

test('reconoce las cuatro bandas de color de la altura y guarda las coordenadas UTM',()=>{
 const result=image(4,1,[1,2,3,4]);
 assert.equal(result.features.length,4);
 assert.deepEqual(result.features.map(f=>f.properties.category),
   ['height_0_03','height_03_2','height_2_5','height_above_5']);
 assert.equal(result.metadata.crs,'EPSG:25830');
 const f=result.features[0],ring=f.geometry.coordinates[0];
 assert.deepEqual(ring[0],[99.5,200.5]);
 assert(signed(ring)>0,'Exterior should be GeoJSON CCW in UTM');
 assert.equal(f.properties.review_required,true);
 assert.equal(f.properties.iof_symbol,null);
});

test('mantiene un hueco interior transparente, sin rellenar los claros de bosque',()=>{
 const arr=Array(25).fill(2);
 for(let y=1;y<4;y++)for(let x=1;x<4;x++)arr[y*5+x]=0;
 const result=image(5,5,arr);
 assert.equal(result.features.length,1);
 const rings=result.features[0].geometry.coordinates;
 assert.equal(rings.length,2,'El claro debe ser hueco interior de un polígono');
 assert(signed(rings[0])>0);
 assert(signed(rings[1])<0);
 assert.equal(result.metadata.summary.transparent,9);
});

test('mantiene una isla interior como polígono separado dentro del hueco',()=>{
 const arr=Array(49).fill(3);
 for(let y=1;y<6;y++)for(let x=1;x<6;x++)arr[y*7+x]=0;
 arr[3*7+3]=3;
 const result=image(7,7,arr);
 assert.equal(result.features.length,2);
 assert.equal(result.features[0].geometry.coordinates.length,2);
 assert.equal(result.features[1].geometry.coordinates.length,1);
});

test('descarta regiones por debajo del área mínima física en m²',()=>{
 const result=image(3,2,[1,1,0,0,2,0],{minAreaM2:2});
 assert.equal(result.features.length,1);
 assert.equal(result.metadata.summary.discardedSmall,1);
 assert.equal(result.features[0].properties.cell_count,2);
});

test('blanco puede representar copa >=5m o datos desconocidos por decisión explícita',()=>{
 const normal=image(2,1,[4,4]);
 assert.equal(normal.features.length,1);
 assert.equal(normal.features[0].properties.category,'height_above_5');
 const masked=image(2,1,[4,4],{whiteAsNoData:true});
 assert.equal(masked.features.length,0);
 assert.equal(masked.metadata.summary.transparent,2);
});

test('conserva georreferencia afín con giro y tamaño de celda de 0,5m',()=>{
 const w=engine.parseWorldFile('0.5\n0.1\n0.05\n-0.5\n500000\n4100000');
 const pixels=new Uint8ClampedArray([...colors[1],255]);
 const result=engine.vectorize({pixels,width:1,height:1,worldFile:w,minAreaM2:0});
 assert.equal(result.features.length,1);
 assert.equal(result.metadata.summary.cellAreaM2,0.255);
 const ring=result.features[0].geometry.coordinates[0];
 assert(ring.some(p=>Math.abs(p[0]-499999.725)<.01));
 assert(signed(ring)>0);
});

test('interpolación RGB entre colores evita confundir el degradado con clases vacías',()=>{
 const p=new Uint8ClampedArray([137,113,81,255]);
 const result=engine.vectorize({pixels:p,width:1,height:1,worldFile:pgw,
   minAreaM2:0,maxColorError:90});
 assert.equal(result.features.length,1);
});

test('no convierte PNG sin PGW o con color no perteneciente a la paleta',()=>{
 const p=new Uint8ClampedArray([0,0,255,255]);
 const result=engine.vectorize({pixels:p,width:1,height:1,worldFile:pgw,
   minAreaM2:0,maxColorError:20});
 assert.equal(result.features.length,0);
 assert.equal(result.metadata.summary.unclassified,1);
 assert.throws(()=>engine.parseWorldFile('1\n0\n0\n0\n100\n200'),/PGW/);
 assert.throws(()=>engine.parseWorldFile('garbage'),/PGW/);
 assert.throws(()=>engine.vectorize({pixels:p,width:1,height:1,
   worldFile:pgw,minAreaM2:-1}),/Parámetros/);
});

test('no consume una imagen arbitrariamente grande en memoria',()=>{
 const pixels=new Uint8ClampedArray(4);
 assert.throws(()=>engine.vectorize({pixels,width:6000,height:6000,
   worldFile:pgw}),/demasiado grande/);
});

test('la interfaz carga el vectorizador por separado y no cambia importación LAS',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(html.includes('lidar-height-image-vector.js'));
 assert(html.includes('id="heightRasterFiles"'));
 assert(html.includes('id="heightRasterGeojson"'));
 assert(html.includes('id="heightRasterAddToMap"'));
 assert(html.includes('heightRasterDraft=result'));
 assert(html.includes("const before=snapshotMap()"));
 assert(html.includes('S.features.push(...objects)'));
 assert(html.includes("'vegetation',target.id"));
});
