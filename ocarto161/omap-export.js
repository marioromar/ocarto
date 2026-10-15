(function attachOmapExport(root) {
  'use strict';
  const NS = 'http://openorienteering.org/apps/mapper/xml/v2';
  const UNIT = 1000000;
  const palette = [
    ['Blanco', '#ffffff'], ['Negro', '#000000'], ['Verde', '#3dff17'],
    ['Verde oscuro', '#006633'], ['Azul', '#00aaff'], ['Marrón', '#ad5b00'],
    ['Amarillo', '#ffbb35'], ['Gris', '#8a949b'], ['Rojo', '#d64a37'],
    ['Morado', '#8e44ad'], ['Naranja', '#e58e26'], ['Turquesa', '#20a6a6']
  ];
  function xml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function n(value, fallback = 0) {
    const x = Number(value);
    return Number.isFinite(x) ? String(Math.round(x * 1000) / 1000) : String(fallback);
  }
  function integer(value, fallback = 0) {
    const x = Number(value);
    return Number.isFinite(x) ? String(Math.round(x)) : String(fallback);
  }
  function cssColor(value, fallback) {
    const text = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : fallback;
  }
  function rgb(hex) {
    const value = cssColor(hex, '#000000').slice(1);
    return { r: parseInt(value.slice(0, 2), 16), g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) };
  }
  function colorIndex(color, colors) {
    const wanted = cssColor(color, '#000000');
    let found = colors.findIndex(item => item.hex === wanted);
    if (found < 0) {
      colors.push({ name: `Color ${colors.length + 1}`, hex: wanted });
      found = colors.length - 1;
    }
    return found;
  }
  function featureKind(feature) {
    const type = feature?.geometry?.type || feature?.properties?.geometry_type;
    return type === 'Polygon' || type === 'MultiPolygon' ? 'area' : type === 'Point' || type === 'MultiPoint' ? 'point' : 'line';
  }
  function codeFor(feature) {
    const p = feature?.properties || {};
    return String(p.symbol ?? p.symbol_code ?? '0');
  }
  function nameFor(feature) {
    const p = feature?.properties || {};
    return String(p.symbol_name || p.symbol || codeFor(feature));
  }
  function colorFor(feature, kind) {
    const p = feature?.properties || {};
    if (p.color) return p.color;
    const text = `${p.symbol_name || ''} ${p.symbol || ''} ${p.kind || ''}`.toLowerCase();
    if (text.includes('agua') || text.includes('arroyo') || text.includes('canal') || text.includes('water')) return '#00aaff';
    if (text.includes('veget') || text.includes('bosque') || text.includes('frutal') || text.includes('árbol') || text.includes('tree')) return '#3dff17';
    if (text.includes('cultivo') || text.includes('abierto') || text.includes('amarillo')) return '#ffbb35';
    if (text.includes('curva') || text.includes('relieve') || text.includes('contour')) return '#ad5b00';
    if (text.includes('edificio') || text.includes('camino') || text.includes('muro') || text.includes('building') || text.includes('path')) return '#000000';
    return kind === 'area' ? '#ffffff' : '#000000';
  }
  function mapName(options, data) {
    return String(options?.name || data?.metadata?.name || 'ocarto-mapa').replace(/\.omap$/i, '') || 'ocarto-mapa';
  }
  function geometryParts(feature) {
    const geometry = feature?.geometry || {};
    if (geometry.type === 'MultiPoint') return geometry.coordinates.map(c => ({ type: 'Point', coordinates: c }));
    if (geometry.type === 'MultiLineString') return geometry.coordinates.map(c => ({ type: 'LineString', coordinates: c }));
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.map(c => ({ type: 'Polygon', coordinates: c }));
    return [geometry];
  }
  function allCoordinates(features) {
    const out = [];
    const visit = value => {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) out.push([Number(value[0]), Number(value[1])]);
      else value.forEach(visit);
    };
    features.forEach(feature => geometryParts(feature).forEach(g => visit(g.coordinates)));
    return out;
  }
  function coordinateText(coords, originX, originY, scale, closed) {
    return coords.map((point, index) => {
      const x = (Number(point[0]) - originX) * UNIT / scale;
      const y = (Number(point[1]) - originY) * UNIT / scale;
      return `${integer(x)} ${integer(y)}${index === coords.length - 1 ? (closed ? ' 18' : ' 16') : ''}`;
    }).join(';');
  }
  function symbolId(kind, index) {
    return String(1000 + index + (kind === 'area' ? 0 : kind === 'line' ? 300 : 600));
  }
  function symbolXml(entry) {
    const { kind, id, code, name, colorId, feature } = entry;
    if (kind === 'area') return `<symbol type="4" id="${id}" code="${xml(code)}" name="${xml(name)}"><description>Exportado por Ocarto</description><area_symbol inner_color="${colorId}" min_area="0" patterns="0"/></symbol>`;
    if (kind === 'point') {
      const size = Number(feature?.properties?.size_mm || feature?.properties?.size || 1.2);
      return `<symbol type="1" id="${id}" code="${xml(code)}" name="${xml(name)}"><description>Exportado por Ocarto</description><point_symbol rotatable="true" inner_radius="${integer(Math.max(100, size * 500))}" inner_color="${colorId}" outer_width="0" outer_color="-1" elements="0"/></symbol>`;
    }
    const width = Number(feature?.properties?.line_width_mm || feature?.properties?.lineWidthMm || 0.25);
    const pattern = String(feature?.properties?.line_pattern || 'solid').toLowerCase();
    const dashed = pattern !== 'solid';
    return `<symbol type="2" id="${id}" code="${xml(code)}" name="${xml(name)}"><description>Exportado por Ocarto</description><line_symbol color="${colorId}" line_width="${integer(Math.max(80, width * 1000))}" minimum_length="0" join_style="1" cap_style="0" start_offset="0" end_offset="0" segment_length="4000" end_length="0" show_at_least_one_symbol="true" minimum_mid_symbol_count="0" minimum_mid_symbol_count_when_closed="0" dash_length="4000" break_length="1000" dashes_in_group="1" in_group_break_length="500" mid_symbols_per_spot="1" mid_symbol_distance="0"${dashed ? ' dashed="true"' : ''}/></symbol>`;
  }
  function objectXml(feature, symbol, originX, originY, scale) {
    const props = feature.properties || {};
    return geometryParts(feature).map(geometry => {
      const kind = featureKind({ geometry, properties: props });
      if (kind === 'point') {
        const coords = coordinateText([geometry.coordinates || [0, 0]], originX, originY, scale, false);
        return `<object type="0" symbol="${symbol.id}"><coords count="1">${coords}</coords></object>`;
      }
      if (kind === 'area') {
        const rings = geometry.coordinates || [];
        if (!rings.length || rings[0].length < 3) return '';
        const outer = rings[0].slice();
        const first = outer[0], last = outer[outer.length - 1];
        if (!last || last[0] !== first[0] || last[1] !== first[1]) outer.push(first);
        return `<object type="1" symbol="${symbol.id}"><coords count="${outer.length}">${coordinateText(outer, originX, originY, scale, true)}</coords></object>`;
      }
      const points = geometry.coordinates || [];
      if (points.length < 2) return '';
      return `<object type="1" symbol="${symbol.id}"><coords count="${points.length}">${coordinateText(points, originX, originY, scale, false)}</coords></object>`;
    }).filter(Boolean).join('');
  }
  function buildOmap(data, options = {}) {
    const collection = data?.type === 'FeatureCollection' ? data : { type: 'FeatureCollection', features: [] };
    const features = (collection.features || []).filter(f => f?.geometry && f.geometry.coordinates != null);
    const scale = Math.max(1, Number(options.scale || collection.metadata?.scale_denominator || 15000));
    const coordinates = allCoordinates(features);
    const xs = coordinates.map(p => p[0]).filter(Number.isFinite), ys = coordinates.map(p => p[1]).filter(Number.isFinite);
    const originX = Number.isFinite(Number(options.originX)) ? Number(options.originX) : (xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0);
    const originY = Number.isFinite(Number(options.originY)) ? Number(options.originY) : (ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0);
    const crs = String(options.crs || collection.metadata?.crs || 'Local');
    const colors = palette.map(([name, hex]) => ({ name, hex }));
    const symbols = [], symbolByKey = new Map();
    const symbolFor = feature => {
      const kind = featureKind(feature), code = codeFor(feature), key = `${kind}|${code}`;
      let entry = symbolByKey.get(key);
      if (!entry) {
        const color = cssColor(colorFor(feature, kind), kind === 'area' ? '#ffffff' : '#000000');
        entry = { kind, code, name: nameFor(feature), color, colorId: colorIndex(color, colors), id: symbolId(kind, symbols.length), feature };
        symbolByKey.set(key, entry); symbols.push(entry);
      }
      return entry;
    };
    const objectXmlText = features.map(feature => objectXml(feature, symbolFor(feature), originX, originY, scale)).join('');
    const colorXml = colors.map((item, index) => {
      const c = rgb(item.hex);
      return `<color priority="${index}" name="${xml(item.name)}" c="0" m="0" y="0" k="0" opacity="1"><spotcolors/><cmyk method="custom"/><rgb method="custom" r="${c.r}" g="${c.g}" b="${c.b}"/></color>`;
    }).join('');
    const symbolXmlText = symbols.map(symbolXml).join('');
    const grouped = `<part id="0" name="${xml(mapName(options, collection))}" visible="true"><objects>${objectXmlText}</objects></part>`;
    const notes = `Ocarto export · origen_x=${n(originX, 0)} · origen_y=${n(originY, 0)} · CRS=${crs} · unidades=metros · objetos=${features.length}`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<map xmlns="${NS}" version="9"><notes>${xml(notes)}</notes><georeferencing scale="${integer(scale)}"><projected_crs id="${xml(crs)}"/></georeferencing><colors count="${colors.length}">${colorXml}</colors><symbols count="${symbols.length}">${symbolXmlText}</symbols><parts>${grouped}</parts><templates count="0"/><view><zoom>1</zoom><center x="0" y="0"/></view></map>`;
  }
  const api = { buildOmap, toOmap: buildOmap, xmlEscape: xml };
  root.OcartoOmapExport = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
