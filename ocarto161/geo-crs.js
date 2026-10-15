/* CRS inspection and GeoJSON conversion to the selected UTM CRS. */
(function attachGeoCrs(root) {
  'use strict';

  function crsName(value) {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    return value.properties?.name || value.name || '';
  }

  function normalizeGeoCrs(value) {
    const name = String(value || '').trim();
    if (!name) return '';
    if (/^(?:OGC:)?CRS:?84$/i.test(name.replace(/\s+/g, ''))) return 'EPSG:4326';
    const epsgOffset = name.toUpperCase().indexOf('EPSG');
    const epsgNumbers = epsgOffset >= 0 ? name.slice(epsgOffset + 4).match(/\d+/g) : null;
    if (epsgNumbers?.length) return `EPSG:${Number(epsgNumbers.at(-1))}`;
    return name.replace(/\s+/g, '').toUpperCase();
  }

  function geoJsonCrs(data) {
    const declared = crsName(data?.metadata?.crs) || crsName(data?.crs);
    // RFC 7946 GeoJSON uses WGS 84 longitude/latitude when no CRS is declared.
    return normalizeGeoCrs(declared || 'EPSG:4326');
  }

  function assertGeoJsonCrsCompatible(data, targetCrs, hasReferencedMap) {
    const source = geoJsonCrs(data);
    const target = normalizeGeoCrs(targetCrs);
    if (!hasReferencedMap) return { source, target: target || null, checked: false };
    if (!target) throw new Error('Indica el CRS del mapa o de la nube antes de importar GeoJSON.');
    if (source === target) return { source, target, checked: true, reprojected: false };
    if (utmDefinition(target) && (isGeographicCrs(source) || utmDefinition(source))) {
      const approximateDatum = source.startsWith('EPSG:258') || source === 'EPSG:4258' || target.startsWith('EPSG:258');
      return { source, target, checked: true, reprojected: true, approximateDatum };
    }
    throw new Error(`No se puede convertir de ${source} a ${target} automáticamente. Se admiten coordenadas GPS EPSG:4326, Web Mercator EPSG:3857 y UTM WGS84/ETRS89 al sistema UTM del mapa.`);
  }

  function utmDefinition(crs) {
    const code = Number(String(crs).replace(/^EPSG:/, ''));
    if (code >= 25828 && code <= 25838) return { zone: code - 25800, south: false, a: 6378137, inverseFlattening: 298.257222101 };
    if (code >= 32601 && code <= 32660) return { zone: code - 32600, south: false, a: 6378137, inverseFlattening: 298.257223563 };
    if (code >= 32701 && code <= 32760) return { zone: code - 32700, south: true, a: 6378137, inverseFlattening: 298.257223563 };
    return null;
  }

  function wgs84ToUtm(longitude, latitude, crs) {
    const definition = utmDefinition(crs);
    if (!definition) throw new Error(`Proyección UTM no admitida: ${crs}`);
    const { zone, south, a, inverseFlattening } = definition;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -80 || latitude > 84 || (!south && latitude < 0) || (south && latitude > 0)) {
      throw new Error('Coordenada EPSG:4326 fuera del rango UTM');
    }
    const flattening = 1 / inverseFlattening;
    const eccentricity2 = flattening * (2 - flattening);
    const secondEccentricity2 = eccentricity2 / (1 - eccentricity2);
    const k0 = 0.9996;
    const phi = latitude * Math.PI / 180;
    const lambda = longitude * Math.PI / 180;
    const lambda0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
    const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi), tanPhi = Math.tan(phi);
    const n = a / Math.sqrt(1 - eccentricity2 * sinPhi * sinPhi);
    const t = tanPhi * tanPhi;
    const c = secondEccentricity2 * cosPhi * cosPhi;
    const aa = cosPhi * (lambda - lambda0);
    const e4 = eccentricity2 * eccentricity2, e6 = e4 * eccentricity2;
    const m = a * ((1 - eccentricity2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi
      - (3 * eccentricity2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * phi)
      + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * phi)
      - (35 * e6 / 3072) * Math.sin(6 * phi));
    const easting = 500000 + k0 * n * (aa + (1 - t + c) * aa ** 3 / 6
      + (5 - 18 * t + t * t + 72 * c - 58 * secondEccentricity2) * aa ** 5 / 120);
    const northing = (south ? 10000000 : 0) + k0 * (m + n * tanPhi * (aa * aa / 2
      + (5 - t + 9 * c + 4 * c * c) * aa ** 4 / 24
      + (61 - 58 * t + t * t + 600 * c - 330 * secondEccentricity2) * aa ** 6 / 720));
    return { x: easting, y: northing };
  }

  function utmToWgs84(easting, northing, crs) {
    const definition = utmDefinition(crs);
    if (!definition) throw new Error(`Proyección UTM no admitida: ${crs}`);
    if (!Number.isFinite(easting) || !Number.isFinite(northing) || easting < 100000 || easting > 900000 || northing < 0 || northing > 10000000) {
      throw new Error('Coordenada UTM fuera de rango');
    }
    const { zone, south, a, inverseFlattening } = definition;
    const flattening = 1 / inverseFlattening;
    const eccentricity2 = flattening * (2 - flattening);
    const secondEccentricity2 = eccentricity2 / (1 - eccentricity2);
    const k0 = 0.9996;
    const x = easting - 500000;
    const y = northing - (south ? 10000000 : 0);
    const e4 = eccentricity2 * eccentricity2, e6 = e4 * eccentricity2;
    const m = y / k0;
    const mu = m / (a * (1 - eccentricity2 / 4 - 3 * e4 / 64 - 5 * e6 / 256));
    const e1 = (1 - Math.sqrt(1 - eccentricity2)) / (1 + Math.sqrt(1 - eccentricity2));
    const e12 = e1 * e1, e13 = e12 * e1, e14 = e13 * e1;
    const phi1 = mu + (3 * e1 / 2 - 27 * e13 / 32) * Math.sin(2 * mu)
      + (21 * e12 / 16 - 55 * e14 / 32) * Math.sin(4 * mu)
      + (151 * e13 / 96) * Math.sin(6 * mu)
      + (1097 * e14 / 512) * Math.sin(8 * mu);
    const sinPhi = Math.sin(phi1), cosPhi = Math.cos(phi1), tanPhi = Math.tan(phi1);
    const n1 = a / Math.sqrt(1 - eccentricity2 * sinPhi * sinPhi);
    const r1 = a * (1 - eccentricity2) / Math.pow(1 - eccentricity2 * sinPhi * sinPhi, 1.5);
    const t1 = tanPhi * tanPhi;
    const c1 = secondEccentricity2 * cosPhi * cosPhi;
    const d = x / (n1 * k0);
    const latitude = phi1 - (n1 * tanPhi / r1) * (d * d / 2
      - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * secondEccentricity2) * d ** 4 / 24
      + (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * secondEccentricity2 - 3 * c1 * c1) * d ** 6 / 720);
    const lambda0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
    const longitude = lambda0 + (d - (1 + 2 * t1 + c1) * d ** 3 / 6
      + (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * secondEccentricity2 + 24 * t1 * t1) * d ** 5 / 120) / cosPhi;
    const lon = longitude * 180 / Math.PI, lat = latitude * 180 / Math.PI;
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < -180 || lon > 180 || lat < -80 || lat > 84) {
      throw new Error('La coordenada UTM queda fuera del rango geográfico admitido');
    }
    return { x: lon, y: lat };
  }

  function isGeographicCrs(crs) { return crs === 'EPSG:4326' || crs === 'EPSG:4258' || crs === 'EPSG:3857'; }

  function coordinateToWgs84(x, y, crs) {
    if (crs === 'EPSG:4326' || crs === 'EPSG:4258') return { x, y };
    if (crs === 'EPSG:3857') {
      const radius = 6378137;
      const longitude = x / radius * 180 / Math.PI;
      const latitude = (2 * Math.atan(Math.exp(y / radius)) - Math.PI / 2) * 180 / Math.PI;
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(latitude) > 85.05112878) throw new Error('Coordenada Web Mercator fuera de rango');
      return { x: longitude, y: latitude };
    }
    if (utmDefinition(crs)) return utmToWgs84(x, y, crs);
    throw new Error(`No se admite la conversión desde ${crs}`);
  }

  function coordinateFromWgs84(longitude, latitude, crs) {
    if (crs === 'EPSG:4326' || crs === 'EPSG:4258') return { x: longitude, y: latitude };
    if (crs === 'EPSG:3857') {
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(latitude) > 85.05112878) throw new Error('Coordenada fuera del rango Web Mercator');
      const radius = 6378137, lambda = longitude * Math.PI / 180, phi = latitude * Math.PI / 180;
      return { x: radius * lambda, y: radius * Math.log(Math.tan(Math.PI / 4 + phi / 2)) };
    }
    if (utmDefinition(crs)) return wgs84ToUtm(longitude, latitude, crs);
    throw new Error(`No se admite la conversión a ${crs}`);
  }

  function detectUtmCrs(longitude, latitude) {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -80 || latitude > 84) throw new Error('No se puede detectar una zona UTM para esas coordenadas GPS');
    let zone = longitude === 180 ? 60 : Math.floor((longitude + 180) / 6) + 1;
    if (latitude >= 56 && latitude < 64 && longitude >= 3 && longitude < 12) zone = 32;
    if (latitude >= 72 && latitude <= 84) {
      if (longitude >= 0 && longitude < 9) zone = 31;
      else if (longitude >= 9 && longitude < 21) zone = 33;
      else if (longitude >= 21 && longitude < 33) zone = 35;
      else if (longitude >= 33 && longitude < 42) zone = 37;
    }
    return `EPSG:${(latitude < 0 ? 32700 : 32600) + zone}`;
  }

  function transformCoordinate(x, y, sourceCrs, targetCrs) {
    const source = normalizeGeoCrs(sourceCrs), target = normalizeGeoCrs(targetCrs);
    if (source === target) return { x, y };
    const wgs84 = coordinateToWgs84(x, y, source);
    return coordinateFromWgs84(wgs84.x, wgs84.y, target);
  }

  function transformPositions(value, sourceCrs, targetCrs) {
    if (!Array.isArray(value)) throw new Error('Geometría GeoJSON no válida');
    if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      const p = transformCoordinate(value[0], value[1], sourceCrs, targetCrs);
      return [p.x, p.y, ...value.slice(2)];
    }
    return value.map(item => transformPositions(item, sourceCrs, targetCrs));
  }

  const api = { normalizeGeoCrs, geoJsonCrs, assertGeoJsonCrsCompatible, transformCoordinate, transformPositions, detectUtmCrs };
  root.OcartoGeoCrs = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
