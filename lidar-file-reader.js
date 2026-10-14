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
function abortError(){const e=Error('Carga cancelada');e.name='AbortError';return e}
return{readFileBuffer};
});
