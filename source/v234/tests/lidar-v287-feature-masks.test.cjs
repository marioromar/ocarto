'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const feature=require('../lidar-feature-height-ranges.js');
const mosaic=require('../lidar-mosaic-feature.js');
const heights=require('../lidar-mosaic-height-bands.js');
const fusion=require('../lidar-feature-vegetation-fusion.js');

test('Feature Map: cuatro intervalos medidos desde 0 m sin confundir 5 cm con MDT',()=>{
 assert.deepEqual(feature.ranges().map(x=>[x.min,x.max]),[[0,.3],[.3,1],[1,2],[2,5]]);
 const rows=[
 {x:.25,y:.25,ground_height_source:'observed',vegetation_points:1,other_points:0,
  feature_min_above_ground_m:.02,feature_max_above_ground_m:.21},
 {x:.75,y:.25,ground_height_source:'observed',vegetation_points:2,other_points:0,
  feature_min_above_ground_m:1.4,feature_max_above_ground_m:3.1},
 {x:1.25,y:.25,ground_height_source:'unknown',vegetation_points:1,other_points:0,
  feature_min_above_ground_m:null,feature_max_above_ground_m:null}
 ];
 const nearGround=feature.render(rows,.5,feature.NEAR_GROUND,mosaic);
 assert.equal(nearGround.summary.selectedCells,1);
 assert.equal(nearGround.grid.rgba[3],255);
 const low=feature.render(rows,.5,feature.ranges()[0],mosaic);
 assert.equal(low.summary.selectedCells,1);
 assert.equal(low.grid.width,1);assert.equal(low.grid.height,1);
 assert.equal(low.grid.rgba[3],255);assert.equal(low.grid.rgba[0],0);
 assert.match(low.grid.worldFile,/0\.5/);
 const mid=feature.render(rows,.5,feature.ranges()[2],mosaic);
 assert.equal(mid.summary.selectedCells,1);
 const empty=feature.render(rows,.5,{min:5,max:6},mosaic);
 assert.equal(empty.grid,null);
});

test('alturas de vegetación por rangos reutilizan el alfa y la georreferencia',()=>{
 const stops=[{height:0},{height:.3},{height:2},{height:5}];
 const ranges=heights.ranges(stops);
 assert.deepEqual(ranges.map(x=>x.min),[0,.3,2,5]);
 const grid={width:2,height:1,cell:.5,
  bounds:{left:0,bottom:0,right:1,top:.5},
  worldFile:'.5\n0\n0\n-.5\n.25\n.25\n',
  rgba:Uint8ClampedArray.from([100,150,20,255,10,200,30,255])};
 const rows=[{x:.25,y:.25,canopy_max_above_ground_m:.2,ground_height_source:'observed'},
  {x:.75,y:.25,canopy_max_above_ground_m:4,ground_height_source:'nearby_estimate'}];
 const low=heights.mask(grid,rows,ranges[0]);
 assert.equal(low.selected,1);assert.equal(low.rgba[3],255);assert.equal(low.rgba[7],0);
 assert.equal(low.worldFile,grid.worldFile);assert.equal(grid.rgba[7],255);
 const tall=heights.mask(grid,rows,ranges[2]);
 assert.equal(tall.selected,1);assert.equal(tall.rgba[3],0);assert.equal(tall.rgba[7],255);
 assert.equal(tall.estimated,1);
});

test('la fusión marca evidencia y conflictos sin cambiar clase candidata',()=>{
 const shape={x0:0,y0:0,width:2,height:1,cell:2};
 const evidence={n:2,pixelTotal:16,nearGroundCoverage:Uint32Array.from([0,0]),coverage:[
  Uint32Array.from([1,0]),Uint32Array.from([3,0]),
  Uint32Array.from([5,0]),Uint32Array.from([6,0])]};
 const features=[{type:'Feature',properties:{clase:'amarillo'},
  geometry:{type:'Polygon',coordinates:[[[0,0],[2,0],[2,2],[0,2],[0,0]]]}},
  {type:'Feature',properties:{clase:'verde_oscuro'},
  geometry:{type:'Polygon',coordinates:[[[2,0],[4,0],[4,2],[2,2],[2,0]]]}}];
 const result=fusion.annotate(features,evidence,shape);
 assert.equal(result.features[0].properties.clase,'amarillo');
 assert.equal(result.features[0].properties.feature_map_evidence.possible_conflict,true);
 assert.equal(result.features[0].properties.feature_map_evidence.near_ground_0_05m_fraction,0);
 assert.equal(result.features[0].properties.feature_map_evidence.sparse_near_ground_supports_open_candidate,false);
 assert.equal(result.features[1].properties.clase,'verde_oscuro');
 assert.equal(result.features[1].properties.feature_map_evidence.possible_conflict,false);
 assert.equal(result.summary.conflicts,1);
 assert.equal(features[0].properties.feature_map_evidence,undefined);
});
