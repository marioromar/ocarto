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
  assert.equal(lines.at(-1),'354501,4070000,190.02');
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
