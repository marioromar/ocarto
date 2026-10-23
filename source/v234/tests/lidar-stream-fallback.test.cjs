'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const reader=require('../ocarto-runtime-v248-5.js');

// The source includes several bundled IIFEs; the last exports the file reader.
const api=reader.streamFileToWorker?reader:globalThis.OcartoLidarFileReader;
function workerFor(jobId,store){
 const listeners=new Set();
 const emit=data=>{for(const fn of listeners)fn({data:{...data,jobId}})};
 return {
  addEventListener(type,fn){if(type==='message')listeners.add(fn)},
  removeEventListener(type,fn){if(type==='message')listeners.delete(fn)},
  postMessage(m){
   if(m.type==='load-start')queueMicrotask(()=>emit({type:'load-ready'}));
   if(m.type==='load-chunk'){
    assert.equal(m.offset,store.bytes.length);
    store.bytes.push(...m.chunk);
    queueMicrotask(()=>emit({type:'load-chunk-ack',sequence:m.sequence}));
   }
   if(m.type==='load-end')queueMicrotask(()=>emit({type:'loaded',count:store.bytes.length}));
   if(m.type==='cancel')store.cancelled=true;
  }
 };
}
function mockFile(data,streamPieces,sliceOverride){
 const bytes=Uint8Array.from(data);
 let at=0;
 return {size:bytes.length,
  stream(){return {getReader(){return {
   async read(){if(at>=streamPieces.length)return {done:true};return {done:false,value:Uint8Array.from(streamPieces[at++])}},
   async cancel(){}, releaseLock(){}
  }}}},
  slice(start,end){return sliceOverride?.(start,end)||new Blob([bytes.slice(start,end)])}
 };
}
test('recupera desde file.slice un archivo cuyo File.stream sale vacío',async()=>{
 const data=Array.from({length:42},(_,i)=>i+1),store={bytes:[]},jobId=7;
 const file=mockFile(data,[]),updates=[];
 const result=await api.streamFileToWorker(file,workerFor(jobId,store),
  {jobId,chunkSize:9,onProgress:(done,total)=>updates.push([done,total])});
 assert.equal(result.count,data.length);
 assert.deepEqual(store.bytes,data);
 assert.deepEqual(updates.at(-1),[42,42]);
 assert.equal(store.cancelled,undefined);
});
test('recupera desde el byte pendiente, sin duplicar prefijo ya transferido',async()=>{
 const data=Array.from({length:31},(_,i)=>i),store={bytes:[]},jobId=10;
 const file=mockFile(data,[data.slice(0,7)]);
 const result=await api.streamFileToWorker(file,workerFor(jobId,store),{jobId,chunkSize:5});
 assert.equal(result.count,31);assert.deepEqual(store.bytes,data);
});
test('con stream íntegro no usa file.slice ni modifica los bytes originales',async()=>{
 const data=[1,2,3,4,5,6,7,8],store={bytes:[]},jobId=12;
 const file=mockFile(data,[data.slice(0,3),data.slice(3)],()=>{throw Error('No debe usar slice')});
 await api.streamFileToWorker(file,workerFor(jobId,store),{jobId,chunkSize:3});
 assert.deepEqual(store.bytes,data);
});
test('archivo truncado se rechaza, sin presentar una carga exitosa',async()=>{
 const data=[1,2,3,4,5,6],store={bytes:[]},jobId=13;
 const file=mockFile(data,[],()=>new Blob([]));
 await assert.rejects(api.streamFileToWorker(file,workerFor(jobId,store),{jobId,chunkSize:3}),/archivo truncado/);
 assert.equal(store.cancelled,true);
});
