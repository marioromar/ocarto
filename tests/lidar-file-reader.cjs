'use strict';
const assert=require('node:assert/strict');
const {readFileBuffer}=require('../lidar-file-reader.js');

(async()=>{
 const file=new Blob([Uint8Array.from([1,2]),Uint8Array.from([3,4,5])]);let progress=[];
 const buffer=await readFileBuffer(file,{onProgress:(done,total)=>progress.push([done,total])});
 assert.deepEqual([...new Uint8Array(buffer)],[1,2,3,4,5]);
 assert.deepEqual(progress.at(-1),[5,5]);
 const controller=new AbortController();let cancelled=false;
 const slowFile={size:4,stream(){return new ReadableStream({start(c){c.enqueue(Uint8Array.from([8,9]));},cancel(){cancelled=true}})}};
 const pending=readFileBuffer(slowFile,{signal:controller.signal});
 await new Promise(resolve=>setImmediate(resolve));controller.abort();
 await assert.rejects(pending,error=>error.name==='AbortError');
 assert.equal(cancelled,true,'abort cancels the pending file stream');
 await assert.rejects(readFileBuffer({size:0,stream(){throw Error('should not open')}}),/Archivo vacío/);
 console.log('✓ lectura LAS/LAZ por bloques: bytes, avance y cancelación antes de enviar al Worker');
})().catch(error=>{console.error(error);process.exitCode=1});
