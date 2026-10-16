const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { browserName: 'chromium', baseURL: 'http://127.0.0.1:4173', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'python3 -m http.server 4173 --directory source/v234', url: 'http://127.0.0.1:4173/index.html', reuseExistingServer: false, timeout: 30000 }
});
