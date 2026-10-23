'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const exportModule=require('../lidar-tile-export.js');

function folder({failAt=0}={}){
  const files=new Map(),written=new Map(),aborted=new Set();
  return {
    files,written,aborted,
    async getFileHandle(name){
      const writes=[];written.set(name,writes);
      return {
        async createWritable(){
          let count=0;
          return {
            async write(value){
              count++;
              if(failAt && count===failAt)throw Error('Disk full');
              writes.push(String(value));
            },
            async close(){files.set(name,writes.join(''));},
            async abort(){aborted.add(name);},
          };
        },
      };
    },
  };
}

test('escribe CSV de más de 8000 celdas en bloques de 4096, sin duplicar encabezados',async()=>{
  const dir=folder();
  const n=9003;
  const rows=Array.from({length:n},(_,i)=>[350000+i/2,4070000,100+i/100]);
  const saved=await exportModule.writeCsv(dir,'tesela_001_001_mdt.csv',
      ['x_utm','y_utm','min_ground_z_m'],rows,row=>row);
  assert.equal(saved,n);
  const text=dir.files.get('tesela_001_001_mdt.csv');
  const lines=text.trim().split('\n');
  assert.equal(lines.length,n+1);
  assert.equal(lines[0],'x_utm,y_utm,min_ground_z_m');
  assert.equal(lines[1],'350000,4070000,100');
  const last=lines.at(-1).split(',').map(Number);
  assert.equal(last[0],354501);
  assert.equal(last[1],4070000);
  assert(Math.abs(last[2]-190.02)<1e-9,'Las cotas exportadas deben conservar su valor numérico');
  assert.equal(dir.written.get('tesela_001_001_mdt.csv').length,4,
    'Expected header + 2 full 4096-row batches + last partial batch');
});

test('CSV mantiene columnas nulas vacías y escapa las cadenas',async()=>{
  const dir=folder();
  await exportModule.writeCsv(dir,'tesela_002_003_vegetacion.csv',
    ['height','ground','source'],[
      [Number.NaN,null,'LAS, "zona"'],
      [1.5,10,'correcto'],
    ],row=>row);
  assert.equal(dir.files.get('tesela_002_003_vegetacion.csv'),
    'height,ground,source\n,,"LAS, ""zona"""\n1.5,10,correcto\n');
});

test('rechaza fila incompleta y aborta la escritura sin publicar un archivo parcial',async()=>{
 const dir=folder();
 await assert.rejects(exportModule.writeCsv(dir,'tesela_001_001_mdt.csv',
   ['x','y','z'],[[100,200]],row=>row),/columnas inconsistente/);
 assert(dir.aborted.has('tesela_001_001_mdt.csv'));
 assert(!dir.files.has('tesela_001_001_mdt.csv'));
});

test('maneja errores de disco: aborta y mantiene la sesión marcable como error',async()=>{
 const dir=folder({failAt:2});
 const rows=Array.from({length:4097},(_,i)=>[i,i]);
 await assert.rejects(exportModule.writeCsv(dir,'tesela_001_001_mdt.csv',
   ['x','y'],rows,row=>row),/Disk full/);
 assert(dir.aborted.has('tesela_001_001_mdt.csv'));
 assert(!dir.files.has('tesela_001_001_mdt.csv'));
});

test('manifiesto JSON conserva el estado y los bloques realmente terminados',async()=>{
 const dir=folder();
 const manifest={format:'Ocarto LiDAR tiled CSV v1',state:'incomplete',
    plan:{total:40},completed:[{name:'tesela_001_001',terrainCells:20}]};
 await exportModule.writeManifest(dir,manifest);
 const json=JSON.parse(dir.files.get('manifest.json'));
 assert.equal(json.state,'incomplete');
 assert.equal(json.completed.length,1);
 manifest.state='cancelled';
 await exportModule.writeManifest(dir,manifest);
 assert.equal(JSON.parse(dir.files.get('manifest.json')).state,'cancelled');
 manifest.state='complete';
 await exportModule.writeManifest(dir,manifest);
 assert.equal(JSON.parse(dir.files.get('manifest.json')).state,'complete');
});

test('exportación rechaza nombres inseguros y estados de manifiesto inventados',async()=>{
 const dir=folder();
 await assert.rejects(exportModule.writeCsv(dir,'../../mi_documento.txt',['a'],[[1]],x=>x),/nombre/i);
 await assert.rejects(exportModule.writeManifest(dir,{state:'finalizado'}),/Estado/);
});

test('la interfaz web realmente carga el exportador y valida número de filas antes de terminar',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(html.includes('<script src="lidar-tile-export.js"></script>'));
 assert(html.includes('OcartoLidarTileExport.writeCsv('));
 assert(html.includes('OcartoLidarTileExport.writeManifest('));
 assert(html.includes('writtenTerrain!==result.terrainCells'));
 assert(html.includes('writtenVegetation!==result.vegetationCells'));
});


