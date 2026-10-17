/* Ocarto: dibujo de símbolos OCAD (definiciones extraídas de un .ocd, en mm base ISOM 1:15000).
 * Todas las funciones reciben un contexto Canvas2D y `px`, píxeles por mm de papel a la escala
 * mostrada (ya multiplicado por el factor de ampliación, p. ej. 1,5 en 1:10000). */
(function (root) {
'use strict';
const TAU = Math.PI * 2;
function ord(lib, n) { const t = lib.tintas[n]; return t ? t.orden : 0; }
function byLayer(lib, a, b) { return ord(lib, b.ink) - ord(lib, a.ink); } // capa inferior primero
function ink(lib, n) { const t = lib.tintas[n]; return t ? t.rgb : null; }

function pathElement(ctx, el, px) {
  const p = el.pts; if (!p.length) return;
  ctx.beginPath();
  let i = 0, start = true;
  while (i < p.length) {
    const [x, y, xf, yf] = p[i];
    if (start || (yf & 2)) { ctx.moveTo(x * px, y * px); start = false; i++; continue; }
    if ((xf & 1) && i + 2 < p.length) { ctx.bezierCurveTo(x * px, y * px, p[i + 1][0] * px, p[i + 1][1] * px, p[i + 2][0] * px, p[i + 2][1] * px); i += 3; continue; }
    ctx.lineTo(x * px, y * px); i++;
  }
}

// Dibuja los elementos de un símbolo (punto o marca de línea) centrados en el origen actual.
function drawElements(ctx, lib, elements, px) {
  for (const el of (elements || []).slice().sort((a, b) => byLayer(lib, a, b))) {
    const c = ink(lib, el.ink); if (!c) continue;
    if (el.k === 'punto') { ctx.beginPath(); ctx.arc(0, 0, el.d * px / 2, 0, TAU); ctx.fillStyle = c; ctx.fill(); }
    else if (el.k === 'circulo') { ctx.beginPath(); ctx.arc(0, 0, el.d * px / 2, 0, TAU); ctx.strokeStyle = c; ctx.lineWidth = el.w * px; ctx.stroke(); }
    else if (el.k === 'linea') { pathElement(ctx, el, px); ctx.strokeStyle = c; ctx.lineWidth = el.w * px; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
    else if (el.k === 'area') { pathElement(ctx, el, px); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); if (el.w > 0) { ctx.strokeStyle = c; ctx.lineWidth = el.w * px; ctx.stroke(); } }
  }
}

function drawPoint(ctx, lib, sym, px) { ctx.save(); ctx.lineCap = 'round'; drawElements(ctx, lib, sym.elementos, px); ctx.restore(); }

function tracePolyline(ctx, pts, px) { ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0] * px, q[1] * px) : ctx.moveTo(q[0] * px, q[1] * px)); }

function walk(pts) { // longitudes acumuladas
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return cum;
}
function at(pts, cum, d) { // posición y ángulo a distancia d
  let i = 1; while (i < pts.length - 1 && cum[i] < d) i++;
  const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1] || 1, t = Math.min(1, Math.max(0, (d - cum[i - 1]) / seg));
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

