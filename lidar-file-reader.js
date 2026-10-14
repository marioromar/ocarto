/* Read large browser files in cancellable chunks without retaining a second full-size copy. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoLidarFileReader=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
async function readFileBuffer(file,{signal,onProgress=()=>{}}={}){
 if(!file||!Number.isSafeInteger(file.size)||file.size<1)throw Error('Archivo vacío o tamaño no válido');
 if(typeof file.stream!=='function')throw Error('Este navegador no permite leer LAS/LAZ por bloques; actualízalo para importar archivos grandes');
 if(signal?.aborted)throw abortError();
 const output=new Uint8Array(file.size),reader=file.stream().getReader();let offset=0,abortHandler;
 const cancel=()=>{try{void reader.cancel()}catch(_){}};
 if(signal){abortHandler=cancel;signal.addEventListener('abort',abortHandler,{once:true})}
 try{
  while(true){
   if(signal?.aborted)throw abortError();
   const {done,value}=await reader.read();
   if(signal?.aborted)throw abortError();
   if(done)break;
   if(!(value instanceof Uint8Array)||offset+value.byteLength>output.byteLength)throw Error('La lectura del archivo devolvió un tamaño inesperado');
   output.set(value,offset);offset+=value.byteLength;onProgress(offset,file.size);
  }
  if(offset!==file.size)throw Error(`Lectura incompleta: ${offset} de ${file.size} bytes`);
  return output.buffer;
 }finally{
  if(signal&&abortHandler)signal.removeEventListener('abort',abortHandler);
  try{reader.releaseLock()}catch(_){}
 }
}
async function streamFileToWorker(file,worker,{jobId,sessionId,signal,onProgress=()=>{},chunkSize=1024*1024}={}){
 if(!file||!Number.isSafeInteger(file.size)||file.size<1)throw Error('Archivo vacío o tamaño no válido');
 if(typeof file.stream!=='function')throw Error('Este navegador no permite leer LAS/LAZ por bloques; actualízalo para importar archivos grandes');
 if(!worker||typeof worker.postMessage!=='function'||typeof worker.addEventListener!=='function')throw Error('Worker LiDAR no disponible');
 if(signal?.aborted)throw abortError();
 let waiter=null,sequence=0,done=0,failed=null,skipped=false;
 const onMessage=event=>{const m=event.data||{};if(m.jobId!==jobId)return;
  if(m.type==='load-ready'&&waiter?.kind==='ready'){const w=waiter;waiter=null;w.resolve()}
  else if(m.type==='load-skip'){skipped=true}
  else if(m.type==='load-skip-ack'&&m.sequence===sequence&&waiter?.kind==='chunk'){const w=waiter;waiter=null;w.resolve()}
  else if(m.type==='load-chunk-ack'&&m.sequence===sequence&&waiter?.kind==='chunk'){const w=waiter;waiter=null;w.resolve()}
  else if(m.type==='loaded'&&waiter?.kind==='finish'){const w=waiter;waiter=null;w.resolve(m)}
  else if((m.type==='error'&&m.operation==='load')||m.type==='cancelled'){failed=Object.assign(Error(m.message||'Carga cancelada'),{name:m.type==='cancelled'?'AbortError':'Error'});if(waiter){const w=waiter;waiter=null;w.reject(failed)}}
 };
 const waitFor=kind=>new Promise((resolve,reject)=>{waiter={kind,resolve,reject};if(failed){waiter=null;reject(failed)}});
 const abort=()=>{try{worker.postMessage({type:'cancel',jobId})}catch(_){};try{void reader?.cancel()}catch(_){}};
 let reader=null;
 worker.addEventListener('message',onMessage);if(signal)signal.addEventListener('abort',abort,{once:true});
 try{
  worker.postMessage({type:'load-start',jobId,fileSize:file.size,sessionId});await waitFor('ready');
  reader=file.stream().getReader();
  while(true){if(signal?.aborted)throw abortError();const part=await reader.read();if(signal?.aborted)throw abortError();if(part.done)break;
   if(!(part.value instanceof Uint8Array))throw Error('La lectura del archivo devolvió un bloque inválido');
   for(let offset=0;offset<part.value.byteLength;offset+=chunkSize){if(signal?.aborted)throw abortError();const chunk=part.value.slice(offset,Math.min(part.value.byteLength,offset+chunkSize));sequence++;worker.postMessage({type:'load-chunk',jobId,sequence,offset:done,chunk},[chunk.buffer]);done+=chunk.byteLength;onProgress(done,file.size);await waitFor('chunk');if(skipped)break}
   if(skipped){try{await reader.cancel()}catch(_){}break}
  }
  if(done!==file.size&&!skipped)throw Error(`Lectura incompleta: ${done} de ${file.size} bytes`);
  worker.postMessage({type:'load-end',jobId});const loaded=await waitFor('finish');return loaded;
 }catch(e){if(e.name==='AbortError'||signal?.aborted)abort();else try{worker.postMessage({type:'cancel',jobId})}catch(_){}throw e}
 finally{if(signal)signal.removeEventListener('abort',abort);worker.removeEventListener('message',onMessage);if(reader)try{reader.releaseLock()}catch(_){}}
}
function abortError(){const e=Error('Carga cancelada');e.name='AbortError';return e}
return{readFileBuffer,streamFileToWorker};
});
