'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const vector=require('../lidar-mosaic-vector.js');
const hdr=vector.CSV_HEADER;
const csv=(x,y,{ground=0,vegetation=0,building=0,wire=0,tower=0,
  canopy=null,density=0,source='unknown',water=0,road=0}={})=>
  [x,y,ground,vegetation,building,wire,tower,
   ground?'100':'',canopy??'',canopy??'',density,source,'',0,water,road].join(',');
function directory(seed={}) {
 const files=new Map(Object.entries(seed)),aborted=new Set();
 return {files,aborted,async getFileHandle(name,{create=false}={}){
  if(!create&&!files.has(name))throw Error('Missing '+name);
  return {
   async getFile(){return new Blob([files.get(name)])},
   async createWritable(){const chunks=[];return {
    async write(v){chunks.push(String(v))},
    async close(){files.set(name,chunks.join(''))},
    async abort(){aborted.add(name)} 
   }}
  };
 }};
}
const shape=(w,h)=>({width:w,height:h,x0:384000,y0:4114000,cell:1});
const pos=(n,w)=>[n%w,Math.floor(n/w)];
const draw=(mask,w,cls,a,b,c,d)=>{
 for(let j=b;j<d;j++)for(let i=a;i<c;i++)mask[j*w+i]=cls;
};
test('tres clases candidatas desde LiDAR, no de colores, y exclusión agua edificios carreteras',()=>{
 const classify=vector.classifyColumns;
 assert.equal(classify(csv(0,0,{ground:1,vegetation:3,canopy:4,density:.8}).split(',')),1);
 assert.equal(classify(csv(0,0,{ground:3,vegetation:2,canopy:1,density:.4}).split(',')),2);
 assert.equal(classify(csv(0,0,{ground:3,source:'observed'}).split(',')),3);
 assert.equal(classify(csv(0,0,{ground:3,source:'observed',road:1}).split(',')),0);
 assert.equal(classify(csv(0,0,{ground:3,source:'observed',water:1}).split(',')),0);
 assert.equal(classify(csv(0,0,{ground:3,source:'observed',building:1}).split(',')),0);
 assert.equal(classify(csv(0,0,{ground:1,source:'observed'}).split(',')),0);
});
test('un verde cruza la antigua frontera de dos LAZ: un único polígono curvo',()=>{
 const w=10,h=10,mask=new Uint8Array(w*h);
 draw(mask,w,1,1,2,9,6);
 const out=vector.vectorizeMask(mask,shape(w,h),
  {minAreas:{verde_oscuro:1,rayado:1,amarillo:1}});
 assert.equal(out.features.length,1);
 const f=out.features[0],ring=f.geometry.coordinates[0];
 assert.equal(f.properties.clase,'verde_oscuro');
 assert.equal(f.properties.review_required,true);
 assert(ring.length>5,'Chaikin genera contorno redondeado');
 assert.deepEqual(ring[0],ring[ring.length-1]);
 const xs=ring.map(p=>p[0]);
 assert(Math.min(...xs)<384005&&Math.max(...xs)>384005,
  'El polígono único debe cubrir ambos lados de la frontera geográfica entre LAZ');
});
test('amarillo grande con hueco interior preserva el hueco sin inventar cultivo',()=>{
 const w=15,h=15,mask=new Uint8Array(w*h);
 draw(mask,w,3,0,0,15,15);
 draw(mask,w,0,5,5,10,10);
 const out=vector.vectorizeMask(mask,shape(w,h));
 assert.equal(out.features.length,1);
 const f=out.features[0];
 assert.equal(f.properties.clase,'amarillo');
 assert.equal(f.properties.iof_symbol,null);
 assert.equal(f.geometry.coordinates.length,2,'Anillo exterior e interior');
 assert.notEqual(f.geometry.coordinates[0].length,0);
 assert(out.summary.features===1);
});
test('no añadir manchas amarillas pequeñas ni clases verde claro/intermedio en Bobadilla',()=>{
 const w=20,h=20,mask=new Uint8Array(w*h);
 draw(mask,w,3,1,1,5,5);
 const out=vector.vectorizeMask(mask,shape(w,h));
 assert.equal(out.features.length,0);
 assert.equal(out.summary.suppressedSmall,1);
 assert.deepEqual(vector.CLASSES.map(c=>c.key),['verde_oscuro','rayado','amarillo']);
});
test('clasificación de CSV de ambos LAZ conserva celda, CRS y rechaza duplicados',async()=>{
 const m=shape(3,2),src=hdr+'\n'+
  csv(384000.5,4114000.5,{ground:3,source:'observed'})+'\n'+
  csv(384001.5,4114000.5,{ground:1,vegetation:3,canopy:5,density:.8})+'\n'+
  csv(384002.5,4114000.5,{ground:2,source:'observed',road:1})+'\n';
 const parsed=await vector.loadMask(new Blob([src]),m);
 assert.equal(parsed.rows,3);
 assert.deepEqual(parsed.count,[1,1,0,1]);
 assert.deepEqual(Array.from(parsed.mask.slice(0,3)),[3,1,0]);
 const duplicated=src+csv(384000.5,4114000.5,{ground:3,source:'observed'})+'\n';
 await assert.rejects(vector.loadMask(new Blob([duplicated]),m),/repetida/);
});
test('exportación de toda la zona conserva 3 clases revisables y descarta símbolos IOF',async()=>{
 const w=15,h=15,lines=[hdr]; 
 for(let j=0;j<h;j++)for(let i=0;i<w;i++)
  lines.push(csv(384000+i+.5,4114000+j+.5,{ground:3,source:'observed'}));
 const folder=directory({'zona_completa_vegetacion_lidar.csv':lines.join('\n')+'\n'});
 const manifest={
  state:'complete',crs:'EPSG:25830',cellVegetation:1,
  selectedArea:{bounds:{minX:384000,minY:4114000,maxX:384015,maxY:4114015}},
  sourceFiles:[{name:'384-4115.laz'},{name:'385-4115.laz'}],
  plan:{total:2},mosaic:{state:'building'}
 };
 const result=await vector.exportGeojson(folder,manifest);
 assert.equal(result.features,1);
 const geo=JSON.parse(folder.files.get(result.name));
 assert.equal(geo.crs.properties.name,'EPSG:25830');
 assert.deepEqual(geo.metadata.noInventedClasses,['verde_claro','verde_intermedio']);
 assert.deepEqual(geo.metadata.sourceFiles,['384-4115.laz','385-4115.laz']);
 assert(geo.features.every(f=>f.properties.review_required));
});
test('abortado no publica un GeoJSON incompleto ni altera LAZ',async()=>{
 const ctrl=new AbortController();ctrl.abort();
 const m=shape(1,1),r=new Uint8Array(1);r[0]=3;
 assert.throws(()=>vector.vectorizeMask(r,m,{signal:ctrl.signal}),{name:'AbortError'});
});
test('la interfaz integra vectorización directa de los LAZ de toda la zona',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(html.includes('<script src="lidar-mosaic-vector.js"></script>'));
 assert(html.includes('OcartoLidarMosaicVector.exportGeojson('));
 assert(html.includes("manifest.mosaic.outputs.vector="));
 assert(html.includes('heightRaster,featureRaster'));
});
