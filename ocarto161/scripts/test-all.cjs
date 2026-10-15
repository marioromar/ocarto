'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const testsDir = path.join(__dirname, '..', 'tests');
const tests = fs.readdirSync(testsDir).filter(name => name.endsWith('.cjs')).sort();
if (!tests.length) {
  console.error('No se encontraron pruebas en tests/*.cjs');
  process.exit(1);
}
for (const test of tests) {
  console.log(`\n▶ ${test}`);
  const result = spawnSync(process.execPath, [path.join(testsDir, test)], { stdio: 'inherit' });
  if (result.error) {
    console.error(`No se pudo ejecutar ${test}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Falló ${test} (código ${result.status ?? 'desconocido'}).`);
    process.exit(result.status || 1);
  }
}
console.log(`\n✓ ${tests.length} pruebas ejecutadas.`);
