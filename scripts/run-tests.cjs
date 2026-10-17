'use strict';
// Ejecuta todos los tests Node del proyecto y falla si alguno falla.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const dirs = ['source/v234/tests', 'desktop/tests'];
let failed = 0, total = 0;
for (const d of dirs) {
  for (const f of fs.readdirSync(path.join(root, d)).filter(n => n.endsWith('.cjs')).sort()) {
    total++;
    const r = spawnSync(process.execPath, [path.join(root, d, f)], { encoding: 'utf8', timeout: 180000 });
    const ok = r.status === 0;
    console.log((ok ? 'OK     ' : 'FALLA  ') + d + '/' + f);
    if (!ok) { failed++; console.log((r.stdout + r.stderr).split('\n').filter(l => /^not ok|error:/.test(l)).slice(0, 5).join('\n')); }
  }
}
console.log(`\n${total - failed}/${total} archivos de test correctos`);
process.exit(failed ? 1 : 0);
