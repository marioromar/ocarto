const assert = require('node:assert/strict');
const { toOmap } = require('../omap-export.js');

const map = {
  type: 'FeatureCollection',
  metadata: { crs: 'EPSG:32630', scale_denominator: 10000 },
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[500000, 4100000], [500020, 4100000], [500020, 4100020], [500000, 4100000]]] },
      properties: { symbol: '401', symbol_name: 'Terreno abierto', geometry_type: 'area' }
    },
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[500000, 4100000], [500030, 4100030]] },
      properties: { symbol: '505', symbol_name: 'Camino', line_pattern: 'dashed', geometry_type: 'line' }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [500010, 4100010] },
      properties: { symbol: '417', symbol_name: 'Árbol', geometry_type: 'point' }
    }
  ]
};

const xml = toOmap(map, { name: 'prueba', scale: 10000 });
assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(xml, /<map xmlns="http:\/\/openorienteering\.org\/apps\/mapper\/xml\/v2" version="9">/);
assert.match(xml, /<georeferencing scale="10000"><projected_crs id="EPSG:32630"\/>/);
assert.match(xml, /<symbols count="3">/);
assert.equal((xml.match(/<object /g) || []).length, 3);
assert.match(xml, /code="401"/);
assert.match(xml, /code="505"/);
assert.match(xml, /code="417"/);
assert.match(xml, / 18<\/coords>/);
assert.match(xml, / dashed="true"/);
assert.match(xml, /origen_x=500015/);
console.log('omap-export ok');
