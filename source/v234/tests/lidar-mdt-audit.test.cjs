'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const audit=require('../lidar-mdt-audit.js');

const a={name:'tesela_001_001',window:{minX:0,maxX:3,minY:0,maxY:3}},
      b={name:'tesela_001_002',window:{minX:3,maxX:6,minY:0,maxY:3}},
      c={name:'tesela_002_001',window:{minX:0,maxX:3,minY:3,maxY:6}};
function raster(tile,{offset=0,nodata=[]}={}){
 const w=tile.window,ncols=w.maxX-w.minX,nrows=w.maxY-w.minY;
 let s=['ncols '+ncols,'nrows '+nrows,'xllcorner '+w.minX,
    'yllcorner '+w.minY,'cellsize 1','NODATA_value -9999'].join('\n')+'\n';
 for(let row=nrows-1;row>=0;row--){
   const y=w.minY+row+.5;
   const values=[];
   for(let col=0;col<ncols;col++){
     const x=w.minX+col+.5;
     const v=nodata.some(([nx,ny])=>nx===x&&ny===y)
       ?-9999:100+4*x+3*y+offset;
     values.push(v);
   }
   s+=values.join(' ')+'\n';
 }
 return s;
}
function directory(tiles){
 const files=new Map(tiles.map(([tile,options])=>
   [tile.name+'_mdt_preliminar.asc',new Blob([raster(tile,options||{})])]));
 return {files,async getFileHandle(name){
   if(!files.has(name))throw Error('Falta archivo '+name);
   return {async getFile(){return files.get(name);}};
 }};
}
const manifest={
 state:'complete',cellTerrain:1,plan:{total:3},
 dtmSeams:{state:'complete'},completed:[a,b,c]
};

test('compara las fronteras de una pendiente normal sin avisos',async()=>{
 const report=await audit.audit(directory([[a],[b],[c]]),manifest);
 assert.equal(report.tiles,3);
 assert.equal(report.seams,2);
 assert.equal(report.totals.pairs,6);
 assert.equal(report.totals.valid,6);
 assert.equal(report.totals.missingOne,0);
 assert.equal(report.totals.suspects,0);
 assert.equal(report.reviewRecommended,false);
 const vertical=report.comparisons.find(c=>c.orientation==='vertical');
 const horizontal=report.comparisons.find(c=>c.orientation==='horizontal');
 assert(vertical&&horizontal);
 assert.equal(vertical.validPairs,3);
 assert.equal(horizontal.validPairs,3);
 assert.equal(vertical.maxHeightStepMetres,4);
 assert.equal(horizontal.maxHeightStepMetres,3);
 assert(vertical.maxGradientResidualMetres<1e-9);
 assert(horizontal.maxGradientResidualMetres<1e-9);
});

test('una pendiente pronunciada y lineal NO se confunde con una discontinuidad',async()=>{
 const report=await audit.audit(directory([[a],[b]]),{
   ...manifest,plan:{total:2},completed:[a,b]
 },{thresholdMetres:0.5});
 assert.equal(report.comparisons[0].maxHeightStepMetres,4);
 assert.equal(report.totals.suspects,0);
});

test('salto artificial en la rejilla vecina se señala para revisión',async()=>{
 const report=await audit.audit(directory([[a],[b,{offset:5}]]),{
   ...manifest,plan:{total:2},completed:[a,b]
 },{thresholdMetres:1.5});
 assert.equal(report.seams,1);
 assert.equal(report.totals.suspects,3);
 assert.equal(report.comparisons[0].maxGradientResidualMetres,5);
 assert.equal(report.comparisons[0].examples.length,3);
 assert.equal(report.comparisons[0].examples[0].positionUTM.x,3);
 assert(report.reviewRecommended);
});

test('ausencia en uno de los lados se indica sin interpolar valores',async()=>{
 const report=await audit.audit(directory([[a],[b,{nodata:[[3.5,1.5]]}]]),{
   ...manifest,plan:{total:2},completed:[a,b]
 });
 assert.equal(report.totals.pairs,3);
 assert.equal(report.totals.missingOne,1);
 assert.equal(report.totals.valid,2);
 assert(report.reviewRecommended);
});

test('NODATA a ambos lados no se confunde con salto de cota',async()=>{
 const report=await audit.audit(directory([
   [a,{nodata:[[2.5,1.5]]}],
   [b,{nodata:[[3.5,1.5]]}]
 ]),{...manifest,plan:{total:2},completed:[a,b]});
 assert.equal(report.totals.missingBoth,1);
 assert.equal(report.totals.missingOne,0);
 assert.equal(report.totals.suspects,0);
});

test('cabecera incorrecta del ASC se detecta respecto al manifiesto',async()=>{
 const dir=directory([[a]]);
 dir.files.set(a.name+'_mdt_preliminar.asc',
    new Blob([raster(a).replace('cellsize 1','cellsize 2')]));
 await assert.rejects(audit.audit(dir,{
   ...manifest,plan:{total:1},completed:[a]
 }),/ventana|resolución|rejilla/i);
});

test('rejilla truncada y cotas inválidas son errores verificables',async()=>{
 const original=raster(a);
 const noLast=original.trim().split('\n').slice(0,-1).join('\n')+'\n';
 await assert.rejects(audit.readEdges(new Blob([noLast])),/truncado/);
 const faulty=original.replace('103.5','NaN');
 await assert.rejects(audit.readEdges(new Blob([faulty])),/no finita/);
});

test('cancelación sin modificar los archivos MDT originales',async()=>{
 const dir=directory([[a],[b],[c]]),controller=new AbortController();
 controller.abort();
 await assert.rejects(audit.audit(dir,manifest,{signal:controller.signal}),
   e=>e.name==='AbortError');
 assert.equal(dir.files.size,3);
});

test('solo un manifiesto completo admite auditoría',async()=>{
 const dir=directory([[a],[b],[c]]);
 await assert.rejects(audit.audit(dir,{...manifest,dtmSeams:{state:'error'}}),
   /Termina las rejillas/);
 await assert.rejects(audit.audit(dir,{...manifest,state:'cancelled'}),
   /Termina las rejillas/);
});

test('la interfaz integra control, informe y cancelación de auditoría',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 for(const term of [
   '<script src="lidar-mdt-audit.js"></script>',
   'id="auditMdtBtn"','id="auditMdtCancel"',
   'OcartoMdtAudit.audit(directory,manifest',
   "manifest.dtmAudit={state:'complete'",
   'mdt_auditoria_bordes.json',
   'auditMdtJob?.abort()'
 ])assert(html.includes(term),term);
});
