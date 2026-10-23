'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const api=require('../lidar-mosaic-export.js');

function directory(seed={}) {
 const files=new Map(Object.entries(seed)),aborted=new Set(),writes=new Map();
 return {
  files,aborted,writes,
  async getFileHandle(name,{create=false}={}){
   if(!create&&!files.has(name))throw Error('Missing '+name);
   return {
    async getFile(){return new Blob([files.get(name)])},
    async createWritable(){
     const parts=[];let count=0;
     return {
      async write(value){count++;parts.push(String(value))},
      async close(){files.set(name,parts.join(''));writes.set(name,count)},
      async abort(){aborted.add(name)}
     };
    }
   };
  }
 };
}
const terrainHeader='x_utm,y_utm,min_ground_z_m';
const vegHeader='x_utm,y_utm,ground_points,vegetation_points,building_points,wire_points,tower_points,ground_min_z_m,canopy_max_above_ground_m,canopy_mean_above_ground_m,vegetation_return_fraction,ground_height_source,estimated_ground_z_m,ground_estimation_support_cells,water_points,road_points';
function manifest() {
 const a={name:'tesela_001_001',window:{minX:0,maxX:2,minY:0,maxY:2},
  terrainFile:'tesela_001_001_mdt.csv',vegetationFile:'tesela_001_001_vegetacion.csv',
  terrainCells:2,vegetationCells:2,heightRaster:{
   png:'tesela_001_001_alturas_lidar.png',pgw:'a.pgw',prj:'a.prj',
   width:2,height:2,cellSize:1,bounds:{left:0,right:2,bottom:0,top:2}
  }};
 const b={name:'tesela_001_002',window:{minX:2,maxX:4,minY:0,maxY:2},
  terrainFile:'tesela_001_002_mdt.csv',vegetationFile:'tesela_001_002_vegetacion.csv',
  terrainCells:2,vegetationCells:2,heightRaster:{
   png:'tesela_001_002_alturas_lidar.png',pgw:'b.pgw',prj:'b.prj',
   width:2,height:2,cellSize:1,bounds:{left:2,right:4,bottom:0,top:2}
  }};
 return {state:'complete',crs:'EPSG:25830',cellTerrain:1,cellVegetation:1,
  plan:{total:2,bounds:{minX:0,maxX:4,minY:0,maxY:2}},
  selectedArea:{bounds:{minX:0,maxX:4,minY:0,maxY:2}},
  completed:[a,b],
  dtmSeams:{state:'complete',completed:[
   {name:a.name+'_mdt_preliminar.asc',rows:2,columns:2},
   {name:b.name+'_mdt_preliminar.asc',rows:2,columns:2}
  ]}};
}
function vegetationLine(x,y,h){
 return [x,y,1,1,0,0,0,100,h,h,.5,'observed','',0,0,0].join(',');
}
function seeded(m=manifest()){
 const data={};
 for(const [i,t] of m.completed.entries()){
  const x=i*2;
  data[t.terrainFile]=terrainHeader+'\n'+(x+.5)+',.5,100\n'+(x+1.5)+',.5,101\n';
  data[t.vegetationFile]=vegHeader+'\n'+vegetationLine(x+.5,.5,3)+
   '\n'+vegetationLine(x+1.5,.5,4)+'\n';
 }
 return directory(data);
}
test('unifica dos LAZ contiguos en un solo CSV de suelo, sin duplicar cabeceras',async()=>{
 const m=manifest(),dir=seeded(m);
 const stats=await api.appendCsv(dir,'zona_completa_suelo_medido.csv',m,'terrain');
 assert.deepEqual({rows:stats.rows,sourceFiles:stats.sourceFiles},{rows:4,sourceFiles:2});
 const lines=dir.files.get(stats.name).trim().split('\n');
 assert.equal(lines.length,5);
 assert.equal(lines[0],terrainHeader);
 assert.deepEqual(lines.slice(1),['0.5,.5,100','1.5,.5,101','2.5,.5,100','3.5,.5,101']);
 assert.equal(dir.writes.get(stats.name),3,'Cabecera + bloques por cada origen');
});
test('unifica vegetación de ambos LAZ sin perder la procedencia del suelo',async()=>{
 const m=manifest(),dir=seeded(m);
 const stats=await api.appendCsv(dir,'zona_completa_vegetacion_lidar.csv',m,'vegetation');
 assert.equal(stats.rows,4);
 const lines=dir.files.get(stats.name).trim().split('\n');
 assert.equal(lines[0],vegHeader);
 assert.equal(lines.length,5);
 assert(lines.slice(1).every(x=>x.includes(',observed,')));
});
test('VRT de alturas es UNA imagen lógica UTM 30 N sobre los dos LAZ',async()=>{
 const m=manifest(),dir=seeded(m);
 const stats=await api.writeVrt(dir,'zona_completa_alturas_lidar.vrt',m,'canopy');
 assert.equal(stats.sources,2);
 assert.equal(stats.bands,4);
 assert.equal(stats.width,4);
 assert.equal(stats.height,2);
 const xml=dir.files.get(stats.name);
 assert(xml.includes('<SRS>EPSG:25830</SRS>'));
 assert(xml.includes('<GeoTransform>0, 1, 0, 2, 0, -1</GeoTransform>'));
 assert(xml.includes('<ColorInterp>Alpha</ColorInterp>'));
 assert(xml.includes('xOff="0" yOff="0" xSize="2" ySize="2"'));
 assert(xml.includes('xOff="2" yOff="0" xSize="2" ySize="2"'));
 assert.equal((xml.match(/<VRTRasterBand /g)||[]).length,4);
});
test('MDT unido con halo utiliza el ASC de cada tesela sin repetir celdas',async()=>{
 const m=manifest(),dir=seeded(m);
 const stats=await api.writeVrt(dir,'zona_completa_mdt_preliminar.vrt',m,'mdt');
 assert.equal(stats.sources,2);
 assert.equal(stats.bands,1);
 const xml=dir.files.get(stats.name);
 assert(xml.includes('tesela_001_001_mdt_preliminar.asc'));
 assert(xml.includes('tesela_001_002_mdt_preliminar.asc'));
 assert(xml.includes('NoDataValue>-9999'));
});
test('la imagen de alturas puede tener teselas sin vegetación sin inventar datos',async()=>{
 const m=manifest(),dir=seeded(m);
 m.completed[1].heightRaster=null;
 const stats=await api.writeVrt(dir,'zona_completa_alturas_lidar.vrt',m,'canopy');
 assert.equal(stats.sources,1);
 assert(!dir.files.get(stats.name).includes('tesela_001_002_alturas_lidar.png'));
});
test('detecta coordenadas fuera del bloque, aborta el CSV y no publica datos incorrectos',async()=>{
 const m=manifest(),dir=seeded(m);
 dir.files.set(m.completed[1].terrainFile,terrainHeader+'\n0.5,0.5,100\n2.5,.5,101\n');
 await assert.rejects(api.appendCsv(dir,'zona_completa_suelo_medido.csv',m,'terrain'),/fuera del bloque/);
 assert(dir.aborted.has('zona_completa_suelo_medido.csv'));
 assert(!dir.files.has('zona_completa_suelo_medido.csv'));
});
test('rechaza zonas incompletas, imagen desplazada y EPSG no confirmado',async()=>{
 const m=manifest(),dir=seeded(m);
 m.state='incomplete';
 await assert.rejects(api.appendCsv(dir,'zona_completa_suelo_medido.csv',m,'terrain'),/terminar/);
 m.state='complete';m.crs='';
 assert.throws(()=>api.vrtXml(m,'canopy'),/EPSG/);
 m.crs='EPSG:25830';m.completed[1].heightRaster.bounds.left=2.25;
 assert.throws(()=>api.vrtXml(m,'canopy'),/Tamaño|desalineada/);
});
test('cancelar detiene la unión de muchos LAZ sin anunciar producto terminado',async()=>{
 const m=manifest(),dir=seeded(m);
 const abort=new AbortController();abort.abort();
 await assert.rejects(api.appendCsv(dir,'zona_completa_vegetacion_lidar.csv',m,'vegetation',
  {signal:abort.signal}),{name:'AbortError'});
 assert(dir.aborted.has('zona_completa_vegetacion_lidar.csv'));
});
test('la interfaz ejecuta unión automáticamente sin cargar todo el mosaico en memoria',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(html.includes('<script src="lidar-mosaic-export.js"></script>'));
 assert(html.includes("OcartoLidarMosaicExport.appendCsv("));
 assert(html.includes("OcartoLidarMosaicExport.writeVrt("));
 assert(html.includes("OcartoLidarSeams.exportTile(folder,manifest,tile,"));
 assert(html.includes("manifest.mosaic.state=manifest.mosaic.outputs.vector?'complete':'partial'"),'No dar el mosaico por completo si falla la vectorización de clases');
 assert(html.includes('heightRaster={...saved,bounds:grid.bounds'));
});
