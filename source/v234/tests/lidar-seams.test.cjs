'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {Blob}=require('node:buffer');
const fs=require('node:fs');
const path=require('node:path');
const seams=require('../lidar-tile-seams.js');

function directory(seed={},opts={}){
 const files=new Map(Object.entries(seed));
 const aborted=new Set(),written=new Map();
 return {
  files,aborted,written,
  async getFileHandle(name,{create=false}={}){
   if(!create&&!files.has(name))throw Error('File not found: '+name);
   return {
    async getFile(){return new Blob([files.get(name)]);},
    async createWritable(){
      let parts=[],writes=0;
      return {
       async write(value){
        if(opts.failAfter===++writes)throw Error('Sin espacio en disco');
        parts.push(String(value));
       },
       async close(){files.set(name,parts.join(''));written.set(name,writes);},
       async abort(){aborted.add(name);},
      };
    },
   };
  },
 };
}
const outer={rings:[[[0,0],[6,0],[6,3],[0,3]]]};
const tileA={name:'tesela_001_001',
 window:{minX:0,maxX:3,minY:0,maxY:3},
 terrainFile:'tesela_001_001_mdt.csv'};
const tileB={name:'tesela_001_002',
 window:{minX:3,maxX:6,minY:0,maxY:3},
 terrainFile:'tesela_001_002_mdt.csv'};
const manifest={
 state:'complete',cellTerrain:1,selectedArea:outer,
 completed:[tileA,tileB],plan:{total:2}
};
function csvForTile(tile,exclude=[]){
 let s='x_utm,y_utm,min_ground_z_m\n';
 for(let x=tile.window.minX;x<tile.window.maxX;x++)
  for(let y=0;y<3;y++){
   const cx=x+.5,cy=y+.5;
   if(exclude.includes(cx))continue;
   s+=cx+','+cy+','+(100+cx*2+cy)+'\n';
  }
 return s;
}
function parseAscii(s){
 const lines=s.trim().split('\n');
 const header=Object.fromEntries(lines.slice(0,6).map(v=>{
   const i=v.indexOf(' ');return [v.slice(0,i),Number(v.slice(i+1))];
 }));
 return {header,rows:lines.slice(6).map(s=>s.split(/\s+/).map(Number))};
}
function getPoint(ascii,row,col){return ascii.rows[row][col]}

test('el MDT conserva las cotas medidas sin suavizarlas y lee datos de la tesela vecina',async()=>{
 const dir=directory({
  [tileA.terrainFile]:csvForTile(tileA,[2.5]),
  [tileB.terrainFile]:csvForTile(tileB,[3.5]),
 });
 const stats=await seams.exportTile(dir,manifest,tileA);
 assert.equal(stats.measured,6);
 assert.equal(stats.interpolated,3);
 assert.equal(stats.noData,0);
 assert.equal(stats.neighborTiles,2);
 const a=parseAscii(dir.files.get(stats.name));
 assert.deepEqual(a.header,{ncols:3,nrows:3,xllcorner:0,yllcorner:0,cellsize:1,NODATA_value:-9999});
 assert.equal(getPoint(a,1,0),102.5); // measured at x0.5, y1.5
 const inputs=new Map();
 for(const tile of manifest.completed){
  const content=dir.files.get(tile.terrainFile);
  for(const line of content.trim().split('\n').slice(1)){
   const [x,y,z]=line.split(',').map(Number);
   inputs.set((Math.round(x-.5))+','+(Math.round(y-.5)),z);
  }
 }
 const expected=seams.interpolation(inputs,2,1);
 assert.equal(expected.measured,false);
 assert(Math.abs(getPoint(a,1,2)-expected.z)<1e-4);
 assert(getPoint(a,1,2)>100 && getPoint(a,1,2)<115,
   'La estimación IDW no debe producir cotas fuera del rango observado');
});

test('el MDT con teselas vecinas produce resultados idénticos a una sola rejilla global',async()=>{
 const dir=directory({
  [tileA.terrainFile]:csvForTile(tileA,[2.5]),
  [tileB.terrainFile]:csvForTile(tileB,[3.5]),
 });
 const [a,b]=await Promise.all([seams.exportTile(dir,manifest,tileA),seams.exportTile(dir,manifest,tileB)]);
 assert.equal(a.measured+b.measured,12);
 assert.equal(a.interpolated+b.interpolated,6);
 assert.equal(a.noData+b.noData,0);
 const rasterA=parseAscii(dir.files.get(a.name));
 const rasterB=parseAscii(dir.files.get(b.name));
 const all=new Map();
 for(const tile of manifest.completed){
  for(const line of dir.files.get(tile.terrainFile).trim().split('\n').slice(1)){
   const [x,y,z]=line.split(',').map(Number);
   all.set(Math.round(x-.5)+','+Math.round(y-.5),z);
  }
 }
 for(let j=0;j<3;j++)for(let i=0;i<6;i++){
  const v=seams.interpolation(all,i,j);
  const actual=i<3?rasterA.rows[2-j][i]:rasterB.rows[2-j][i-3];
  assert(Math.abs(actual-v.z)<0.0001,'Interpolación de frontera '+i+','+j);
 }
});

