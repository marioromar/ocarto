// Chromium GUI -> real file input -> browser reader -> Web Worker -> offline LAZ WASM.
// Non-destructive smoke checks on top of v279. No modification of editor state.
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fixture = ext =>
  path.join(__dirname, '..', '..', 'source', 'v234', 'tests', 'fixtures', '1815.' + ext);

test('el editor avanzado conserva las herramientas LiDAR y la carga del WASM', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Ocarto/i);
  await expect(page.locator('#lidarNav')).toHaveCount(1);
  await expect(page.locator('#pointFile')).toHaveCount(1);
  await expect(page.locator('#heightRasterFiles')).toHaveCount(1);
  await expect(page.locator('#tiledAreaBtn')).toHaveCount(1);
  await expect(page.locator('#auditMdtBtn')).toHaveCount(1);
  await expect(page.locator('#pointFile')).toHaveAttribute('accept', /\.las.*\.laz/);
  await expect(page.locator('#heightRasterFiles')).toHaveAttribute('accept', /\.png.*\.pgw/);
  const worker = await page.request.get('/lidar-worker.js');
  expect(worker.status()).toBe(200);
  const wasm = await page.request.get('/vendor/laz-perf.wasm');
  expect(wasm.status()).toBe(200);
  expect(wasm.headers()['content-type']).toContain('application/wasm');
});

for (const extension of ['las', 'laz']) {
  test('importación REAL con Chromium de ' + extension.toUpperCase(), async ({ page }) => {
    await page.goto('/index.html');
    // Select the actual cloud input, not the first arbitrary input on the page.
    await page.locator('#pointFile').setInputFiles(fixture(extension));
    // This UI message is sent after worker.loaded, not when just selecting a file.
    await expect(page.locator('#lidarStatus')).toHaveText('Carga completa', { timeout: 75_000 });
    await expect(page.locator('#pointInfo')).toBeVisible();
    await expect(page.locator('#cloudName')).toHaveText('1815.' + extension);
    await expect(page.locator('#pointCount')).toContainText(/\d+/);
    await expect(page.locator('#terrainBtn')).toBeEnabled();
  });
}


test('v285: selección de tres capas visible y no destructiva sin mapa georreferenciado', async ({ page }) => {
  await page.goto('/index.html');
  for(const id of ['vegReviewedPanel','vegReviewedFiles','vegReviewedDark',
    'vegReviewedHatch','vegReviewedYellow','vegReviewedImport','vegReviewedStatus'])
    await expect(page.locator('#'+id)).toHaveCount(1);
  const before=await page.locator('#featureCount').textContent();
  await page.evaluate(()=>{
    document.getElementById('vegReviewedYellow').checked=false;
    document.getElementById('vegReviewedImport').click();
  });
  await expect(page.locator('#vegReviewedStatus')).toContainText('No se importó ningún cambio');
  await expect(page.locator('#featureCount')).toHaveText(before);
});
