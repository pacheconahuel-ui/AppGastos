import { defineConfig } from '@playwright/test';

// CHROMIUM_PATH: usar un Chromium ya instalado en vez del que baja Playwright
const executablePath = process.env.CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'e2e',
  testIgnore: 'firebase/**',
  timeout: 30000,
  use: { baseURL: 'http://localhost:8765/AppGastos/', launchOptions: { executablePath } },
  webServer: { command: 'node e2e/server.mjs', url: 'http://localhost:8765/AppGastos/', reuseExistingServer: true },
});
