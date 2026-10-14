'use strict';const assert=require('node:assert/strict'),W=require('../wms-templates.js');
const basic={url:'https://www.ign.es/wms-inspire/pnoa-ma?REQUEST=GetCapabilities&foo=bar',layers:'OI.OrthoimageCoverage',crs:'EPSG:25830',bbox:[450000,4080000,451000,4081000],width:800,height:500};
const u=new URL(W.getMapUrl(basic));assert.equal(u.searchParams.get('REQUEST'),'GetMap');assert.equal(u.searchParams.get('foo'),'bar');assert.equal(u.searchParams.get('CRS'),'EPSG:25830');assert.equal(u.searchParams.get('BBOX'),'450000,4080000,451000,4081000');assert.equal(u.searchParams.get('WIDTH'),'800');assert.equal(u.searchParams.get('TRANSPARENT'),'TRUE');assert.equal(u.searchParams.getAll('REQUEST').length,1);
const g=W.georef(basic);assert.equal(g.a,1.25);assert.equal(g.e,-2);assert.equal(g.c,450000);assert.equal(g.f,4081000);
const geo={...basic,crs:'EPSG:4326',bbox:[-6,36,-5,37]};assert.equal(new URL(W.getMapUrl(geo)).searchParams.get('BBOX'),'36,-6,37,-5');assert.equal(new URL(W.getMapUrl({...geo,version:'1.1.1'})).searchParams.get('BBOX'),'-6,36,-5,37');
assert.deepEqual(W.parseManualBBox('100,200,300,400'),[100,200,300,400]);
for(const input of [{...basic,url:'http://example.com/map'},{...basic,url:'javascript:alert(1)'},{...basic,layers:'a&REQUEST=evil'},{...basic,bbox:[2,1,1,3]},{...basic,width:9999},{...basic,crs:'invalid'}])assert.throws(()=>W.getMapUrl(input));
assert.ok(W.PRESETS.pnoa.url.startsWith('https://'));assert.ok(W.PRESETS.catastro.url.startsWith('https://'));
console.log('OK: plantillas WMS, EPSG, BBOX, parámetros, límites y servicios seguros');
