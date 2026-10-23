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
  // Imagen de alturas calculadas del propio LAZ, y su georreferencia:
  // se publican las tres piezas antes de marcar la tesela como completa.
  // Exportar tres piezas de cada ráster calculado desde LAZ; abortar escrituras
  // parciales para que el manifiesto solo registre los productos completos.
  async function writeRasterTriplet(directory,base,png,worldFile,wkt){
    if(!/^[\w-]+$/.test(base))throw Error('Nombre de ráster LiDAR inválido');
    const world=String(worldFile||'').trim().split(/\s+/).map(Number);
    if(!png||!Number.isSafeInteger(png.size)||png.size===0 ||
       world.length!==6||!world.every(Number.isFinite) ||
       world[0]<=0||world[3]>=0 ||
       typeof wkt!=='string'||!wkt.includes('PROJCS['))
      throw Error('PNG, world file o PRJ del LiDAR incompletos');
    const entries=[{name:base+'.png',data:png},{name:base+'.pgw',data:worldFile},
      {name:base+'.prj',data:wkt+'\n'}],saved=[];
    try{
      for(const file of entries){
        const handle=await directory.getFileHandle(file.name,{create:true});
        const writer=await handle.createWritable();
        try{await writer.write(file.data);await writer.close();}
        catch(err){try{await writer.abort()}catch(_){}throw err;}
        saved.push(file.name);
      }
    }catch(error){
      for(const name of saved)try{await directory.removeEntry?.(name)}catch(_){}
      throw error;
    }
    return {png:entries[0].name,pgw:entries[1].name,prj:entries[2].name,bytes:png.size};
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
  return Object.freeze({writeCsv,writeManifest,writeRasterTriplet,csvValue});
});
