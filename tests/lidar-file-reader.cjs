'use strict';
const assert=require('node:assert/strict');
const {readFileBuffer,streamFileToWorker}=require('../lidar-file-reader.js');

(async()=>{
 const file=new Blob([Uint8Array.from([1,2]),Uint8Array.from([3,4,5])]);let progress=[];
 const buffer=await readFileBuffer(file,{onProgress:(done,total)=>progress.push([done,total])});
 assert.deepEqual([...new Uint8Array(buffer)],[1,2,3,4,5]);
 assert.deepEqual(progress.at(-1),[5,5]);
 const sent=[],listeners=new Set(),worker={addEventListener:(n,fn)=>listeners.add(fn),removeEventListener:(n,fn)=>listeners.delete(fn),postMessage(m){sent.push(m);const reply=m.type==='load-start'?{type:'load-ready',jobId:m.jobId}:m.type==='load-chunk'?{type:'load-chunk-ack',jobId:m.jobId,sequence:m.sequence}:m.type==='load-end'?{type:'loaded',jobId:m.jobId}:m.type==='cancel'?{type:'cancelled',jobId:m.jobId}:null;if(reply)queueMicrotask(()=>listeners.forEach(fn=>fn({data:reply})))}};
 let streamProgress=[];await streamFileToWorker(new Blob([Uint8Array.from([1,2,3,4,5])]),worker,{jobId:41,chunkSize:2,onProgress:(done,total)=>streamProgress.push([done,total])});
 assert.deepEqual(sent.filter(m=>m.type==='load-chunk').map(m=>[...new Uint8Array(m.chunk)]),[[1,2],[3,4],[5]],'transfiere bloques pequeños con espera entre bloques');assert.deepEqual(streamProgress.at(-1),[5,5]);assert.equal(sent.at(-1).type,'load-end');
 const cancelWorker={...worker,postMessage(m){worker.postMessage.call(this,m)}},streamAbort=new AbortController();
 await assert.rejects(streamFileToWorker(new Blob([new Uint8Array(16)]),cancelWorker,{jobId:42,signal:streamAbort.signal,chunkSize:2,onProgress:()=>streamAbort.abort()}),error=>error.name==='AbortError');
 assert(sent.some(m=>m.type==='cancel'&&m.jobId===42),'cancel interrupts the chunk transfer and tells the Worker to release its partial allocation');
 const controller=new AbortController();let cancelled=false;
 const slowFile={size:4,stream(){return new ReadableStream({start(c){c.enqueue(Uint8Array.from([8,9]));},cancel(){cancelled=true}})}};
 const pending=readFileBuffer(slowFile,{signal:controller.signal});
 await new Promise(resolve=>setImmediate(resolve));controller.abort();
 await assert.rejects(pending,error=>error.name==='AbortError');
 assert.equal(cancelled,true,'abort cancels the pending file stream');
 await assert.rejects(readFileBuffer({size:0,stream(){throw Error('should not open')}}),/Archivo vacío/);
 console.log('✓ lectura LAS/LAZ por bloques: bytes, avance y cancelación antes de enviar al Worker');
})().catch(error=>{console.error(error);process.exitCode=1});
