'use strict';

function streetViewUrl(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Coordenadas geográficas fuera de rango');
  }
  const lat = Number(latitude.toFixed(7)), lon = Number(longitude.toFixed(7));
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
}

if (typeof module === 'object' && module.exports) module.exports = { streetViewUrl };
if (typeof window !== 'undefined') window.OcartoStreetViewTools = { streetViewUrl };
