'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const feature=require('../lidar-mosaic-feature.js');
const mosaic=require('../lidar-mosaic-export.js');
function renderer(){
 const content=fs.readFileSync(path.join(__dirname,'../ocarto-runtime-v248-3.js'),'utf8');
 const start=content.indexOf('/* feature-map.js */'),end=content.indexOf('/* terrain-relief.js */',start);
 assert(start>=0&&end>start);
 const scope={module:{exports:{}},Uint8Array,Uint8ClampedArray,Float32Array,Math,Map};
 vm.runInNewContext(content.slice(start,end),scope,{timeout:10000});
 return scope.module.exports;
}
const rows=[
 {x:384000.25,y:4114000.25,ground_height_source:'nearby_estimate',
  canopy_max_above_ground_m:7,feature_max_above_ground_m:1.2,
  vegetation_points:2,other_points:1},
 {x:384000.75,y:4114000.25,ground_height_source:'observed',
  canopy_max_above_ground_m:null,feature_max_above_ground_m:.8,
  vegetation_points:0,other_points:3},
 {x:384001.25,y:4114000.25,ground_height_source:'unknown',
  canopy_max_above_ground_m:null,feature_max_above_ground_m:null,
  vegetation_points:0,other_points:2},
 {x:384001.75,y:4114000.25,ground_height_source:'observed',
  canopy_max_above_ground_m:8,feature_max_above_ground_m:8,
  vegetation_points:2,other_points:0},
];
test('Feature Map usa retornos no suelo LiDAR, no interpreta edificios como copas',()=>{
 const result=feature.buildCells(rows,.5,0,2);
 assert.equal(result.summary.selectedCells,2);
 assert.equal(result.summary.selectedReturns,6);
 assert.equal(result.summary.discardedUncertainGround,1);
 assert.equal(result.summary.excludedByHeight,1);
 assert.equal(result.summary.measuredGroundCells,1);
 assert.equal(result.summary.estimatedGroundCells,1);
 assert.deepEqual(result.cells.height,[1.2,.8]);
});
test('Feature Map real del visor produce RGBA, PGW UTM y transparencia sin inventar valores',()=>{
 const result=feature.render(rows,.5,0,2,renderer());
 assert(result.grid);
 assert.equal(result.grid.width,2);
 assert.equal(result.grid.height,1);
 assert.equal(result.grid.rgba[3],255);
 const pgw=result.grid.worldFile.trim().split('\n').map(Number);
 assert.equal(pgw[0],.5);
 assert.equal(pgw[3],-.5);
 assert.equal(pgw[4],384000.25);
 assert.equal(pgw[5],4114000.25);
});
test('Feature Map de zona completa produce un solo VRT con las dos LAZ',()=>{
 const manifest={state:'complete',crs:'EPSG:25830',cellVegetation:.5,cellTerrain:.5,
  plan:{total:2,bounds:{minX:384000,maxX:384002,minY:4114000,maxY:4114000.5}},
  selectedArea:{bounds:{minX:384000,maxX:384002,minY:4114000,maxY:4114000.5}},
  completed:[0,1].map(i=>({
   name:'tesela_001_00'+(i+1),window:{minX:384000+i,maxX:384001+i,minY:4114000,maxY:4114000.5},
   featureRaster:{
    png:'tesela_001_00'+(i+1)+'_feature_lidar.png',
    width:2,height:1,cellSize:.5,
    bounds:{left:384000+i,right:384001+i,bottom:4114000,top:4114000.5}
   }
  }))
 };
 const vrt=mosaic.vrtXml(manifest,'feature');
 assert.equal(vrt.sources,2);
 assert.equal(vrt.bands,4);
 assert.equal(vrt.width,4);
 assert.equal(vrt.height,1);
 assert(vrt.xml.includes('SourceBand>4</SourceBand'));
 assert(vrt.xml.includes('EPSG:25830'));
 assert(vrt.xml.includes('DstRect xOff="2"'));
});
test('Feature Map no pinta una imagen falsa cuando faltan retornos con suelo fiable',()=>{
 const result=feature.render(rows.filter(r=>r.ground_height_source==='unknown'),.5,0,2,renderer());
 assert.equal(result.grid,null);
 assert.equal(result.summary.selectedCells,0);
 assert.equal(result.summary.discardedUncertainGround,1);
});
test('Feature Map rechaza coordenadas inventadas y umbrales incoherentes',()=>{
 assert.throws(()=>feature.buildCells(rows,.5,3,2),/Parámetros/);
 assert.throws(()=>feature.buildCells([{...rows[0],x:384000.3}],.5,0,3),/alineado/);
});
test('Ocarto enlaza el Feature Map nuevo en el mismo procesamiento de ambos LAZ',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(html.includes('<script src="lidar-mosaic-feature.js"></script>'));
 assert(html.includes('OcartoLidarMosaicFeature.render(result.vegetationRows,'));
 assert(html.includes('featureRaster='));
 assert(html.includes('OcartoLidarMosaicExport.writeVrt('));
 assert(html.includes("'zona_completa_feature_map_lidar.vrt',manifest,'feature'"));
});

test('une ambas teselas Feature Map en UNA imagen PNG sin perder el encaje PGW',async()=>{
 const manifest={state:'complete',cellVegetation:.5,
  selectedArea:{bounds:{minX:384000,maxX:384002,minY:4114000,maxY:4114000.5}},
  completed:[0,1].map(i=>({
   name:'tesela_001_00'+(i+1),
   featureRaster:{
    png:'tesela_001_00'+(i+1)+'_feature_lidar.png',
    width:2,height:1,cellSize:.5,
    bounds:{left:384000+i,right:384001+i,top:4114000.5,bottom:4114000}
   }
  }))
 };
 const calls=[],folder={async getFileHandle(){return{
  async getFile(){return new Blob([new Uint8Array(8)])}
 }}};
 let saved;
 const output=await feature.saveWholePng(folder,manifest,{
  planGeometry:mosaic.geometry,
  decodeImage:async()=>({width:2,height:1,close(){calls.push('close')}}),
  createCanvas:(w,h)=>({
   getContext:()=>({drawImage:(_img,x,y)=>calls.push([x,y])}),
   toBlob:cb=>cb(new Blob([new Uint8Array(8)],{type:'image/png'}))
  }),
  writeTriplet:async(_dir,name,png,pgw,wkt)=>{
   saved={name,pgw,wkt,size:png.size};
   return {png:name+'.png',pgw:name+'.pgw',prj:name+'.prj'};
  },
  wkt:'PROJCS[ETRS89 UTM 30N]'
 });
 assert.equal(output.width,4);
 assert.equal(output.height,1);
 assert.equal(output.sources,2);
 assert.deepEqual(calls.filter(x=>Array.isArray(x)),[[0,0],[2,0]]);
 assert.equal(saved.name,'zona_completa_feature_map_lidar');
 assert.equal(saved.pgw,'0.5\n0\n0\n-0.5\n384000.25\n4114000.25\n');
 assert.equal(saved.wkt,'PROJCS[ETRS89 UTM 30N]');
 const skip=await feature.saveWholePng(folder,manifest,{
  planGeometry:mosaic.geometry,decodeImage:async()=>{throw Error('No debe decodificar')},
  createCanvas:()=>{throw Error('No debe crear lienzo')},
  writeTriplet:async()=>{},wkt:'WKT',maxPixels:2
 });
 assert.equal(skip,null,'Las áreas demasiado grandes se quedan con el VRT');
});
