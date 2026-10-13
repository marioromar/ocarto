const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const VERSION = '3.4.0';
const ROOT = path.resolve(__dirname, '..');
const FILES = [
  ['js/src/laz-perf.js', 'vendor/laz-perf.js', '8f271302ca22c7b0490f3b59f6ceed61d61f8dd97e4e94669e5aeb74c8e3d94e'],
  ['js/src/laz-perf.wasm', 'vendor/laz-perf.wasm', '7f4eacd83856610d42ba36e1c6f4a4019d07d9750827919c0c9b91397b862260'],
];
function download(file) {
  const url = `https://raw.githubusercontent.com/hobuinc/laz-perf/${VERSION}/${file}`;
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode !== 200) return reject(new Error(`${url}: HTTP ${response.statusCode}`));
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}
(async () => {
  for (const [source, destination, expectedSha256] of FILES) {
    const bytes = await download(source);
    if (!bytes.length) throw new Error(`Descarga vacía: ${source}`);
    const actualSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    if (actualSha256 !== expectedSha256) throw new Error(`SHA-256 incorrecto para ${source}: ${actualSha256}`);
    const target = path.join(ROOT, destination);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    console.log(`${destination}: ${bytes.length} bytes · SHA-256 verificado (laz-perf ${VERSION})`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
