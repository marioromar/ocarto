'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Set_=require('../ocad-symbol-set.js');globalThis.OcartoOcadSet=Set_;
const Draw=require('../ocad-symbol-draw.js'),data=require('../ocad-symbols-data.js');
const Renderer=require('../symbol-renderer.js');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const rec=()=>{const log=[];const ctx=new Proxy({},{get:(t,k)=>(...a)=>{log.push([k,a])},set:(t,k,v)=>{log.push(['=',[k,v]]);return true}});return{ctx,log}};
const by=code=>data.simbolos.find(s=>s.code===code);

test('el conjunto trae los 212 símbolos del .ocd con ids únicos y códigos válidos',()=>{
  const cat=Set_.catalog();assert.equal(cat.length,212);
  assert.equal(new Set(cat.map(x=>x.id)).size,212);
  for(const c of cat){assert.match(c.id,/^ocad-\d+$/);assert.match(c.code,/^\d+(\.\d+)?$/);assert.ok(['point','line','area'].includes(c.geometry))}
});
test('los valores base son ISOM (ocd ÷ 1,5): curvas, montículo, piedra',()=>{
  assert.equal(by(101000).ancho,.14);assert.equal(by(102000).ancho,.25);assert.equal(by(103000).ancho,.1);
  assert.equal(by(109000).elementos[0].d,.5);assert.equal(by(204000).elementos[0].d,.4);assert.equal(by(205000).elementos[0].d,.6);
  const veg=by(402000).estructura;assert.deepEqual([veg.ancho,veg.alto,veg.ang,veg.elementos[0].d],[.7,.7,45,.4]);
});
test('enrichCatalog añade los símbolos OCAD sin tocar los existentes y specFor los conoce',()=>{
  const k='const SYMBOL_CATALOG=',h=html,a=h.indexOf(k),b=h.indexOf('];',a);
  const parsed=vm.runInNewContext(h.slice(a+k.length,b+1));const before=parsed.length;
  const cat=Renderer.enrichCatalog(parsed);
  assert.equal(new Set(cat.map(x=>x.id)).size,cat.length);
  assert.equal(cat.filter(x=>x.ocad).length,212);assert.ok(cat.length>=before+212);
  assert.equal(Renderer.specFor('ocad-101000').code,'101');assert.equal(Renderer.specFor('tree').code,'417');
  for(const c of cat.filter(x=>x.ocad))assert.ok(Renderer.specFor(c.id),c.id);
});
test('los 212 símbolos se dibujan sin errores en punto, línea y área (con hueco)',()=>{
  let sinTrazo=[];
  for(const s of data.simbolos){const {ctx,log}=rec();
    if(s.tipo==='punto')Draw.drawPoint(ctx,data,s,14);
    else if(s.tipo==='linea')Draw.drawLine(ctx,data,s,[[0,0],[8,0],[11,-2]],14);
    else Draw.drawArea(ctx,data,s,[[0,0],[10,0],[10,5],[0,5]],14,[[[3,1],[5,1],[5,3],[3,3]]]);
    if(!log.some(([k])=>k==='stroke'||k==='fill'||k==='fillRect'))sinTrazo.push(s.code)}
  assert.ok(sinTrazo.length<=8,'sin dibujo: '+sinTrazo.join(','));
});
test('el árbol 417 pinta la máscara blanca ANTES que el anillo verde (orden de capas OCAD)',()=>{
  const {ctx,log}=rec();Draw.drawPoint(ctx,data,by(417000),14);
  const white=log.findIndex(([k,a])=>k==='='&&a[0]==='fillStyle'&&a[1]==='#ffffff');
  const green=log.findIndex(([k,a])=>k==='='&&a[0]==='strokeStyle'&&a[1]===data.tintas[6].rgb);
  assert.ok(white>=0&&green>white,`blanco ${white}, verde ${green}`);
});
test('la valla 516 coloca marcas a 60° y la 511 dibuja doble línea sin relleno central',()=>{
  const m=by(516000).marcas.prim[0].pts;assert.ok(Math.abs(Math.atan2(m[1][1]-m[0][1],m[1][0]-m[0][0])*180/Math.PI-60)<1);
  const {ctx,log}=rec();Draw.drawLine(ctx,data,by(511000),[[0,0],[10,0]],14);
  assert.equal(log.filter(([k])=>k==='stroke').length,2);
});
test('la paleta y el mapa usan el conjunto: scripts y enganches presentes en index.html',()=>{
  for(const f of ['ocad-symbols-data.js','ocad-symbol-draw.js','ocad-symbol-set.js'])assert.ok(html.includes(`<script src="${f}"></script>`),f);
  assert.ok(html.indexOf('ocad-symbol-set.js')<html.indexOf('symbol-renderer.js'));
  assert.ok(html.includes('OcartoOcadSet.owns(f.symbol)'));assert.ok(html.includes('OcartoOcadSet.drawFeature(ctx,f,'));
});
test('renderPreview dibuja los símbolos OCAD en el lienzo de la paleta',()=>{
  const {ctx}=rec();const canvas={width:48,height:36,getContext:()=>ctx};
  for(const c of Set_.catalog())assert.equal(Renderer.renderPreview(canvas,c.id,c.geometry,Renderer.specFor(c.id)),true,c.id);
});
