'use strict';
const fs=require('node:fs');
const path=require('node:path');
const Vegetation=require('../vegetation-lidar.js');
const Learn=require('../vegetation-learning.js');
const SymbolGuides=require('../vegetation-symbol-guides.js');
const OcadObjects=require('../ocad-objects.js');
const Vector=require('../vectorize-vegetation.js');

function readHeader(buffer){
 if(buffer.byteLength<375)throw Error('Cabecera LAS/LAZ incompleta');
 const d=new DataView(buffer.buffer,buffer.byteOffset,buffer.byteLength);
 if(d.getUint32(0,true)!==0x4653414c)throw Error('Cabecera LAS inválida');
 const major=d.getUint8(24),minor=d.getUint8(25),format=d.getUint8(104)&63,compressed=!!(d.getUint8(104)&0xc0),recordLength=d.getUint16(105,true),offset=d.getUint32(96,true);
 let count=d.getUint32(107,true);if(major===1&&minor>=4){const extended=Number(d.getBigUint64(247,true));if(extended)count=extended}
 const minimumLength={0:20,1:28,2:26,3:34,4:57,5:63,6:30,7:36,8:38,9:59,10:67}[format];
 if(!compressed||!minimumLength||recordLength<minimumLength||!Number.isSafeInteger(count)||count<1)throw Error('El archivo debe ser un LAZ válido con un formato de punto compatible');
 return{major,minor,format,count,recordLength,offset,scale:[131,139,147].map(p=>d.getFloat64(p,true)),origin:[155,163,171].map(p=>d.getFloat64(p,true))};
}
function collectOcadGuides(file){
 const parsed=OcadObjects.parseOcadObjects(fs.readFileSync(file));
 const features=parsed.objects.map(o=>({type:'area',symbolCode:o.symbolCode,points:o.geometry.coordinates[0].slice(0,-1).map(([x,y])=>({x,y})),holes:o.geometry.coordinates.slice(1).map(r=>r.slice(0,-1).map(([x,y])=>({x,y})))}));
 const guide=SymbolGuides.collect(features,{worldRing:ring=>ring.map(p=>[p.x,p.y])});
 if(!guide.polygons.length)throw Error('El OCAD no contiene áreas guía reconocidas de vegetación');
 return{parsed,guide};
}
async function main(){
 const [, ,file,mapFile,cellArg]=process.argv;
 if(!file){console.error('Uso: node tests/lidar-real-workflow.cjs <archivo.laz> [mapa.ocd] [celda-m]');process.exitCode=2;return}
 const resolved=path.resolve(file);if(!fs.existsSync(resolved))throw Error(`No existe el archivo: ${resolved}`);
 const cell=Number(cellArg??5);if(!Number.isFinite(cell)||cell<1)throw Error('La celda de vegetación debe ser de al menos 1 m');
 const buffer=fs.readFileSync(resolved),meta=readHeader(buffer);if(meta.count<2_000_000)throw Error(`La prueba real espera al menos 2 millones de puntos; el archivo declara ${meta.count.toLocaleString('es-ES')}`);
 const factory=require('../vendor/laz-perf.js'),module=await factory({locateFile:name=>path.join(__dirname,'..','vendor',name)});
 const input=module._malloc(buffer.byteLength);if(!input)throw Error('Memoria insuficiente para abrir el LAZ en WebAssembly');
 const record=module._malloc(meta.recordLength);if(!record){module._free(input);throw Error('Memoria insuficiente para decodificar un punto LAZ')}
 let decoder=null;const store=Vegetation.create(cell,{maxCells:100000}),classCounts={},started=Date.now();
 try{
  module.HEAPU8.set(buffer,input);decoder=new module.LASZip();decoder.open(input,buffer.byteLength);
  if(decoder.getCount()!==meta.count||decoder.getPointLength()!==meta.recordLength||decoder.getPointFormat()!==meta.format)throw Error('La cabecera LAS/LAZ no coincide con el decodificador');
  const point=new DataView(module.HEAPU8.buffer,record,meta.recordLength);
  for(let i=0;i<meta.count;i++){
   decoder.getPoint(record);const x=point.getInt32(0,true)*meta.scale[0]+meta.origin[0],y=point.getInt32(4,true)*meta.scale[1]+meta.origin[1],z=point.getInt32(8,true)*meta.scale[2]+meta.origin[2],classification=point.getUint8(meta.format<=5?15:16),intensity=point.getUint16(12,true),returnNumber=point.getUint8(14)&15;
   classCounts[classification]=(classCounts[classification]||0)+1;store.add(x,y,z,classification,intensity,returnNumber);
  }
  const vegetation=store.finish({includeGeoJSON:false}),rows=vegetation.rows;
  const result={file:path.basename(resolved),lasVersion:`${meta.major}.${meta.minor}`,pointFormat:meta.format,points:meta.count,seconds:+((Date.now()-started)/1000).toFixed(1),classificationCounts:classCounts,vegetationCells:rows.length,usableVegetationCells:rows.filter(r=>Learn.fingerprint(r)).length};
  if(mapFile){
   const{parsed,guide}=collectOcadGuides(path.resolve(mapFile)),model=Learn.train(rows,guide.polygons),learnedCells=rows.filter(r=>model.predict(r)).length;
   const candidates=Vector.vectorize(rows,cell,{minArea:100,minWidth:4,maxFeatures:10000,labeler:model.predict,includeUncertain:true});
   result.ocad={version:parsed.version,crs:parsed.setup.crs,georeferenced:parsed.setup.georeferenced,areaObjects:parsed.areaCount,guideAreas:guide.matchedFeatures,guideCounts:guide.labelCounts};
   result.training={labels:model.labels,trainingCells:model.counts,prototypes:model.prototypes,conflicts:model.conflicts,predictedCells:learnedCells,candidateAreas:candidates.features.length,candidateCells:candidates.properties.counts,reviewRequired:true,orthophotoRequired:false};
  }
  console.log(JSON.stringify(result,null,2));
 }finally{if(decoder)try{decoder.delete()}catch(_){}module._free(record);module._free(input)}
}
main().catch(error=>{console.error(`Fallo de prueba LiDAR real: ${error.message}`);process.exitCode=1});
