const { defineConfig } = require('@playwright/test');
const path = require('node:path');
module.exports = defineConfig({
  testDir: '.',
  testMatch: 'lidar-browser.spec.cjs',
  timeout: 90_000,
  expect: { timeout: 35_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory source/v234',
    cwd: path.resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 40_000,
  },
});