// pts: vértices en mm (y hacia abajo). Dibuja base, doble línea y marcas.
function drawLine(ctx, lib, sym, pts, px) {
  if (!pts || pts.length < 2) return;
  const d = sym.doble, ops = [];
  ctx.save(); ctx.lineJoin = 'round';
  if (d && d.modo > 0 && d.ancho > 0) {
    const fill = (d.flags & 1) && ink(lib, d.relleno);
    if (fill) ops.push({ ink: d.relleno, fn() { tracePolyline(ctx, pts, px); ctx.strokeStyle = fill; ctx.lineWidth = d.ancho * px; ctx.lineCap = 'butt'; ctx.stroke(); } });
    for (const side of [-1, 1]) {
      const inkN = side < 0 ? d.izq : d.der, col = ink(lib, inkN), w = side < 0 ? d.anchoIzq : d.anchoDer; if (!col || !w) continue;
      ops.push({ ink: inkN, fn() {
        const off = pts.map((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [q[0] + side * (a[1] - b[1]) / L * d.ancho / 2, q[1] + side * (b[0] - a[0]) / L * d.ancho / 2]; });
        tracePolyline(ctx, off, px); ctx.strokeStyle = col; ctx.lineWidth = w * px; ctx.lineCap = 'butt'; ctx.stroke(); } });
    }
  }
  const col = ink(lib, sym.tinta);
  if (col && sym.ancho > 0) ops.push({ ink: sym.tinta, fn() {
    ctx.strokeStyle = col; ctx.lineWidth = sym.ancho * px; ctx.lineCap = sym.extremos === 1 ? 'round' : 'butt';
    if (sym.hueco > 0 && sym.largo > 0) ctx.setLineDash(sym.huecoSec > 0 ? [sym.largo * px, sym.hueco * px, sym.largo * px, sym.huecoSec * px] : [sym.largo * px, sym.hueco * px]);
    tracePolyline(ctx, pts, px); ctx.stroke(); ctx.setLineDash([]); } });
  const prim = sym.marcas && sym.marcas.prim;
  if (prim && prim.length && sym.largo > 0 && !(sym.hueco > 0)) ops.push({ ink: prim.slice().sort((a, b) => byLayer(lib, a, b))[0].ink, fn() {
    const cum = walk(pts), L = cum[cum.length - 1], n = Math.max(1, Math.round(L / sym.largo)), step = L / n, group = Math.max(1, sym.nSimb || 1);
    for (let k = 0; k <= n; k++) for (let g = 0; g < group; g++) {
      const dd = Math.min(L, Math.max(0, k * step + (g - (group - 1) / 2) * (sym.distSimb || 0))), s = at(pts, cum, dd);
      ctx.save(); ctx.translate(s.x * px, s.y * px); ctx.rotate(s.ang); drawElements(ctx, lib, prim, px); ctx.restore();
    } } });
  const corner = sym.marcas && sym.marcas.esquina;
  if (corner && corner.length) ops.push({ ink: corner[0].ink, fn() { // marcas en los vértices interiores (p. ej. postes de 511)
    for (let i = 1; i < pts.length - 1; i++) { const a = pts[i - 1], b = pts[i + 1]; ctx.save(); ctx.translate(pts[i][0] * px, pts[i][1] * px); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0])); drawElements(ctx, lib, corner, px); ctx.restore(); } } });
  ops.sort((a, b) => byLayer(lib, a, b)); ops.forEach(o => o.fn());
  ctx.restore();
}

// ring: polígono exterior en mm [[x,y],...]. bbox calculado del propio anillo.
function drawArea(ctx, lib, sym, ring, px, holes) {
  if (!ring || ring.length < 3) return;
  const xs = ring.map(q => q[0]), ys = ring.map(q => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 1;
  ctx.save(); ctx.beginPath();
  for (const rg of [ring].concat(holes || [])) { rg.forEach((q, i) => i ? ctx.lineTo(q[0] * px, q[1] * px) : ctx.moveTo(q[0] * px, q[1] * px)); ctx.closePath(); }
  ctx.clip('evenodd');
  const ops = [], fill = sym.rellenoOn && ink(lib, sym.tintaRelleno);
  if (fill) ops.push({ ink: sym.tintaRelleno, fn() { ctx.fillStyle = fill; ctx.fillRect(x0 * px, y0 * px, (x1 - x0) * px, (y1 - y0) * px); } });
  const h = sym.trama, hcol = h && h.dist > 0 && ink(lib, h.tinta);
  if (hcol) ops.push({ ink: h.tinta, fn() {
    for (const ang of (h.modo === 2 ? [h.ang1, h.ang2] : [h.ang1])) {
      ctx.save(); ctx.translate(cx * px, cy * px); ctx.rotate(-ang * Math.PI / 180); ctx.strokeStyle = hcol; ctx.lineWidth = Math.max(h.ancho, 0.01) * px; ctx.beginPath();
      for (let t = -R; t <= R; t += h.dist) { ctx.moveTo(-R * px, t * px); ctx.lineTo(R * px, t * px); }
      ctx.stroke(); ctx.restore();
    } } });
  const s = sym.estructura;
  if (s && s.ancho > 0 && s.alto > 0 && s.elementos.length) ops.push({ ink: s.elementos.slice().sort((a, b) => byLayer(lib, a, b))[0].ink, fn() {
    ctx.save(); ctx.translate(cx * px, cy * px); ctx.rotate(-s.ang * Math.PI / 180);
    const nj = Math.ceil(R / s.alto) + 1, ni = Math.ceil(R / s.ancho) + 1;
    for (let j = -nj; j <= nj; j++) for (let i = -ni; i <= ni; i++) {
      const sh = (s.modo === 2 && (j & 1)) ? s.ancho / 2 : 0;
      ctx.save(); ctx.translate((i * s.ancho + sh) * px, j * s.alto * px); drawElements(ctx, lib, s.elementos, px); ctx.restore();
    }
    ctx.restore(); } });
  ops.sort((a, b) => byLayer(lib, a, b)); ops.forEach(o => o.fn());
  ctx.restore();
}

const api = { drawPoint, drawLine, drawArea, drawElements };
if (typeof module === 'object' && module.exports) module.exports = api; else root.OcartoOcadDraw = api;
})(typeof self !== 'undefined' ? self : this);
