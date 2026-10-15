const assert=require('node:assert/strict');
const V=require('../valley-extend.js');
const {extend}=V;
const axis=[[0,0],[2,0]],source=JSON.stringify(axis);
const contours=[
 {type:'Feature',properties:{elevation:100},geometry:{type:'LineString',coordinates:[[3,-1],[3,1]]}},
 {type:'Feature',properties:{elevation:101},geometry:{type:'LineString',coordinates:[[5,-2],[5,2]]}},
 {type:'Feature',properties:{elevation:101},geometry:{type:'LineString',coordinates:[[8,-2],[8,2]]}}
];
const out=extend(axis,contours,{targetElevation:101,startElevation:100.5,maxDistance:10});
assert.deepEqual(out.coordinates,[[0,0],[2,0],[5,0]]);
assert.equal(out.extension_m,3);assert.equal(out.target_elevation,101);assert.equal(out.review_required,true);
assert.equal(JSON.stringify(axis),source,'input axis is immutable');
assert.throws(()=>extend(axis,contours,{targetElevation:100,startElevation:100.5,maxDistance:10}),/superior/);
assert.throws(()=>extend([[0,0],[0,0]],contours,{targetElevation:101}),/dirección/);
assert.throws(()=>extend(axis,contours,{targetElevation:101,maxDistance:2}),/no cruza/);
const beginning=extend(axis,contours.map(f=>({...f,geometry:{...f.geometry,coordinates:f.geometry.coordinates.map(([x,y])=>[-x,y])}})),{targetElevation:101,startElevation:100.5,end:'start'});
assert.deepEqual(beginning.coordinates[0],[-5,0]);
const terrain=[];for(let i=0;i<24;i++)for(let j=0;j<15;j++){const x=i+.5,y=j+.5,axisJ=i<6?5:i<10?6:7,z=100+.35*i+3*Math.abs(j-axisJ);terrain.push([x,y,z,4,'observado'])}
const terrainBefore=JSON.stringify(terrain),followed=V.followTerrain([[2.5,5.5],[3.5,5.5]],terrain,1,{targetElevation:104,startElevation:101.05,maxDistance:20});
assert.ok(followed.coordinates.some(p=>p[1]===6.5)&&followed.coordinates.some(p=>p[1]===7.5),'route should follow the curved LiDAR valley');
assert.ok(Math.abs(followed.coordinates.at(-1)[1]-7.5)<1e-8,'next upper contour should be reached');
assert.equal(JSON.stringify(terrain),terrainBefore,'terrain remains immutable');
console.log('✓ v61: extensión del eje hasta la primera curva objetivo; sin mutar eje ni MDT');
