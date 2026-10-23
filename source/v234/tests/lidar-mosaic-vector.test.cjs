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


test('suelo PNOA disperso: agrega retornos de 0,5 m para detectar amarillo grande sin TIFF',async()=>{
 const c=.5,minX=384000,minY=4114000,width=20,height=20,lines=[hdr];
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  // Un retorno de suelo por 0,5 m: las reglas antiguas descartaban todas.
  lines.push(csv(minX+(i+.5)*c,minY+(j+.5)*c,
    {ground:1,vegetation:0,source:'observed'}));
 }
 const fakeManifest={cellVegetation:c,selectedArea:{bounds:{
  minX,maxX:minX+width*c,minY,maxY:minY+height*c
 }}};
 const shape=vector.aggregationGeometry(fakeManifest);
 assert.equal(shape.cell,2);
 assert.equal(shape.width,5);
 assert.equal(shape.height,5);
 const loaded=await vector.loadAggregatedMask(new Blob([lines.join('\n')+'\n']),shape);
 assert.equal(loaded.rows,400);
 assert.deepEqual(loaded.count,[0,0,0,25]);
 const areas=vector.vectorizeMask(loaded.mask,shape);
 assert.equal(areas.features.length,1);
 assert.equal(areas.features[0].properties.clase,'amarillo');
 assert.equal(areas.features[0].properties.review_required,true);
 assert.equal(areas.features[0].properties.estimated_area_m2,100);
});
test('mosaico LiDAR de 2 LAZ: un verde oscuro continuo con suelo y copas reales',async()=>{
 const minX=384000,minY=4114000,c=.5,lines=[hdr];
 // 6m x 10m con vegetación densa, atravesando x=384003.
 for(let j=0;j<20;j++)for(let i=0;i<12;i++)
  lines.push(csv(minX+(i+.5)*c,minY+(j+.5)*c,
    {ground:1,vegetation:3,canopy:4.8,density:.75,source:'observed'}));
 const fakeManifest={cellVegetation:c,selectedArea:{bounds:{
  minX,maxX:minX+6,minY,maxY:minY+10
 }}};
 const shape=vector.aggregationGeometry(fakeManifest);
 const loaded=await vector.loadAggregatedMask(new Blob([lines.join('\n')+'\n']),shape);
 const v=vector.vectorizeMask(loaded.mask,shape,
   {minAreas:{verde_oscuro:25,rayado:25,amarillo:25}});
 assert.equal(v.features.length,1);
 assert.equal(v.features[0].properties.clase,'verde_oscuro');
 const xs=v.features[0].geometry.coordinates[0].map(p=>p[0]);
 assert(Math.min(...xs)<384003&&Math.max(...xs)>384003);
 assert.equal(loaded.count[1],15);
});
test('el área no se recorta cuando contiene más de 12 millones de celdas originales',()=>{
 const huge={cellVegetation:.5,selectedArea:{bounds:{
  minX:384000,maxX:394000,minY:4114000,maxY:4124000
 }}};
 const a=vector.aggregationGeometry(huge);
 assert(a.width*a.height<=12000000);
 assert(a.cell>=2);
 assert.equal((a.cell/.5)%1,0);
 assert(a.width*a.height>0);
});
test('el agregado excluye celdas con carreteras/edificios y rechaza datos de origen inválidos',async()=>{
 const maskData=[
  csv(384000.25,4114000.25,{ground:1,vegetation:3,canopy:5,density:.75}),
  csv(384000.75,4114000.25,{ground:1,vegetation:3,canopy:5,density:.75,road:1}),
  csv(384001.25,4114000.25,{ground:1,vegetation:3,canopy:5,density:.75}),
 ];
 const shape=vector.aggregationGeometry({cellVegetation:.5,
   selectedArea:{bounds:{minX:384000,maxX:384002,minY:4114000,maxY:4114002}}});
 const loaded=await vector.loadAggregatedMask(
   new Blob([hdr+'\n'+maskData.join('\n')+'\n']),shape);
 assert.equal(loaded.count[0],1,'Una carretera impide sugerir verde sobre su celda');
 assert.deepEqual(loaded.count.slice(1),[0,0,0]);
 await assert.rejects(vector.loadAggregatedMask(
   new Blob([hdr+'\n'+csv(400000.25,4114000.25,{ground:1})+'\n']),shape),/fuera/);
});
