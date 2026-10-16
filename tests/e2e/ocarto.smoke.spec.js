const { test, expect } = require('@playwright/test');
const path = require('path');

test('editor web loads its main interface', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Ocarto/i);
  await expect(page.locator('.brand')).toContainText('ocarto');
  await expect(page.locator('#lidarNav')).toContainText('LiDAR e IA');
  await expect(page.getByText('Mapa editable', { exact: true })).toBeVisible();
});

test('LiDAR workspace exposes the input flow for a small fixture', async ({ page }) => {
  await page.goto('/index.html');
  const lidar = page.locator('#lidarNav');
  await expect(lidar).toBeVisible();
  await lidar.click();
  await expect(page.getByText(/LiDAR/i).first()).toBeVisible();
  const inputs = page.locator('input[type="file"]');
  await expect(inputs.first()).toBeAttached();
  await inputs.first().setInputFiles(path.join(__dirname, '..', 'fixtures', 'lidar-small.geojson'));
});
