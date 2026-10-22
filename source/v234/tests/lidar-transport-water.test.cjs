'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const detector=require('../lidar-transport-water.js');
const fusion=require('../lidar-ortho-fusion.js');

const row=(i,j,overrides={})=>({x:i+.5,y:j+.5,road_points:0,water_points:0,
 ground_points:0,vegetation_points:0,canopy_max_above_ground_m:null,...overrides});
const detect=(rows,extra={})=>detector.detect(rows,1,{minRoadLength:5,minWaterArea:5,...extra});
const area=coords=>coords.slice(0,-1).reduce((a,p,i)=>{
 const q=coords[i+1];return a+p[0]*q[1]-q[0]*p[1];
},0)/2;

test('clases LAS 9 y 11 producen áreas de agua y ejes de carretera separados y revisables',()=>{
 const rows=[];
 for(let x=1;x<19;x++)rows.push(row(x,1,{road_points:3}));
 for(let y=4;y<8;y++)for(let x=3;x<9;x++)rows.push(row(x,y,{water_points:2}));
 const fc=detect(rows,{minRoadLength:8,minWaterArea:15});
 const roads=fc.features.filter(f=>f.geometry.type==='LineString');
 const water=fc.features.filter(f=>f.geometry.type==='Polygon');
 assert(roads.length>0,'Debe detectar al menos un eje de carretera');
 assert.equal(water.length,1,'Superficie conectada de agua');
 assert.equal(fc.properties.roadClassCells,18);
 assert.equal(fc.properties.waterClassCells,24);
 assert.equal(water[0].properties.source_class,9);
 assert(roads.every(f=>f.properties.source_class===11));
 assert(fc.features.every(f=>f.properties.review_required===true&&f.properties.auto_accept===false));
});
test('el agua conserva un claro o isla interior como hueco georreferenciado',()=>{
 const rows=[];
 for(let j=0;j<6;j++)for(let i=0;i<6;i++)
   if(i!==2||j!==2)rows.push(row(i,j,{water_points:1}));
 const out=detect(rows,{minWaterArea:1,minRoadLength:1});
 const poly=out.features.find(f=>f.geometry.type==='Polygon');
 assert(poly);
 assert.equal(poly.geometry.coordinates.length,2,'El interior no debe rellenarse');
 assert(area(poly.geometry.coordinates[0])>0);
 assert(area(poly.geometry.coordinates[1])<0);
});
test('sin clases de carretera o agua no inventa elementos por suelo desnudo',()=>{
 const rows=Array.from({length:80},(_,i)=>row(i%10,Math.floor(i/10),{ground_points:20}));
 const out=detect(rows);
 assert.equal(out.features.length,0);
 assert.equal(out.properties.roadClassCells,0);
 assert.equal(out.properties.waterClassCells,0);
});
test('georreferencia, duplicados y parámetros imposibles producen error explícito',()=>{
 assert.throws(()=>detect([row(1,2),row(1,2)]),/duplicadas/);
 assert.throws(()=>detect([row(0,0)],{minRoadLength:-2}),/Umbrales/);
 assert.throws(()=>detect([row(0,0,{x:0.75})]),/incompatible/);
});
test('ortofoto: la clase 11 aumenta evidencia, pero nunca valida automáticamente',()=>{
 const fc={type:'FeatureCollection',features:[{type:'Feature',
   properties:{kind:'posible-camino-por-ortofoto'},
   geometry:{type:'LineString',coordinates:[[.5,.5],[11.5,.5]]}}]};
 const rows=Array.from({length:12},(_,i)=>row(i,0,{road_points:3,ground_points:2}));
 const out=fusion.annotateRoads(fc,rows,1);
 const p=out.features[0].properties;
 assert.equal(p.lidar_crosscheck,'apoyo-clase11');
 assert.equal(p.auto_accept,false);
 assert.equal(p.review_required,true);
 assert.equal(out.properties.corroborated_with_las_class11,1);
});
test('ortofoto: suelo o copas sin clase 11 nunca se presentan como carretera confirmada',()=>{
 const fc={type:'FeatureCollection',features:[{type:'Feature',properties:{},
   geometry:{type:'LineString',coordinates:[[.5,.5],[12.5,.5]]}}]};
 const ground=Array.from({length:13},(_,i)=>row(i,0,{ground_points:8}));
 const out=fusion.annotateRoads(fc,ground,1);
 assert.equal(out.features[0].properties.lidar_crosscheck,'superficie-despejada-no-confirma');
 assert.equal(out.properties.corroborated_with_las_class11,0);
 const nothing=fusion.annotateRoads(fc,[],1);
 assert.equal(nothing.features[0].properties.lidar_crosscheck,'insuficiente');
 assert.equal(nothing.features[0].properties.auto_accept,false);
});
test('el motor de la interfaz y el worker contienen el flujo incremental sin sustituir símbolos',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const worker=fs.readFileSync(path.join(__dirname,'../lidar-worker.js'),'utf8');
 assert(html.includes('<script src="lidar-transport-water.js"></script>'));
 assert(html.includes('<script src="lidar-ortho-fusion.js"></script>'));
 assert(html.includes('OcartoTransportWater.detect(vegetationRows,vegCell)'));
 assert(html.includes('OcartoOrthoLidarFusion.annotateRoads'));
 assert(html.includes('id="detectAllLidarElements"'));
 assert(html.includes('id="acceptDetections"'));
 assert(html.includes('id="acceptDetectionsEditable"'));
 assert(worker.includes('road_points:0'));
 assert(worker.includes('water_points:0'));
 assert(worker.includes('cls===11'));
 assert(worker.includes('cls===9'));
});
