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
    const values = DEFAULT_SYMBOL_MM[symbol];
    if (!values) return null;
    const type = normalizeMapType(mapType);if(symbol==='large-rock')symbol='rockLarge';
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
