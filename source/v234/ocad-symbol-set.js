/* Ocarto: conjunto de símbolos OCAD (importados de un .ocd de referencia).
 * Une los datos (ocad-symbols-data.js), el dibujo (ocad-symbol-draw.js) y el catálogo del editor.
 * Los ids son 'ocad-<código OCAD>' y no sustituyen a ningún símbolo existente de Ocarto. */
(function (root) {
'use strict';
const lib = root.OcartoOcadData || (typeof require === 'function' ? require('./ocad-symbols-data.js') : null);
const Draw = root.OcartoOcadDraw || (typeof require === 'function' ? require('./ocad-symbol-draw.js') : null);
const GEOM = { punto: 'point', linea: 'line', area: 'area' }, GLYPH = { punto: '●', linea: '━', area: '▨' }, LABEL = { punto: 'Puntos', linea: 'Líneas', area: 'Áreas' };
const byId = new Map(), list = [];
const codeText = c => String(parseFloat((c / 1000).toFixed(3)));
function firstColor(s) {
  const cand = [s.tinta, ...(s.elementos || []).map(e => e.ink), s.tintaRelleno, ...(s.tintas || [])];
  for (const n of cand) { const t = lib.tintas[n]; if (t && t.rgb !== '#ffffff') return t.rgb; }
  return '#000000';
}
function pointSize(s) { let m = 0; for (const e of s.elementos || []) { m = Math.max(m, e.d || 0, ...e.pts.map(p => Math.hypot(p[0], p[1]) * 2)); } return Math.max(.5, Math.round(m * 100) / 100); }
if (lib) for (const s of lib.simbolos) {
  const id = 'ocad-' + s.code;
  const entry = { id, geometry: GEOM[s.tipo], group: 'OCAD Bobadilla · ' + LABEL[s.tipo], name: s.name, code: codeText(s.code), glyph: GLYPH[s.tipo], sizeMm: s.tipo === 'punto' ? pointSize(s) : 0, lineMm: s.ancho || .15, ocad: true };
  byId.set(id, { sym: s, entry, spec: { code: entry.code, color: firstColor(s), lineWidthMm: s.ancho || undefined, ocad: true } });
  list.push(entry);
}
const KEY = 'ocarto.symbolSet.v1', MODES = ['ocad', 'legacy', 'all'];
let mode = 'ocad';
try { const v = root.localStorage && root.localStorage.getItem(KEY); if (MODES.includes(v)) mode = v; } catch (e) { /* sin almacenamiento: se usa el valor por defecto */ }
const getMode = () => mode;
function setMode(m) { if (!MODES.includes(m)) return mode; mode = m; try { root.localStorage && root.localStorage.setItem(KEY, m); } catch (e) { /* ignorar */ } return mode; }
// Alias: un símbolo antiguo de Ocarto (mismo código y geometría) se dibuja con el aspecto OCAD cuando el modo es 'ocad'.
const byKey = new Map(list.map(e => [e.code + '|' + e.geometry, e.id])), aliases = new Map();
function registerAlias(oldId, code, geometry) { const target = byKey.get(String(code) + '|' + geometry); if (target && !byId.has(oldId)) aliases.set(oldId, target); return !!target; }
const resolve = id => byId.has(id) ? id : (mode === 'ocad' && aliases.get(id)) || null;
const WKEY = 'ocarto.symbolWeight.v1', WEIGHTS = { real: 0, reforzado: 2, grueso: 3.2 };
let weight = 'reforzado';
try { const v = root.localStorage && root.localStorage.getItem(WKEY); if (v in WEIGHTS) weight = v; } catch (e) { /* ignorar */ }
const getWeight = () => weight;
function setWeight(w) { if (!(w in WEIGHTS)) return weight; weight = w; try { root.localStorage && root.localStorage.setItem(WKEY, w); } catch (e) { /* ignorar */ } return weight; }
const minScreen = () => WEIGHTS[weight]; // grosor mínimo de línea en píxeles de pantalla
const owns = id => byId.has(id);
const spec = id => (byId.get(id) || {}).spec || null;
const catalog = () => list.slice();

// px = píxeles por mm de papel a la escala mostrada (ya con ampliación). f.points en unidades de mundo.
function drawFeature(ctx, f, o) {
  const r = byId.get(o.symbol || f.symbol); if (!r) return false;
  const px = o.px, s = r.sym;
  ctx.save(); if (o.candidate) ctx.globalAlpha = .55;
  const min = o.min || 0;
  if (s.tipo === 'punto') Draw.drawPoint(ctx, lib, s, px, min);
  else {
    const mm = p => [p.x / px, p.y / px], pts = (f.points || []).map(mm);
    if (s.tipo === 'linea') Draw.drawLine(ctx, lib, s, pts, px, min);
    else Draw.drawArea(ctx, lib, s, pts, px, (f.holes || []).map(h => h.map(mm)), min);
  }
  ctx.restore(); return true;
}

function drawPreview(canvas, id, geometry) {
  const r = byId.get(id), c = canvas && canvas.getContext && canvas.getContext('2d'); if (!r || !c) return false;
  const w = canvas.width, h = canvas.height, k = w / 48, s = r.sym, m = 3 * k, min = 2.2 * k;
  // Iconos grandes y de trazo grueso; los símbolos puntuales mayores se ajustan a la casilla.
  const PX = geometry === 'point' ? Math.min(26 * k, (w * .6) / Math.max(r.entry.sizeMm || .5, .3)) : 15 * k;
  c.clearRect(0, 0, w, h); c.save();
  if (s.tipo === 'punto') { c.translate(w / 2, h / 2); Draw.drawPoint(c, lib, s, PX, min); }
  else if (s.tipo === 'linea') Draw.drawLine(c, lib, s, [[m / PX, h * .66 / PX], [(w - m) / PX, h * .35 / PX]], PX, min);
  else Draw.drawArea(c, lib, s, [[m / PX, m / PX], [(w - m) / PX, m / PX], [(w - m) / PX, (h - m) / PX], [m / PX, (h - m) / PX]], PX, null, min);
  c.restore(); return true;
}

const api = { owns, resolve, getWeight, setWeight, minScreen, registerAlias, getMode, setMode, spec, catalog, drawFeature, drawPreview, count: () => list.length, source: lib && lib.fuente };
if (typeof module === 'object' && module.exports) module.exports = api; else root.OcartoOcadSet = api;
})(typeof self !== 'undefined' ? self : this);
