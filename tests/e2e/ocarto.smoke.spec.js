const { test, expect } = require('@playwright/test');
const path = require('path');

test('editor web loads its main interface', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Ocarto/i);
  await expect(page.locator('body')).toContainText('ocarto');
  await expect(page.locator('body')).toContainText('LiDAR e IA');
  await expect(page.locator('body')).toContainText('Mapa editable');
});

test('LiDAR workspace exposes the input flow for a small fixture', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('#lidarNav')).toHaveCount(1);
  await expect(page.locator('body')).toContainText(/LiDAR/i);
  const inputs = page.locator('input[type="file"]');
  await expect(inputs.first()).toBeAttached();
  await inputs.first().setInputFiles(path.join(__dirname, '..', 'fixtures', 'lidar-small.geojson'));
});