function lidarRasterExports(){
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const runtime=fs.readFileSync(path.join(__dirname,'../ocarto-runtime-v248-3.js'),'utf8');
 const start=runtime.indexOf('/* lidar-exports.js */'),end=runtime.indexOf('/* feature-map.js */',start);
 assert(start>=0&&end>start);
 const scope={module:{exports:{}}};
 vm.runInNewContext(runtime.slice(start,end),scope,{timeout:4000});
 return scope.module.exports;
}
test('ráster LiDAR de 200 000 celdas evita desbordamiento de argumentos y conserva PGW',()=>{
 const {rasterGrid}=lidarRasterExports();
 const baseX=384000,baseY=4114000,cell=.5;
 const rows=Array.from({length:200000},(_,i)=>({
  x:baseX+(i%500+.5)*cell,
  y:baseY+(Math.floor(i/500)+.5)*cell,
  canopy_max_above_ground_m:i%51/5,
 }));
 const r=rasterGrid(rows,cell,'canopy');
 assert.equal(r.width,500);
 assert.equal(r.height,400);
 assert.equal(r.rgba.length,500*400*4);
 assert.equal(r.min,0);
 assert.equal(r.max,10);
 const pgw=r.worldFile.trim().split('\n').map(Number);
 assert.equal(pgw[0],.5);
 assert.equal(pgw[3],-.5);
 assert.equal(pgw[4],baseX+.25);
 assert.equal(pgw[5],baseY+200-.25);
});
test('canopy LiDAR conserva sin color las celdas sin altura fiable',()=>{
 const {rasterGrid}=lidarRasterExports();
 const rows=[
  {x:384000.25,y:4114000.25,canopy_max_above_ground_m:8},
  {x:384000.75,y:4114000.25,canopy_max_above_ground_m:null},
 ];
 const grid=rasterGrid(rows,.5,'canopy');
 assert.equal(grid.width,2);
 assert.equal(grid.rgba[3],255);
 assert.equal(grid.rgba[7],0,'Sin suelo fiable, el pixel debe ser transparente');
});


test('escribe imagen LiDAR PNG con georreferencia PGW y PRJ, sin TIFF reciclado',async()=>{
 const dir=folder();
 const png=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10])],
  {type:'image/png'});
 const pgw='0.5\n0\n0\n-0.5\n384000.25\n4114999.75\n';
 const result=await exportModule.writeRasterTriplet(dir,
  'tesela_001_002_alturas_lidar',png,pgw,'PROJCS[EPSG:25830]');
 assert.equal(result.png,'tesela_001_002_alturas_lidar.png');
 assert.equal(result.pgw,'tesela_001_002_alturas_lidar.pgw');
 assert.equal(result.prj,'tesela_001_002_alturas_lidar.prj');
 assert.equal(result.bytes,png.size);
 assert(dir.files.has(result.png));
 assert.equal(dir.files.get(result.pgw),pgw);
 assert(dir.files.get(result.prj).includes('PROJCS[EPSG:25830]'));
});
test('impide PGW inválido, nombre inseguro y rechaza un PNG vacío',async()=>{
 const dir=folder(),png=new Blob([new Uint8Array(10)]);
 await assert.rejects(exportModule.writeRasterTriplet(dir,'../../falso',
  png,'0.5\n0\n0\n-0.5\n0\n0\n','PROJCS[EPSG:25830]'),/nombre/i);
 await assert.rejects(exportModule.writeRasterTriplet(dir,'tesela_1',
  png,'0.5\n0\n0\n0.5\n0\n0\n','PROJCS[EPSG:25830]'),/incompletos/);
 await assert.rejects(exportModule.writeRasterTriplet(dir,'tesela_1',
  new Blob([]),'0.5\n0\n0\n-0.5\n0\n0\n','PROJCS[EPSG:25830]'),/incompletos/);
 assert.equal(dir.files.size,0);
});
test('el mosaico importa alturas desde LAZ y las guarda sin tocar el TIFF anterior',()=>{
 const html=require('node:fs').readFileSync(require('node:path')
  .join(__dirname,'../index.html'),'utf8');
 assert(html.includes('OcartoLidarExports.rasterGrid(result.vegetationRows,'));
 assert(html.includes("cellVegetation,'canopy',{heightStops}"));
 assert(html.includes('OcartoLidarTileExport.writeRasterTriplet(folder,'));
 assert(html.includes("label+'_alturas_lidar',png,grid.worldFile,wkt"));
 assert(html.includes('heightRaster={...saved,bounds:grid.bounds,width:grid.width'));
 assert(html.includes('transparentNoData:true'));
 assert(html.includes('heightRaster});'));
});
