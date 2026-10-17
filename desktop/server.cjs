'use strict';
// Servidor estático local de Ocarto (solo 127.0.0.1). Sustituye a servidor-ocarto.ps1
// dentro de la app Electron: funciona leyendo de app.asar y no necesita PowerShell.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.zip': 'application/zip', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8'
};

function resolveSafe(root, urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]); } catch { return null; }
  if (decoded.includes('\0')) return null;
  const rootResolved = path.resolve(root);
  const target = path.resolve(rootResolved, '.' + path.sep + decoded.replace(/^[/\\]+/, ''));
  if (target !== rootResolved && !target.startsWith(rootResolved + path.sep)) return null;
  return target;
}

function createServer(root, { entry = '/source/v234/index.html' } = {}) {
  return http.createServer((req, res) => {
    const send = (code, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'Method Not Allowed');
    let urlPath = req.url || '/';
    if (urlPath.split('?')[0] === '/') urlPath = entry;
    const file = resolveSafe(root, urlPath);
    if (!file) return send(403, 'Forbidden');
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return send(404, 'Not found');
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
    });
  });
}

// Intenta el puerto preferido y, si está ocupado, los siguientes; devuelve { server, port }.
function listen(root, preferred = 8787, tries = 20, options) {
  return new Promise((resolve, reject) => {
    const attempt = port => {
      const server = createServer(root, options);
      server.once('error', e => {
        if (e.code === 'EADDRINUSE' && port < preferred + tries - 1) attempt(port + 1); else reject(e);
      });
      server.listen(port, '127.0.0.1', () => resolve({ server, port }));
    };
    attempt(preferred);
  });
}

module.exports = { createServer, listen, resolveSafe, TYPES };
