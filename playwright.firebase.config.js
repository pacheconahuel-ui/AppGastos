import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

// Contra los emuladores de Firebase (database + auth): npm run test:firebase
export default defineConfig({
  ...base,
  testDir: 'e2e/firebase',
  testIgnore: undefined,
  timeout: 90000,
  workers: 1,
});
