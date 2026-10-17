/* Ocarto LiDAR: blockwise file output to an authorized local directory.
   No uploads or remote APIs; File System Access handles belong to the user. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.OcartoLidarTileExport=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const BATCH_ROWS=4096;
  function csvValue(v){
    if(v==null)return '';
    if(typeof v==='number'&&!Number.isFinite(v))return '';
    const s=String(v);
    if(/[\r\n",]/.test(s))return '"'+s.replace(/"/g,'""')+'"';
    return s;
  }
  async function writeCsv(directory,name,headers,rows,toArray){
    if(!/^[\w-]+\.csv$/i.test(name))throw Error('Nombre de CSV de tesela inválido: '+name);
    if(!Array.isArray(headers)||!headers.length||!Array.isArray(rows)||typeof toArray!=='function')
      throw Error('Filas de CSV LiDAR inválidas');
    const handle=await directory.getFileHandle(name,{create:true});
    const stream=await handle.createWritable();
    let count=0;
    try {
      await stream.write(headers.map(csvValue).join(',')+'\n');
      const lines=[];
      for(const row of rows){
        const cells=toArray(row);
        if(!Array.isArray(cells)||cells.length!==headers.length)
          throw Error('Número de columnas inconsistente en '+name);
        lines.push(cells.map(csvValue).join(','));
        count++;
        if(lines.length===BATCH_ROWS){
          await stream.write(lines.join('\n')+'\n');
          lines.length=0;
        }
      }
      if(lines.length)await stream.write(lines.join('\n')+'\n');
      await stream.close();
    }catch(error){try{await stream.abort()}catch(_){}throw error;}
    return count;
  }
  async function writeManifest(directory,document){
    if(!document || !['complete','incomplete','cancelled','error'].includes(document.state))
      throw Error('Estado de manifiesto LiDAR inválido');
    const handle=await directory.getFileHandle('manifest.json',{create:true});
    const stream=await handle.createWritable();
    try{
      await stream.write(JSON.stringify(document,null,2));
      await stream.close();
    }catch(error){try{await stream.abort()}catch(_){}throw error;}
  }
  return Object.freeze({writeCsv,writeManifest,csvValue});
});
