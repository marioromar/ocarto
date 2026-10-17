/* Ocarto v248 runtime assets. Original bundled licenses retained. */

/* symbol-specs.js */
/* IOF base scales and official size enlargement factors for map modes. */
(function attachSymbolSpecs(root) {
  'use strict';
  const TYPES = Object.freeze({
    forest: { label: 'Orientación a pie · ISOM', baseScale: 15000, defaultScale: 15000, discipline: 'isom' },
    sprint: { label: 'Orientación sprint · ISSprOM', baseScale: 4000, defaultScale: 4000, discipline: 'issprom' },
    mtbo_long: { label: 'Orientación en bicicleta (OBM / MTBO) · larga distancia', baseScale: 15000, defaultScale: 15000, discipline: 'ismtbom-long' },
    mtbo_middle: { label: 'Orientación en bicicleta (OBM / MTBO) · media / relevos', baseScale: 10000, defaultScale: 10000, discipline: 'ismtbom-enlarged' },
    mtbo_sprint: { label: 'Orientación en bicicleta (OBM / MTBO) · sprint', baseScale: 5000, defaultScale: 5000, discipline: 'ismtbom-enlarged' },
    other: { label: 'Otro tipo de mapa', baseScale: 15000, defaultScale: 15000, discipline: 'isom' }
  });
  const DEFAULT_SYMBOL_MM = Object.freeze({
    tree: Object.freeze({ forest: 1.1, sprint: 1.4, mtbo: 1.1 }),
    bush: Object.freeze({ forest: 0.6, sprint: 0.8, mtbo: 0.75 }),
    rock: Object.freeze({ forest: 0.4, sprint: 0.6, mtbo: 0.5 }),
    rockLarge: Object.freeze({ forest: 0.6, sprint: 0.7, mtbo: 0.5 }),
    waterhole: Object.freeze({ forest: 0.8, sprint: 0.8, mtbo: 0.8 }),
    specialVegetation: Object.freeze({ forest: 0.9, sprint: 1.2, mtbo: 0.9 })
  });
  const PALETTE = Object.freeze({
    black: '#000000', blue: '#00aaff', brown: '#ad5b00', yellow: '#ffbb35',
    green: '#3dff17', darkGreen: '#006633', white: '#ffffff', grey: '#b3b3b3'
  });
  const AREA_STYLES = Object.freeze({
    'open-land': { fill: PALETTE.yellow, fillOpacity: 1, code: { forest: '401', sprint: '401', mtbo: '401' }, minimumAreaMm2: { forest: .3025, sprint: .5, mtbo: 2 }, minimumWidthMm: { forest: .55, sprint: .3, mtbo: .6 } },
    'open-scattered': { fill: PALETTE.yellow, fillOpacity: .75, pattern: 'dots', patternColor: PALETTE.white, code: { forest: '402', sprint: '402', mtbo: '402' }, minimumAreaMm2: { forest: 4, sprint: 6.25, mtbo: 4 }, minimumWidthMm: { forest: 1.5, sprint: 2.2, mtbo: 1.5 } },
    'rough-open': { fill: PALETTE.yellow, fillOpacity: .5, code: { forest: '403', sprint: '403', mtbo: '403' }, minimumAreaMm2: { forest: 1, sprint: 1, mtbo: 2 }, minimumWidthMm: { forest: .4, sprint: .4, mtbo: .6 } },
    'forest-white': { fill: PALETTE.white, fillOpacity: 1, code: { forest: '405', sprint: '405', mtbo: '405' }, minimumAreaMm2: { forest: 1, sprint: 1, mtbo: 2 }, minimumWidthMm: { forest: .3, sprint: .3, mtbo: .8 } },
    'veg-slow': { fill: PALETTE.green, fillOpacity: .3, code: { forest: '406', sprint: '406', mtbo: '406' }, minimumAreaMm2: { forest: 1, sprint: 1, mtbo: 2 }, minimumWidthMm: { forest: .4, sprint: .4, mtbo: .8 }, name: { mtbo: 'Bosque denso · visibilidad y rodabilidad reducidas' } },
    'veg-slow-open': { fill: PALETTE.green, fillOpacity: 1, pattern: 'two-lines', code: { forest: '407', sprint: '407', mtbo: '407' }, minimumAreaMm2: { forest: 1.5, sprint: 0, mtbo: 0 }, minimumWidthMm: { forest: .25, sprint: 0, mtbo: 0 }, name: { mtbo: 'Matorral · buena visibilidad, rodabilidad reducida fuera de pista' } },
    'veg-walk': { fill: PALETTE.green, fillOpacity: .6, code: { forest: '408', sprint: '408', mtbo: null }, minimumAreaMm2: { forest: .49, sprint: .5, mtbo: 0 }, minimumWidthMm: { forest: .3, sprint: .4, mtbo: 0 } },
    'veg-walk-open': { fill: PALETTE.green, fillOpacity: 1, pattern: 'two-lines', code: { forest: '409', sprint: '409', mtbo: null }, minimumAreaMm2: { forest: 1, sprint: 0, mtbo: 0 }, minimumWidthMm: { forest: .25, sprint: 0, mtbo: 0 } },
    'veg-fight': { fill: PALETTE.green, fillOpacity: 1, code: { forest: '410', sprint: '410', mtbo: null }, minimumAreaMm2: { forest: .3025, sprint: .3, mtbo: 0 }, minimumWidthMm: { forest: .25, sprint: .25, mtbo: 0 } },
    'veg-uncrossable': { fill: PALETTE.darkGreen, fillOpacity: 1, code: { forest: null, sprint: '411', mtbo: '410' }, minimumAreaMm2: { forest: 0, sprint: .3, mtbo: 0 }, minimumWidthMm: { forest: 0, sprint: .4, mtbo: 1 } },
    cultivated: { fill: PALETTE.yellow, fillOpacity: 1, pattern: 'dots', patternColor: PALETTE.black, code: { forest: '412', sprint: '412', mtbo: null }, minimumAreaMm2: { forest: 9, sprint: 9, mtbo: 0 }, minimumWidthMm: { forest: 3, sprint: 3, mtbo: 0 } },
    orchard: { fill: PALETTE.yellow, fillOpacity: .7, pattern: 'orchard', patternColor: PALETTE.green, code: { forest: '413', sprint: '413', mtbo: '413' }, minimumAreaMm2: { forest: 4, sprint: 0, mtbo: 4 }, minimumWidthMm: { forest: .4, sprint: 2, mtbo: 0 } },
    vineyard: { fill: PALETTE.yellow, fillOpacity: .5, pattern: 'rows', patternColor: PALETTE.green, code: { forest: '414', sprint: '414', mtbo: null }, minimumAreaMm2: { forest: 4, sprint: 4, mtbo: 0 }, minimumWidthMm: { forest: .4, sprint: 2, mtbo: 0 } },
    'water-deep': { fill: PALETTE.blue, fillOpacity: 1, outline: PALETTE.black, code: { forest: '301', sprint: '301', mtbo: '301' }, minimumAreaMm2: { forest: .3025, sprint: .5, mtbo: 2 }, minimumWidthMm: { forest: .3, sprint: .3, mtbo: .3 } },
    'water-shallow': { fill: PALETTE.blue, fillOpacity: .5, outline: PALETTE.blue, code: { forest: '302', sprint: '302', mtbo: null }, minimumAreaMm2: { forest: .49, sprint: .5, mtbo: 0 }, minimumWidthMm: { forest: .3, sprint: .3, mtbo: 0 } },
    'marsh-area': { fill: PALETTE.blue, fillOpacity: .3, pattern: 'rows', outline: null, code: { forest: '308', sprint: null, mtbo: '307' }, minimumAreaMm2: { forest: 1, sprint: 0, mtbo: 0 }, minimumWidthMm: { forest: 0, sprint: 0, mtbo: 0 } },
    'paved-area': { fill: PALETTE.brown, fillOpacity: .5, outline: PALETTE.black, code: { forest: '501', sprint: '501', mtbo: '501' }, minimumAreaMm2: { forest: 1, sprint: 0, mtbo: 2 }, minimumWidthMm: { forest: 0, sprint: .35, mtbo: .9 } },
    'building-area': { fill: PALETTE.black, fillOpacity: { forest: .6, sprint: .5, mtbo: .6 }, outline: PALETTE.black, code: { forest: '521', sprint: '521', mtbo: '521' }, minimumAreaMm2: { forest: 0, sprint: 0, mtbo: 0 }, minimumWidthMm: { forest: 0, sprint: 0, mtbo: 0 } },
    'bare-rock': { fill: PALETTE.black, fillOpacity: .3, code: { forest: '214', sprint: '214', mtbo: '214' }, minimumAreaMm2: { forest: 1, sprint: 1, mtbo: 4 }, minimumWidthMm: { forest: .3, sprint: .3, mtbo: .3 } },
    'giant-boulder': { fill: PALETTE.black, fillOpacity: 1, code: { forest: '206', sprint: '206', mtbo: '206' }, minimumAreaMm2: { forest: .3, sprint: .3, mtbo: .3 }, minimumWidthMm: { forest: .25, sprint: .25, mtbo: .3 } }
  });
  const LINE_STYLES = Object.freeze({
    path: { code: { forest: '505', sprint: '505', mtbo: '816' }, color: PALETTE.black, lineWidthMm: { forest: .25, sprint: .12, mtbo: .12 }, pattern: { forest: 'dashed', sprint: 'solid', mtbo: 'dashed' } },
    'road-wide': { code: { forest: '502', sprint: null, mtbo: '502' }, color: PALETTE.black, secondary: PALETTE.brown, lineWidthMm: { forest: .14, sprint: 0, mtbo: .12 }, roadWidthMm: { forest: .58, sprint: 0, mtbo: .54 }, roadFillWidthMm: { forest: .3, sprint: 0, mtbo: .3 }, pattern: { forest: 'double-road', sprint: 'solid', mtbo: 'double-road' } },
    road: { code: { forest: '503', sprint: null, mtbo: null }, color: PALETTE.black, lineWidthMm: { forest: .35, sprint: 0, mtbo: 0 }, pattern: { forest: 'solid', sprint: 'solid', mtbo: 'solid' } },
    'vehicle-track': { code: { forest: '504', sprint: null, mtbo: '817' }, color: PALETTE.black, lineWidthMm: { forest: .25, sprint: 0, mtbo: .18 }, pattern: { forest: 'dashed', sprint: 'solid', mtbo: 'dashed' } },
    'small-footpath': { code: { forest: '506', sprint: '506', mtbo: '818' }, color: PALETTE.black, lineWidthMm: { forest: .18, sprint: .27, mtbo: .12 }, pattern: { forest: 'dashed', sprint: 'dashed', mtbo: 'dashed' } },
    'small-track': { code: { forest: '507', sprint: '507', mtbo: '820' }, color: PALETTE.black, lineWidthMm: { forest: .18, sprint: .27, mtbo: .12 }, pattern: { forest: 'dotted', sprint: 'dashed', mtbo: 'dashed' } },
    'mtbo-track-fast': { code: { forest: null, sprint: null, mtbo: '815' }, color: PALETTE.black, lineWidthMm: { forest: 0, sprint: 0, mtbo: .25 }, pattern: { forest: 'solid', sprint: 'solid', mtbo: 'solid' } },
    'mtbo-path-fast': { code: { forest: null, sprint: null, mtbo: '816' }, color: PALETTE.black, lineWidthMm: { forest: 0, sprint: 0, mtbo: .18 }, pattern: { forest: 'dashed', sprint: 'solid', mtbo: 'dashed' } },
    'mtbo-track-medium': { code: { forest: null, sprint: null, mtbo: '817' }, color: PALETTE.black, lineWidthMm: { forest: 0, sprint: 0, mtbo: .22 }, pattern: { forest: 'solid', sprint: 'solid', mtbo: 'solid' } },
    'mtbo-path-medium': { code: { forest: null, sprint: null, mtbo: '818' }, color: PALETTE.black, lineWidthMm: { forest: 0, sprint: 0, mtbo: .16 }, pattern: { forest: 'dashed', sprint: 'solid', mtbo: 'dashed' } },
    'mtbo-track-slow': { code: { forest: null, sprint: null, mtbo: '819' }, color: PALETTE.black, lineWidthMm: { forest: 0, sprint: 0, mtbo: .18 }, pattern: { forest: 'dashed', sprint: 'solid', mtbo: 'dashed' } },
    'mtbo-track-very-slow': { code: { forest: null, sprint: null, mtbo: '821' }, color: PALETTE.black, lineWidthMm: { forest: 0, sprint: 0, mtbo: .12 }, pattern: { forest: 'dotted', sprint: 'solid', mtbo: 'dotted' } },
    'watercourse': { code: { forest: '304', sprint: '304', mtbo: '304' }, color: PALETTE.blue, lineWidthMm: { forest: .3, sprint: .21, mtbo: .18 }, pattern: { forest: 'solid', sprint: 'solid', mtbo: 'solid' } },
    'small-watercourse': { code: { forest: '305', sprint: '305', mtbo: '305' }, color: PALETTE.blue, lineWidthMm: { forest: .18, sprint: .21, mtbo: .18 }, pattern: { forest: 'solid', sprint: 'solid', mtbo: 'solid' } },
    'minor-watercourse': { code: { forest: '306', sprint: '306', mtbo: '306' }, color: PALETTE.blue, lineWidthMm: { forest: .18, sprint: .21, mtbo: .18 }, pattern: { forest: 'dashed', sprint: 'dashed', mtbo: 'dashed' } },
    'power-line': { code: { forest: '510', sprint: '510', mtbo: '510' }, color: PALETTE.black, lineWidthMm: { forest: .14, sprint: .14, mtbo: .14 }, pattern: { forest: 'ticked', sprint: 'ticked', mtbo: 'ticked' } },
    'major-power-line': { code: { forest: '511', sprint: '511', mtbo: '511' }, color: PALETTE.black, lineWidthMm: { forest: .25, sprint: .25, mtbo: .25 }, pattern: { forest: 'double-black', sprint: 'double-black', mtbo: 'double-black' } },
    'passable-wall': { code: { forest: '513', sprint: '513.1', mtbo: '513' }, color: PALETTE.black, lineWidthMm: { forest: .18, sprint: .2, mtbo: .18 }, pattern: { forest: 'solid', sprint: 'solid', mtbo: 'solid' } },
    'uncrossable-wall': { code: { forest: '515', sprint: '515', mtbo: '515' }, color: PALETTE.black, lineWidthMm: { forest: .25, sprint: .25, mtbo: .25 }, pattern: { forest: 'solid', sprint: 'solid', mtbo: 'solid' } }
  });
  const POINT_STYLES = Object.freeze({
    tree: { code: { forest: '417', sprint: '417', mtbo: '417' }, color: PALETTE.green, mask: PALETTE.white },
    bush: { code: { forest: '418', sprint: '418', mtbo: '418' }, color: PALETTE.green, mask: PALETTE.white },
    rock: { code: { forest: '204', sprint: '204', mtbo: '204' }, color: PALETTE.black },
    'large-rock': { code: { forest: '205', sprint: '205', mtbo: null }, color: PALETTE.black },
    spring: { code: { forest: '312', sprint: '312', mtbo: '313' }, color: PALETTE.blue },
    waterhole: { code: { forest: '303', sprint: '303', mtbo: '313' }, color: PALETTE.blue },
    'special-vegetation': { code: { forest: '419', sprint: '419', mtbo: '419' }, color: PALETTE.green, mask: PALETTE.white }
  });
  function normalizeMapType(value) { return Object.hasOwn(TYPES, value) ? value : 'forest'; }
  function mapTypeInfo(value) { return TYPES[normalizeMapType(value)]; }
  function defaultScale(value) { return mapTypeInfo(value).defaultScale; }
  function enlargementFactor(mapType, scaleValue) {
    const type = normalizeMapType(mapType), scale = Number(scaleValue), info = TYPES[type];
    if (!Number.isFinite(scale) || scale <= 0) return 1;
    if (info.discipline === 'ismtbom-enlarged') return 1.5;
    if (info.discipline === 'ismtbom-long') {
      if (scale >= 15000) return 1;
      if (scale >= 12500) return 1.2;
      return 1.5;
    }
    return scale < info.baseScale ? info.baseScale / scale : 1;
  }
  function officialPointSize(symbol, mapType) {
    // En el catálogo la roca grande se llama large-rock; el perfil oficial usa rockLarge.
    const values = DEFAULT_SYMBOL_MM[symbol==='large-rock'?'rockLarge':symbol];
    if (!values) return null;
    const type = normalizeMapType(mapType);
    return type.startsWith('mtbo') ? values.mtbo : type === 'sprint' ? values.sprint : values.forest;
  }
  function minimumAreaGround(symbol,mapType,scaleValue) {
    const style=symbolStyle(symbol,mapType),scale=Number(scaleValue);
    if(!style||!Number.isFinite(style.minimumAreaMm2)||!Number.isFinite(scale)||scale<=0)return null;
    return style.minimumAreaMm2*(scale/1000)**2;
  }
  function minimumWidthGround(symbol,mapType,scaleValue) { const style=symbolStyle(symbol,mapType),scale=Number(scaleValue); if(!style||!Number.isFinite(style.minimumWidthMm)||!Number.isFinite(scale)||scale<=0)return null; return style.minimumWidthMm*(scale/1000); }
  function symbolStyle(symbol, mapType) {
    const type = normalizeMapType(mapType), mtbo = type.startsWith('mtbo'),profile=mtbo?'mtbo':type==='sprint'?'sprint':'forest',spec = AREA_STYLES[symbol]||LINE_STYLES[symbol]||POINT_STYLES[symbol];
    if (spec) {
      const code=spec.code[profile],lineWidthMm=spec.lineWidthMm?.[profile],roadWidthMm=spec.roadWidthMm?.[profile],roadFillWidthMm=spec.roadFillWidthMm?.[profile],pattern=spec.pattern?.[profile]||spec.pattern,fillOpacity=spec.fillOpacity?.[profile]??spec.fillOpacity;return { ...spec, code, name:spec.name?.[profile], minimumAreaMm2: spec.minimumAreaMm2?.[profile], minimumWidthMm:spec.minimumWidthMm?.[profile], fillOpacity,lineWidthMm,roadWidthMm,roadFillWidthMm, pattern, color: spec.patternColor || spec.color || spec.fill };
    }
    if (symbol === 'rock') return { color: PALETTE.black };
    if (symbol === 'spring' || symbol === 'stream' || symbol === 'marsh') return { color: PALETTE.blue };
    return null;
  }
  const api = { TYPES, PALETTE, AREA_STYLES, normalizeMapType, mapTypeInfo, defaultScale, enlargementFactor, officialPointSize, minimumAreaGround, minimumWidthGround, symbolStyle };
  root.OcartoSymbolSpecs = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);

;

/* omap-export.js */
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

;

/* project-settings.js */
/* Safe normalization of optional analysis settings stored in Ocarto project files. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoProjectSettings=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function normalize(raw){
 raw=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const heightDefaults=[{height:0,color:'#f2dc72'},{height:.3,color:'#e53935'},{height:2,color:'#48a868'},{height:5,color:'#ffffff'}];
 let vegetationHeightStops=Array.isArray(raw.vegetationHeightStops)&&raw.vegetationHeightStops.length===4?raw.vegetationHeightStops.map(s=>({height:Number(s?.height),color:String(s?.color||'').toLowerCase()})):heightDefaults;
 if(vegetationHeightStops.some((s,i)=>!Number.isFinite(s.height)||s.height<0||!/^#[0-9a-f]{6}$/.test(s.color)||i>0&&s.height<=vegetationHeightStops[i-1].height))vegetationHeightStops=heightDefaults;
 const numeric=(key,fallback,min,max,integer=false)=>{const n=Number(raw[key]);if(!Number.isFinite(n)||n<min||n>max||integer&&!Number.isInteger(n))return String(fallback);return String(n)};
 const heightThreshold=numeric('heightThreshold',4,-10000,10000);
 let heightMaximum='';
 if(raw.heightMaximum!==undefined&&raw.heightMaximum!==null&&raw.heightMaximum!==''){
  const candidate=numeric('heightMaximum',NaN,-10000,10000);
  if(Number.isFinite(Number(candidate))&&Number(candidate)>=Number(heightThreshold))heightMaximum=candidate;
 }
 return{
  heightThreshold,heightMaximum,
  lidarClassFilter:['all','ground','vegetation','unclassified'].includes(raw.lidarClassFilter)?raw.lidarClassFilter:'all',
  cellSize:numeric('cellSize',.5,.1,10000),minCellPoints:numeric('minCellPoints',1,1,10000000,true),
  localMax3x3:raw.localMax3x3===true,
  contourInterval:numeric('contourInterval',5,.1,10000),contourSmoothing:numeric('contourSmoothing',25,0,100),
  contourProtectAngle:numeric('contourProtectAngle',55,0,180),contourDetailInterval:numeric('contourDetailInterval',1,.1,10000),
  valleyThreshold:numeric('valleyThreshold',.6,.1,10000),valleyMinLength:numeric('valleyMinLength',20,5,1000000),
  valleyRadius:numeric('valleyRadius',2,1,4,true),vegetationCell:numeric('vegetationCell',.5,.1,10000),vegetationHeightStops,vegetationMinArea:numeric('vegetationMinArea',100,0,100000000),vegetationAreaPreset:['isom406','isom408','isom410','isom407','isom401','isom402','isom405','custom'].includes(raw.vegetationAreaPreset)?raw.vegetationAreaPreset:'isom406',vegetationMinWidth:numeric('vegetationMinWidth',4,0,100000),wallMinStep:numeric('wallMinStep',.8,.1,100),wallMinLength:numeric('wallMinLength',5,0,100000),rockMinProminence:numeric('rockMinProminence',.35,.05,100),rockRadius:numeric('rockRadius',2,1,5,true),rockMinPoints:numeric('rockMinPoints',1,1,100000,true),featureMapMinHeight:numeric('featureMapMinHeight',0,0,10000),featureMapMaxHeight:numeric('featureMapMaxHeight',2,0,10000),featureMapCell:numeric('featureMapCell',.5,.1,10000)
 };
}
const VEGETATION_LABELS=new Set(['forest_white','slow','slow_open','walk','walk_open','fight','uncrossable','cultivated','orchard','vineyard','open_land','rough_open','low_vegetation','scrub','frutales','clear_open','tall_forest']);
function normalizeVegetationCorrections(raw){
 raw=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const out={decisions:{},classes:{}};
 for(const [key,value] of Object.entries(raw.decisions||{}).slice(0,15000))if(typeof key==='string'&&key.length<=180&&['keep','remove'].includes(value))out.decisions[key]=value;
 for(const [key,value] of Object.entries(raw.classes||{}).slice(0,15000))if(typeof key==='string'&&key.length<=180&&VEGETATION_LABELS.has(value))out.classes[key]=value;
 return out;
}
return{normalize,normalizeVegetationCorrections};
});

;

/* project-backup.js */
/* Latest-project backup with IndexedDB and a size-limited localStorage fallback. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoProjectBackup=api})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const DB='ocarto-local-backups',STORE='projects',KEY='latest',FALLBACK_KEY='ocarto-local-backup-fallback-v1',MAX_LOCAL_CHARS=1800000;
function open(){return new Promise((resolve,reject)=>{if(!root.indexedDB){reject(Error('IndexedDB no disponible'));return}const req=root.indexedDB.open(DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('No se pudo abrir la copia local'));req.onblocked=()=>reject(Error('La base local está bloqueada'))})}
function fallbackRead(){try{const raw=root.localStorage?.getItem(FALLBACK_KEY);if(!raw)return null;const record=JSON.parse(raw);return record?.id===KEY&&record.project?.format==='ocarto-project'?record:null}catch(_){return null}}
function fallbackWrite(record){if(!root.localStorage)throw Error('Almacenamiento alternativo no disponible');const raw=JSON.stringify(record);if(raw.length>MAX_LOCAL_CHARS)throw Error('El proyecto supera el límite de la copia local alternativa');root.localStorage.setItem(FALLBACK_KEY,raw)}
async function saveIndexedDB(record){const db=await open();try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('No se pudo guardar la copia local'));tx.onabort=()=>reject(tx.error||Error('Guardado local cancelado'))})}finally{db.close()}}
async function readIndexedDB(){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(KEY);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||Error('No se pudo leer la copia local'))})}finally{db.close()}}
async function saveLatest(project){if(!project||project.format!=='ocarto-project')throw Error('Proyecto no válido para copia local');const record={id:KEY,savedAt:new Date().toISOString(),project};try{await saveIndexedDB(record);try{root.localStorage?.removeItem(FALLBACK_KEY)}catch(_){};return{savedAt:record.savedAt,projectName:String(project.name||'Mapa nuevo'),storage:'indexeddb'}}catch(indexedError){try{fallbackWrite(record);return{savedAt:record.savedAt,projectName:String(project.name||'Mapa nuevo'),storage:'localstorage'}}catch(fallbackError){throw Error(fallbackError.message||indexedError.message||'No se pudo guardar una copia local')}}}
async function loadLatest(){let stored=null;try{stored=await readIndexedDB()}catch(_){}const fallback=fallbackRead();if(stored?.project?.format!=='ocarto-project')stored=null;if(!stored)return fallback;if(!fallback)return stored;return String(fallback.savedAt||'')>String(stored.savedAt||'')?fallback:stored}
return{saveLatest,loadLatest};
});

;

/* vectorize-structures.js */
/* Ocarto v26. LAS/LAZ-class-driven artificial feature proposals.
 * Buildings class 6, wire conductors class 14, transmission towers class 15.
 * No unsupported semantic inference from unclassified points.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoStructures=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function extract(rows,cell,opts={}){
 const v=typeof require==='function'?require('./vectorize-vegetation.js'):globalThis.OcartoVegetationVector;
 if(!v||typeof v.vectorize!=='function')throw Error('Falta motor de vectorización de polígonos');
 const minRoof=Number(opts.minRoofPoints??2),minRoofArea=Number(opts.minRoofArea??35),minWire=Number(opts.minWirePoints??1),minWireLength=Number(opts.minWireLength??20);
 if(!Number.isInteger(minRoof)||minRoof<1||minRoof>100||!Number.isFinite(minRoofArea)||minRoofArea<0||!Number.isInteger(minWire)||minWire<1||minWire>100||!Number.isFinite(minWireLength)||minWireLength<0)throw Error('Parámetros de estructuras inválidos');
 const structures=v.vectorize(rows,cell,{minArea:minRoofArea,labeler:r=>Number(r.building_points||0)>=minRoof?'edificio-candidato':null});
 const buildings=structures.features.map(f=>({...f,properties:{...f.properties,kind:'edificio-candidato-por-clase-lidar',building_class:6,source:'LAS clase 6',confidence:'clasificacion-lidar-sin-verificar',required_confirmation:'Ortofoto, planta real, cerramientos, fecha del vuelo',map_symbol:null,review_required:true,apply_automatically:false}}));
 const candidates=new Map();for(const r of rows){if(Number(r.wire_points||0)>=minWire){const i=Math.round(r.x/cell-.5),j=Math.round(r.y/cell-.5);candidates.set(i+','+j,{i,j,x:r.x,y:r.y,n:r.wire_points})}}
 const dirs=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]],adj=new Map();for(const [k,p] of candidates){const ns=[];for(const [dx,dy] of dirs){const id=(p.i+dx)+','+(p.j+dy);if(candidates.has(id))ns.push(id)}adj.set(k,ns)}
 const seen=new Set(),wires=[];
 function farthest(start,set){const distance=new Map([[start,0]]),predecessor=new Map(),todo=[start];let far=start;while(todo.length){const k=todo.shift(),p=candidates.get(k);if(distance.get(k)>distance.get(far))far=k;for(const next of adj.get(k)){if(!set.has(next)||distance.has(next))continue;const q=candidates.get(next);distance.set(next,distance.get(k)+Math.hypot(p.x-q.x,p.y-q.y));predecessor.set(next,k);todo.push(next)}}return{far,distance,predecessor}}
 for(const k of candidates.keys())if(!seen.has(k)){const connected=new Set(),todo=[k];seen.add(k);while(todo.length){const q=todo.pop();connected.add(q);for(const n of adj.get(q))if(!seen.has(n)){seen.add(n);todo.push(n)}}if(connected.size<2)continue;const p=farthest(k,connected),q=farthest(p.far,connected);if((q.distance.get(q.far)||0)<minWireLength)continue;const coords=[],walk=new Set();let cur=q.far;while(cur&&!walk.has(cur)){walk.add(cur);const c=candidates.get(cur);coords.push([c.x,c.y]);cur=q.predecessor.get(cur)}coords.reverse();wires.push({type:'Feature',properties:{kind:'tendido-electrico-candidato-por-clase-lidar',source:'LAS clase 14',approx_length_m:+(q.distance.get(q.far)||0).toFixed(1),confidence:'clasificacion-lidar-sin-verificar',review_required:true,apply_automatically:false,warning:'Eje aproximado por centroides de celdas: revisar cableado, apoyos y trazado real.'},geometry:{type:'LineString',coordinates:coords}})}
 const towers=rows.filter(r=>Number(r.tower_points||0)>=1).map(r=>({type:'Feature',properties:{kind:'apoyo-electrico-candidato-por-clase-lidar',source:'LAS clase 15',points:r.tower_points,review_required:true,apply_automatically:false,warning:'Centro de celda, no posición topográfica del poste medida.'},geometry:{type:'Point',coordinates:[r.x,r.y]}}));
 return{type:'FeatureCollection',name:'Ocarto v26 - elementos artificiales LiDAR para revisión',properties:{cellSize:cell,buildings:buildings.length,power_lines:wires.length,power_tower_cells:towers.length,methods:'Clases LAS 6,14,15; no infiere objetos ausentes de las clases',needsOrthophotoReview:true},features:[...buildings,...wires,...towers]};
}
return{extract};
});

;

/* vectorize-walls.js */
/* Ocarto v80: candidate wall/escarpment axes from abrupt terrain-grid steps. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoWalls=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function detect(points,cell,opts={}){
 cell=Number(cell);const minStep=Number(opts.minStep??.8),minLength=Number(opts.minLength??5),maxEdges=Number(opts.maxEdges??750000),maxFeatures=Number(opts.maxFeatures??10000);
 if(!Array.isArray(points)||points.length>1000000||!Number.isFinite(cell)||cell<=0)throw Error('Rejilla de terreno no válida');
 if(!Number.isFinite(minStep)||minStep<=0||!Number.isFinite(minLength)||minLength<0||!Number.isInteger(maxEdges)||maxEdges<1||maxEdges>1500000||!Number.isInteger(maxFeatures)||maxFeatures<1||maxFeatures>30000)throw Error('Parámetros de muros no válidos');
 const cells=new Map();for(const p of points){if(!Array.isArray(p)||p.length<4||!p.slice(0,4).every(Number.isFinite)||p[3]<0)throw Error('Celda de terreno no válida');const i=Math.round(p[0]/cell-.5),j=Math.round(p[1]/cell-.5);if(Math.abs((i+.5)*cell-p[0])>cell*1e-5||Math.abs((j+.5)*cell-p[1])>cell*1e-5)throw Error('Rejilla de terreno incompatible con la celda');if(p[4]&&p[4]!=='observado')continue;const id=i+','+j;if(cells.has(id))throw Error('Celdas de terreno duplicadas');cells.set(id,{i,j,z:p[2]})}
 const edges=[];for(const p of cells.values()){for(const [dx,dy] of [[1,0],[0,1]]){const q=cells.get((p.i+dx)+','+(p.j+dy));if(!q)continue;const step=Math.abs(p.z-q.z);if(step<minStep)continue;if(edges.length>=maxEdges)throw Error('Demasiados candidatos de muro; aumenta el umbral de desnivel');if(dx===1)edges.push({a:[p.i+1,p.j],b:[p.i+1,p.j+1],step});else edges.push({a:[p.i,p.j+1],b:[p.i+1,p.j+1],step})}}
 const node=(p)=>p[0]+','+p[1],adj=new Map();edges.forEach((e,index)=>{for(const p of [e.a,e.b]){const id=node(p);if(!adj.has(id))adj.set(id,[]);adj.get(id).push(index)}});
 const used=new Set(),features=[];function trace(start,first){const path=[start],chain=[];let at=start,edgeIndex=first,guard=0;while(edgeIndex!==undefined&&!used.has(edgeIndex)&&guard++<=edges.length){used.add(edgeIndex);const e=edges[edgeIndex];chain.push(e);const next=node(node(e.a)===at?e.b:e.a);path.push(next);const choices=(adj.get(next)||[]).filter(i=>!used.has(i));if((adj.get(next)||[]).length!==2||!choices.length)break;at=next;edgeIndex=choices[0]}return{path,chain}}
 for(const [id,list]of adj){if(list.length===2)continue;for(const edgeIndex of list){if(used.has(edgeIndex))continue;const t=trace(id,edgeIndex);addFeature(t)}}
 for(let i=0;i<edges.length;i++)if(!used.has(i)){const e=edges[i],t=trace(node(e.a),i);addFeature(t)}
 function addFeature(t){const length=t.chain.length*cell;if(length+1e-9<minLength)return;if(features.length>=maxFeatures)throw Error('Demasiadas líneas candidatas; aumenta el desnivel o longitud mínimos');const raw=t.path.map(s=>s.split(',').map(Number)),vertices=[];for(let i=0;i<raw.length;i++){if(i>0&&i<raw.length-1){const a=raw[i-1],b=raw[i],c=raw[i+1];if((b[0]-a[0])*(c[1]-b[1])===(b[1]-a[1])*(c[0]-b[0]))continue}vertices.push(raw[i])}const coords=vertices.map(p=>p.map(v=>+(v*cell).toFixed(3)));if(coords.length<2)return;let stepMax=0,stepSum=0;for(const e of t.chain){stepMax=Math.max(stepMax,e.step);stepSum+=e.step}features.push({type:'Feature',geometry:{type:'LineString',coordinates:coords},properties:{kind:'muro-o-escarpe-candidato-lidar',source:'desnivel entre celdas vecinas del MDT',approx_length_m:+length.toFixed(2),height_step_max_m:+stepMax.toFixed(2),height_step_mean_m:+(stepSum/t.chain.length).toFixed(2),cell_edges:t.chain.length,review_required:true,auto_accept:false,warning:'El desnivel lineal también puede ser talud, roca, ribera o terraza; confirmar como muro con ortofoto y cartografía.'}})}
 features.sort((a,b)=>b.properties.approx_length_m-a.properties.approx_length_m);return{type:'FeatureCollection',name:'Ocarto · muros y escarpes candidatos LiDAR · revisar',properties:{cellSize:cell,minStepM:minStep,minLengthM:minLength,edgeCandidates:edges.length,features:features.length,nonAutomatic:true,warning:'Ejes lineales de cambios bruscos de cota; no confirman por sí solos muros construidos.'},features};
}
return{detect};
});

;

/* vectorize-rocks.js */
/* Ocarto v82: local-relief rock-like protrusion candidates from observed ground cells. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoRocks=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function detect(rows,cell,opts={}){
 cell=Number(cell);const prominence=Number(opts.minProminence??.35),radius=Number(opts.radius??2),minPoints=Number(opts.minPoints??1),maxFeatures=Number(opts.maxFeatures??10000);
 if(!Array.isArray(rows)||rows.length>1000000||!Number.isFinite(cell)||cell<=0)throw Error('Rejilla LiDAR no válida');
 if(!Number.isFinite(prominence)||prominence<=0||!Number.isInteger(radius)||radius<1||radius>5||!Number.isInteger(minPoints)||minPoints<1||minPoints>100000||!Number.isInteger(maxFeatures)||maxFeatures<1||maxFeatures>30000)throw Error('Parámetros de rocas inválidos');
 const cells=new Map();for(const row of rows){if(!Array.isArray(row)||row.length<4||!row.slice(0,4).every(Number.isFinite)||row[3]<0)throw Error('Celda de suelo no válida');if(row[4]&&row[4]!=='observado')continue;const i=Math.round(row[0]/cell-.5),j=Math.round(row[1]/cell-.5);if(Math.abs(row[0]-(i+.5)*cell)>cell*1e-5||Math.abs(row[1]-(j+.5)*cell)>cell*1e-5)throw Error('Rejilla incompatible con tamaño de celda');const key=i+','+j;if(cells.has(key))throw Error('Celdas de suelo duplicadas');cells.set(key,{i,j,x:row[0],y:row[1],z:row[2],n:row[3]})}
 const features=[],offsets=[];for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(dx||dy)offsets.push([dx,dy]);
 for(const p of cells.values()){
  if(p.n<minPoints)continue;const neighbors=offsets.map(([dx,dy])=>cells.get((p.i+dx)+','+(p.j+dy)));if(neighbors.some(q=>!q||q.n<minPoints))continue;
  if(neighbors.some(q=>q.z>=p.z))continue;
  const ring=neighbors.filter(q=>Math.max(Math.abs(q.i-p.i),Math.abs(q.j-p.j))===radius);if(ring.length<Math.max(5,radius===1?5:8))continue;
  const elevations=ring.map(q=>q.z).sort((a,b)=>a-b),mid=elevations.length>>1,base=elevations.length%2?elevations[mid]:(elevations[mid-1]+elevations[mid])/2,relief=p.z-base;if(relief<prominence)continue;
  if(features.length>=maxFeatures)throw Error('Demasiadas rocas candidatas; aumenta el desnivel mínimo o el radio');
  features.push({type:'Feature',geometry:{type:'Point',coordinates:[p.x,p.y,p.z]},properties:{kind:'roca-candidata-relieve-lidar',source:'máximo local sobre celdas de suelo observadas',ground_points:p.n,local_prominence_m:+relief.toFixed(3),min_prominence_m:prominence,neighborhood_radius_cells:radius,review_required:true,auto_accept:false,warning:'La prominencia local también puede corresponder a un tocón, escalón del terreno o error de clasificación; confirmar con ortofoto y cartografía.'}})
 }
 features.sort((a,b)=>b.properties.local_prominence_m-a.properties.local_prominence_m);
 return{type:'FeatureCollection',name:'Ocarto · rocas candidatas LiDAR · revisar',properties:{cellSize:cell,minProminenceM:prominence,radiusCells:radius,minGroundPoints:minPoints,features:features.length,method:'máximo local respecto a mediana del anillo exterior; solo suelo observado',nonAutomatic:true},features};
}
return{detect};
});

;

/* road-extract.js */
/* Ocarto v27: orthophoto region segmentation -> provisional vector road axes.
 * RGB similarity + binary thinning + connected centerline tracing.
 * Does NOT certify roads; fields/soil of similar colors can be false positives.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoRoadExtract=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const EIGHT=[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]], FOUR=[[1,0],[-1,0],[0,1],[0,-1]];
function extract(img,transform,opts={}){
 const w=img?.width,h=img?.height,rgba=img?.data;if(!Number.isInteger(w)||!Number.isInteger(h)||w<4||h<4||w*h>2300000||rgba?.length!==w*h*4)throw Error('Ortofoto inválida, supera el límite de píxeles o sin datos');
 if(!transform||![transform.a,transform.b,transform.c,transform.d,transform.e,transform.f].every(Number.isFinite))throw Error('Falta georreferenciación válida');
 const rgb=opts.referenceRGB||[205,190,160],tol=Number(opts.tolerance??26),minLength=Number(opts.minLength??25),minArea=Number(opts.minArea??14),maxFeatures=Number(opts.maxFeatures??2500);
 if(!Array.isArray(rgb)||rgb.length!==3||rgb.some(v=>!Number.isFinite(v)||v<0||v>255)||!Number.isFinite(tol)||tol<5||tol>120||!Number.isFinite(minLength)||minLength<4||!Number.isFinite(minArea)||minArea<1||!Number.isInteger(maxFeatures)||maxFeatures<1||maxFeatures>6000)throw Error('Parámetros de detección inválidos');
 const n=w*h,mask=new Uint8Array(n),maxdiff=tol*tol*3;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=y*w+x,i=k*4;if(rgba[i+3]<200)continue;const dr=rgba[i]-rgb[0],dg=rgba[i+1]-rgb[1],db=rgba[i+2]-rgb[2];if(dr*dr+dg*dg+db*db<=maxdiff)mask[k]=1}
 // 4-connected components: discard isolated color patches before thinning.
 let discarded=0;const visited=new Uint8Array(n),queue=new Int32Array(n),components=[];
 for(let k=0;k<n;k++){if(!mask[k]||visited[k])continue;let end=1;queue[0]=k;visited[k]=1;for(let p=0;p<end;p++){const at=queue[p],x=at%w,y=(at/w)|0;for(const [dx,dy] of FOUR){const xx=x+dx,yy=y+dy;if(xx<1||yy<1||xx>=w-1||yy>=h-1)continue;const next=yy*w+xx;if(mask[next]&&!visited[next]){visited[next]=1;queue[end++]=next}}}if(end<minArea){for(let i=0;i<end;i++)mask[queue[i]]=0;discarded++;continue}components.push(end)}
 // Standard two-subiteration thinning (Zhang-Suen). Kept in a Worker in the browser.
 const removed=new Int32Array(n);let iterations=0;
 for(let step=0;step<36;step++){let changes=0;for(let pass=0;pass<2;pass++){let m=0;for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=y*w+x;if(!mask[k])continue;const p2=mask[k-w],p3=mask[k-w+1],p4=mask[k+1],p5=mask[k+w+1],p6=mask[k+w],p7=mask[k+w-1],p8=mask[k-1],p9=mask[k-w-1];const nb=p2+p3+p4+p5+p6+p7+p8+p9;if(nb<2||nb>6)continue;const transitions=(!p2&&p3)+(!p3&&p4)+(!p4&&p5)+(!p5&&p6)+(!p6&&p7)+(!p7&&p8)+(!p8&&p9)+(!p9&&p2);if(transitions!==1)continue;if(pass===0?(p2*p4*p6||p4*p6*p8):(p2*p4*p8||p2*p6*p8))continue;removed[m++]=k}for(let j=0;j<m;j++)mask[removed[j]]=0;changes+=m}iterations++;if(changes===0)break}
 const graphVisited=new Uint8Array(n),segments=[];const pixScale=(Math.hypot(transform.a,transform.d)+Math.hypot(transform.b,transform.e))/2;
 function neighbors(k){const x=k%w,y=(k/w)|0,out=[];for(const [dx,dy] of EIGHT){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const id=yy*w+xx;if(mask[id])out.push(id)}return out}
 // Collect skeleton subgraphs and trace the longest path through each, to avoid loops/noise.
 const graphQueue=new Int32Array(n),seenCost=new Float32Array(n),predecessor=new Int32Array(n),stamp=new Uint32Array(n);let epoch=0;
 function farthest(root,set){++epoch;let end=1;graphQueue[0]=root;stamp[root]=epoch;seenCost[root]=0;predecessor[root]=-1;let far=root;for(let start=0;start<end;start++){const curr=graphQueue[start],x=curr%w,y=(curr/w)|0;for(const id of neighbors(curr)){if(!set.has(id)||stamp[id]===epoch)continue;stamp[id]=epoch;seenCost[id]=seenCost[curr]+Math.hypot(id%w-x,Math.floor(id/w)-y);predecessor[id]=curr;graphQueue[end++]=id;if(seenCost[id]>seenCost[far])far=id}}return{far,length:seenCost[far],predecessor,stamp:epoch}}
 for(let k=0;k<n;k++){if(!mask[k]||graphVisited[k])continue;let end=1;graphQueue[0]=k;graphVisited[k]=1;const component=new Set();for(let q=0;q<end;q++){const id=graphQueue[q];component.add(id);for(const j of neighbors(id))if(!graphVisited[j]){graphVisited[j]=1;graphQueue[end++]=j}}if(component.size<3)continue;
  let tip=k;for(const idx of component)if(neighbors(idx).filter(j=>component.has(j)).length===1){tip=idx;break}
  const a=farthest(tip,component),b=farthest(a.far,component);if(b.length*pixScale<minLength)continue;
  const route=[],seen=new Set();let j=b.far;while(j>=0&&!seen.has(j)){seen.add(j);const x=j%w+.5,y=Math.floor(j/w)+.5;route.push([+(transform.a*x+transform.b*y+transform.c).toFixed(3),+(transform.d*x+transform.e*y+transform.f).toFixed(3)]);j=b.predecessor[j]}
  if(route.length<3)continue;route.reverse();if(segments.length>=maxFeatures)throw Error('Demasiados candidatos: ajusta tolerancia o área mínima');
  segments.push({type:'Feature',properties:{kind:'posible-camino-por-ortofoto',method:'color-skeleton',approx_length_m:+(b.length*pixScale).toFixed(2),referenceRGB:rgb,tolerance:tol,review_required:true,apply_automatically:false,confidence:'experimental-sin-semantica',warning:'La coincidencia de color NO confirma un sendero o carretera; revisar continuidad, ortofoto, LiDAR y campo. Intersecciones o ramales pueden omitirse.'},geometry:{type:'LineString',coordinates:route}});
 }
 segments.sort((a,b)=>b.properties.approx_length_m-a.properties.approx_length_m);
 return {type:'FeatureCollection',name:'Ocarto v27: ejes probables de caminos por ortofoto',properties:{image_pixels:n,pixel_size_approx_m:+pixScale.toFixed(3),iterations,small_blobs_removed:discarded,components_after_mask:components.length,warning:'Detector experimental por color; no sustituye segmentación semántica ni validación georreferenciada. No altera mapa.',review_required:true},features:segments};
}
return {extract};
});

;

/* lidar-file-reader.js */
/* Read large browser files in cancellable chunks without retaining a second full-size copy. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoLidarFileReader=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
async function readFileBuffer(file,{signal,onProgress=()=>{}}={}){
 if(!file||!Number.isSafeInteger(file.size)||file.size<1)throw Error('Archivo vacío o tamaño no válido');
 if(typeof file.stream!=='function')throw Error('Este navegador no permite leer LAS/LAZ por bloques; actualízalo para importar archivos grandes');
 if(signal?.aborted)throw abortError();
 const output=new Uint8Array(file.size),reader=file.stream().getReader();let offset=0,abortHandler;
 const cancel=()=>{try{void reader.cancel()}catch(_){}};
 if(signal){abortHandler=cancel;signal.addEventListener('abort',abortHandler,{once:true})}
 try{
  while(true){
   if(signal?.aborted)throw abortError();
   const {done,value}=await reader.read();
   if(signal?.aborted)throw abortError();
   if(done)break;
   if(!(value instanceof Uint8Array)||offset+value.byteLength>output.byteLength)throw Error('La lectura del archivo devolvió un tamaño inesperado');
   output.set(value,offset);offset+=value.byteLength;onProgress(offset,file.size);
  }
  if(offset!==file.size)throw Error(`Lectura incompleta: ${offset} de ${file.size} bytes`);
  return output.buffer;
 }finally{
  if(signal&&abortHandler)signal.removeEventListener('abort',abortHandler);
  try{reader.releaseLock()}catch(_){}
 }
}
async function hasCopcInfo(file){
 if(!file||!Number.isSafeInteger(file.size)||file.size<397||typeof file.slice!=='function')return false;
 const bytes=new Uint8Array(await file.slice(375,397).arrayBuffer());if(bytes.length!==22)return false;
 let userId='';for(let i=0;i<16&&bytes[i+2];i++)userId+=String.fromCharCode(bytes[i+2]);
 return userId.trim()==='copc'&&new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint16(18,true)===1;
}
async function streamFileToWorker(file,worker,{jobId,sessionId,signal,onProgress=()=>{},chunkSize=1024*1024}={}){
 if(!file||!Number.isSafeInteger(file.size)||file.size<1)throw Error('Archivo vacío o tamaño no válido');
 if(typeof file.stream!=='function')throw Error('Este navegador no permite leer LAS/LAZ por bloques; actualízalo para importar archivos grandes');
 if(!worker||typeof worker.postMessage!=='function'||typeof worker.addEventListener!=='function')throw Error('Worker LiDAR no disponible');
 if(signal?.aborted)throw abortError();
 let waiter=null,sequence=0,done=0,failed=null,skipped=false;
 const onMessage=event=>{const m=event.data||{};if(m.jobId!==jobId)return;
  if(m.type==='load-ready'&&waiter?.kind==='ready'){const w=waiter;waiter=null;w.resolve()}
  else if(m.type==='load-skip'){skipped=true}
  else if(m.type==='load-skip-ack'&&m.sequence===sequence&&waiter?.kind==='chunk'){const w=waiter;waiter=null;w.resolve()}
  else if(m.type==='load-chunk-ack'&&m.sequence===sequence&&waiter?.kind==='chunk'){const w=waiter;waiter=null;w.resolve()}
  else if(m.type==='loaded'&&waiter?.kind==='finish'){const w=waiter;waiter=null;w.resolve(m)}
  else if((m.type==='error'&&m.operation==='load')||m.type==='cancelled'){failed=Object.assign(Error(m.message||'Carga cancelada'),{name:m.type==='cancelled'?'AbortError':'Error'});if(waiter){const w=waiter;waiter=null;w.reject(failed)}}
 };
 const waitFor=kind=>new Promise((resolve,reject)=>{
  const seconds=kind==='finish'?600:35;
  const timer=setTimeout(()=>{
   const error=Error('El procesador LiDAR no responde ('+kind+'). Comprueba que el servidor local y lidar-worker.js están disponibles.');
   failed=error;if(waiter?.kind===kind){waiter=null;reject(error)}
  },seconds*1000);
  waiter={kind,resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}};
  if(failed){const w=waiter;waiter=null;w.reject(failed)}
 });
 const onWorkerError=event=>{
  failed=Error('El procesador LiDAR no pudo iniciar: '+(event.message||'error de carga del Worker'));
  if(waiter){const w=waiter;waiter=null;w.reject(failed)}
 };
 const abort=()=>{try{worker.postMessage({type:'cancel',jobId})}catch(_){};try{void reader?.cancel()}catch(_){}};
 let reader=null;
 worker.addEventListener('message',onMessage);
 worker.addEventListener('error',onWorkerError);
 if(signal)signal.addEventListener('abort',abort,{once:true});
 try{
  worker.postMessage({type:'load-start',jobId,fileSize:file.size,sessionId});await waitFor('ready');
  reader=file.stream().getReader();
  while(true){if(signal?.aborted)throw abortError();const part=await reader.read();if(signal?.aborted)throw abortError();if(part.done)break;
   if(!(part.value instanceof Uint8Array))throw Error('La lectura del archivo devolvió un bloque inválido');
   for(let offset=0;offset<part.value.byteLength;offset+=chunkSize){if(signal?.aborted)throw abortError();const chunk=part.value.slice(offset,Math.min(part.value.byteLength,offset+chunkSize));sequence++;worker.postMessage({type:'load-chunk',jobId,sequence,offset:done,chunk},[chunk.buffer]);done+=chunk.byteLength;onProgress(done,file.size);await waitFor('chunk');if(skipped)break}
   if(skipped){try{await reader.cancel()}catch(_){}break}
  }
  if(done!==file.size&&!skipped)throw Error(`Lectura incompleta: ${done} de ${file.size} bytes`);
  worker.postMessage({type:'load-end',jobId});const loaded=await waitFor('finish');return loaded;
 }catch(e){if(e.name==='AbortError'||signal?.aborted)abort();else try{worker.postMessage({type:'cancel',jobId})}catch(_){}throw e}
 finally{if(signal)signal.removeEventListener('abort',abort);worker.removeEventListener('message',onMessage);worker.removeEventListener('error',onWorkerError);if(reader)try{reader.releaseLock()}catch(_){}}
}
function abortError(){const e=Error('Carga cancelada');e.name='AbortError';return e}
return{readFileBuffer,streamFileToWorker,hasCopcInfo};
});

;

/* lidar-detection-catalog.js */
/* Ocarto v1.09: consolidate natural and human-made LiDAR proposals for review. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoLidarCatalog=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const GROUPS={vegetation:'vegetacion',clearing:'vegetacion',orchard:'vegetacion',building:'construido',power:'infraestructura',wall:'construido_o_relieve',rock:'relieve',drainage:'hidrografia_o_surco',road:'transporte',unknown:'sin_clasificar'};
function inferGroup(p){const text=[p.kind,p.category,p.description,p.source,p.source_detection].filter(Boolean).join(' ').toLowerCase();if(/veget|bosque|forest|frutal|orchard|claro|clear|matorral|cultivo/.test(text))return text.includes('frutal')||text.includes('orchard')?'orchard':text.includes('claro')||text.includes('clear')?'clearing':'vegetation';if(/edificio|building|muro|escarpe|wall/.test(text))return /muro|escarpe|wall/.test(text)?'wall':'building';if(/tendido|cable|eléct|electric|apoyo/.test(text))return 'power';if(/roca|rock|prominencia/.test(text))return 'rock';if(/arroyo|canal|surco|vaguada|drenaje/.test(text))return 'drainage';if(/camino|sendero|carretera|road|track/.test(text))return 'road';return 'unknown'}
function combine(collections,metadata={}){if(!Array.isArray(collections)||collections.length>100)throw Error('Lista de propuestas LiDAR no válida');const features=[],counts={},sources=[];for(const item of collections){const fc=item?.collection||item;if(!fc||fc.type!=='FeatureCollection'||!Array.isArray(fc.features)||fc.features.length>250000)throw Error('Cada entrada debe ser una FeatureCollection válida');const source=String(item?.source||fc.name||'LiDAR').slice(0,120);sources.push(source);for(const feature of fc.features){if(!feature||feature.type!=='Feature'||!feature.geometry||!feature.properties||typeof feature.properties!=='object')throw Error('Propuesta LiDAR incompleta');const group=inferGroup(feature.properties),key=GROUPS[group]||GROUPS.unknown;counts[key]=(counts[key]||0)+1;features.push({...feature,properties:{...feature.properties,source_detection:feature.properties.source_detection||feature.properties.source||source,detection_group:key,review_required:true,auto_accept:false}})}}return{type:'FeatureCollection',name:'Ocarto · inventario de elementos naturales y humanos detectados por LiDAR · revisar',metadata:{...metadata,coordinate_status:metadata.coordinate_status||'check-source',contains_unverified_candidates:true},properties:{proposal_count:features.length,counts,sources:[...new Set(sources)],taxonomy:{vegetacion:'claros, cultivos, vegetacion baja y alta, frutales; confirmar la clase con ortofoto y ejemplos',construido:'edificios, muros o escarpes; distinguir construccion de relieve en revision',infraestructura:'tendidos y apoyos electricos; requiere confirmar la clasificacion LAS',relieve:'rocas o resaltes; puede incluir tocones o errores',hidrografia_o_surco:'arroyos, canales, vaguadas y surcos; el LiDAR no determina si llevan agua ni su origen',transporte:'caminos, senderos y carreteras; confirmar continuidad y uso',sin_clasificar:'la geometria se conserva con su procedencia para inspeccion'},deduplicated:false,warning:'Todas las entidades son propuestas. La geometria se conserva y ninguna se acepta automaticamente.'},features}}
return{combine,inferGroup};
});

;

/* tree-crowns.js */
'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoTreeCrowns=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function detect(rows,cell,options={}){
    if(!Array.isArray(rows))throw Error('Las celdas de vegetación no son válidas');
    cell=Number(cell);if(!Number.isFinite(cell)||cell<=0)throw Error('El tamaño de celda debe ser mayor que cero');
    const minHeight=Number(options.minHeight??2),largeHeight=Number(options.largeHeight??8),radius=Number(options.radius??2),minSeparation=Number(options.minSeparation??3),maxCandidates=Number(options.maxCandidates??50000);
    if(!Number.isFinite(minHeight)||minHeight<0||!Number.isFinite(largeHeight)||largeHeight<=minHeight||!Number.isFinite(radius)||radius<cell||!Number.isFinite(minSeparation)||minSeparation<cell||!Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>100000)throw Error('Parámetros de detección de copas no válidos');
    const cells=rows.filter(r=>Number.isFinite(Number(r.x))&&Number.isFinite(Number(r.y))&&Number.isFinite(Number(r.canopy_max_above_ground_m))&&Number(r.canopy_max_above_ground_m)>=minHeight).map(r=>({r,x:Number(r.x),y:Number(r.y),h:Number(r.canopy_max_above_ground_m)})).sort((a,b)=>b.h-a.h||a.y-b.y||a.x-b.x);
    const byKey=new Map(cells.map(c=>[`${c.x},${c.y}`,c]));const local=[];
    for(const c of cells){let peak=true;const steps=Math.ceil(radius/cell);for(let dy=-steps;dy<=steps&&peak;dy++)for(let dx=-steps;dx<=steps;dx++){if(!dx&&!dy)continue;if(Math.hypot(dx*cell,dy*cell)>radius+1e-9)continue;const n=byKey.get(`${c.x+dx*cell},${c.y+dy*cell}`);if(n&&(n.h>c.h+1e-9||(Math.abs(n.h-c.h)<=1e-9&&(n.y<c.y||n.y===c.y&&n.x<c.x)))){peak=false;break}}if(peak)local.push(c)}
    const selected=[];for(const c of local){if(selected.some(n=>Math.hypot(n.x-c.x,n.y-c.y)<minSeparation-1e-9))continue;const r=c.r,small=c.h<largeHeight;selected.push({type:'Feature',geometry:{type:'Point',coordinates:[c.x,c.y]},properties:{kind:'lidar-tree-crown-candidate',source:'LiDAR height local maximum',source_key:`tree:${c.x}:${c.y}`,symbol_candidate:small?'418':'417',symbol_name_candidate:small?'Arbolado pequeño':'Árbol aislado',tree_size_class:small?'small':'large',canopy_height_m:c.h,canopy_mean_height_m:Number.isFinite(Number(r.canopy_mean_above_ground_m))?Number(r.canopy_mean_above_ground_m):null,vegetation_return_fraction:Number.isFinite(Number(r.vegetation_return_fraction))?Number(r.vegetation_return_fraction):null,vegetation_points:Number.isFinite(Number(r.vegetation_points))?Number(r.vegetation_points):null,grid_cell_m:cell,peak_radius_m:radius,min_tree_separation_m:minSeparation,review_required:true,auto_accept:false}});if(selected.length>=maxCandidates)break}
    return{type:'FeatureCollection',properties:{source:'ocarto-lidar-tree-crowns-v1',grid_cell_m:cell,min_height_m:minHeight,large_tree_height_m:largeHeight,peak_radius_m:radius,min_tree_separation_m:minSeparation,candidate_limit:maxCandidates,review_required:true},features:selected};
  }
  return Object.freeze({detect});
});

;