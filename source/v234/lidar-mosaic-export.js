/* Ocarto v286: un proyecto LiDAR continuo, con cálculos internos por teselas.
   Genera CSV conjuntos por streaming y VRT georreferenciados sin reunir millones
   de celdas en RAM. Los VRT necesitan sus archivos fuente en la misma carpeta. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoLidarMosaicExport=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const checkStop=options=>{
   if(options?.shouldCancel?.()||options?.signal?.aborted)
     throw Object.assign(Error('Procesamiento del mosaico cancelado'),{name:'AbortError'});
 };
 const safeName=(s,extension)=>{
   if(typeof s!=='string'||!new RegExp('^[\\w-]+\\.'+extension+'$','i').test(s))
     throw Error('Nombre de archivo LiDAR inseguro: '+s);
   return s;
 };
 const escapeXml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
   .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 function verifiedManifest(manifest) {
   if(!manifest?.plan?.total||manifest.completed?.length!==manifest.plan.total||
       manifest.state!=='complete')
     throw Error('Primero se deben terminar todas las teselas del mosaico');
   if(!/^EPSG:\d+$/i.test(String(manifest.crs||'')))
     throw Error('EPSG del mosaico no confirmado');
   const names=new Set();
   for(const tile of manifest.completed){
     if(!tile.window||!tile.name||names.has(tile.name))
       throw Error('Teselas de mosaico duplicadas o incompletas');
     names.add(tile.name);
   }
   return manifest;
 }
 function geometry(manifest,cell) {
   const b=manifest.selectedArea?.bounds||manifest.plan.bounds;
   if(!b||![b.minX,b.minY,b.maxX,b.maxY,cell].every(Number.isFinite)||
     cell<.1||cell>100||b.minX>=b.maxX||b.minY>=b.maxY)
     throw Error('Georreferencia de mosaico o resolución inválida');
   const left=Math.floor(b.minX/cell)*cell,top=Math.ceil(b.maxY/cell)*cell;
   const width=Math.ceil(b.maxX/cell)-Math.floor(b.minX/cell);
   const height=Math.ceil(b.maxY/cell)-Math.floor(b.minY/cell);
   if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||
      height<1||width*height>200000000)
     throw Error('Extensión del mosaico superior al límite virtual seguro');
   return {left,top,width,height,cell};
 }
 const position=(v,cell,label)=>{
   const scaled=v/cell,rounded=Math.round(scaled);
   if(Math.abs(scaled-rounded)>1e-5)
     throw Error('Tesela desalineada en '+label+': '+v);
   return rounded;
 };
 function vrtXml(manifest,product) {
   verifiedManifest(manifest);
   if(!['canopy','feature','mdt'].includes(product))throw Error('Modelo de mosaico no reconocido');
   const cell=Number(product==='mdt'?manifest.cellTerrain:manifest.cellVegetation);
   const g=geometry(manifest,cell);
   const sources=[];
   for(const t of manifest.completed) {
     let name,x,y,width,height;
     if(product==='canopy'||product==='feature') {
       const raster=product==='canopy'?t.heightRaster:t.featureRaster;
       if(!raster)continue; // Sin retornos válidos, transparentar en vez de inventar.
       const b=raster.bounds;
       if(!b||Math.abs(raster.cellSize-cell)>1e-8)
         throw Error('Ráster de altura sin georreferencia en '+t.name);
       name=safeName(raster.png,'png');width=raster.width;height=raster.height;
       if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
          Math.abs((b.right-b.left)/cell-width)>1e-5||
          Math.abs((b.top-b.bottom)/cell-height)>1e-5)
         throw Error('Tamaño de imagen LiDAR incompatible en '+t.name);
       x=position(b.left-g.left,cell,'X');
       y=position(g.top-b.top,cell,'Y');
     } else {
       const stats=(manifest.dtmSeams?.completed||[]).find(s=>
         s.tile===t.name||s.name===t.name+'_mdt_preliminar.asc');
       if(!stats)throw Error('Falta MDT con halo de '+t.name);
       name=safeName(stats.name,'asc');
       width=stats.columns;height=stats.rows;
       x=position(t.window.minX-g.left,cell,'X');
       y=position(g.top-(t.window.minY+height*cell),cell,'Y');
     }
     if(![width,height,x,y].every(Number.isInteger)||width<1||height<1||
        x<0||y<0||x+width>g.width||y+height>g.height)
       throw Error('Tesela fuera del mosaico georreferenciado: '+t.name);
     sources.push({name,width,height,x,y});
   }
   if(!sources.length)throw Error('No hay alturas LiDAR válidas para el mosaico');
   const colors=product==='mdt'?['Gray']:['Red','Green','Blue','Alpha'];
   const bandType=product==='mdt'?'Float32':'Byte';
   const bands=colors.map((color,k)=>{
     const blocks=sources.map(src=>
       '    <SimpleSource>\n'+
       '      <SourceFilename relativeToVRT="1">'+escapeXml(src.name)+'</SourceFilename>\n'+
       '      <SourceBand>'+(product==='mdt'?1:k+1)+'</SourceBand>\n'+
       '      <SourceProperties RasterXSize="'+src.width+'" RasterYSize="'+src.height+
          '" DataType="'+bandType+'" BlockXSize="256" BlockYSize="256"/>\n'+
       '      <SrcRect xOff="0" yOff="0" xSize="'+src.width+'" ySize="'+src.height+'"/>\n'+
       '      <DstRect xOff="'+src.x+'" yOff="'+src.y+
          '" xSize="'+src.width+'" ySize="'+src.height+'"/>\n'+
       '    </SimpleSource>').join('\n');
     return '  <VRTRasterBand dataType="'+bandType+'" band="'+(k+1)+'">\n'+
       '    <ColorInterp>'+color+'</ColorInterp>\n'+
       (product==='mdt'?'    <NoDataValue>-9999</NoDataValue>\n':'')+
       blocks+'\n  </VRTRasterBand>';
   }).join('\n');
   return {xml:'<VRTDataset rasterXSize="'+g.width+'" rasterYSize="'+g.height+'">\n'+
     '  <SRS>'+escapeXml(manifest.crs)+'</SRS>\n'+
     '  <GeoTransform>'+[g.left,g.cell,0,g.top,0,-g.cell].join(', ')+'</GeoTransform>\n'+
     bands+'\n</VRTDataset>\n',
     sources:sources.length,bands:colors.length,width:g.width,height:g.height,
     cellSize:cell,crs:manifest.crs,format:'GDAL VRT (requiere rásteres fuente en la misma carpeta)'};
 }
 async function writeVrt(directory,name,manifest,product) {
   safeName(name,'vrt');
   const data=vrtXml(manifest,product);
   const stream=await (await directory.getFileHandle(name,{create:true})).createWritable();
   try{await stream.write(data.xml);await stream.close();}
   catch(error){try{await stream.abort()}catch(_){}throw error;}
   const {xml,...stats}=data;
   return {name,...stats};
 }
 const cancelReader=async reader=>{try{await reader.cancel()}catch(_){}try{reader.releaseLock()}catch(_){}};
 async function appendCsv(directory,name,manifest,field,options={}) {
   verifiedManifest(manifest);
   const terrain=field==='terrain';
   if(!terrain&&field!=='vegetation')throw Error('Campo de unión LiDAR desconocido');
   safeName(name,'csv');
   const key=terrain?'terrainFile':'vegetationFile';
   const expectedKey=terrain?'terrainCells':'vegetationCells';
   const header=terrain?'x_utm,y_utm,min_ground_z_m':
     'x_utm,y_utm,ground_points,vegetation_points,building_points,wire_points,tower_points,ground_min_z_m,canopy_max_above_ground_m,canopy_mean_above_ground_m,vegetation_return_fraction,ground_height_source,estimated_ground_z_m,ground_estimation_support_cells,water_points,road_points';
   const stream=await (await directory.getFileHandle(name,{create:true})).createWritable();
   let all=0,sourceFiles=0;
   try {
     await stream.write(header+'\n');
     for(const tile of manifest.completed) {
       checkStop(options);
       const src=safeName(tile[key],'csv');
       if(src===name)throw Error('Salida y origen CSV del mosaico coinciden');
       const file=await (await directory.getFileHandle(src)).getFile();
       const reader=file.stream().getReader(),decoder=new TextDecoder();
       let pending='',first=true,local=0,lines=[];
       const consume=async(line)=>{
         if(first){first=false;if(line!==header)throw Error('Cabecera CSV diferente en '+src);return;}
         if(!line)return;
         const p=line.split(',');
         const x=Number(p[0]),y=Number(p[1]),w=tile.window;
         if(![x,y].every(Number.isFinite)||x<w.minX-1e-7||
           y<w.minY-1e-7||x>=w.maxX+1e-7||y>=w.maxY+1e-7)
           throw Error('Celda fuera del bloque de origen '+src);
         lines.push(line);local++;
         if(lines.length>=4096){await stream.write(lines.join('\n')+'\n');lines=[];}
       };
       try {
         while(true){
           checkStop(options);
           const {value,done}=await reader.read();
           if(done)break;
           pending+=decoder.decode(value,{stream:true});
           let pos;
           while((pos=pending.indexOf('\n'))>=0){
             const line=pending.slice(0,pos).replace(/\r$/,'');
             pending=pending.slice(pos+1);
             await consume(line);
           }
           if(pending.length>65536)throw Error('Fila CSV excesivamente larga: '+src);
         }
         pending+=decoder.decode();
         if(pending)await consume(pending.replace(/\r$/,''));
       }finally{await cancelReader(reader);}
       if(first||local!==tile[expectedKey])
         throw Error('CSV incompleto en '+src+'; esperadas '+tile[expectedKey]+' filas, recibidas '+local);
       if(lines.length)await stream.write(lines.join('\n')+'\n');
       all+=local;sourceFiles++;
       options.onProgress?.({file:src,sourceFiles,totalFiles:manifest.completed.length,rows:all});
     }
     await stream.close();
   } catch(error){try{await stream.abort()}catch(_){}throw error;}
   return {name,rows:all,sourceFiles,cellSize:terrain?manifest.cellTerrain:manifest.cellVegetation,
     crs:manifest.crs,format:'CSV conjunto observado, sin inventar cotas'};
 }
 return Object.freeze({verifiedManifest,geometry,vrtXml,writeVrt,appendCsv});
});
