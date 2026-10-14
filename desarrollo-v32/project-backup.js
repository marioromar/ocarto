/* Local latest-project backup using IndexedDB so embedded map images fit better than localStorage. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoProjectBackup=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DB='ocarto-local-backups',STORE='projects',KEY='latest';
function open(){return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined'){reject(Error('IndexedDB no disponible'));return}const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('No se pudo abrir la copia local'));req.onblocked=()=>reject(Error('La base local está bloqueada'))})}
async function saveLatest(project){if(!project||project.format!=='ocarto-project')throw Error('Proyecto no válido para copia local');const db=await open();try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({id:KEY,savedAt:new Date().toISOString(),project});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('No se pudo guardar la copia local'));tx.onabort=()=>reject(tx.error||Error('Guardado local cancelado'))})}finally{db.close()}}
async function loadLatest(){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(KEY);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||Error('No se pudo leer la copia local'))})}finally{db.close()}}
return{saveLatest,loadLatest};
});