test('las zonas fuera del polígono y los huecos interiores son NODATA, no rellenos falsos',async()=>{
 const dir=directory({
  [tileA.terrainFile]:csvForTile(tileA),
  [tileB.terrainFile]:csvForTile(tileB),
 });
 const withHole={...manifest,selectedArea:{rings:[
  ...outer.rings,
  [[1,1],[2,1],[2,2],[1,2]]
 ]}};
 const t=await seams.exportTile(dir,withHole,tileA);
 const a=parseAscii(dir.files.get(t.name));
 assert.equal(a.rows[1][1],-9999);
 assert.equal(t.noData,1);
 assert.equal(t.measured,8);
});

test('un terreno muy escaso no se extrapola a grandes huecos',async()=>{
 const dir=directory({
  [tileA.terrainFile]:'x_utm,y_utm,min_ground_z_m\n0.5,0.5,105\n',
  [tileB.terrainFile]:'x_utm,y_utm,min_ground_z_m\n',
 });
 const stats=await seams.exportTile(dir,manifest,tileA);
 assert.equal(stats.measured,1);
 assert.equal(stats.interpolated,0);
 assert.equal(stats.noData,8);
});

test('error por cota incorrecta impide publicar rejillas resultantes',async()=>{
 const dir=directory({
  [tileA.terrainFile]:'x_utm,y_utm,min_ground_z_m\n0.7,0.5,105\n',
  [tileB.terrainFile]:csvForTile(tileB),
 });
 await assert.rejects(seams.exportTile(dir,manifest,tileA),/desalineada/);
 assert(![...dir.files.keys()].some(x=>x.endsWith('.asc')));
});

test('un fallo de disco aborta la salida .asc sin marcarla como completa',async()=>{
 const dir=directory({
  [tileA.terrainFile]:csvForTile(tileA),
  [tileB.terrainFile]:csvForTile(tileB),
 },{failAfter:3});
 const name='tesela_001_001_mdt_preliminar.asc';
 await assert.rejects(seams.exportTile(dir,manifest,tileA),/Sin espacio/);
 assert(dir.aborted.has(name));
 assert(!dir.files.has(name));
});

test('la lectura CSV detecta filas truncadas y conserva límite de memoria por flujo',async()=>{
 const bad=new Blob(['x_utm,y_utm,min_ground_z_m\n0.5,1.5,\n']);
 await assert.rejects(seams.readTerrainCsv(bad,()=>{}),/vacía/);
 const huge=new Blob(['x_utm,y_utm,min_ground_z_m\n', '0.5,1.5,123\n'.repeat(9000)]);
 let count=0;
 await seams.readTerrainCsv(huge,()=>count++);
 assert.equal(count,9000);
});

test('abort permite cancelar durante la escritura y deja solo rejillas terminadas',async()=>{
 const dir=directory({[tileA.terrainFile]:csvForTile(tileA),[tileB.terrainFile]:csvForTile(tileB)});
 const controller=new AbortController();
 controller.abort();
 await assert.rejects(seams.exportTile(dir,manifest,tileA,{signal:controller.signal}),
  error=>error.name==='AbortError');
 assert(!dir.files.has(tileA.name+'_mdt_preliminar.asc'));
});

test('un área incompleta no se presenta como MDT unido listo',async()=>{
 const dir=directory({});
 await assert.rejects(seams.exportAll(dir,{...manifest,state:'incomplete'}),/termina/);
 assert.throws(()=>seams.tileGridGeometry({minX:0,maxX:5000,minY:0,maxY:5000},.5),/1.000.000/);
});

test('la interfaz integra halo, botón y manifiesto diferenciado',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(html.includes('<script src="lidar-tile-seams.js"></script>'));
 assert(html.includes('id="rebuildMdtBtn"'));
 assert(html.includes('id="rebuildMdtCancel"'));
 assert(html.includes('OcartoLidarSeams.exportTile('));
 assert(html.includes('manifest.dtmSeams.state='));
 assert(html.includes('mdSeamJob?.abort()'));
});
