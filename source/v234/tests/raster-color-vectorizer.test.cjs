'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const v=require('../raster-color-vectorizer.js');
function raster(w,h,draw){
 const a=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const c=draw(x,y),i=(y*w+x)*4;
  a[i]=c[0];a[i+1]=c[1];a[i+2]=c[2];a[i+3]=c.length>3?c[3]:255;
 }
 return a;
}
const white=[255,255,255],green=[13,151,39],yellow=[240,203,25];
test('vectoriza área clasificada TIFF sin puntos LiDAR',()=>{
 const w=36,h=30;
 const data=raster(w,h,(x,y)=>x>=3&&x<29&&y>=4&&y<25?green:white);
 const result=v.vectorize(data,w,h,{maxClasses:3,minPixels:25,tolerance:0});
 assert.equal(result.features.length,1);
 const f=result.features[0];
 assert(f.outer.length>=4);
 assert.equal(f.pixels,26*21);
 assert.equal(f.holes.length,0);
 assert(v.shoelace(f.outer)>0);
});
test('conserva un hueco interior del ráster al vectorizar',()=>{
 const data=raster(40,40,(x,y)=>{
  if(x>=3&&x<37&&y>=3&&y<37){
   if(x>=12&&x<23&&y>=10&&y<25)return white;
   return green;
  }
  return white;
 });
 const result=v.vectorize(data,40,40,{maxClasses:2,minPixels:20,tolerance:0});
 assert.equal(result.features.length,1);
 assert.equal(result.features[0].holes.length,1);
 assert(v.shoelace(result.features[0].holes[0])<0);
});
test('no fusiona áreas de un mismo color que solo se tocan en diagonal',()=>{
 const data=raster(40,40,(x,y)=>
   (x>=3&&x<13&&y>=3&&y<13)||(x>=13&&x<23&&y>=13&&y<23)
      ? green:white);
 const result=v.vectorize(data,40,40,{maxClasses:2,minPixels:25,tolerance:0});
 assert.equal(result.features.length,2);
});
test('separa zonas verdes y amarillas en clases distintas',()=>{
 const data=raster(40,20,(x,y)=>{
  if(x>=2&&x<18&&y>=2&&y<18)return green;
  if(x>=22&&x<38&&y>=2&&y<18)return yellow;
  return white;
 });
 const result=v.vectorize(data,40,20,{maxClasses:2,minPixels:30,tolerance:0});
 assert.equal(result.palette.length,2);
 assert.equal(result.features.length,2);
 assert.notEqual(result.features[0].color,result.features[1].color);
});
test('respeta alfa transparente y fondo blanco',()=>{
 const data=raster(30,30,(x,y)=>{
  if(x>5&&x<23&&y>5&&y<23)return green;
  return [255,255,255,0];
 });
 const result=v.vectorize(data,30,30,{minPixels:25});
 assert.equal(result.features.length,1);
 assert.equal(result.features[0].pixels,17*17);
});
test('descarta motas de color por debajo de área mínima',()=>{
 const data=raster(50,30,(x,y)=>
    (x>=2&&x<22&&y>=2&&y<22)||(x>=36&&x<39&&y>=25&&y<28)
      ?green:white);
 const result=v.vectorize(data,50,30,{minPixels:20,tolerance:0});
 assert.equal(result.features.length,1);
});
test('limita imagen y no inventa polígonos cuando faltan clases',()=>{
 assert.throws(()=>v.vectorize(new Uint8Array(4),2000,2000),/demasiado grande/);
 const whiteData=raster(20,20,()=>white);
 assert.throws(()=>v.vectorize(whiteData,20,20),/No se detectan clases/);
});
test('la interfaz abre TIFF en plantilla y ofrece vectorización independiente del LiDAR',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(html.includes('<script src="raster-color-vectorizer.js"></script>'));
 assert(html.includes('id="vectorizeTemplateRaster"'));
 assert(html.includes("'vectorizeTemplateRaster').onclick=async()=>"));
 assert(html.includes('OcartoRasterVector.vectorize('));
 assert(html.includes('layerId=mapLayer.id'));
 assert(html.includes('recordMapEdit(before)'));
 assert(html.includes("sourceRaster:layer.name"));
 assert(html.includes('rawX,rawY'));
 assert(!html.includes('if(!vegetationRows.length)return;try{const raster='));
});
