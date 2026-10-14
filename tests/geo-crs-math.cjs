const assert = require('node:assert/strict');
const { normalizeGeoCrs, geoJsonCrs, assertGeoJsonCrsCompatible, transformCoordinate } = require('../geo-crs.js');

assert.equal(normalizeGeoCrs('urn:ogc:def:crs:EPSG::25830'), 'EPSG:25830');
assert.equal(normalizeGeoCrs('https://www.opengis.net/def/crs/EPSG/0/25830'), 'EPSG:25830');
assert.equal(normalizeGeoCrs('OGC:CRS84'), 'EPSG:4326');
assert.equal(geoJsonCrs({ type: 'FeatureCollection' }), 'EPSG:4326');
assert.equal(geoJsonCrs({ metadata: { crs: 'EPSG:25830' } }), 'EPSG:25830');
assert.equal(geoJsonCrs({ crs: { type: 'name', properties: { name: 'EPSG:25830' } } }), 'EPSG:25830');
assert.deepEqual(assertGeoJsonCrsCompatible({ metadata: { crs: 'urn:ogc:def:crs:EPSG::25830' } }, 'ETRS89 / UTM 30N (EPSG:25830)', true), { source: 'EPSG:25830', target: 'EPSG:25830', checked: true, reprojected: false });
assert.equal(assertGeoJsonCrsCompatible({}, '', false).checked, false);
assert.deepEqual(assertGeoJsonCrsCompatible({}, 'EPSG:25830', true), { source: 'EPSG:4326', target: 'EPSG:25830', checked: true, reprojected: true, approximateDatum: true });
assert.throws(() => assertGeoJsonCrsCompatible({}, '', true), /Indica el CRS/);

const north = transformCoordinate(12, 56, 'EPSG:4326', 'EPSG:32632');
assert.ok(Math.abs(north.x - 687071.44) < 0.05);
assert.ok(Math.abs(north.y - 6210141.33) < 0.05);
const northBack = transformCoordinate(north.x, north.y, 'EPSG:32632', 'EPSG:4326');
assert.ok(Math.abs(northBack.x - 12) < 1e-7);
assert.ok(Math.abs(northBack.y - 56) < 1e-7);
const etrs = transformCoordinate(-3, 40, 'EPSG:4326', 'EPSG:25830');
const etrsBack = transformCoordinate(etrs.x, etrs.y, 'EPSG:25830', 'EPSG:4326');
assert.ok(Math.abs(etrsBack.x + 3) < 1e-7);
assert.ok(Math.abs(etrsBack.y - 40) < 1e-7);
const origin = transformCoordinate(0, 0, 'EPSG:4326', 'EPSG:32631');
assert.ok(Math.abs(origin.x - 166021.44) < 0.05);
assert.ok(Math.abs(origin.y) < 0.01);
const south = transformCoordinate(151.2, -33.9, 'EPSG:4326', 'EPSG:32756');
assert.ok(south.x > 100000 && south.x < 900000 && south.y > 0 && south.y < 10000000);
const southBack = transformCoordinate(south.x, south.y, 'EPSG:32756', 'EPSG:4326');
assert.ok(Math.abs(southBack.x - 151.2) < 1e-7);
assert.ok(Math.abs(southBack.y + 33.9) < 1e-7);
assert.throws(() => transformCoordinate(1, 1, 'EPSG:4326', 'EPSG:32731'), /rango UTM/);
assert.throws(() => assertGeoJsonCrsCompatible({}, 'EPSG:3857', true), /No se puede convertir/);

console.log('OK: detección de CRS GeoJSON, normalización y prevención de importaciones desalineadas');
