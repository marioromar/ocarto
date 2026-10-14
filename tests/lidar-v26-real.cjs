'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const input=process.argv[2];if(!input)throw Error('Uso: node tests/lidar-v23-real.cjs ruta/nube.laz');
const source=fs.readFileSync('lidar-worker.js','utf8');
const laz=fs.readFileSync('vendor/laz-perf.js','utf8');
const veg=fs.readFileSync('vegetation-lidar.js','utf8');
const SS=require('../vectorize-structures.js');const VV=require('../vectorize-vegetation.js');const valley=require('../valley-tracing.js');const {buildModel}=require('../terrain-grid.js');
const messages=[];const started=Date.now();
const context={console,WebAssembly,Uint8Array,Int8Array,Int32Array,Float32Array,Float64Array,ArrayBuffer,DataView,Math,Number,Error,Promise,Map,Set,BigInt,process,require,__dirname:path.resolve('vendor'),setTimeout,TextDecoder,TextEncoder,postMessage(msg){if(msg.type!=='progress')messages.push(msg)}};
context.self=context;vm.createContext(context);
context.importScripts=name=>{if(name==='vendor/laz-perf.js')vm.runInContext(laz,context);else if(name==='vegetation-lidar.js')vm.runInContext(veg,context);else throw Error('Dependencia no permitida: '+name)};
vm.runInContext(source,context);
const f=fs.readFileSync(input),buffer=f.buffer.slice(f.byteOffset,f.byteOffset+f.byteLength);
async function streamLoad(){const jobId=701;await context.onmessage({data:{type:'load-start',jobId,fileSize:buffer.byteLength}});if(messages.at(-1).type!=='load-ready')throw Error('El Worker no aceptó el inicio de carga');const chunkSize=1024*1024;let offset=0,sequence=0;while(offset<buffer.byteLength){const size=Math.min(chunkSize,buffer.byteLength-offset),chunk=new Uint8Array(buffer,offset,size);sequence++;await context.onmessage({data:{type:'load-chunk',jobId,sequence,offset,chunk}});offset+=size;const ack=messages.at(-1);if(ack.type!=='load-chunk-ack')throw Error(ack.message||'El Worker no confirmó un bloque LAZ')}await context.onmessage({data:{type:'load-end',jobId}});const loaded=messages.at(-1);if(loaded.type!=='loaded'||loaded.jobId!==jobId)throw Error(loaded.message||'No se pudo cargar el LAZ por bloques');return loaded}
async function command(type,options){if(type==='load')return streamLoad();await context.onmessage({data:{type,options}});const m=messages.at(-1);if(m.type==='error')throw Error(m.message);if(m.type!==({terrain:'terrain',vegetation:'vegetation'}[type]))throw Error('Respuesta inesperada: '+m.type);return m}
(async()=>{
 await context.onmessage({data:{type:'area-start',sessionId:700,terrainCell:5,vegetationCell:5}});if(messages.at(-1).type!=='area-ready')throw Error('No se inició el modelo de área');
 const load=await command('load');await context.onmessage({data:{type:'area-add',sessionId:700,jobId:701}});if(messages.at(-1).type!=='area-tile-done')throw Error(messages.at(-1).message||'Falló el agregado de la tesela real');
 await context.onmessage({data:{type:'area-finish',sessionId:700,jobId:702}});const area=messages.at(-1);if(area.type!=='area-finished')throw Error(area.message||'Falló el modelo final del área');
 const ground={candidates:area.terrain};
 const model=buildModel(ground.candidates,5);const axes=valley.detect(model.rows,5,{minLength:20,minIncision:0.6,radius:2});
 const green={rows:area.vegetationRows,cells:area.vegetationCells,classifiedPoints:area.vegetationProcessed};const vectors=VV.vectorize(green.rows,5,{minArea:150});const structures=SS.extract(green.rows,5);
 if(load.count<1_000_000||ground.candidates.length<1000||green.rows.length<1000)throw Error('Faltan datos en análisis real');
 for(const f of axes.features){if(f.properties.length_m<20||f.properties.apply_automatically!==false)throw Error('Eje de vaguada fuera del criterio');}
 for(const f of vectors.features){if(f.properties.passability!==null||f.properties.review_required!==true)throw Error('Polígono LiDAR clasificado incorrectamente como mapa final')}
 const summary={tiles:area.tiles,points:load.count,buildings_from_class6:structures.properties.buildings,power_lines_from_class14:structures.properties.power_lines,power_tower_cells_from_class15:structures.properties.power_tower_cells,building_points:green.rows.reduce((sum,r)=>sum+(r.building_points||0),0),wire_points:green.rows.reduce((sum,r)=>sum+(r.wire_points||0),0),tower_points:green.rows.reduce((sum,r)=>sum+(r.tower_points||0),0),vegetation_vector_polygons:vectors.features.length,vegetation_class_counts:vectors.properties.counts,file:path.basename(input),ground_cells:ground.candidates.length,valleys_over_20m:axes.features.length,vegetation_cells:green.cells,classified_vegetation_ground_points:green.classifiedPoints,vegetation_samples_with_ground:green.rows.filter(r=>r.ground_points>0&&r.vegetation_points>0).length,seconds:+((Date.now()-started)/1000).toFixed(1),peakRssMiB:Math.round(process.memoryUsage().rss/1048576)};
 console.log('OCARTO LAZ AREA REAL',JSON.stringify(summary,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
