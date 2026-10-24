'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const SymbolRenderer=require('../symbol-renderer.js');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

const start=html.indexOf('const SYMBOL_CATALOG='),end=html.indexOf('];',start);
assert.ok(start>=0&&end>start,'source catalogue present');
const parsed=vm.runInNewContext(html.slice(start+'const SYMBOL_CATALOG='.length,end+1));
const catalog=SymbolRenderer.enrichCatalog(parsed);
const byId=id=>catalog.find(x=>x.id===id);
const drawingLog=[];
const ctx={save(){},restore(){},translate(){},clearRect(){},beginPath(){},arc(){drawingLog.push('arc')},ellipse(){drawingLog.push('ellipse')},lineTo(){drawingLog.push('line')},moveTo(){},fill(){drawingLog.push('fill')},stroke(){drawingLog.push('stroke')},closePath(){},rect(){},bezierCurveTo(){},setLineDash(){},quadraticCurveTo(){}};
const canvas={width:48,height:36,getContext:()=>ctx};

test('cada ID de símbolo es único y la ampliación no duplica registros',()=>{
 assert.ok(catalog.length>=90);
 assert.equal(new Set(catalog.map(x=>x.id)).size,catalog.length);
 const len=catalog.length;SymbolRenderer.enrichCatalog(catalog);assert.equal(catalog.length,len);
});
test('relieve oficial 104/201/202 usa código, color y marcas propios',()=>{
 assert.equal(byId('earth-bank').code,'104');
 assert.equal(byId('cliff').code,'201');
 assert.equal(byId('passable-cliff').code,'202');
 assert.equal(SymbolRenderer.specFor('earth-bank').color,SymbolRenderer.COLORS.brown);
 assert.equal(SymbolRenderer.specFor('cliff').color,SymbolRenderer.COLORS.black);
 assert.equal(SymbolRenderer.specFor('passable-cliff').color,SymbolRenderer.COLORS.black);
 for(const id of ['earth-bank','cliff','passable-cliff']){
  drawingLog.length=0;
  assert.equal(SymbolRenderer.decorateLine(ctx,id,[{x:0,y:0},{x:90,y:0}],null,1,SymbolRenderer.specFor(id)),true,id);
  assert.ok(drawingLog.includes('stroke'),id);
 }
});
test('ISOM 101/102 y puntos erróneos están corregidos',()=>{
 assert.equal(byId('contour-normal').code,'101');
 assert.equal(byId('contour-index').code,'102');
 assert.equal(byId('knoll').code,'109');
 assert.equal(byId('pit').code,'112');
 assert.equal(byId('tower').code,'524');
 assert.equal(byId('cairn').code,'526');
 assert.equal(byId('building-point').code,'530');
 assert.equal(byId('vegetation-boundary').code,'416');
 assert.equal(SymbolRenderer.specFor('watercourse').code,'305');
 assert.equal(SymbolRenderer.specFor('small-watercourse').code,'306');
 assert.equal(SymbolRenderer.specFor('passable-wall').code,'513.1');
 assert.equal(SymbolRenderer.specFor('uncrossable-wall').code,'513.3');
 assert.equal(byId('giant-boulder').code,'206');
 assert.equal(SymbolRenderer.specFor('giant-boulder').code,'206');
 assert.equal(byId('boulder-cluster').code,'207');
});
test('piedra y grupo de piedras tienen una sola entrada visible por código',()=>{
 assert.equal(byId('rock').name,'Piedra aislada (204)');
 assert.equal(SymbolRenderer.isPaletteAlias('boulder-small'),true);
 assert.equal(SymbolRenderer.specFor('boulder-small').aliasOf,'rock');
 assert.equal(SymbolRenderer.isPaletteAlias('boulder-cluster'),false);
 assert.equal(catalog.filter(x=>SymbolRenderer.symbolCode(x,{})==='204'&&!SymbolRenderer.isPaletteAlias(x.id)).length,1);
 assert.equal(catalog.filter(x=>SymbolRenderer.symbolCode(x,{})==='207').length,1);
 assert.ok(html.includes('!OcartoSymbolRenderer.isPaletteAlias(item.id)'));
});
test('cada símbolo del catálogo tiene especificación visual',()=>{
 for(const item of catalog)assert.ok(SymbolRenderer.specFor(item.id),item.id);
});
test('no hay códigos pendientes ni códigos ficticios para elementos propios',()=>{
 for(const s of catalog){
  assert.notEqual(s.code,'Pendiente',s.id);
  assert.ok(/^\d+(?:\.\d+)?$|^Personalizado$/.test(s.code),s.id+' '+s.code);
 }
 assert.equal(byId('bench').code,'Personalizado');
 assert.equal(byId('power-support').code,'Personalizado');
});
test('previsualización disponible para cada símbolo y geometría',()=>{
 for(const s of catalog){
  assert.ok(['point','line','area'].includes(s.geometry),s.id);
  assert.equal(SymbolRenderer.renderPreview(canvas,s.id,s.geometry,SymbolRenderer.specFor(s.id)||{}),true,s.id);
 }
});
test('los puntos destacados tienen geometrías diferenciadas, no un punto genérico',()=>{
 for(const id of ['tree','bush','rock','large-rock','spring','waterhole','pit','depression','knoll','elongated-knoll','rocky-pit','dangerous-pit','boulder-cluster','tower','small-tower','fodder-rack','manmade-x','course-start','course-control','course-finish','continuing-point','crossing-point','cairn','crossing','special-vegetation']){
  drawingLog.length=0;
  assert.equal(SymbolRenderer.drawPoint(ctx,id,8,SymbolRenderer.specFor(id)||{},false),true,id);
  assert.ok(drawingLog.length>0,id);
 }
});
test('los símbolos lineales especiales incluyen marcas',()=>{
 for(const id of ['fence','impassable-fence','cliff','earth-bank','earth-wall','retaining-earth-wall','erosion-gully','trench','railway']){
  drawingLog.length=0;
  assert.equal(SymbolRenderer.decorateLine(ctx,id,[{x:0,y:0},{x:90,y:0}],null,1,SymbolRenderer.specFor(id)),true,id);
  assert.ok(drawingLog.includes('stroke'),id);
 }
 assert.equal(SymbolRenderer.specFor('ruined-earth-wall').pattern,'dashed');
 assert.equal(SymbolRenderer.specFor('ruined-earth-wall').decoration,undefined);
});
test('la paleta de pantalla sigue los colores IOF del apéndice',()=>{
 assert.equal(SymbolRenderer.COLORS.brown,'#d15c00');
 assert.equal(SymbolRenderer.COLORS.blue,'#00a8e8');
 assert.equal(SymbolRenderer.COLORS.green,'#3dff17');
 assert.equal(SymbolRenderer.COLORS.darkGreen,'#00b324');
 assert.equal(SymbolRenderer.COLORS.purple,'#a626ff');
});
test('paleta y mapa usan el mismo motor de símbolos',()=>{
 assert.ok(html.includes('<script src="symbol-renderer.js"></script>'));
 assert.ok(html.includes('OcartoSymbolRenderer.renderPreview(preview,x.id,x.geometry,style)'));
 assert.ok(html.includes('OcartoSymbolRenderer.drawPoint(ctx,f.symbol,r,symbolStyle,candidate)'));
 assert.ok(/OcartoSymbolRenderer\.decorateLine\(ctx,f\.symbol,pts,unitScale,S\.zoom,iof\|\|OcartoSymbolRenderer\.specFor\(f\.symbol\)\|\|\{\}\)/.test(html));
});
