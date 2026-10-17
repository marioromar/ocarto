'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), http = require('node:http');
const { listen, resolveSafe } = require('../server.cjs');
const root = path.join(__dirname, '..', '..');
const get = (port, p, method = 'GET') => new Promise((ok, ko) => {
  http.request({ host: '127.0.0.1', port, path: p, method }, r => { const c = []; r.on('data', d => c.push(d)); r.on('end', () => ok({ status: r.statusCode, type: r.headers['content-type'], body: Buffer.concat(c) })); }).on('error', ko).end();
});
test('raíz sirve el editor, WASM con MIME correcto y bloquea rutas fuera', async () => {
  const { server, port } = await listen(root, 18787);
  try {
    const home = await get(port, '/');
    assert.equal(home.status, 200); assert.match(home.type, /text\/html/); assert.match(home.body.toString(), /ocarto/i);
    const wasm = await get(port, '/source/v234/vendor/laz-perf.wasm');
    if (wasm.status === 200) assert.equal(wasm.type, 'application/wasm');
    assert.equal((await get(port, '/source/v234/symbol-renderer.js')).status, 200);
    assert.equal((await get(port, '/no-existe.js')).status, 404);
    assert.equal((await get(port, '/..%2f..%2fetc%2fpasswd')).status, 403);
    assert.equal((await get(port, '/', 'POST')).status, 405);
  } finally { server.close(); }
});
test('resolveSafe rechaza traversal y bytes nulos', () => {
  assert.equal(resolveSafe(root, '/../x'), null);
  assert.equal(resolveSafe(root, '/a%00b'), null);
  assert.ok(resolveSafe(root, '/source/v234/index.html').endsWith('index.html'));
});
test('si el puerto está ocupado usa el siguiente', async () => {
  const a = await listen(root, 18800), b = await listen(root, 18800);
  try { assert.equal(b.port, a.port + 1); } finally { a.server.close(); b.server.close(); }
});
