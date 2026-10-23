'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const contour=require('../lidar-mosaic-contours.js');

const grid=xOffset=>[
'ncols 2','nrows 2','xllcorner '+xOffset,'yllcorner 0',
'cellsize 1','NODATA_value -9999',
(100+(xOffset+.5)/2)+' '+(100+(xOffset+1.5)/2),
(100+(xOffset+.5)/2)+' '+(100+(xOffset+1.5)/2),''
].join('\n');
function manifest(){
 const completed=[0,2].map((x,i)=>({
  name:'tesela_001_00'+(i+1),
  window:{minX:x,maxX:x+2,minY:0,maxY:2}
 }));
 return {state:'complete',crs:'EPSG:25830',cellTerrain:1,
  plan:{total:2},completed,
  dtmSeams:{state:'complete',completed:completed.map(t=>({
   name:t.name+'_mdt_preliminar.asc',rows:2,columns:2
  }))}};
}
function directory(seed,opts={}){
 const files=new Map(Object.entries(seed)),aborted=new Set();
 return {files,aborted,
  async getFileHandle(name,{create=false}={}){
   if(!create&&!files.has(name))throw Error('Not found '+name);
   return {
    async getFile(){return new Blob([files.get(name)])},
    async createWritable(){
     const parts=[];
     return {
      async write(v){if(opts.failWrite)throw Error('Disk error');parts.push(String(v))},
      async close(){files.set(name,parts.join(''))},
      async abort(){aborted.add(name)}
     };
    }
   };
  }
 };
}
const seed=()=>({
 'tesela_001_001_mdt_preliminar.asc':grid(0),
 'tesela_001_002_mdt_preliminar.asc':grid(2)
});
test('curva de nivel atraviesa la frontera entre los dos LAZ sin huecos',async()=>{
 const m=manifest(),dir=directory(seed());
 const left=await contour.tileSegments(dir,m,m.completed[0],1);
 assert(left.squares>0);
 assert(left.segments.some(s=>Math.abs(s.z-101)<1e-6&&
  s.coords.some(p=>Math.abs(p[0]-2)<1e-9)),
  'Nivel 101 debe cruzar entre celdas de ambos archivos en X=2');
 const right=await contour.tileSegments(dir,m,m.completed[1],1);
 assert.equal(right.segments.filter(s=>s.z===101).length,0,
  'La tesela derecha no debe volver a generar el cuadrado fronterizo');
});
test('exporta un único GeoJSON con curvas desde ambos MDT y CRS UTM',async()=>{
 const m=manifest(),dir=directory(seed());
 const result=await contour.exportGeojson(dir,m,'zona_completa_curvas_1m.geojson',1);
 assert(result.features>0);
 const geo=JSON.parse(dir.files.get(result.name));
 assert.equal(geo.type,'FeatureCollection');
 assert.equal(geo.crs.properties.name,'EPSG:25830');
 assert.equal(geo.metadata.source,'MDT preliminar LiDAR de todos los LAZ');
 assert(geo.features.every(f=>f.geometry.type==='LineString'));
 assert(geo.features.some(f=>f.geometry.coordinates.some(p=>p[0]===2)));
 assert(geo.features.every(f=>f.properties.review_required));
});
test('ASC con NODATA no inventa curvas en celdas sin suelo',async()=>{
 const m=manifest(),data=seed();
 data['tesela_001_002_mdt_preliminar.asc']=data['tesela_001_002_mdt_preliminar.asc']
  .replaceAll('101.25','-9999');
 const dir=directory(data),a=await contour.tileSegments(dir,m,m.completed[0],1);
 assert(a.missing>0);
 assert(a.segments.every(s=>s.coords.every(p=>p.every(Number.isFinite))));
});
test('abort y errores de disco no anuncian archivo GeoJSON como completado',async()=>{
 const m=manifest(),dir=directory(seed()),controller=new AbortController();
 controller.abort();
 await assert.rejects(contour.exportGeojson(dir,m,
  'zona_completa_curvas_1m.geojson',1,{signal:controller.signal}),
  {name:'AbortError'});
 assert(dir.aborted.has('zona_completa_curvas_1m.geojson'));
 const broken=directory(seed(),{failWrite:true});
 await assert.rejects(contour.exportGeojson(broken,m,
  'zona_completa_curvas_1m.geojson',1),/Disk error/);
 assert(broken.aborted.has('zona_completa_curvas_1m.geojson'));
});
test('rechaza falta de MDT, incoherencia de cotas, nombres y equidistancias inválidos',async()=>{
 const m=manifest(),dir=directory(seed());
 m.dtmSeams.state='incomplete';
 await assert.rejects(contour.exportGeojson(dir,m,'zona_completa_curvas_1m.geojson',1),/completos/);
 m.dtmSeams.state='complete';
 await assert.rejects(contour.exportGeojson(dir,m,'../../curvas.geojson',1),/Nombre/);
 await assert.rejects(contour.tileSegments(dir,m,m.completed[0],0),/Equidistancia/);
 const f=new Blob([grid(0).replace('ncols 2','ncols 7')]);
 await assert.rejects(contour.readAsc(f,{width:2,height:2,x:0,y:0},1),/incompatible/);
});
test('las curvas son un posprocesado único a partir del mismo mosaico LAZ, no del TIFF',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(html.includes('<script src="lidar-mosaic-contours.js"></script>'));
 assert(html.includes('OcartoLidarMosaicContours.exportGeojson('));
 assert(html.includes("manifest.mosaic.outputs.contours="));
});
