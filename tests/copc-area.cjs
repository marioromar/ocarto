'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../copc-area-worker.js'),'utf8');
const points={
  root:[5,5,1],
  left:[15,15,2],
  right:[75,75,3],
};
function pointBuffer(x,y,z){
 const b=new ArrayBuffer(36),d=new DataView(b);d.setInt32(0,x,true);d.setInt32(4,y,true);d.setInt32(8,z,true);d.setUint16(12,80,true);d.setUint8(14,1);d.setUint8(16,2);return new Uint8Array(b);
}
const pages=new Map([
 [400,{nodes:{'1-0-0-0':{pointCount:1,pointDataOffset:310,pointDataLength:10}},pages:{}}],
 [500,{nodes:{'1-1-0-0':{pointCount:1,pointDataOffset:320,pointDataLength:10}},pages:{}}],
]);
const api={
 async create(){return{header:{majorVersion:1,minorVersion:4,pointDataRecordFormat:7,pointCount:3,pointDataRecordLength:36,scale:[1,1,1],offset:[0,0,0],min:[0,0,0],max:[100,100,10]},info:{cube:[0,0,0,100,100,100],rootHierarchyPage:{pageOffset:100,pageLength:96}}}},
 async loadHierarchyPage(_get,page){
  if(page.pageOffset===100)return{nodes:{'0-0-0-0':{pointCount:1,pointDataOffset:300,pointDataLength:10}},pages:{'1-0-0-0':{pageOffset:400,pageLength:32},'1-1-0-0':{pageOffset:500,pageLength:32}}};
  return pages.get(page.pageOffset);
 },
 async loadPointDataBuffer(_get,_header,node){
  if(node.pointDataOffset===300)return pointBuffer(...points.root);
  if(node.pointDataOffset===310)return pointBuffer(...points.left);
  if(node.pointDataOffset===320)return pointBuffer(...points.right);
  throw Error('unexpected node');
 }
};
const context={self:null,globalThis:null,OcartoCopcLibrary:{Copc:api},Uint8Array,DataView,ArrayBuffer,Number,Math,Error,Promise,Map,Set};
context.self=context;context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
const file={size:1024,slice(begin,end){return{arrayBuffer:async()=>new ArrayBuffer(end-begin)}}};
const inside=(x,y,rings)=>{let hit=false;for(const ring of rings){let r=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))r=!r}if(r)hit=!hit}return hit};
(async()=>{
 const session={aoi:{bounds:{minX:0,maxX:20,minY:0,maxY:20},rings:[[[0,0],[20,0],[0,20]]]}};
 let reads=0;const progress=[];
 const result=await context.OcartoCopcArea.process(file,{session,getDecoder:async()=>({}),cancelled:()=>false,yield:async()=>{},progress:(done,total)=>progress.push([done,total]),addPoint:(x,y,z,cls,intensity,ret)=>{reads++;return inside(x,y,session.aoi.rings)}});
 assert.equal(result.pages,2,'solo consulta la jerarquía hija que cruza el área');
 assert.equal(result.nodes,2,'solo descomprime la raíz y el bloque espacial candidato');
 assert.equal(result.points,2);
 assert.equal(result.acceptedPoints,1,'aplica el polígono exacto después de acotar los bloques');
 assert.equal(reads,2);
 assert.deepEqual(progress,[[1,2],[2,2]],'el progreso termina en el total de puntos de los bloques candidatos');
 const outside={...session,aoi:{bounds:{minX:150,maxX:160,minY:150,maxY:160},rings:[]}};
 const skipped=await context.OcartoCopcArea.process(file,{session:outside,getDecoder:async()=>{throw Error('should skip before decoder initialization')},cancelled:()=>false,yield:async()=>{},progress:()=>{},addPoint:()=>true});
 assert.equal(skipped.skipped,true);assert.equal(skipped.pages,0);assert.equal(skipped.points,0);
 console.log('✓ COPC mock: consulta páginas y bloques espaciales candidatos, filtra polígono y omite encuadres exteriores');
})().catch(error=>{console.error(error);process.exitCode=1});
