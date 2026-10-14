const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('  function importBezierVertices');
const end=html.indexOf("  $('geoFile').onchange",start);
assert.ok(start>=0&&end>start,'No se encontraron los helpers de importación GeoJSON');
const context={S:{georef:null},activeVectorLayer:()=>({id:'layer-1'}),worldToLocal:(x,y)=>({x,y})};
vm.createContext(context);
vm.runInContext(html.slice(start,end),context);
assert.equal(context.importGeoPoint([null,5],'tree'),null,'null no es una coordenada GeoJSON');
assert.equal(context.importGeoPoint(['1',5],'tree'),null,'GeoJSON requiere coordenadas numéricas');
const area=context.importGeoPath([
  [[0,0],[10,0],[10,10],[0,10],[0,0]],
  [[2,2],[4,2],[4,4],[2,4],[2,2]],
  [[3,3],[null,3],[3,5],[3,3]],
], 'area', {}, 'vegetation');
assert.ok(area,'El contorno exterior válido debe importarse');
assert.equal(area.points.length,4,'Se elimina el punto repetido de cierre del contorno');
assert.equal(area.holes.length,1,'Se conservan huecos válidos y se omiten anillos defectuosos');
assert.equal(area.holes[0].length,4);
assert.equal(context.importGeoPath([[0,0],[1,1],[null,2]],'line',{},'path'),null,'Una línea defectuosa se rechaza por separado');
console.log('OK: GeoJSON numérico estricto, contorno válido, huecos y componentes defectuosos');
