/* Ocarto v275 — Auditar fronteras del MDT preliminar sin cargar
   las rejillas completas. El indicador no demuestra un error cartográfico:
   pendientes naturales y cortados pueden crear gradientes elevados.
   Solo se señalan ausencias y cambios bruscos de gradiente para revisión. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoMdtAudit=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const CHECK=signal=>{if(signal?.aborted)throw Object.assign(
   Error('Auditoría MDT cancelada'),{name:'AbortError'});};
 const close=(a,b,tolerance=1e-5)=>Math.abs(a-b)<=tolerance;
 const keys=['ncols','nrows','xllcorner','yllcorner','cellsize','nodata_value'];
 function validHeader(h){
   if(keys.some(k=>!Number.isFinite(h[k])))throw Error('Cabecera ASCII Grid incompleta');
   if(!Number.isInteger(h.ncols)||!Number.isInteger(h.nrows)||
       h.ncols<1||h.nrows<1||h.ncols>10000||h.nrows>10000||
       h.ncols*h.nrows>1000000||h.cellsize<.1||h.cellsize>100)
     throw Error('Dimensiones de rejilla MDT inválidas o demasiado grandes');
 }
 async function readEdges(file,{signal}={}){
   if(!file?.stream)throw Error('El ASC de MDT no es un archivo legible');
   const reader=file.stream().getReader(),decoder=new TextDecoder();
   const head={},edges={north:null,northInner:null,south:null,southInner:null,
     west:[],westInner:[],east:[],eastInner:[]};
   let pending='',headers=0,rows=0;
   const lineOfText=line=>{
     const text=line.trim();if(!text)return;
     if(headers<6){
       const match=/^([a-zA-Z_]+)\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)$/.exec(text);
       if(!match)throw Error('Cabecera MDT ASC mal formada');
       const key=match[1].toLowerCase();
       if(!keys.includes(key)||Object.hasOwn(head,key))throw Error('Campo de cabecera MDT incorrecto: '+key);
       head[key]=Number(match[2]);headers++;
       if(headers===6)validHeader(head);
       return;
     }
     if(rows>=head.nrows)throw Error('El ASC contiene más filas de las declaradas');
     const fields=text.split(/\s+/);
     if(fields.length!==head.ncols)throw Error('Columnas incorrectas en la fila MDT '+(rows+1));
     const data=fields.map(Number);
     if(data.some(v=>!Number.isFinite(v)))throw Error('Cota no finita en MDT ASC');
     if(rows===0)edges.north=data;
     if(rows===1)edges.northInner=data;
     if(rows===head.nrows-2)edges.southInner=data;
     if(rows===head.nrows-1)edges.south=data;
     edges.west.push(data[0]);
     edges.westInner.push(data[Math.min(1,head.ncols-1)]);
     edges.east.push(data[head.ncols-1]);
     edges.eastInner.push(data[Math.max(0,head.ncols-2)]);
     rows++;
   };
   try{
     while(true){
       CHECK(signal);
       const item=await reader.read();if(item.done)break;
       pending+=decoder.decode(item.value,{stream:true});
       let end;
       while((end=pending.indexOf('\n'))>=0){
         lineOfText(pending.slice(0,end));pending=pending.slice(end+1);
       }
       if(pending.length>500000)throw Error('Línea MDT ASCII anormalmente grande');
     }
     pending+=decoder.decode();
     if(pending.trim())lineOfText(pending);
     if(headers!==6||rows!==head.nrows)throw Error('MDT ASC truncado: '+rows+'/'+head.nrows+' filas');
   }finally{reader.releaseLock();}
   return {header:head,edges};
 }
 function validateTile(raster,tile,cell){
   const h=raster.header,w=tile.window;
   const nc=Math.ceil((w.maxX-w.minX)/cell-1e-8);
   const nr=Math.ceil((w.maxY-w.minY)/cell-1e-8);
   if(!close(h.cellsize,cell,1e-9)||!close(h.xllcorner,w.minX)||
       !close(h.yllcorner,w.minY)||h.ncols!==nc||h.nrows!==nr)
     throw Error('La rejilla ASC no coincide con la ventana de '+tile.name);
 }
 function sample(raster,side,coord){
   const h=raster.header,e=raster.edges;
   const horizontal=side==='north'||side==='south';
   const pos=(coord-(horizontal?h.xllcorner:h.yllcorner))/h.cellsize-.5;
   const ix=Math.round(pos),count=horizontal?h.ncols:h.nrows;
   if(ix<0||ix>=count||Math.abs(pos-ix)>1e-4)return null;
   if(horizontal){
     const edge=e[side];
     const inner=e[side==='north'?'northInner':'southInner'];
     return {z:edge[ix],inside:inner?.[ix]??null};
   }
   const arr=e[side],inner=e[side==='east'?'eastInner':'westInner'];
   const fileIndex=h.nrows-1-ix;
   return {z:arr[fileIndex],inside:inner[fileIndex]};
 }
 function comparePair(a,b,orientation,{thresholdMetres=1.5}={}){
   if(!Number.isFinite(thresholdMetres)||thresholdMetres<=0||thresholdMetres>100)
     throw Error('Umbral de revisión de desnivel inválido');
   const wA=a.tile.window,wB=b.tile.window;
   const parallel=orientation==='vertical'?'y':'x',min='min'+parallel.toUpperCase(),max='max'+parallel.toUpperCase();
   const begin=Math.max(wA[min],wB[min]),end=Math.min(wA[max],wB[max]);
   if(end<=begin)return null;
   const cell=a.raster.header.cellsize;
   const fromA=orientation==='vertical'?'east':'north';
   const fromB=orientation==='vertical'?'west':'south';
   const origin=a.raster.header[orientation==='vertical'?'yllcorner':'xllcorner'];
   const first=Math.max(0,Math.ceil((begin-origin)/cell-.5-1e-7));
   const last=Math.ceil((end-origin)/cell-.5-1e-7);
   const report={a:a.tile.name,b:b.tile.name,orientation,thresholdMetres,
     paired:0,validPairs:0,bothMissing:0,oneMissing:0,
     maxHeightStepMetres:0,maxGradientResidualMetres:0,
     suspectGradient:0,examples:[]};
   for(let idx=first;idx<last;idx++){
     const coord=origin+(idx+.5)*cell;
     if(coord<begin-1e-7||coord>=end-1e-7)continue;
     const x=sample(a.raster,fromA,coord),y=sample(b.raster,fromB,coord);
     if(x===null||y===null)continue;
     report.paired++;
     const hx=a.raster.header,hy=b.raster.header;
     const good1=x.z!==hx.nodata_value,good2=y.z!==hy.nodata_value;
     if(!good1&&!good2){report.bothMissing++;continue;}
     if(good1!==good2){report.oneMissing++;continue;}
     report.validPairs++;
     const seamStep=y.z-x.z;
     report.maxHeightStepMetres=Math.max(report.maxHeightStepMetres,Math.abs(seamStep));
     // Three consecutive gradients, one at the border. This is a *review
     // indicator*, not a terrain error: cliffs and gullies may be real.
     if(x.inside!==null&&y.inside!==null&&
         x.inside!==hx.nodata_value&&y.inside!==hy.nodata_value){
       const leftGradient=x.z-x.inside,rightGradient=y.inside-y.z;
       const residual=Math.max(Math.abs(seamStep-leftGradient),
         Math.abs(seamStep-rightGradient));
       report.maxGradientResidualMetres=Math.max(report.maxGradientResidualMetres,residual);
       if(residual>thresholdMetres){
         report.suspectGradient++;
         if(report.examples.length<8)report.examples.push({
           positionUTM:orientation==='vertical'
             ?{x:wA.maxX,y:coord}:{x:coord,y:wA.maxY},
           stepMetres:Number(seamStep.toFixed(4)),
           gradientResidualMetres:Number(residual.toFixed(4)),
         });
       }
     }
   }
   report.reviewRecommended=report.oneMissing>0||report.suspectGradient>0;
   return report;
 }
 function adjacentPairs(tiles){
   const pairs=[];
   for(let i=0;i<tiles.length;i++)for(let j=i+1;j<tiles.length;j++){
     const a=tiles[i],b=tiles[j],wA=a.window,wB=b.window;
     if(close(wA.maxX,wB.minX)&&Math.min(wA.maxY,wB.maxY)>Math.max(wA.minY,wB.minY)+1e-5)
       pairs.push({a,b,orientation:'vertical'});
     else if(close(wB.maxX,wA.minX)&&Math.min(wA.maxY,wB.maxY)>Math.max(wA.minY,wB.minY)+1e-5)
       pairs.push({a:b,b:a,orientation:'vertical'});
     else if(close(wA.maxY,wB.minY)&&Math.min(wA.maxX,wB.maxX)>Math.max(wA.minX,wB.minX)+1e-5)
       pairs.push({a,b,orientation:'horizontal'});
     else if(close(wB.maxY,wA.minY)&&Math.min(wA.maxX,wB.maxX)>Math.max(wA.minX,wB.minX)+1e-5)
       pairs.push({a:b,b:a,orientation:'horizontal'});
   }
   return pairs;
 }
 async function audit(directory,manifest,{signal,onProgress,thresholdMetres=1.5}={}){
   CHECK(signal);
   if(manifest?.state!=='complete'||manifest?.dtmSeams?.state!=='complete'||
      !Array.isArray(manifest.completed)||manifest.completed.length!==manifest.plan?.total)
     throw Error('Termina las rejillas MDT preliminares antes de auditar sus bordes');
   const cell=Number(manifest.cellTerrain);
   if(!Number.isFinite(cell)||cell<.1)throw Error('Resolución MDT inválida');
   const unique=new Set(),tiles=[];
   for(let i=0;i<manifest.completed.length;i++){
     CHECK(signal);
     const tile=manifest.completed[i];
     if(!/^[\w-]+$/.test(tile.name)||unique.has(tile.name))
       throw Error('Nombre de tesela duplicado o inválido en manifest.json');
     unique.add(tile.name);
     const handle=await directory.getFileHandle(tile.name+'_mdt_preliminar.asc');
     const raster=await readEdges(await handle.getFile(),{signal});
     validateTile(raster,tile,cell);
     tiles.push({tile,raster});
     onProgress?.({stage:'read',done:i+1,total:manifest.completed.length});
   }
   const index=new Map(tiles.map(t=>[t.tile.name,t]));
   const seams=[];
   const pairs=adjacentPairs(manifest.completed);
   for(let i=0;i<pairs.length;i++){
     CHECK(signal);
     const p=pairs[i],a=index.get(p.a.name),b=index.get(p.b.name);
     const checked=comparePair(a,b,p.orientation,{thresholdMetres});
     if(checked)seams.push(checked);
     onProgress?.({stage:'compare',done:i+1,total:pairs.length});
   }
   const totals=seams.reduce((acc,s)=>({
     pairs:acc.pairs+s.paired,valid:acc.valid+s.validPairs,
     missingBoth:acc.missingBoth+s.bothMissing,missingOne:acc.missingOne+s.oneMissing,
     suspects:acc.suspects+s.suspectGradient
   }),{pairs:0,valid:0,missingBoth:0,missingOne:0,suspects:0});
   return {version:1,method:'Consecutive 3-cell elevation gradient; diagnostic only',
     quality:'preliminary; review natural cliffs, gullies and edge coverage manually',
     thresholdMetres,tiles:tiles.length,seams:seams.length,totals,
     reviewRecommended:seams.some(s=>s.reviewRecommended),
     comparisons:seams};
 }
 return Object.freeze({readEdges,adjacentPairs,comparePair,audit});
});
